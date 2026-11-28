import { readWorkbook } from './core/table';
import {
  EngineBlockError,
  type BaseRow,
  type EngineResult,
} from './core/types';
import { processClientes } from './clientes/process';
import { processCompras } from './compras/process';
import { processCortes } from './cortes/process';
import { processRoteiro } from './roteiro/process';
import { enriquecerComVendedor } from './core/vendedores';
import { loadOperacoesMovimentacoes, loadVendedores } from './storage';
import { processProdutos } from './produtos/process';
import {
  decodeLatin1,
  processMovimentacoes,
  type Fonte379,
  type Fonte8022,
} from './movimentacoes/process';

export type EngineRunner = {
  /** Coluna que identifica cada linha da base. */
  keyColumn: string;
  /** Base grande: grava em lotes (a base anterior só é trocada no fim). */
  chunked?: boolean;
  /** Motores cuja base vigente este motor precisa (ex.: Cortes usa Produtos e Clientes). */
  needs?: string[];
  /** Lê os arquivos (por id de slot) e devolve a base. */
  run: (
    files: Record<string, File>,
    bases: Record<string, BaseRow[]>,
  ) => Promise<EngineResult>;
};

function need(files: Record<string, File>, slot: string): File {
  const file = files[slot];
  if (!file)
    throw new EngineBlockError(
      `arquivo não enviado nesta sessão (${slot}): envie novamente os arquivos para reprocessar`,
    );
  return file;
}

async function bytes(file: File): Promise<Uint8Array> {
  return new Uint8Array(await file.arrayBuffer());
}

/** Planilha do Excel (xls = OLE2, xlsx = zip) ou texto de largura fixa: decidido pelo conteúdo, nunca pelo nome. */
function isSpreadsheet(data: Uint8Array): boolean {
  const ole = [0xd0, 0xcf, 0x11, 0xe0];
  const zip = [0x50, 0x4b, 0x03, 0x04];
  const starts = (sig: number[]) => sig.every((b, i) => data[i] === b);
  return starts(ole) || starts(zip);
}

/** Motores ligados ao processamento real e às bases persistidas no Supabase. */
export const runners: Record<string, EngineRunner> = {
  produtos: {
    keyColumn: 'ean',
    run: async (files) => {
      const itens = readWorkbook(await bytes(need(files, '286')));
      const logistico = readWorkbook(await bytes(need(files, '8013')));
      const lista = readWorkbook(
        await bytes(need(files, 'lista-preco-industria')),
      );
      const precos = readWorkbook(await bytes(need(files, '8011')));
      const sortimento = readWorkbook(
        await bytes(need(files, 'sortimento-nacional')),
      );
      const text322 = new TextDecoder('windows-1252').decode(
        await need(files, '322').arrayBuffer(),
      );
      return processProdutos({
        itens286: itens.sheetWith(['Código', 'Cód. Barras', 'Custo real']),
        texto322: text322,
        logistico8013: logistico.sheetWith(['SUB BRANDS']),
        listaPreco: lista.sheetWith(['SKU', 'PRECO BASE'], 'data'),
        precos8011: precos.sheetWith(['CODPROD', 'PRECO']),
        sortimento: sortimento.sheetWith(
          ['STATUS', 'COD', 'EAN'],
          'Base_Sortimento_Nacional',
        ),
      });
    },
  },
  clientes: {
    keyColumn: 'cnpj_cpf',
    run: async (files) => {
      const cadastro = readWorkbook(await bytes(need(files, '1203')));
      const carteira = readWorkbook(
        await bytes(need(files, 'carteira-clientes')),
      );
      const piramide = readWorkbook(await bytes(need(files, 'piramide')));
      const base = processClientes(
        {
          cadastro1203: cadastro.sheetWith(['Código', 'CPF/CNPJ', 'Nome']),
          carteira: carteira.sheet(),
          piramide: piramide.sheetWith(
            ['COD CLIENTE', 'FAIXAS', 'PERFIL'],
            'Pirâmide ativa',
          ),
        },
        {
          cadastro: '1203-clientes.xls',
          carteira: 'relatorio_carteira_clientes.xls',
          piramide: 'piramide (aba Pirâmide ativa)',
        },
      );
      // RCA "2" = venda das indústrias (sem vendedor)
      return enriquecerComVendedor(
        base,
        await loadVendedores(),
        'cod_rca_1203',
        ['2'],
      );
    },
  },
  cortes: {
    keyColumn: 'id_corte',
    needs: ['produtos', 'clientes'],
    run: async (files, bases) => {
      const produtos = bases.produtos ?? [];
      const clientes = bases.clientes ?? [];
      if (!produtos.length)
        throw new EngineBlockError(
          'a base de Produtos está vazia: processe o motor Produtos antes',
        );
      if (!clientes.length)
        throw new EngineBlockError(
          'a base de Clientes está vazia: processe o motor Clientes antes',
        );
      const arquivos = [];
      for (const [slot, nome] of [
        ['1454-agosto', '1454 de agosto em diante'],
        ['1454-atual', '1454 do mês atual'],
      ] as const) {
        const wb = readWorkbook(await bytes(need(files, slot)), {
          serialDates: true,
        });
        arquivos.push({ nome, matrix: wb.sheet() });
      }
      return processCortes({ arquivos, produtos, clientes });
    },
  },
  roteiro: {
    keyColumn: 'id_visita',
    needs: ['clientes'],
    run: async (files, bases) => {
      const wb = readWorkbook(await bytes(need(files, 'roteiro-consolidado')));
      const base = processRoteiro({
        matrix: wb.sheet(),
        clientes: bases.clientes ?? [],
      });
      return enriquecerComVendedor(base, await loadVendedores(), 'cod_rca');
    },
  },
  movimentacoes: {
    keyColumn: 'id_movimento',
    chunked: true,
    run: async (files) => {
      const antigos: Fonte379[] = [];
      const novos: Fonte8022[] = [];
      for (const slot of [
        '379-2025',
        '379-2026-julho',
        '8022-agosto',
        '8022-atual',
      ]) {
        const file = need(files, slot);
        const data = await bytes(file);
        if (isSpreadsheet(data)) {
          novos.push({
            nome: file.name,
            matrix: readWorkbook(data).sheetWith(['DATA MOVIMENTO']),
          });
        } else {
          antigos.push({ nome: file.name, texto: () => decodeLatin1(data) });
        }
      }
      return processMovimentacoes({
        antigos,
        novos,
        operacoes: await loadOperacoesMovimentacoes(),
        vendedores: await loadVendedores(),
      });
    },
  },
  'compras-industria': {
    keyColumn: 'linha',
    needs: ['produtos'],
    run: async (files, bases) => {
      const produtos = bases.produtos ?? [];
      if (!produtos.length)
        throw new EngineBlockError(
          'a base de Produtos está vazia: processe o motor Produtos antes',
        );
      // O 218 vem inteiro, do começo do ano até o fim: um arquivo só.
      const r218 = [readWorkbook(await bytes(need(files, '218'))).sheet()];
      const carteira = readWorkbook(
        await bytes(need(files, 'carteira-17-11')),
      ).sheet();
      const texto12322 = new TextDecoder('windows-1252').decode(
        await need(files, '12322').arrayBuffer(),
      );
      return processCompras({ texto12322, r218, carteira, produtos });
    },
  },
};
