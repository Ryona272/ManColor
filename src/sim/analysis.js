/**
 * analysis.js -- 今セッションの全改善を段階的に検証
 *
 * ビルド＆実行:
 *   npx.cmd esbuild src/sim/analysis.js --bundle --platform=node --outfile=dist-sim/analysis.cjs --format=cjs ; node dist-sim/analysis.cjs
 */
import { DEFAULT_PARAMS, mergeParams } from "./SimParams.js";
import { runMany } from "./SimRunner.js";

const N = 1000;

function pr(label, s) {
  const draw = (
    100 -
    parseFloat(s.selfWinRate) -
    parseFloat(s.oppWinRate)
  ).toFixed(1);
  const marker =
    parseFloat(s.selfWinRate) > parseFloat(s.oppWinRate) + 3
      ? " ◀ self優勢"
      : parseFloat(s.oppWinRate) > parseFloat(s.selfWinRate) + 3
        ? " ◀ opp優勢"
        : "";
  console.log(`  ${label}${marker}`);
  console.log(
    `    self win: ${s.selfWinRate}  opp win: ${s.oppWinRate}  draw: ${draw}%`,
  );
  console.log(`    avgDiff: ${s.avgScoreDiff}  med: ${s.medianScoreDiff}`);
  console.log(
    `    guru  self:${s.avgSelfGuru} opp:${s.avgOppGuru}  peeks self:${s.avgSelfPeeks} opp:${s.avgOppPeeks}  turns:${s.avgTurns}`,
  );
}

function sep(title) {
  console.log("\n" + "=".repeat(64));
  console.log("  " + title);
  console.log("=".repeat(64));
}

// ─── ベースライン: 今セッション開始直前の状態 ─────────────────────────────
const BASELINE = mergeParams({
  // ぐるぐる連鎖は線形（二乗前）
  guruguruChainMult: 28,
  guruguruChainMultEarly: 7,
  guruguruBase: 71,
  guruguruDisrupt: 28,
  // lane品質スコアは旧値
  laneOwnFortune: 3,
  laneInferred: 4,
  laneKnownPos: 2,
  laneKnownNegPenalty: 8,
  laneAvoidedPenalty: 0,
  sendKnownNegToOpp: 12,
  // pit色品質評価なし
  pitColorOwnFortune: 0,
  pitColorInferred: 0,
  pitColorKnownPos: 0,
  pitColorKnownNeg: 0,
  pitColorAvoided: 0,
  // 自ちらちら準備破壊ペナルティなし
  ownChirachiraLost: 0,
  // 脅威成長ペナルティなし
  playerThreatGrowthMult: 0,
  // 2手先読みなし
  lookaheadOwnMult: 0,
  lookaheadPlayerMult: 0,
  // 旧防御パラメータ
  zakuzakuExposedBase: 0,
  zakuzakuExposedMult: 0,
});

// ─── 現在の最新パラメータ ───────────────────────────────────────────────────
const CURRENT = DEFAULT_PARAMS;

// ─── 各改善を1つずつONにした中間パラメータ ──────────────────────────────────

// ① 二乗連鎖のみON
const STEP1_CHAIN_QUAD = mergeParams({
  ...BASELINE,
  guruguruChainMult: 36,
  guruguruChainMultEarly: 9,
  guruguruBase: 77,
  guruguruDisrupt: 33,
});

// ② + lane品質強化
const STEP2_LANE = mergeParams({
  ...STEP1_CHAIN_QUAD,
  laneOwnFortune: 8,
  laneInferred: 10,
  laneKnownPos: 6,
  laneKnownNegPenalty: 16,
  laneAvoidedPenalty: 6,
  sendKnownNegToOpp: 18,
  pitColorOwnFortune: 2,
  pitColorInferred: 2.5,
  pitColorKnownPos: 1.5,
  pitColorKnownNeg: 6,
  pitColorAvoided: 3,
});

// ③ + 自ちらちら準備破壊防止 + 脅威成長ペナルティ
const STEP3_THREAT = mergeParams({
  ...STEP2_LANE,
  ownChirachiraLost: 20,
  playerThreatGrowthMult: 1.2,
  zakuzakuExposedBase: 12,
  zakuzakuExposedMult: 3,
});

// ④ = CURRENT (+ 2手先読み + 気分システム)
// 気分システムはコード側でロール、パラメータ変化なし

sep("0. ベースライン自己対戦（基準値）");
pr("BASELINE vs BASELINE", runMany(BASELINE, BASELINE, N));

sep("1. ① 二乗連鎖 vs BASELINE");
pr("STEP1 (先手) vs BASELINE (後手)", runMany(STEP1_CHAIN_QUAD, BASELINE, N));
pr("BASELINE (先手) vs STEP1 (後手)", runMany(BASELINE, STEP1_CHAIN_QUAD, N));

sep("2. ② +lane/pit色品質 vs BASELINE");
pr("STEP2 (先手) vs BASELINE (後手)", runMany(STEP2_LANE, BASELINE, N));
pr("BASELINE (先手) vs STEP2 (後手)", runMany(BASELINE, STEP2_LANE, N));

sep("3. ③ +脅威成長ペナルティ vs BASELINE");
pr("STEP3 (先手) vs BASELINE (後手)", runMany(STEP3_THREAT, BASELINE, N));
pr("BASELINE (先手) vs STEP3 (後手)", runMany(BASELINE, STEP3_THREAT, N));

sep("4. ④ CURRENT(最新) vs BASELINE");
pr("CURRENT (先手) vs BASELINE (後手)", runMany(CURRENT, BASELINE, N));
pr("BASELINE (先手) vs CURRENT (後手)", runMany(BASELINE, CURRENT, N));

sep("5. CURRENT 自己対戦（新ベースライン）");
pr("CURRENT vs CURRENT", runMany(CURRENT, CURRENT, N));

sep("6. CURRENT vs BASELINE まとめ（先後手平均）");
{
  const s1 = runMany(CURRENT, BASELINE, N);
  const s2 = runMany(BASELINE, CURRENT, N);
  const currWin = (parseFloat(s1.selfWinRate) + parseFloat(s2.oppWinRate)) / 2;
  const baseWin = (parseFloat(s1.oppWinRate) + parseFloat(s2.selfWinRate)) / 2;
  console.log(`  CURRENT 平均勝率: ${currWin.toFixed(1)}%`);
  console.log(`  BASELINE 平均勝率: ${baseWin.toFixed(1)}%`);
  console.log(`  改善幅: ${(currWin - baseWin).toFixed(1)}pt`);
}

sep("7. lookaheadPlayerMult グリッドサーチ (CURRENT vs CURRENT-lookahead0)");
{
  const noLookahead = mergeParams({
    lookaheadOwnMult: 0,
    lookaheadPlayerMult: 0,
  });
  for (const v of [0.2, 0.4, 0.55, 0.7, 0.9]) {
    const p = mergeParams({ lookaheadPlayerMult: v, lookaheadOwnMult: 0.35 });
    const s = runMany(p, noLookahead, 500);
    console.log(
      `  lookaheadPlayerMult=${v}  win: ${s.selfWinRate}  avgDiff: ${s.avgScoreDiff}`,
    );
  }
}

sep("8. playerThreatGrowthMult グリッドサーチ (vs BASELINE)");
{
  for (const v of [0.5, 0.8, 1.0, 1.2, 1.5, 2.0]) {
    const p = mergeParams({ playerThreatGrowthMult: v });
    const s = runMany(p, BASELINE, 500);
    console.log(
      `  threatGrowthMult=${v}  win: ${s.selfWinRate}  avgDiff: ${s.avgScoreDiff}`,
    );
  }
}
