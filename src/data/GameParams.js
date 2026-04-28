/**
 * GameParams.js
 * ゲーム内 AI 用チューニングパラメータ定義
 */

/**
 * 鬼神（kisin）用パラメータ
 * SimKisinV1 に渡す。
 * - ぐるぐる連鎖一本槍・武闘派ごり押し
 * - ぐるぐる >> ちらちら ≈ ざくざく
 * - くたくたボーナス 0（賽壇に石を貯めない）
 */
export const DEFAULT_KISIN_PARAMS = {
  kisinGuruguruScore: 50, // ぐるぐる最優先（他を圧倒）
  kisinChirachiraScore: 20, // 1回目ちらちら（ぐるぐるより低い）
  kisinChirachiraScore2: 10, // 2回目以降ちらちら（さらに低い）
  kisinChirachiraLimit: 3, // ちらちら上限 3回まで
  kisinZakuzakuBase: 12, // ざくざく（ぐるぐると組み合わせて使う）
  kisinKutakutaBonus: 0, // くたくたは使わない
  kisinTopN: 5, // 評価候補路数（5路）
  kisinDepth: 5, // 5手先まで読む
  kisinGuruDepthDiscount: 0.75, // 深さごとのぐるぐる評価割引率
};

/**
 * 九尾（kyubi）用パラメータ
 * KyubiV1 に渡す。
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

/**
 * 九尾（kyubi）V2 用パラメータ（SimKyubiV1 / KyubiV2 向け）
 * - ちらちら全3回優先 > ざくざく超優先 > ぐるぐる低評価
 */
export const DEFAULT_KYUBI_PARAMS = {
  kyubiGuruguruScore: 3, // ぐるぐるは低評価
  kyubiChirachiraScore: 25, // 1回目ちらちら
  kyubiChirachiraScore2: 25, // 2・3回目ちらちら（3回全部積極的に狙う）
  kyubiChirachiraLimit: 3, // ちらちら最大3回
  kyubiZakuzakuBase: 15, // ざくざく基本スコア
  kyubiKutakutaBonus: 0,
  kyubiDepth: 5,
  // ─── 妨害スコア（相手ターン想定値・高いほど相手技を潰しに行く） ───
  kyubiOppChiraScore: 15, // 相手ちらちら脅威（kugutsu=9より高く）
  kyubiOppZakuBase: 13, // 相手ざくざく脅威（kugutsu=7より高く）
  kyubiZakuzakuSetupBonus: 0, // ざくざく仕掛け: 自路を空にして相手鏡路の石を狙いやすく
};
