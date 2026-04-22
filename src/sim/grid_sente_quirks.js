/**
 * grid_sente_quirks.js
 * senteStrategy の「専用の癖」候補をグリッド探索
 *
 * 1. kutakutaThresholdOffset : 早期発動（-6 → -2）
 * 2. zakuzakuOwnFortune / earlyOwnFortune : 序盤から自占い色を積極奪取
 * 3. 組み合わせ最良値
 *
 * npx.cmd esbuild src/sim/grid_sente_quirks.js --bundle --platform=node --outfile=dist-sim/grid_sente_quirks.cjs --format=cjs && node dist-sim/grid_sente_quirks.cjs
 */
import { PRESETS, mergeParams } from "./SimParams.js";
import { runMany } from "./SimRunner.js";

const N = 500; // 精度とスピードのバランス
const GOTE = PRESETS.goteStrategy;
const BASE = PRESETS.senteStrategy;

function pr(label, s) {
  const draw = (
    100 -
    parseFloat(s.selfWinRate) -
    parseFloat(s.oppWinRate)
  ).toFixed(1);
  console.log(
    `  ${label.padEnd(52)}  self:${s.selfWinRate}  opp:${s.oppWinRate}  draw:${draw}%  diff:${s.avgScoreDiff}`,
  );
}

function sep(t) {
  console.log("\n" + "─".repeat(72) + "\n  " + t + "\n" + "─".repeat(72));
}

// ─── ベースライン ───
sep("ベースライン: senteStrategy vs goteStrategy");
pr("BASE(sente) vs GOTE", runMany(BASE, GOTE, N));

// ─── 1. kutakutaThresholdOffset : 値を上げると「早期発動 / 小差でも発動」───
// 現状 -6 = 「自分が相手より6個多い時だけ発動」
// -2 = 「2個多ければ発動（積極的）」
// 0  = 「同数でも発動」
// +2 = 「相手が2個多くても発動（超積極）」
sep("1. kutakutaThresholdOffset (早期発動) -6→+2");
for (const v of [-6, -5, -4, -3, -2, -1, 0, 1, 2]) {
  const p = mergeParams({ ...BASE, kutakutaThresholdOffset: v });
  pr(`kutakutaThresholdOffset = ${v}`, runMany(p, GOTE, N));
}

// ─── 2. zakuzakuOwnFortune : 自占い色石を奪う評価値 ───
// 「自分の+3石を相手に渡さない」 → 値が高いほど積極的に奪いに行く
sep("2. zakuzakuOwnFortune (自占い色石の奪取重視)");
for (const v of [4, 8, 12, 16, 20, 25, 30, 36, 44]) {
  const p = mergeParams({ ...BASE, zakuzakuOwnFortune: v });
  pr(`zakuzakuOwnFortune = ${v}`, runMany(p, GOTE, N));
}

// ─── 3. earlyOwnFortune : 序盤に自占い色を自分の賽壇に入れる評価値 ───
sep("3. earlyOwnFortune (序盤 自賽壇への自占い色収集)");
for (const v of [18, 22, 26, 30, 34, 38, 44]) {
  const p = mergeParams({ ...BASE, earlyOwnFortune: v });
  pr(`earlyOwnFortune = ${v}`, runMany(p, GOTE, N));
}

// ─── 4. zakuzakuStoneMult : ざくざく時の石数ボーナス乗数 ───
// 石が多い穴を優先的に奪う
sep("4. zakuzakuStoneMult (ざくざく石数ボーナス)");
for (const v of [6, 8, 11, 14, 18, 22, 28]) {
  const p = mergeParams({ ...BASE, zakuzakuStoneMult: v });
  pr(`zakuzakuStoneMult = ${v}`, runMany(p, GOTE, N));
}

// ─── 5. 最良の組み合わせ候補 ───
sep("5. 組み合わせ候補");
const combos = [
  {
    label: "kuta=-3, zakuOwn=20",
    overrides: { kutakutaThresholdOffset: -3, zakuzakuOwnFortune: 20 },
  },
  {
    label: "kuta=-2, zakuOwn=20",
    overrides: { kutakutaThresholdOffset: -2, zakuzakuOwnFortune: 20 },
  },
  {
    label: "kuta=-3, zakuOwn=25",
    overrides: { kutakutaThresholdOffset: -3, zakuzakuOwnFortune: 25 },
  },
  {
    label: "kuta=-2, zakuOwn=25",
    overrides: { kutakutaThresholdOffset: -2, zakuzakuOwnFortune: 25 },
  },
  {
    label: "kuta=-4, zakuOwn=16, earlyOwn=30",
    overrides: {
      kutakutaThresholdOffset: -4,
      zakuzakuOwnFortune: 16,
      earlyOwnFortune: 30,
    },
  },
  {
    label: "kuta=-3, zakuOwn=20, earlyOwn=30",
    overrides: {
      kutakutaThresholdOffset: -3,
      zakuzakuOwnFortune: 20,
      earlyOwnFortune: 30,
    },
  },
  {
    label: "kuta=-2, zakuOwn=25, earlyOwn=34",
    overrides: {
      kutakutaThresholdOffset: -2,
      zakuzakuOwnFortune: 25,
      earlyOwnFortune: 34,
    },
  },
];
for (const { label, overrides } of combos) {
  const p = mergeParams({ ...BASE, ...overrides });
  pr(label, runMany(p, GOTE, N));
}
