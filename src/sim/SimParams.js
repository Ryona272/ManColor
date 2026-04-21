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
  guruguruBaseEarly: 14, // 序盤のぐるぐるベース
  guruguruChainMultEarly: 10, // 序盤の連鎖ボーナス乗数
  guruguruBase: 28, // 中盤以降のぐるぐるベース
  guruguruChainMult: 16, // 中盤以降の連鎖ボーナス乗数
  guruguruFollowupMult: 1.3, // 2手先読み乗数
  guruguruDisrupt: 26, // プレイヤーぐるぐる破壊ボーナス/手

  // ─── ちらちら（pit5着地）───
  chirachira1st: 50, // 1回目（序盤）
  chirachira2nd: 42, // 2回目（序盤）
  chirachira1stMid: 36, // 1回目（中盤以降）
  chirachira2ndMid: 30, // 2回目（中盤以降）
  chirachira3rd: 24, // 3回目
  poipoiWithFortune: 30, // ぽいぽい: inferred色が相手賽壇にある
  poipoiGeneral: 12, // ぽいぽい: 石が1個以上ある
  poipoiEmpty: 3, // ぽいぽい: 相手賽壇が空

  // ─── ざくざく ───
  zakuzakuBase: 10, // ざくざく奪取基本点
  zakuzakuStoneMult: 4, // ざくざく石1個あたり
  zakuzakuOwnFortune: 8, // 奪う石が自占い色
  zakuzakuInferred: 6, // 奪う石がinferred色
  zakuzakuKnownPos: 10, // 奪う石がknownPos色

  // ─── 石の色評価（pit11着地）─ 序盤 ───
  earlyOwnFortune: 22, // 自分の占い色（+3確実）
  earlyCancelMult: 10, // 相手賽壇にN枚以上 → N×この値
  earlyCancelThreshold: 2, // キャンセルが有効になる枚数下限
  earlyUnknownPenalty: -18, // 未知色ペナルティ

  // ─── 石の色評価（pit11着地）─ 中盤以降 ───
  midInferred: 38, // 相手占い色（+5）
  midOwnFortune: 20, // 自分占い色（+3）
  midKnownPos: 8, // ちらちら確認済み+1石
  midKnownNeg: -42, // 確定マイナス石（絶対回避）
  midAvoidedColor: -22, // プレイヤーが避けている色
  midUnknownPenalty: -16, // 未確定色ペナルティ
  midCancelMult: 8, // 相手賽壇にN枚 → N×この値
  midCancelThreshold: 2, // キャンセルが有効になる枚数下限

  // ─── くたくた ───
  kutakutaThresholdOffset: -2, // kutakuta発動: oppStore > selfStore + offset
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
