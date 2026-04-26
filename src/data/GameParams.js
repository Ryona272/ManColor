/**
 * GameParams.js
 * ゲーム内 AI 用チューニングパラメータ定義
 */

/**
 * 鬼神（kisin）用パラメータ
 * pickPitParamDfsV1 に渡す。
 * - ぐるぐる一押し（他の技は最後の手段）
 * - マイナス石ペナルティ無視（NegBonus=0）
 * - くたくたボーナス 0（賽壇に石を貯めない）
 */
export const DEFAULT_KISIN_PARAMS = {
  kisinGuruguruScore: 50, // ぐるぐる最優先
  kisinChirachiraScore: 3, // ちらちらは最後の手段
  kisinChirachiraNegBonus: 0, // マイナス石を無視（武力型）
  kisinChirachiraLimit: 2, // ちらちら上限 2回（循環目的）
  kisinZakuzakuBase: 2, // ざくざくも最後の手段
  kisinKutakutaBonus: 0, // くたくたは使わない
  kisinTopN: 5, // 評価候補路数（5路）
  kisinDepth: 3, // 3手先まで読む
};

/**
 * 九尾（kyubi）用パラメータ
 * pickPitDisruptDfsV1 に渡す。
 * - ちらちら全3回最優先
 * - ざくざく超高評価 / 相手ぐるぐる破壊ボーナス
 */
export const DEFAULT_TEST_KYUBI_PARAMS = {
  // ─── ピット選択スコア ───────────────────────────────────────────
  tkGuruguruScore: 1, // ぐるぐる基本スコア
  tkChirachiraScore: 12, // 強制ちらちら（peeksDone < Force）のスコア
  tkChirachiraOptScore: 5, // 機会ちらちら（Force 以降）のスコア
  tkChirachiraForce: 2, // 強制ちらちら回数（0〜3）
  tkZakuzakuBase: 16, // ざくざく基本スコア
  tkOppZakuzakuPenalty: 11, // 相手ざくざくリスク1石あたりペナルティ
  tkGuruguruBlockBonus: 8, // 相手ぐるぐる連鎖を1路阻止するボーナス
  tkOppGuruguruPenalty: 6, // 相手ぐるぐるスコア（DFS内ペナルティ）
  tkOppChirachiraPenalty: 9, // 相手ちらちらスコア（DFS内ペナルティ）
  tkChirachiraNegBonus: 8, // 2回目ちらちら時にTK側未確認マイナス牌あれば追加ボーナス
  tkOppChirachiraNegBonus: 8, // 相手2回目ちらちら時にKisin側未確認マイナス牌あれば追加ペナルティ
  // ─── 路別バイアス ──────────────────────────────────────────────
  tkTakeZakuzakuBias: 5, // 竹(pit10): ざくざく着地時の追加スコア
  tkMagatamaBias: 5, // 勾玉(pit9): ちらちら着地時の追加スコア
  tkMusubiGuruguruBias: 3, // 結び(pit8): ぐるぐる着地時の追加スコア
  // ─── ざくざく後配置 ────────────────────────────────────────────
  tkChirachiraSetupBias: 3, // ちらちらセットアップバイアス（乗数）
  tkZakuzakuStoneBias: 3, // 石が多い路へのバイアス（1石あたり）
  // ─── こびふり ──────────────────────────────────────────────────
  tkPoipoiOwnFortune: 50, // AI占い色の価値
  tkPoipoiInferred: 35, // 推測プレイヤー占い色の価値
  tkPoipoiKnownPos: 15, // 確認済み+1色の価値
  tkKutakutaBias: 1, // くたくた発動傾向
};
