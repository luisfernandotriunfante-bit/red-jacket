import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = (await readFile(new URL('../src/main.js', import.meta.url), 'utf8')).replace(/^import '\.\/style\.css';/, '');
const css = await readFile(new URL('../src/style.css', import.meta.url), 'utf8');

class FakeElement {
  constructor(attrs = {}, parent = null) {
    this.attrs = attrs;
    this.dataset = { tab: attrs['data-tab'] };
    this.parent = parent;
    this.listeners = {};
    this.classes = new Set((attrs.class || '').split(/\s+/).filter(Boolean));
    this.classList = {
      contains: name => this.classes.has(name),
      add: (...names) => names.forEach(name => this.classes.add(name)),
      remove: (...names) => names.forEach(name => this.classes.delete(name)),
      toggle: (name, force) => {
        const enabled = force === undefined ? !this.classes.has(name) : force;
        if (enabled) this.classes.add(name); else this.classes.delete(name);
        return enabled;
      }
    };
  }
  addEventListener(type, callback) { (this.listeners[type] ||= []).push(callback); }
  dispatch(type, extra = {}) {
    const event = { type, target: this, ...extra };
    for (const callback of this.listeners[type] || []) callback(event);
  }
  click() { this.dispatch('click'); }
  focus() { globalThis.document.activeElement = this; }
  contains(target) { for (let p = target; p; p = p.parent) if (p === this) return true; return false; }
  setAttribute(name, value) { this.attrs[name] = value; }
  getAttribute(name) { return this.attrs[name] ?? null; }
  querySelector(selector) { return selector === '.menu-toggle' ? this.menuToggle : null; }
}

function setup(initialTheme = null, prefersDark = false) {
  const saved = new Map(initialTheme ? [['red-jacket-theme', initialTheme]] : []);
  const document = {
    documentElement: { dataset: {} },
    activeElement: null,
    listeners: {},
    addEventListener(type, callback) { (this.listeners[type] ||= []).push(callback); },
    dispatch(type, extra = {}) { for (const fn of this.listeners[type] || []) fn({ type, ...extra }); },
    querySelector(selector) { if (selector === '#app') return app; return this.elements.find(el => {
      if (selector === '.nav-item.selected') return el.classList.contains('nav-item') && el.classList.contains('selected');
      if (selector === '.subtabs .active') return el.parentKind === 'subtabs' && el.classList.contains('active');
      if (selector.startsWith('#')) return el.attrs.id === selector.slice(1);
      if (selector.startsWith('.')) return el.classList.contains(selector.slice(1));
      return false;
    }) || null; },
    querySelectorAll(selector) { return selector === '[data-tab]' ? this.elements.filter(el => el.attrs['data-tab']) : []; },
    elements: []
  };
  const app = { html: '', set innerHTML(html) {
    this.html = html;
    const sidebar = new FakeElement({ class: 'sidebar', id: 'sidebar' });
    const buttons = [...html.matchAll(/<button\b([^>]*)>/g)].map(match => {
      const attrs = Object.fromEntries([...match[1].matchAll(/([\w-]+)="([^"]*)"/g)].map(([, key, value]) => [key, value]));
      const el = new FakeElement(attrs, attrs.class?.includes('nav-item') || attrs.class?.includes('menu-toggle') ? sidebar : null);
      if (attrs.class?.includes('active') && attrs['data-tab']) el.parentKind = 'subtabs';
      return el;
    });
    sidebar.menuToggle = buttons.find(el => el.classList.contains('menu-toggle'));
    const message = new FakeElement({ id: 'table-message' });
    message.textContent = '';
    document.elements = [sidebar, ...buttons, message];
  }, get innerHTML() { return this.html; } };
  globalThis.document = document;
  globalThis.localStorage = { getItem: key => saved.get(key) ?? null, setItem: (key, value) => saved.set(key, value) };
  globalThis.matchMedia = () => ({ matches: prefersDark });
  return { document, app, saved };
}
async function boot(initialTheme = null, prefersDark = false) {
  const env = setup(initialTheme, prefersDark);
  await import('data:text/javascript;charset=utf-8,' + encodeURIComponent(source) + '#' + Math.random());
  return env;
}
const tab = (doc, name, kind = 'subtabs') => doc.querySelectorAll('[data-tab]').find(el => el.attrs['data-tab'] === name && (kind === 'sidebar' ? el.classList.contains('nav-item') : !el.classList.contains('nav-item')));

test('tema inicial, alternância e persistência após recarga', async () => {
  let env = await boot(null, true);
  assert.equal(env.document.documentElement.dataset.theme, 'dark');
  env.document.querySelector('#theme-toggle').click();
  assert.equal(env.document.documentElement.dataset.theme, 'light');
  assert.equal(env.saved.get('red-jacket-theme'), 'light');
  assert.equal(env.document.activeElement, env.document.querySelector('#theme-toggle'));
  env = await boot('light', true);
  assert.equal(env.document.documentElement.dataset.theme, 'light');
});

test('quatro seções navegam e preservam foco no controle correspondente', async () => {
  const { document, app } = await boot();
  for (const name of ['Vendas', 'Produtos', 'Clientes', 'Visão geral']) {
    const kind = name === 'Produtos' ? 'sidebar' : 'subtabs';
    tab(document, name, kind).click();
    assert.equal(document.querySelector(kind === 'sidebar' ? '.nav-item.selected' : '.subtabs .active').attrs['data-tab'], name);
    assert.equal(document.activeElement.attrs['data-tab'], name);
    assert.match(app.innerHTML, /DADOS FICTÍCIOS/);
  }
});

test('menu responde a hover, fixação, toque fora e Escape', async () => {
  const { document } = await boot();
  let side = document.querySelector('.sidebar');
  side.dispatch('pointerenter');
  assert.equal(side.classList.contains('hovered'), true);
  tab(document, 'Vendas', 'sidebar').click();
  side = document.querySelector('.sidebar');
  assert.equal(side.classList.contains('hovered'), true);
  const toggle = document.querySelector('.menu-toggle');
  toggle.click();
  assert.equal(side.classList.contains('pinned'), true);
  assert.equal(document.querySelector('.drawer-backdrop').classList.contains('visible'), true);
  document.querySelector('.drawer-backdrop').click();
  assert.equal(side.classList.contains('pinned'), false);
  toggle.click();
  document.dispatch('keydown', { key: 'Escape' });
  assert.equal(side.classList.contains('pinned'), false);
  assert.equal(document.activeElement, toggle);
  toggle.click();
  document.dispatch('pointerdown', { target: document.querySelector('#theme-toggle') });
  assert.equal(side.classList.contains('pinned'), false);
  assert.match(css, /\.sidebar:focus-within/);
  assert.match(css, /@media\(max-width:650px\)\{\.drawer-backdrop\.visible/);
});

test('gráfico lista doze índices e Ver todos dá resposta visível', async () => {
  const { document, app } = await boot();
  const list = app.innerHTML.match(/<details class="chart-data">[\s\S]*?<\/details>/)?.[0];
  assert.ok(list);
  assert.equal((list.match(/<li>/g) || []).length, 12);
  assert.match(list, /Jan: índice 38/);
  assert.match(list, /Dez: índice 100/);
  document.querySelector('#show-all').click();
  assert.match(document.querySelector('#table-message').textContent, /Todos os 3 destaques/);
  assert.doesNotMatch(app.innerHTML, /type="password"/);
});
