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
  guruguruBaseEarly: 37, // 序盤のぐるぐるベース
  guruguruChainMultEarly: 9, // 序盤の連鎖ボーナス乗数
  guruguruBase: 77, // 中盤以降のぐるぐるベース
  guruguruChainMult: 36, // 中盤以降の連鎖ボーナス乗数
  guruguruFollowupMult: 1.725, // 2手先読み乗数
  guruguruDisrupt: 33, // プレイヤーぐるぐる破壊ボーナス/手

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
  zakuzakuInferred: 8, // 奪う石が相手の推定占い色（+3石を否定）
  zakuzakuKnownPos: 10, // 奪う石がknownPos色
  zakuzakuOppStoreColor: 5, // 奪う石が相手賽壇の色と一致（相手の蓄積否定）

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
  midUnknownPenalty: -4, // 未確定色ペナルティ
  midCancelMult: 7, // 相手賽壇にN枚 → N×この値
  midCancelThreshold: 2, // キャンセルが有効になる枚数下限

  // ─── 自路の石の色品質 ───
  laneOwnFortune: 8,
  laneInferred: 10,
  laneKnownPos: 6,
  laneKnownNegPenalty: 16,
  laneAvoidedPenalty: 6,
  sendKnownNegToOpp: 18,

  // ─── 路の色品質評価（路全体の色構成を事前評価）───
  pitColorOwnFortune: 2,
  pitColorInferred: 2.5,
  pitColorKnownPos: 1.5,
  pitColorKnownNeg: 6,
  pitColorAvoided: 3,

  // ─── 先後手制御 ───
  forceChirachiraThreshold: 2, // 強制ちらちら回数（2回まで）
  forceChirachiraMinLane: 3, // 強制ちらちら発動に必要な自陣の最低石数（これ未満なら点数稼ぎ優先）
  saidanAbandonThreshold: 7, // 両賽壇の石の合計がこの値以上になったらちらちらを諦めてぐるぐる専念

  // ─── くたくた ───
  kutakutaThresholdOffset: -6,

  // ─── 防御的ペナルティ（タイブレーカー用: 攻撃スコアが接近した手の中でのみ適用）───
  // 最良攻撃スコアから defensiveTiebreakWindow 以内の手にのみ加算される
  defensiveTiebreakWindow: 8, // この点差以内の手の中でのみ防御ペナルティを比較
  oppGuruguruCreate: 15, // （互換性用に残存）
  oppChirachiraCreate: 12, // 撒いた結果相手路にちらちら可能穴が増えたときのペナルティ/個
  ownChirachiraLost: 5, // 撒いた結果自分のちらちら準備路が崩れたときのペナルティ/個
  playerThreatGrowthMult: 1.2, // 全手共通: 撒き後にプレイヤー脅威度が増加した場合の硬ペナルティ乗数

  // ─── 2手先読み ───
  lookaheadOwnMult: 0.35, // 応手後にAIが取れる行動の価値乗数（ボーナス）
  lookaheadPlayerMult: 0.55, // 応手後にプレイヤーが取れる行動の脅威乗数（ペナルティ）← grid最適値
  kutakutaLanePenalty: 6, // 相手がくたくた発動可能な時に相手路に石を送るペナルティ/石
  // ─── 被ざくざく露出ペナルティ（無効化: 後手時に過剰ペナルティが発生するため）───
  zakuzakuExposedBase: 0,
  zakuzakuExposedMult: 0,
};

/**
 * ロボ用パラメータ（OniV3ベース、機械学習で最適化）
 * pickPitRoboV1 に渡す変動変数
 */
export const DEFAULT_ROBO_PARAMS = {
  roboGuruguruScore: 8, // ぐるぐる発動スコア
  roboChirachiraScore: 15, // ちらちら発動スコア
  roboChirachiraNegBonus: 4, // ちらちら時マイナス確定ボーナス
  roboChirachiraLimit: 10, // ちらちら上限（10=事実上無制限, 整数）
  roboZakuzakuBase: 7, // ざくざく基本スコア
  roboKutakutaBonus: 2, // くたくた新規解放ボーナス
  roboTopN: 3, // 各手番で候補にする上位N手（整数）
  roboDepth: 5, // 先読み深さ（整数）
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

  // AI先手特化パラメータ（廃止: oni-sente削除のため未使用）
  // senteStrategy: mergeParams({ ... }),

  // AI後手特化パラメータ（廃止: oni-gote削除のため未使用）
  // goteStrategy: mergeParams({ ... }),

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

  // 改善版鬼: 2手先読み + 脅威成長ペナルティ + 気分システム
  kai: DEFAULT_PARAMS,

  // ロボ: リセット済み（旧selfplay進化パラメータは保管のみ）
  // 将来: プレイヤー操作記録をサーバーに蓄積し、機械学習で自動進化する知能変動型AI
  // 現在はデータ不足のため導入保留 → DEFAULT_PARAMSと同等
  robo: DEFAULT_PARAMS,

  // ロボ旧パラメータ（保管用・現在は未使用）
  roboLegacy: mergeParams({
    guruguruBaseEarly: 36,
    guruguruChainMultEarly: 20,
    guruguruBase: 134,
    guruguruChainMult: 70,
    guruguruFollowupMult: 3.5,
    guruguruDisrupt: 55,
    chirachira1st: 16,
    chirachira2nd: 41,
    chirachira1stMid: 6,
    chirachira2ndMid: 20,
    chirachira3rd: 17,
    poipoiWithFortune: 23,
    poipoiGeneral: 3,
    poipoiEmpty: 0,
    chirachiraThresholdHigh: 18,
    chirachiraThresholdLow: 9,
    poipoiStoneOwnFortune: 57,
    poipoiStoneInferred: 11,
    poipoiStoneKnownPos: 20,
    zakuzakuBase: 0,
    zakuzakuStoneMult: 1,
    zakuzakuOwnFortune: 24,
    zakuzakuInferred: 6,
    zakuzakuKnownPos: 24,
    earlyOwnFortune: 9,
    earlyCancelMult: 11,
    earlyUnknownPenalty: -28,
    midInferred: 62,
    midOwnFortune: 38,
    midKnownPos: 30,
    midKnownNeg: -64,
    midAvoidedColor: 0,
    midUnknownPenalty: 10,
    midCancelMult: 8,
    laneOwnFortune: 0,
    laneInferred: 3,
    laneKnownPos: 17,
    laneKnownNegPenalty: 8,
    laneAvoidedPenalty: 16,
    sendKnownNegToOpp: 24,
    pitColorInferred: 10,
    pitColorKnownPos: 1.0955,
    pitColorKnownNeg: 17,
    forceChirachiraMinLane: 5,
    kutakutaThresholdOffset: -7,
    defensiveTiebreakWindow: 4,
    oppChirachiraCreate: 27,
    ownChirachiraLost: 10,
    playerThreatGrowthMult: 3,
    lookaheadOwnMult: 1.1096,
    lookaheadPlayerMult: 2,
    kutakutaLanePenalty: 12,
  }),
};
