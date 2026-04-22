/**
 * kai_vs_old.js -- 鬼改DEFAULT vs 元DEFAULT 比較
 * npx.cmd esbuild src/sim/kai_vs_old.js --bundle --platform=node --outfile=dist-sim/kai_vs_old.cjs --format=cjs ; node dist-sim/kai_vs_old.cjs
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
  console.log(`  ${label}`);
  console.log(
    `    self win: ${s.selfWinRate}  opp win: ${s.oppWinRate}  draw: ${draw}%  avgDiff: ${s.avgScoreDiff}  med: ${s.medianScoreDiff}`,
  );
  console.log(`    guru  self:${s.avgSelfGuru} opp:${s.avgOppGuru}`);
  console.log(
    `    peeks self:${s.avgSelfPeeks} opp:${s.avgOppPeeks}  turns:${s.avgTurns}`,
  );
}

function sep(title) {
  console.log("\n" + "=".repeat(60));
  console.log("  " + title);
  console.log("=".repeat(60));
}

// ─── 元DEFAULT（セッション前の値）───
const OLD_DEFAULT = {
  // フェーズ切り替え
  earlyGamePeekThreshold: 2,
  // ぐるぐる（旧値）
  guruguruBaseEarly: 30,
  guruguruChainMultEarly: 9,
  guruguruBase: 71,
  guruguruChainMult: 28,
  guruguruFollowupMult: 1.725,
  guruguruDisrupt: 28,
  // ちらちら
  chirachira1st: 34,
  chirachira2nd: 30,
  chirachira1stMid: 37,
  chirachira2ndMid: 30,
  chirachira3rd: 21,
  poipoiWithFortune: 22,
  poipoiGeneral: 4,
  poipoiEmpty: 3,
  chirachiraThresholdHigh: 25,
  chirachiraThresholdLow: 6,
  poipoiStoneOwnFortune: 45,
  poipoiStoneInferred: 28,
  poipoiStoneKnownPos: 4,
  // ざくざく（旧値）
  zakuzakuBase: 5,
  zakuzakuStoneMult: 11,
  zakuzakuOwnFortune: 8,
  zakuzakuInferred: 0, // 旧: 評価なし
  zakuzakuKnownPos: 10,
  // zakuzakuOppStoreColor なし
  // 石の色評価・序盤
  earlyOwnFortune: 28,
  earlyCancelMult: 9,
  earlyCancelThreshold: 2,
  earlyUnknownPenalty: -17,
  // 石の色評価・中盤
  midInferred: 34,
  midOwnFortune: 24,
  midKnownPos: 10,
  midKnownNeg: -42,
  midAvoidedColor: -21,
  midUnknownPenalty: -12,
  midCancelMult: 7,
  midCancelThreshold: 2,
  // 自路石品質
  laneOwnFortune: 3,
  laneInferred: 4,
  laneKnownPos: 2,
  laneKnownNegPenalty: 8,
  sendKnownNegToOpp: 12,
  // 先後手制御
  forceChirachiraThreshold: 2,
  forceChirachiraMinLane: 3,
  // くたくた
  kutakutaThresholdOffset: -6,
  // 旧: 防御ペナルティなし（新パラメータ導入前）
  oppGuruguruCreate: 0,
  oppChirachiraCreate: 0,
  kutakutaLanePenalty: 0,
  zakuzakuExposedBase: 0,
  zakuzakuExposedMult: 0,
};

// ─── 鬼改DEFAULT（現在のDEFAULT_PARAMS）───
const KAI = DEFAULT_PARAMS;

sep("1. 鬼改DEFAULT(先手) vs 元DEFAULT(後手)");
pr("鬼改 vs 旧", runMany(KAI, OLD_DEFAULT, N));

sep("2. 元DEFAULT(先手) vs 鬼改DEFAULT(後手)");
pr("旧 vs 鬼改", runMany(OLD_DEFAULT, KAI, N));

sep("3. 元DEFAULT(先手) vs 元DEFAULT(後手)  旧ベースライン");
pr("旧 vs 旧", runMany(OLD_DEFAULT, OLD_DEFAULT, N));

sep("4. 鬼改DEFAULT(先手) vs 鬼改DEFAULT(後手)  新ベースライン");
pr("鬼改 vs 鬼改", runMany(KAI, KAI, N));
