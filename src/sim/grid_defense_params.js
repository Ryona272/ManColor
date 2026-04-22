/**
 * grid_defense_params.js
 * 新防御パラメータ（oppGuruguruCreate / oppChirachiraCreate / kutakutaLanePenalty）を
 * senteStrategy 用にグリッド探索
 *
 * npx.cmd esbuild src/sim/grid_defense_params.js --bundle --platform=node --outfile=dist-sim/grid_defense_params.cjs --format=cjs && node dist-sim/grid_defense_params.cjs
 */
import { PRESETS, mergeParams } from "./SimParams.js";
import { runMany } from "./SimRunner.js";

const N = 500;
const GOTE = PRESETS.goteStrategy;
const BASE = PRESETS.senteStrategy;

function pr(label, s) {
  const draw = (
    100 -
    parseFloat(s.selfWinRate) -
    parseFloat(s.oppWinRate)
  ).toFixed(1);
  console.log(
    `  ${label.padEnd(52)}  self:${s.selfWinRate}  opp:${s.oppWinRate}  diff:${s.avgScoreDiff}`,
  );
}
function sep(t) {
  console.log("\n" + "─".repeat(72) + "\n  " + t + "\n" + "─".repeat(72));
}

sep("ベースライン");
pr("BASE vs GOTE", runMany(BASE, GOTE, N));

sep("1. oppGuruguruCreate (相手ぐるぐる新規生成ペナルティ)");
for (const v of [0, 5, 10, 15, 20, 28, 36]) {
  const p = mergeParams({ ...BASE, oppGuruguruCreate: v });
  pr(`oppGuruguruCreate = ${v}`, runMany(p, GOTE, N));
}

sep("2. oppChirachiraCreate (ちらちら被弾防止ペナルティ)");
for (const v of [0, 5, 8, 12, 18, 25, 35]) {
  const p = mergeParams({ ...BASE, oppChirachiraCreate: v });
  pr(`oppChirachiraCreate = ${v}`, runMany(p, GOTE, N));
}

sep("3. kutakutaLanePenalty (くたくた妨害ペナルティ)");
for (const v of [0, 4, 8, 12, 16, 24]) {
  const p = mergeParams({ ...BASE, kutakutaLanePenalty: v });
  pr(`kutakutaLanePenalty = ${v}`, runMany(p, GOTE, N));
}

sep("4. 組み合わせ最良候補");
const combos = [
  {
    label: "guru=20, chira=18",
    overrides: { oppGuruguruCreate: 20, oppChirachiraCreate: 18 },
  },
  {
    label: "guru=28, chira=18",
    overrides: { oppGuruguruCreate: 28, oppChirachiraCreate: 18 },
  },
  {
    label: "guru=20, chira=25",
    overrides: { oppGuruguruCreate: 20, oppChirachiraCreate: 25 },
  },
  {
    label: "guru=28, chira=25",
    overrides: { oppGuruguruCreate: 28, oppChirachiraCreate: 25 },
  },
  {
    label: "guru=36, chira=25, kuta=12",
    overrides: {
      oppGuruguruCreate: 36,
      oppChirachiraCreate: 25,
      kutakutaLanePenalty: 12,
    },
  },
  {
    label: "guru=28, chira=18, kuta=8",
    overrides: {
      oppGuruguruCreate: 28,
      oppChirachiraCreate: 18,
      kutakutaLanePenalty: 8,
    },
  },
  {
    label: "guru=36, chira=35",
    overrides: { oppGuruguruCreate: 36, oppChirachiraCreate: 35 },
  },
];
for (const { label, overrides } of combos) {
  const p = mergeParams({ ...BASE, ...overrides });
  pr(label, runMany(p, GOTE, N));
}
