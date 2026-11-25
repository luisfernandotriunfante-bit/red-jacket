export function cpfOk(d: string): boolean {
  if (d.length !== 11 || d === d[0]?.repeat(11)) return false;
  for (const n of [9, 10]) {
    let s = 0;
    for (let i = 0; i < n; i += 1) s += Number(d[i]) * (n + 1 - i);
    if (((s * 10) % 11) % 10 !== Number(d[n])) return false;
  }
  return true;
}

export function cnpjOk(d: string): boolean {
  if (d.length !== 14 || d === d[0]?.repeat(14)) return false;
  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const w2 = [6, ...w1];
  for (const [ws, pos] of [
    [w1, 12],
    [w2, 13],
  ] as const) {
    let sum = 0;
    for (let i = 0; i < pos; i += 1) sum += Number(d[i]) * (ws[i] ?? 0);
    const r = sum % 11;
    if ((r < 2 ? 0 : 11 - r) !== Number(d[pos])) return false;
  }
  return true;
}
