// Estatística do cruzamento de dados (tabela de contingência).
//
// Responde à pergunta que todo cruzamento levanta: "essa diferença entre os
// grupos é real ou pode ser acaso?". Usa o teste qui-quadrado de
// independência (χ²) e o V de Cramér (força da associação, de 0 a 1), e
// calcula o resíduo padronizado ajustado de cada célula — quanto aquela
// combinação aparece ACIMA ou ABAIXO do esperado se não houvesse relação.
//
// Tudo é calculado sobre as contagens já agregadas (nunca sobre respostas
// individuais), então pode rodar tanto no editor quanto na página pública.

export interface CrosstabStats {
  chi2: number;
  df: number;
  pValue: number;
  cramersV: number;
  /** Força da associação em palavras (convenção de Cohen ajustada por gl). */
  strength: "nenhuma" | "fraca" | "moderada" | "forte";
  significant: boolean;
  /** Mais de 20% das células com frequência esperada < 5: resultado frágil. */
  lowExpected: boolean;
  /** Resíduo padronizado ajustado por célula ([linha][coluna]). |r| > 1,96 ≈ p < 0,05. */
  residuals: number[][];
  n: number;
}

// ─── Função gama incompleta (para o p-valor do χ²) ───────────────────────────
// Implementação clássica (Numerical Recipes): série para x < a+1, fração
// contínua no restante. Precisão muito acima do que um painel precisa.

function logGamma(z: number): number {
  const c = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
  const x = z;
  let y = z;
  let tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (const ci of c) ser += ci / ++y;
  return -tmp + Math.log((2.5066282746310005 * ser) / x);
}

function gammaPLower(a: number, x: number): number {
  if (x <= 0) return 0;
  if (x < a + 1) {
    let sum = 1 / a, del = sum, ap = a;
    for (let n = 0; n < 500; n++) {
      ap += 1; del *= x / ap; sum += del;
      if (Math.abs(del) < Math.abs(sum) * 1e-12) break;
    }
    return sum * Math.exp(-x + a * Math.log(x) - logGamma(a));
  }
  // fração contínua para Q, depois P = 1 - Q
  let b = x + 1 - a, c = 1 / 1e-300, d = 1 / b, h = d;
  for (let i = 1; i < 500; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b; if (Math.abs(d) < 1e-300) d = 1e-300;
    c = b + an / c; if (Math.abs(c) < 1e-300) c = 1e-300;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 1e-12) break;
  }
  return 1 - Math.exp(-x + a * Math.log(x) - logGamma(a)) * h;
}

/** P(X ≥ x) para X ~ χ² com df graus de liberdade. */
export function chiSquarePValue(x: number, df: number): number {
  if (df <= 0 || !Number.isFinite(x)) return 1;
  return Math.min(1, Math.max(0, 1 - gammaPLower(df / 2, x / 2)));
}

/**
 * Estatística de uma tabela de contingência. Linhas e colunas sem nenhuma
 * resposta são ignoradas (não entram nos graus de liberdade). Devolve null se
 * não houver ao menos 2×2 com dados.
 */
export function crosstabStats(cells: number[][]): CrosstabStats | null {
  const rowsIdx = cells.map((r, i) => (r.reduce((a, b) => a + b, 0) > 0 ? i : -1)).filter(i => i >= 0);
  const nCols = cells[0]?.length ?? 0;
  const colsIdx = Array.from({ length: nCols }, (_, j) => j).filter(j => cells.reduce((a, r) => a + (r[j] ?? 0), 0) > 0);
  if (rowsIdx.length < 2 || colsIdx.length < 2) return null;

  const sub = rowsIdx.map(i => colsIdx.map(j => cells[i][j]));
  const rowT = sub.map(r => r.reduce((a, b) => a + b, 0));
  const colT = colsIdx.map((_, j) => sub.reduce((a, r) => a + r[j], 0));
  const n = rowT.reduce((a, b) => a + b, 0);
  if (n === 0) return null;

  let chi2 = 0, lowCells = 0;
  const subRes: number[][] = sub.map((r, i) => r.map((obs, j) => {
    const exp = (rowT[i] * colT[j]) / n;
    if (exp < 5) lowCells++;
    if (exp > 0) chi2 += (obs - exp) ** 2 / exp;
    const denom = Math.sqrt(exp * (1 - rowT[i] / n) * (1 - colT[j] / n));
    return denom > 0 ? (obs - exp) / denom : 0;
  }));

  const df = (rowsIdx.length - 1) * (colsIdx.length - 1);
  const k = Math.min(rowsIdx.length, colsIdx.length) - 1;
  const cramersV = k > 0 ? Math.sqrt(chi2 / (n * k)) : 0;
  const pValue = chiSquarePValue(chi2, df);

  // Limiares de Cohen para V ajustados ao menor lado da tabela (k).
  const small = 0.1 / Math.sqrt(k), medium = 0.3 / Math.sqrt(k), large = 0.5 / Math.sqrt(k);
  const strength = cramersV >= large ? "forte" : cramersV >= medium ? "moderada" : cramersV >= small ? "fraca" : "nenhuma";

  // Devolve os resíduos no formato da tabela original (0 onde linha/coluna foi ignorada).
  const residuals = cells.map(r => r.map(() => 0));
  rowsIdx.forEach((i, si) => colsIdx.forEach((j, sj) => { residuals[i][j] = subRes[si][sj]; }));

  return {
    chi2, df, pValue, cramersV, strength,
    significant: pValue < 0.05,
    lowExpected: lowCells / (rowsIdx.length * colsIdx.length) > 0.2,
    residuals, n,
  };
}

/** Frase curta, em português, para quem não é estatístico. */
export function describeStats(s: CrosstabStats): string {
  const p = s.pValue < 0.001 ? "p < 0,001" : `p = ${s.pValue.toFixed(3).replace(".", ",")}`;
  const v = s.cramersV.toFixed(2).replace(".", ",");
  if (!s.significant) return `Sem associação estatisticamente significativa (${p}). As diferenças entre os grupos podem ser acaso.`;
  return `Associação ${s.strength === "nenhuma" ? "muito fraca" : s.strength}, estatisticamente significativa (V de Cramér = ${v}; ${p}).`;
}
