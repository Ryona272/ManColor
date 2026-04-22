/**
 * SimParams.js
 * シミュレーター用チューニングパラメータ定義
 * 各 AI インスタンスに個別パラメータを渡してヘッドレス対戦させる
 */

/** デフォルト（現状の鬼V2に相当する値） */
export const DEFAULT_PARAMS = {
  // ─── フェーズ切り替え ───
  earlyGamePeekThreshold: 2, // peeksDone < X && inferredなし && knownPosなし → 序盤

  // ─── ぐるぐる ───
  guruguruBaseEarly: 30, // 序盤のぐるぐるベース
  guruguruChainMultEarly: 9, // 序盤の連鎖ボーナス乗数
  guruguruBase: 71, // 中盤以降のぐるぐるベース
  guruguruChainMult: 28, // 中盤以降の連鎖ボーナス乗数
  guruguruFollowupMult: 1.725, // 2手先読み乗数
  guruguruDisrupt: 28, // プレイヤーぐるぐる破壊ボーナス/手

  // ─── ちらちら（pit5着地）───
  chirachira1st: 34, // 1回目（序盤）
  chirachira2nd: 30, // 2回目（序盤）
  chirachira1stMid: 37, // 1回目（中盤以降）
  chirachira2ndMid: 30, // 2回目（中盤以降）
  chirachira3rd: 21, // 3回目
  poipoiWithFortune: 22, // ぽいぽい判断: inferred色が相手賽壇にある
  poipoiGeneral: 4, // ぽいぽい判断: 石が1個以上ある
  poipoiEmpty: 3, // ぽいぽい判断: 相手賽壇が空
  chirachiraThresholdHigh: 25, // ちらちら比較値: 残り回数≥2 (鬼)
  chirachiraThresholdLow: 6, // ちらちら比較値: 残り回数<2 (鬼)
  poipoiStoneOwnFortune: 45, // ぽいぽい石選択: 自占い色
  poipoiStoneInferred: 28, // ぽいぽい石選択: 推測プレイヤー占い色
  poipoiStoneKnownPos: 4, // ぽいぽい石選択: ちらちら確認済み+色

  // ─── ざくざく ───
  zakuzakuBase: 5, // ざくざく奪取基本点
  zakuzakuStoneMult: 11, // ざくざく石1個あたり
  zakuzakuOwnFortune: 8, // 奪う石が自占い色
  zakuzakuInferred: 0, // 奪う石がinferred色
  zakuzakuKnownPos: 10, // 奪う石がknownPos色

  // ─── 石の色評価（pit11着地）─ 序盤 ───
  earlyOwnFortune: 28, // 自分の占い色（+3確実）
  earlyCancelMult: 9, // 相手賽壇にN枚以上 → N×この値
  earlyCancelThreshold: 2, // キャンセルが有効になる枚数下限
  earlyUnknownPenalty: -17, // 未知色ペナルティ

  // ─── 石の色評価（pit11着地）─ 中盤以降 ───
  midInferred: 34, // 相手占い色（+5）
  midOwnFortune: 24, // 自分占い色（+3）
  midKnownPos: 10, // ちらちら確認済み+1石
  midKnownNeg: -42, // 確定マイナス石（絶対回避）
  midAvoidedColor: -21, // プレイヤーが避けている色
  midUnknownPenalty: -12, // 未確定色ペナルティ
  midCancelMult: 7, // 相手賽壇にN枚 → N×この値
  midCancelThreshold: 2, // キャンセルが有効になる枚数下限

  // ─── 自路の石の色品質 ───
  laneOwnFortune: 3,
  laneInferred: 4,
  laneKnownPos: 2,
  laneKnownNegPenalty: 8,
  sendKnownNegToOpp: 12,

  // ─── 先後手制御 ───
  forceChirachiraThreshold: 2, // 強制ちらちら回数（先手=2、後手=1、通常=2）
  forceChirachiraMinLane: 3, // 強制ちらちら発動に必要な自陣の最低石数（これ未満なら点数稼ぎ優先）

  // ─── くたくた ───
  kutakutaThresholdOffset: -6,

  // ─── 防御的ペナルティ ───
  oppGuruguruCreate: 15, // 撒いた結果相手路にぐるぐる待機が増えたときのペナルティ/個
  oppChirachiraCreate: 12, // 撒いた結果相手路にちらちら可能穴が増えたときのペナルティ/個
  kutakutaLanePenalty: 6, // 相手がくたくた発動可能な時に相手路に石を送るペナルティ/石
};

/**
 * パラメータのマージユーティリティ
 * overrides に含まれるキーだけを上書き
 */
export function mergeParams(overrides = {}) {
  return { ...DEFAULT_PARAMS, ...overrides };
}

/**
 * 実験用プリセット
 * sim.html で選択するか Optimizer.js が動的生成する
 */
export const PRESETS = {
  default: DEFAULT_PARAMS,

  // ぐるぐる強化: 中盤のぐるぐる評価を大きく上げ、ちらちら閾値を下げる
  guruguruHeavy: mergeParams({
    guruguruBase: 40,
    guruguruChainMult: 22,
    guruguruFollowupMult: 1.6,
    guruguruBaseEarly: 22,
    chirachira1st: 38,
    chirachira2nd: 30,
  }),

  // ちらちら強化: ちらちら評価を高く、ぐるぐるは抑える
  chirachiraHeavy: mergeParams({
    chirachira1st: 70,
    chirachira2nd: 60,
    chirachira1stMid: 50,
    chirachira2ndMid: 42,
    guruguruBase: 20,
    guruguruChainMult: 12,
  }),

  // AI先手特化（座標降下法最適化済み v2）
  senteStrategy: mergeParams({
    forceChirachiraThreshold: 2,
    guruguruBaseEarly: 29,
    guruguruBase: 68,
    guruguruFollowupMult: 1.675,
    guruguruChainMult: 27,
    guruguruDisrupt: 29,
    chirachira1st: 53,
    chirachira2nd: 48,
    chirachira1stMid: 51,
    chirachira2ndMid: 47,
    chirachira3rd: 41,
    chirachiraThresholdHigh: 24,
    poipoiWithFortune: 26,
    poipoiEmpty: 2,
    poipoiStoneOwnFortune: 44,
    zakuzakuBase: 4,
    zakuzakuOwnFortune: 44,
    zakuzakuKnownPos: 11,
    earlyOwnFortune: 26,
    earlyCancelThreshold: 0,
    midInferred: 32,
    midKnownNeg: -50,
    midAvoidedColor: -20,
    midUnknownPenalty: -13,
    midCancelMult: 5,
    sendKnownNegToOpp: 18,
    oppGuruguruCreate: 36,
    oppChirachiraCreate: 8,
    kutakutaLanePenalty: 12,
  }),

  // AI後手特化（座標降下法最適化済み）
  goteStrategy: mergeParams({
    forceChirachiraThreshold: 1,
    guruguruBaseEarly: 35,
    guruguruChainMultEarly: 7,
    guruguruBase: 77,
    guruguruChainMult: 34,
    guruguruFollowupMult: 1.525,
    guruguruDisrupt: 31,
    chirachira1st: 54,
    chirachira2nd: 18,
    chirachira3rd: 12,
    chirachira1stMid: 55,
    chirachira2ndMid: 19,
    poipoiWithFortune: 21,
    poipoiGeneral: 3,
    chirachiraThresholdHigh: 26,
    zakuzakuBase: 4,
    zakuzakuOwnFortune: 9,
    midInferred: 41,
    midKnownPos: 11,
    midCancelMult: 9,
  }),

  // 恐怖心強化: 未確定色ペナルティを大きく、マイナス色回避を最強に
  fearHeavy: mergeParams({
    earlyUnknownPenalty: -30,
    midUnknownPenalty: -28,
    midKnownNeg: -60,
  }),

  // キャンセル戦略重視
  cancelHeavy: mergeParams({
    midCancelMult: 16,
    midCancelThreshold: 1,
    earlyCancelMult: 18,
    earlyCancelThreshold: 1,
  }),
};
