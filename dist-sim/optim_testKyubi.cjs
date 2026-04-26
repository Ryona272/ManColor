// src/sim/SimParams.js
var DEFAULT_PARAMS = {
  // ─── フェーズ切り替え ───
  earlyGamePeekThreshold: 2,
  // peeksDone < X && inferredなし && knownPosなし → 序盤
  // ─── ぐるぐる ───
  guruguruBaseEarly: 37,
  // 序盤のぐるぐるベース
  guruguruChainMultEarly: 9,
  // 序盤の連鎖ボーナス乗数
  guruguruBase: 77,
  // 中盤以降のぐるぐるベース
  guruguruChainMult: 36,
  // 中盤以降の連鎖ボーナス乗数
  guruguruFollowupMult: 1.725,
  // 2手先読み乗数
  guruguruDisrupt: 33,
  // プレイヤーぐるぐる破壊ボーナス/手
  // ─── ちらちら（pit5着地）───
  chirachira1st: 34,
  // 1回目（序盤）
  chirachira2nd: 30,
  // 2回目（序盤）
  chirachira1stMid: 37,
  // 1回目（中盤以降）
  chirachira2ndMid: 30,
  // 2回目（中盤以降）
  chirachira3rd: 21,
  // 3回目
  poipoiWithFortune: 22,
  // ぽいぽい判断: inferred色が相手賽壇にある
  poipoiGeneral: 4,
  // ぽいぽい判断: 石が1個以上ある
  poipoiEmpty: 3,
  // ぽいぽい判断: 相手賽壇が空
  chirachiraThresholdHigh: 25,
  // ちらちら比較値: 残り回数≥2 (鬼)
  chirachiraThresholdLow: 6,
  // ちらちら比較値: 残り回数<2 (鬼)
  poipoiStoneOwnFortune: 45,
  // ぽいぽい石選択: 自占い色
  poipoiStoneInferred: 28,
  // ぽいぽい石選択: 推測プレイヤー占い色
  poipoiStoneKnownPos: 4,
  // ぽいぽい石選択: ちらちら確認済み+色
  // ─── ざくざく ───
  zakuzakuBase: 5,
  // ざくざく奪取基本点
  zakuzakuStoneMult: 11,
  // ざくざく石1個あたり
  zakuzakuOwnFortune: 8,
  // 奪う石が自占い色
  zakuzakuInferred: 8,
  // 奪う石が相手の推定占い色（+3石を否定）
  zakuzakuKnownPos: 10,
  // 奪う石がknownPos色
  zakuzakuOppStoreColor: 5,
  // 奪う石が相手賽壇の色と一致（相手の蓄積否定）
  // ─── 石の色評価（pit11着地）─ 序盤 ───
  earlyOwnFortune: 28,
  // 自分の占い色（+3確実）
  earlyCancelMult: 9,
  // 相手賽壇にN枚以上 → N×この値
  earlyCancelThreshold: 2,
  // キャンセルが有効になる枚数下限
  earlyUnknownPenalty: -17,
  // 未知色ペナルティ
  // ─── 石の色評価（pit11着地）─ 中盤以降 ───
  midInferred: 34,
  // 相手占い色（+5）
  midOwnFortune: 24,
  // 自分占い色（+3）
  midKnownPos: 10,
  // ちらちら確認済み+1石
  midKnownNeg: -42,
  // 確定マイナス石（絶対回避）
  midAvoidedColor: -21,
  // プレイヤーが避けている色
  midUnknownPenalty: -4,
  // 未確定色ペナルティ
  midCancelMult: 7,
  // 相手賽壇にN枚 → N×この値
  midCancelThreshold: 2,
  // キャンセルが有効になる枚数下限
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
  forceChirachiraThreshold: 2,
  // 強制ちらちら回数（2回まで）
  forceChirachiraMinLane: 3,
  // 強制ちらちら発動に必要な自陣の最低石数（これ未満なら点数稼ぎ優先）
  saidanAbandonThreshold: 7,
  // 両賽壇の石の合計がこの値以上になったらちらちらを諦めてぐるぐる専念
  // ─── くたくた ───
  kutakutaThresholdOffset: -6,
  // ─── 防御的ペナルティ（タイブレーカー用: 攻撃スコアが接近した手の中でのみ適用）───
  // 最良攻撃スコアから defensiveTiebreakWindow 以内の手にのみ加算される
  defensiveTiebreakWindow: 8,
  // この点差以内の手の中でのみ防御ペナルティを比較
  oppGuruguruCreate: 15,
  // （互換性用に残存）
  oppChirachiraCreate: 12,
  // 撒いた結果相手路にちらちら可能穴が増えたときのペナルティ/個
  ownChirachiraLost: 5,
  // 撒いた結果自分のちらちら準備路が崩れたときのペナルティ/個
  playerThreatGrowthMult: 1.2,
  // 全手共通: 撒き後にプレイヤー脅威度が増加した場合の硬ペナルティ乗数
  // ─── 2手先読み ───
  lookaheadOwnMult: 0.35,
  // 応手後にAIが取れる行動の価値乗数（ボーナス）
  lookaheadPlayerMult: 0.55,
  // 応手後にプレイヤーが取れる行動の脅威乗数（ペナルティ）← grid最適値
  kutakutaLanePenalty: 6,
  // 相手がくたくた発動可能な時に相手路に石を送るペナルティ/石
  // ─── 被ざくざく露出ペナルティ（無効化: 後手時に過剰ペナルティが発生するため）───
  zakuzakuExposedBase: 0,
  zakuzakuExposedMult: 0
};
var DEFAULT_TEST_KYUBI_PARAMS = {
  // ─── ピット選択スコア ───────────────────────────────────────────
  tkGuruguruScore: 2,
  // ぐるぐる基本スコア
  tkChirachiraScore: 9,
  // 強制ちらちら（peeksDone < Force）のスコア
  tkChirachiraOptScore: 4,
  // 機会ちらちら（Force 以降）のスコア
  tkChirachiraForce: 2,
  // 強制ちらちら回数（0〜3）
  tkZakuzakuBase: 16,
  // ざくざく基本スコア
  tkOppZakuzakuPenalty: 12,
  // 相手ざくざくリスク1石あたりペナルティ
  tkGuruguruBlockBonus: 8,
  // 相手ぐるぐる連鎖を1路阻止するボーナス
  tkOppGuruguruPenalty: 5,
  // 相手ぐるぐるスコア（DFS内ペナルティ）
  tkOppChirachiraPenalty: 9,
  // 相手ちらちらスコア（DFS内ペナルティ）
  tkChirachiraNegBonus: 8,
  // 2回目ちらちら時にTK側未確認マイナス牌あれば追加ボーナス
  tkOppChirachiraNegBonus: 8,
  // 相手2回目ちらちら時にKisin側未確認マイナス牌あれば追加ペナルティ
  // ─── 路別バイアス ──────────────────────────────────────────────
  tkTakeZakuzakuBias: 5,
  // 竹(pit10): ざくざく着地時の追加スコア
  tkMagatamaBias: 5,
  // 勾玉(pit9): ちらちら着地時の追加スコア
  tkMusubiGuruguruBias: 3,
  // 結び(pit8): ぐるぐる着地時の追加スコア
  // ─── ざくざく後配置 ────────────────────────────────────────────
  tkChirachiraSetupBias: 3,
  // ちらちらセットアップバイアス（乗数）
  tkZakuzakuStoneBias: 2,
  // 石が多い路へのバイアス（1石あたり）
  // ─── こびふり ──────────────────────────────────────────────────
  tkPoipoiOwnFortune: 50,
  // AI占い色の価値
  tkPoipoiInferred: 30,
  // 推測プレイヤー占い色の価値
  tkPoipoiKnownPos: 15,
  // 確認済み+1色の価値
  tkKutakutaBias: 1
  // くたくた発動傾向
};
function mergeParams(overrides = {}) {
  return { ...DEFAULT_PARAMS, ...overrides };
}
var PRESETS = {
  default: DEFAULT_PARAMS,
  // ぐるぐる強化: 中盤のぐるぐる評価を大きく上げ、ちらちら閾値を下げる
  guruguruHeavy: mergeParams({
    guruguruBase: 40,
    guruguruChainMult: 22,
    guruguruFollowupMult: 1.6,
    guruguruBaseEarly: 22,
    chirachira1st: 38,
    chirachira2nd: 30
  }),
  // ちらちら強化: ちらちら評価を高く、ぐるぐるは抑える
  chirachiraHeavy: mergeParams({
    chirachira1st: 70,
    chirachira2nd: 60,
    chirachira1stMid: 50,
    chirachira2ndMid: 42,
    guruguruBase: 20,
    guruguruChainMult: 12
  }),
  // AI先手特化パラメータ（廃止: oni-sente削除のため未使用）
  // senteStrategy: mergeParams({ ... }),
  // AI後手特化パラメータ（廃止: oni-gote削除のため未使用）
  // goteStrategy: mergeParams({ ... }),
  // 恐怖心強化: 未確定色ペナルティを大きく、マイナス色回避を最強に
  fearHeavy: mergeParams({
    earlyUnknownPenalty: -30,
    midUnknownPenalty: -28,
    midKnownNeg: -60
  }),
  // キャンセル戦略重視
  cancelHeavy: mergeParams({
    midCancelMult: 16,
    midCancelThreshold: 1,
    earlyCancelMult: 18,
    earlyCancelThreshold: 1
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
    kutakutaLanePenalty: 12
  })
};

// src/data/constants.js
var INITIAL_STATE = {
  pits: [
    { stones: [] },
    // 0 自分の桜
    { stones: [] },
    // 1 自分の四葉
    { stones: [] },
    // 2 自分の結び
    { stones: [] },
    // 3 自分の勾玉
    { stones: [] },
    // 4 自分の竹
    { stones: [] },
    // 5 自分の賽壇
    { stones: [] },
    // 6 相手の桜
    { stones: [] },
    // 7 相手の四葉
    { stones: [] },
    // 8 相手の結び
    { stones: [] },
    // 9 相手の勾玉
    { stones: [] },
    // 10 相手の竹
    { stones: [] }
    // 11 相手の賽壇
  ],
  fortune: {
    self: { color: null, seen: false },
    opp: { color: null, seen: false },
    center: [
      { color: null, seenBy: [] },
      // 左 +1
      { color: null, seenBy: [] },
      // 中央 -4
      { color: null, seenBy: [] }
      // 右 +1
    ]
  },
  turn: 1
};
var STONE_COLORS = {
  red: { label: "\u8D64", value: 3, hex: 14700624 },
  blue: { label: "\u9752", value: 1, hex: 5275872 },
  green: { label: "\u7DD1", value: 1, hex: 5292112 },
  yellow: { label: "\u9EC4", value: 1, hex: 14733392 },
  purple: { label: "\u7D2B", value: 1, hex: 10506432 }
};
function createPlayerStones() {
  const stones = [];
  for (const [color] of Object.entries(STONE_COLORS)) {
    for (let i = 0; i < 3; i++) {
      stones.push({ color, face: "front" });
    }
  }
  return stones;
}
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// src/logic/GameState.js
var GameState = class {
  constructor() {
    this.reset();
  }
  reset() {
    this.state = JSON.parse(JSON.stringify(INITIAL_STATE));
    this.pendingPlacement = [];
    this.placementHistory = [];
    this.centerPeekProgress = { self: 0, opp: 0 };
    this.state.discard = [];
    this._sennitteMap = /* @__PURE__ */ new Map();
    this._sennitteLastStoreTotal = -1;
    this._sennitteLastHash = null;
    this._initBoard();
  }
  /**
   * 千日手検出 — 各ターン開始時（撒く前）に呼ぶ
   * どちらかの賽壇の石数が増えたらリセット（ぽいぽいで減るのは無視）。
   * 同数期間中に同一盤面ハッシュが出現した回数を返す。
   * @returns {number} 0=問題なし, 1=2回目(警告), 2以上=3回目(引き分け)
   */
  checkSennitte() {
    const storeTotal = this.state.pits[5].stones.length + this.state.pits[11].stones.length;
    if (storeTotal > this._sennitteLastStoreTotal) {
      this._sennitteMap.clear();
    }
    this._sennitteLastStoreTotal = storeTotal;
    const hash = this.state.pits.map((pit) => [...pit.stones.map((s) => s.color)].sort().join(",")).join("|");
    const count = (this._sennitteMap.get(hash) ?? 0) + 1;
    this._sennitteMap.set(hash, count);
    this._sennitteLastHash = hash;
    return count - 1;
  }
  /**
   * 直前の checkSennitte() による記録を1回分取り消す。
   * 路選択をキャンセル（戻る）した際に呼ぶ。
   */
  undoSennitteCheck() {
    if (!this._sennitteLastHash) return;
    const count = this._sennitteMap.get(this._sennitteLastHash) ?? 0;
    if (count <= 1) {
      this._sennitteMap.delete(this._sennitteLastHash);
    } else {
      this._sennitteMap.set(this._sennitteLastHash, count - 1);
    }
    this._sennitteLastHash = null;
  }
  /** 初期配置: 自分の路5マスに3個ずつランダム配置 → 全部表にする */
  _initBoard() {
    const selfStones = shuffle(createPlayerStones());
    const oppStones = shuffle(createPlayerStones());
    for (let i = 0; i < 5; i++) {
      this.state.pits[i].stones = selfStones.splice(0, 3).map((s) => ({
        ...s,
        face: "front"
      }));
    }
    for (let i = 0; i < 5; i++) {
      this.state.pits[6 + i].stones = oppStones.splice(0, 3).map((s) => ({
        ...s,
        face: "front"
      }));
    }
    this._setupFortune();
  }
  /** 占い石をセット（自分・相手各1個、中央3個） */
  _setupFortune() {
    const colors = ["red", "blue", "green", "yellow", "purple"];
    const shuffled = shuffle([...colors]);
    const centerColors = shuffled.slice(0, 3);
    const selfColor = shuffled[3];
    const oppColor = shuffled[4];
    this.state.fortune.self = { color: selfColor, seen: false };
    this.state.fortune.opp = { color: oppColor, seen: false };
    this.state.fortune.center = centerColors.map((color, i) => ({
      color,
      seenBy: [],
      selfPeekOrder: 0,
      oppPeekOrder: 0,
      bonus: i === 1 ? -4 : 1
      // 中央は-4、左右は+1
    }));
  }
  // ─────────────────────────────────
  // ターン処理
  // ─────────────────────────────────
  /**
   * 自分の路（pit index 0-4）から石を反時計回りに撒く
   * @param {number} pitIndex 0-4
   * @returns {object} { lastPit, bonusEffect }
   */
  sow(pitIndex) {
    if (pitIndex < 0 || pitIndex > 4) return null;
    const pit = this.state.pits[pitIndex];
    if (pit.stones.length === 0) return null;
    const stones = [...pit.stones];
    pit.stones = [];
    let cursor = pitIndex;
    let lastPit = -1;
    for (const stone of stones) {
      cursor = (cursor + 1) % 12;
      this.state.pits[cursor].stones.push(stone);
      lastPit = cursor;
    }
    return { lastPit, stones };
  }
  /** ターン後効果: ぐるぐる（最後が賽壇5 → もう1ターン） */
  checkExtraTurn(lastPit) {
    return lastPit === 5;
  }
  _getLaneDistanceToStore(player, pitIndex) {
    if (player === "self") {
      if (pitIndex < 0 || pitIndex > 4) return null;
      return 5 - pitIndex;
    }
    if (pitIndex < 6 || pitIndex > 10) return null;
    return 11 - pitIndex;
  }
  _getMatchingPatternPit(player, pitIndex) {
    const distance = this._getLaneDistanceToStore(player, pitIndex);
    if (distance == null) return null;
    if (player === "self") {
      return 11 - distance;
    }
    return 5 - distance;
  }
  getCaptureTargetIndex(player, pitIndex) {
    return this._getMatchingPatternPit(player, pitIndex);
  }
  /** ターン後効果: ざくざく（最後が空の自路 → 相手の同紋様の石を全奪い） */
  checkCaptureForPlayer(player, lastPit) {
    const selfRange = player === "self" ? [0, 4] : [6, 10];
    if (lastPit < selfRange[0] || lastPit > selfRange[1]) return [];
    const pit = this.state.pits[lastPit];
    if (pit.stones.length !== 1) return [];
    const matchingIndex = this._getMatchingPatternPit(player, lastPit);
    if (matchingIndex == null) return [];
    const oppPit = this.state.pits[matchingIndex];
    const captured = [...oppPit.stones];
    oppPit.stones = [];
    return captured;
  }
  checkCapture(lastPit) {
    return this.checkCaptureForPlayer("self", lastPit);
  }
  /** ゲーム終了判定 */
  isGameOver() {
    const selfEmpty = this.state.pits.slice(0, 5).every((p) => p.stones.length === 0);
    const oppEmpty = this.state.pits.slice(6, 11).every((p) => p.stones.length === 0);
    return selfEmpty || oppEmpty;
  }
  /** 得点計算 */
  calcScore(player) {
    const storeIndex = player === "self" ? 5 : 11;
    const store = this.state.pits[storeIndex].stones;
    const ownFortuneColor = player === "self" ? this.state.fortune.self.color : this.state.fortune.opp.color;
    const oppFortuneColor = player === "self" ? this.state.fortune.opp.color : this.state.fortune.self.color;
    const center = this.state.fortune.center;
    let score = 0;
    for (const stone of store) {
      if (stone.color === ownFortuneColor) {
        score += 3;
      } else if (stone.color === oppFortuneColor) {
        score += 5;
      } else {
        for (const fc of center) {
          if (stone.color === fc.color) {
            score += fc.bonus;
            break;
          }
        }
      }
    }
    return score;
  }
  revealNextCenterForPlayer(player) {
    const order = [0, 1, 2];
    const progress = this.centerPeekProgress[player] ?? 0;
    const viewIndex = order[progress];
    const targetIndex = player === "opp" ? viewIndex != null ? 2 - viewIndex : null : viewIndex;
    if (targetIndex == null) return null;
    this.centerPeekProgress[player] = progress + 1;
    const centerStone = this.state.fortune.center[targetIndex];
    if (!centerStone.seenBy.includes(player)) {
      centerStone.seenBy.push(player);
    }
    const orderKey = player === "self" ? "selfPeekOrder" : "oppPeekOrder";
    centerStone[orderKey] = progress + 1;
    return {
      index: targetIndex,
      color: centerStone.color,
      bonus: centerStone.bonus,
      revealOrder: progress + 1
    };
  }
  canUseChirachira(player) {
    const progress = this.centerPeekProgress[player] ?? 0;
    return progress < 3;
  }
  revealAllCenterStones() {
    this.state.fortune.center.forEach((stone) => {
      if (!stone.seenBy.includes("self")) stone.seenBy.push("self");
      if (!stone.seenBy.includes("opp")) stone.seenBy.push("opp");
    });
  }
  getFortuneColorForPlayer(player) {
    if (player === "self") return this.state.fortune.self.color;
    if (player === "opp") return this.state.fortune.opp.color;
    return null;
  }
  revealPersonalFortunes() {
    this.state.fortune.self.revealed = true;
    this.state.fortune.opp.revealed = true;
  }
  calcStoneScores(player) {
    const storeIndex = player === "self" ? 5 : 11;
    const store = this.state.pits[storeIndex].stones;
    const ownFortuneColor = player === "self" ? this.state.fortune.self.color : this.state.fortune.opp.color;
    const oppFortuneColor = player === "self" ? this.state.fortune.opp.color : this.state.fortune.self.color;
    const center = this.state.fortune.center;
    return store.map((stone) => {
      let pts = 0;
      if (stone.color === ownFortuneColor) {
        pts = 3;
      } else if (stone.color === oppFortuneColor) {
        pts = 5;
      } else {
        for (const fc of center) {
          if (stone.color === fc.color) {
            pts = fc.bonus;
            break;
          }
        }
      }
      return { color: stone.color, pts };
    });
  }
  removeStoneFromPit(pitIndex, stoneIndex) {
    if (pitIndex < 0 || pitIndex > 11) return null;
    const pit = this.state.pits[pitIndex];
    if (!pit || stoneIndex < 0 || stoneIndex >= pit.stones.length) return null;
    const [removed] = pit.stones.splice(stoneIndex, 1);
    if (!removed) return null;
    this.state.discard.push(removed);
    return removed;
  }
  removeRandomStoneFromStore(storeIndex) {
    const pit = this.state.pits[storeIndex];
    if (!pit || pit.stones.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * pit.stones.length);
    return this.removeStoneFromPit(storeIndex, randomIndex);
  }
  getDiscardCount() {
    return this.state.discard.length;
  }
  canActivateKutakuta(player) {
    const laneIndexes = player === "self" ? [0, 1, 2, 3, 4] : [6, 7, 8, 9, 10];
    const colors = /* @__PURE__ */ new Set();
    for (const index of laneIndexes) {
      for (const stone of this.state.pits[index].stones) {
        colors.add(stone.color);
      }
    }
    return colors.size <= 2;
  }
  startPlacement(stones) {
    this.pendingPlacement = [...stones];
    this.placementHistory = [];
  }
  isPlacementActive() {
    return this.pendingPlacement.length > 0;
  }
  getPendingPlacement() {
    return [...this.pendingPlacement];
  }
  placePendingStone(pitIndex, pendingIndex) {
    if (!this.isPlacementActive()) return null;
    if (pitIndex < 0 || pitIndex > 11) return null;
    if (pendingIndex < 0 || pendingIndex >= this.pendingPlacement.length) {
      return null;
    }
    const [stone] = this.pendingPlacement.splice(pendingIndex, 1);
    this.state.pits[pitIndex].stones.push(stone);
    this.placementHistory.push({ pitIndex, stone, pendingIndex });
    return stone;
  }
  undoPlacement() {
    const lastPlacement = this.placementHistory.pop();
    if (!lastPlacement) return null;
    const pit = this.state.pits[lastPlacement.pitIndex];
    const removedStone = pit.stones.pop();
    if (!removedStone) return null;
    this.pendingPlacement.splice(lastPlacement.pendingIndex, 0, removedStone);
    return removedStone;
  }
  getState() {
    return this.state;
  }
  setState(nextState) {
    this.state = JSON.parse(JSON.stringify(nextState));
  }
};

// src/logic/GameAI.js
function createMemoV1() {
  return {
    playerColorFreq: {},
    inferredPlayerColor: null,
    playerAvoidedColor: null
  };
}
function updateMemoV1(memo, state, excludeColors = []) {
  const storeFreq = {};
  for (const s of state.pits[5].stones) {
    storeFreq[s.color] = (storeFreq[s.color] ?? 0) + 1;
  }
  const laneFreq = {};
  for (let i = 0; i < 5; i++) {
    for (const s of state.pits[i].stones) {
      laneFreq[s.color] = (laneFreq[s.color] ?? 0) + 1;
    }
  }
  for (const [color, count] of Object.entries(storeFreq)) {
    memo.playerColorFreq[color] = (memo.playerColorFreq[color] ?? 0) + count * 3;
  }
  for (const [color, count] of Object.entries(laneFreq)) {
    memo.playerColorFreq[color] = (memo.playerColorFreq[color] ?? 0) + count;
  }
  const sorted = Object.entries(memo.playerColorFreq).filter(([color]) => !excludeColors.includes(color)).sort((a, b) => b[1] - a[1]);
  memo.inferredPlayerColor = sorted[0]?.[0] ?? null;
  memo.playerAvoidedColor = sorted.length >= 3 ? sorted[sorted.length - 1][0] : null;
}
function pickPitKisinV1(validPits, state, peeksDoneAI, peeksDonePlayer, fortune, maxDepth = 5) {
  const initCounts = state.pits.map((p) => p.stones.length);
  const hasUnconfirmedNegForAI = fortune.center.some(
    (fc) => fc.bonus < 0 && !fc.seenBy.includes("opp")
  );
  const hasUnconfirmedNegForPlayer = fortune.center.some(
    (fc) => fc.bonus < 0 && !fc.seenBy.includes("self")
  );
  function fastSow(counts, pitIndex) {
    const nc = counts.slice();
    const n = nc[pitIndex];
    if (n === 0) return { counts: nc, lastPit: -1 };
    nc[pitIndex] = 0;
    let cur = pitIndex;
    for (let i = 0; i < n; i++) {
      cur = (cur + 1) % 12;
      nc[cur]++;
    }
    return { counts: nc, lastPit: cur };
  }
  function scoreSow(counts, pit, isAI, peeks) {
    const laneMin = isAI ? 6 : 0;
    const laneMax = isAI ? 10 : 4;
    const storeIndex = isAI ? 11 : 5;
    const oppStoreIndex = isAI ? 5 : 11;
    const n = counts[pit];
    const lastPit = (pit + n) % 12;
    let score = 0;
    if (lastPit === storeIndex) score += 5;
    if (lastPit === oppStoreIndex && peeks < 2) {
      score += 9;
      if (peeks === 1) {
        score += isAI ? hasUnconfirmedNegForAI ? 8 : 0 : hasUnconfirmedNegForPlayer ? 8 : 0;
      }
    }
    if (lastPit >= laneMin && lastPit <= laneMax && counts[lastPit] === 0) {
      const mirror = isAI ? lastPit - 6 : lastPit + 6;
      if (counts[mirror] > 0) score += 7 + counts[mirror];
    }
    return { score, lastPit };
  }
  function getTopMoves(counts, isAI, peeks, restrictTo) {
    const laneMin = isAI ? 6 : 0;
    const laneMax = isAI ? 10 : 4;
    const pool = restrictTo ?? Array.from({ length: laneMax - laneMin + 1 }, (_, i) => laneMin + i);
    const scored = [];
    for (const p of pool) {
      if (counts[p] === 0) continue;
      const { score } = scoreSow(counts, p, isAI, peeks);
      scored.push({ pit: p, score });
    }
    return scored;
  }
  function canKutakutaAI(counts) {
    return counts[11] >= counts[5] - 6;
  }
  function canKutakutaPlayer(counts) {
    return counts[5] >= counts[11];
  }
  let bestFirstPit = validPits[0];
  let bestNet = -Infinity;
  const initAiKk = canKutakutaAI(initCounts);
  const initPlayerKk = canKutakutaPlayer(initCounts);
  function dfs(depth, isAITurn, isFirstMove, chainDepth, counts, aiPeeks, playerPeeks, aiScore, playerScore, firstPit, prevAiKk, prevPlayerKk) {
    if (depth === maxDepth) {
      const net = aiScore - playerScore;
      if (net > bestNet) {
        bestNet = net;
        bestFirstPit = firstPit;
      }
      return;
    }
    const isAI = isAITurn;
    const storeIndex = isAI ? 11 : 5;
    const peeks = isAI ? aiPeeks : playerPeeks;
    const oppStoreIndex = isAI ? 5 : 11;
    const topMoves = isFirstMove ? getTopMoves(counts, true, aiPeeks, validPits) : getTopMoves(counts, isAI, peeks, null);
    if (topMoves.length === 0) {
      return;
    }
    for (const { pit } of topMoves) {
      const { score, lastPit } = scoreSow(counts, pit, isAI, peeks);
      const { counts: newCounts } = fastSow(counts, pit);
      let newAiPeeks = aiPeeks;
      let newPlayerPeeks = playerPeeks;
      if (lastPit === oppStoreIndex && peeks < 2) {
        if (isAI) newAiPeeks++;
        else newPlayerPeeks++;
      }
      const newAiKk = canKutakutaAI(newCounts);
      const newPlayerKk = canKutakutaPlayer(newCounts);
      const aiKkBonus = !prevAiKk && newAiKk ? 2 : 0;
      const playerKkBonus = !prevPlayerKk && newPlayerKk ? 2 : 0;
      const newAiScore = isAI ? aiScore + score + aiKkBonus : aiScore + aiKkBonus;
      const newPlayerScore = !isAI ? playerScore + score + playerKkBonus : playerScore + playerKkBonus;
      const fp = isFirstMove ? pit : firstPit;
      if (lastPit === storeIndex && chainDepth < 10) {
        dfs(
          depth,
          isAITurn,
          false,
          chainDepth + 1,
          newCounts,
          newAiPeeks,
          newPlayerPeeks,
          newAiScore,
          newPlayerScore,
          fp,
          newAiKk,
          newPlayerKk
        );
      } else {
        dfs(
          depth + 1,
          !isAITurn,
          false,
          0,
          newCounts,
          newAiPeeks,
          newPlayerPeeks,
          newAiScore,
          newPlayerScore,
          fp,
          newAiKk,
          newPlayerKk
        );
      }
    }
  }
  dfs(
    0,
    true,
    true,
    0,
    initCounts,
    peeksDoneAI,
    peeksDonePlayer,
    0,
    0,
    validPits[0],
    initAiKk,
    initPlayerKk
  );
  return validPits.includes(bestFirstPit) ? bestFirstPit : validPits[0];
}
function decidePlacementsKisinV1(stones, state, fortune, memo) {
  if (stones.length === 0) return [];
  const aiLanes = [10, 9, 8, 7, 6];
  const ownFortune = fortune?.opp?.color ?? null;
  const inferredPlayer = memo?.inferredPlayerColor ?? null;
  const avoidedPlayer = memo?.playerAvoidedColor ?? null;
  let knownNeg = null;
  const knownPos = [];
  for (const fc of fortune?.center ?? []) {
    if (fc.seenBy?.includes("opp")) {
      if (fc.bonus < 0) knownNeg = fc.color;
      else if (fc.bonus > 0) knownPos.push(fc.color);
    }
  }
  function stoneClass(stone) {
    const c = stone.color;
    if (knownNeg && c === knownNeg) return "neg";
    if (inferredPlayer && c === inferredPlayer) return "inferred";
    if (ownFortune && c === ownFortune) return "own";
    if (knownPos.includes(c)) return "pos";
    if (avoidedPlayer && c === avoidedPlayer) return "avoided";
    return "unknown";
  }
  function scoreForLane(stone, pit, currentCount) {
    const stepsToStore = 11 - pit;
    const cls = stoneClass(stone);
    if (cls === "neg") {
      if (pit === 10 && currentCount === 0) return -200;
      return stepsToStore * 8 + (currentCount > 0 ? 15 : -20);
    }
    if (cls === "avoided") {
      return stepsToStore * 3;
    }
    if (cls === "inferred" || cls === "own" || cls === "pos") {
      return (6 - stepsToStore) * 8;
    }
    return Math.random() * 0.1;
  }
  function guruCount(pit) {
    return (11 - pit + 12) % 12;
  }
  function chirachiraCount(pit) {
    return (5 - pit + 12) % 12;
  }
  function playerCanReach(counts2, targetPit) {
    for (let p = 0; p <= 4; p++) {
      const c = counts2[p];
      if (c === 0) continue;
      for (let i = 1; i <= c; i++) {
        if ((p + i) % 12 === targetPit) return true;
      }
      if ((p + c) % 12 === 5) {
        for (let p2 = 0; p2 <= 4; p2++) {
          const c2 = counts2[p2];
          if (c2 === 0) continue;
          for (let i = 1; i <= c2; i++) {
            if ((p2 + i) % 12 === targetPit) return true;
          }
        }
      }
    }
    return false;
  }
  const counts = state.pits.map((p) => p.stones.length);
  const pitAllocs = [];
  let toDistribute = stones.length;
  for (const pit of aiLanes) {
    if (toDistribute === 0) break;
    const cur = counts[pit];
    const gNeeded = guruCount(pit);
    const cNeeded = chirachiraCount(pit);
    const canReach = playerCanReach(counts, pit);
    let target;
    if (cur > gNeeded) {
      target = canReach ? cNeeded - 1 : cNeeded;
    } else {
      target = canReach ? gNeeded - 1 : gNeeded;
    }
    const toPlace = Math.min(Math.max(0, target - cur), toDistribute);
    if (toPlace > 0) {
      pitAllocs.push({ pit, count: toPlace });
      toDistribute -= toPlace;
    }
  }
  while (toDistribute > 0) {
    const fallbackPit = aiLanes.find((p) => counts[p] > 0) ?? aiLanes[0];
    const existing = pitAllocs.find((a) => a.pit === fallbackPit);
    if (existing) existing.count++;
    else pitAllocs.push({ pit: fallbackPit, count: 1 });
    toDistribute--;
  }
  const available = stones.map((_, i) => i);
  const result = [];
  for (const { pit, count } of pitAllocs) {
    for (let slot = 0; slot < count; slot++) {
      if (available.length === 0) break;
      const currentCount = counts[pit];
      let bestAvailIdx = 0;
      let bestScore = -Infinity;
      for (let ai = 0; ai < available.length; ai++) {
        const sc = scoreForLane(stones[available[ai]], pit, currentCount);
        if (sc > bestScore) {
          bestScore = sc;
          bestAvailIdx = ai;
        }
      }
      result.push({ pitIndex: pit, stoneIndex: available[bestAvailIdx] });
      available.splice(bestAvailIdx, 1);
      counts[pit]++;
    }
  }
  return result;
}
function optimizeSowOrderKisinV1(stones, targets, state, fortune, memo, opts = {}) {
  if (stones.length <= 1) return stones;
  const dynamicUnknownPenalty = opts.dynamicUnknownPenalty ?? false;
  const unknownPenaltyScale = opts.unknownPenaltyScale ?? 100;
  const ownFortune = fortune?.opp?.color ?? null;
  const inferredPlayer = memo?.inferredPlayerColor ?? null;
  const avoidedPlayer = memo?.playerAvoidedColor ?? null;
  let knownNeg = null;
  const knownPos = [];
  for (const fc of fortune?.center ?? []) {
    if (fc.seenBy?.includes("opp")) {
      if (fc.bonus < 0) knownNeg = fc.color;
      else if (fc.bonus > 0) knownPos.push(fc.color);
    }
  }
  const playerStoreColors = new Set(state.pits[5].stones.map((s) => s.color));
  function stoneClass(stone) {
    const c = stone.color;
    if (knownNeg && c === knownNeg) return "neg";
    if (inferredPlayer && c === inferredPlayer) return "inferred";
    if (ownFortune && c === ownFortune) return "own";
    if (knownPos.includes(c)) return "pos";
    if (avoidedPlayer && c === avoidedPlayer) return "avoided";
    return "unknown";
  }
  function scoreFor(stone, targetPit) {
    const cls = stoneClass(stone);
    if (targetPit === 11) {
      if (cls === "neg") return -200;
      if (cls === "inferred") return 100;
      if (cls === "own") return 80;
      if (cls === "pos") return 60;
      if (cls === "avoided") return -15;
      if (dynamicUnknownPenalty) {
        if (knownNeg) return 0;
        const knownCount = (ownFortune ? 1 : 0) + knownPos.length;
        const unknownCount = Math.max(1, 5 - knownCount);
        return Math.round(-(1 / unknownCount) * unknownPenaltyScale);
      }
      return 10 + Math.random() * 0.1;
    }
    if (targetPit === 5) {
      if (cls === "neg") return 90;
      if (cls === "pos") return 50;
      if (cls === "avoided") return 40;
      if (cls === "inferred") return -100;
      if (cls === "own") return -80;
      return (playerStoreColors.has(stone.color) ? -5 : 5) + Math.random() * 0.1;
    }
    if (targetPit >= 6 && targetPit <= 10) {
      const stepsToStore = 11 - targetPit;
      const currentCount = state.pits[targetPit].stones.length;
      if (cls === "neg") {
        if (targetPit === 10 && currentCount === 0) return -200;
        return stepsToStore * 8 + (currentCount > 0 ? 15 : -20);
      }
      if (cls === "avoided") {
        return stepsToStore * 3;
      }
      if (cls === "inferred" || cls === "own" || cls === "pos") {
        return (6 - stepsToStore) * 8;
      }
      return Math.random() * 0.1;
    }
    if (targetPit >= 0 && targetPit <= 4) {
      const stepsToOppStore = 5 - targetPit;
      const currentCount = state.pits[targetPit].stones.length;
      if (cls === "neg") {
        const aloneBonus = targetPit === 4 && currentCount === 0 ? 25 : 0;
        return (6 - stepsToOppStore) * 8 + aloneBonus;
      }
      if (cls === "avoided") {
        const aloneBonus = targetPit === 4 && currentCount === 0 ? 20 : 0;
        return (6 - stepsToOppStore) * 5 + aloneBonus;
      }
      if (cls === "inferred" || cls === "own" || cls === "pos") {
        return stepsToOppStore * 5;
      }
      return Math.random() * 0.1;
    }
    return 0;
  }
  function targetPriority(pit) {
    if (pit === 11) return 1e3;
    if (pit === 5) return 800;
    if (pit >= 6 && pit <= 10) return 400 + (11 - pit);
    if (pit >= 0 && pit <= 4) return 100 + (5 - pit);
    return 0;
  }
  const positions = targets.map((pit, pos) => ({ pit, pos }));
  positions.sort((a, b) => targetPriority(b.pit) - targetPriority(a.pit));
  const available = stones.map((s, i) => ({ s, i }));
  const result = new Array(stones.length);
  for (const { pit, pos } of positions) {
    if (available.length === 0) break;
    let bestIdx = 0;
    let bestScore = -Infinity;
    for (let ai = 0; ai < available.length; ai++) {
      const sc = scoreFor(available[ai].s, pit);
      if (sc > bestScore) {
        bestScore = sc;
        bestIdx = ai;
      }
    }
    result[pos] = available[bestIdx].s;
    available.splice(bestIdx, 1);
  }
  return result;
}
function pickPitTestKyubiV1(validPits, state, peeksDoneAI, peeksDonePlayer, fortune = null, params = {}, maxDepth = 3) {
  const p = {
    tkGuruguruScore: 2,
    tkChirachiraScore: 9,
    tkChirachiraOptScore: 4,
    tkChirachiraForce: 2,
    tkZakuzakuBase: 16,
    tkOppZakuzakuPenalty: 12,
    tkGuruguruBlockBonus: 8,
    tkTakeZakuzakuBias: 5,
    tkMagatamaBias: 5,
    tkMusubiGuruguruBias: 3,
    tkOppGuruguruPenalty: 5,
    tkOppChirachiraPenalty: 9,
    tkKutakutaBias: 2,
    tkChirachiraNegBonus: 8,
    tkOppChirachiraNegBonus: 8,
    ...params
  };
  const hasUnconfirmedNegForTK = fortune?.center?.some((fc) => fc.bonus < 0 && !fc.seenBy.includes("opp")) ?? false;
  const hasUnconfirmedNegForKisin = fortune?.center?.some(
    (fc) => fc.bonus < 0 && !fc.seenBy.includes("self")
  ) ?? false;
  const forceCount = Math.max(0, Math.round(p.tkChirachiraForce));
  const initCounts = state.pits.map((pt) => pt.stones.length);
  function fastSow(counts, pitIndex) {
    const nc = counts.slice();
    const n = nc[pitIndex];
    if (n === 0) return { counts: nc, lastPit: -1 };
    nc[pitIndex] = 0;
    let cur = pitIndex;
    for (let i = 0; i < n; i++) {
      cur = (cur + 1) % 12;
      nc[cur]++;
    }
    return { counts: nc, lastPit: cur };
  }
  function countSenteGuruguru(counts) {
    let n = 0;
    for (let pt = 0; pt <= 4; pt++) {
      if (counts[pt] > 0 && (pt + counts[pt]) % 12 === 5) n++;
    }
    return n;
  }
  function scoreTK(counts, pit, peeks) {
    const n = counts[pit];
    if (n === 0) return { score: -Infinity, lastPit: -1 };
    const lastPit = (pit + n) % 12;
    let score = 0;
    if (lastPit === 11) {
      score += p.tkGuruguruScore;
      if (pit === 8) score += p.tkMusubiGuruguruBias;
    }
    if (lastPit === 5) {
      score += peeks < forceCount ? p.tkChirachiraScore : p.tkChirachiraOptScore ?? 4;
      if (pit === 9) score += p.tkMagatamaBias;
      if (peeks === 1 && hasUnconfirmedNegForTK)
        score += p.tkChirachiraNegBonus;
    }
    if (lastPit >= 6 && lastPit <= 10 && counts[lastPit] === 0) {
      const mirror = lastPit - 6;
      if (counts[mirror] > 0) {
        score += p.tkZakuzakuBase + counts[mirror];
        if (pit === 10) score += p.tkTakeZakuzakuBias;
      }
    }
    return { score, lastPit };
  }
  function scoreOpp(counts, pit, peeks) {
    const n = counts[pit];
    if (n === 0) return { score: -Infinity, lastPit: -1 };
    const lastPit = (pit + n) % 12;
    let score = 0;
    if (lastPit === 5) score += p.tkOppGuruguruPenalty;
    if (lastPit === 11 && peeks < 2) {
      score += p.tkOppChirachiraPenalty;
      if (peeks === 1 && hasUnconfirmedNegForKisin)
        score += p.tkOppChirachiraNegBonus;
    }
    if (lastPit >= 0 && lastPit <= 4 && counts[lastPit] === 0) {
      const mirror = lastPit + 6;
      if (counts[mirror] > 0) score += p.tkOppZakuzakuPenalty + counts[mirror];
    }
    return { score, lastPit };
  }
  function canKutakutaAI(counts) {
    return counts[11] >= counts[5] - 6;
  }
  function canKutakutaPlayer(counts) {
    return counts[5] >= counts[11];
  }
  const initAiKk = canKutakutaAI(initCounts);
  const initPlayerKk = canKutakutaPlayer(initCounts);
  let bestFirstPit = validPits[0];
  let bestNet = -Infinity;
  function dfs(depth, isAITurn, isFirstMove, chainDepth, counts, aiPeeks, playerPeeks, aiScore, playerScore, firstPit, prevAiKk, prevPlayerKk) {
    if (depth === maxDepth) {
      const net = aiScore - playerScore;
      if (net > bestNet) {
        bestNet = net;
        bestFirstPit = firstPit;
      }
      return;
    }
    const storeIndex = isAITurn ? 11 : 5;
    const peeks = isAITurn ? aiPeeks : playerPeeks;
    const laneMin = isAITurn ? 6 : 0;
    const laneMax = isAITurn ? 10 : 4;
    let pool;
    if (isFirstMove) {
      pool = validPits.filter((pt) => counts[pt] > 0);
    } else {
      pool = [];
      for (let pt = laneMin; pt <= laneMax; pt++) {
        if (counts[pt] > 0) pool.push(pt);
      }
      if (!isAITurn) {
        pool.sort(
          (a, b) => scoreOpp(counts, b, peeks).score - scoreOpp(counts, a, peeks).score
        );
      }
    }
    if (pool.length === 0) return;
    for (const pit of pool) {
      const { score: moveScore, lastPit } = isAITurn ? scoreTK(counts, pit, peeks) : scoreOpp(counts, pit, peeks);
      if (moveScore === -Infinity || lastPit < 0) continue;
      const { counts: newCounts } = fastSow(counts, pit);
      let blockBonus = 0;
      if (isAITurn) {
        const before = countSenteGuruguru(counts);
        const after = countSenteGuruguru(newCounts);
        blockBonus = Math.max(0, before - after) * p.tkGuruguruBlockBonus;
      }
      const newAiKk = canKutakutaAI(newCounts);
      const newPlayerKk = canKutakutaPlayer(newCounts);
      const aiKkBonus = !prevAiKk && newAiKk ? p.tkKutakutaBias : 0;
      const playerKkBonus = !prevPlayerKk && newPlayerKk ? p.tkKutakutaBias : 0;
      let newAiPeeks = aiPeeks;
      let newPlayerPeeks = playerPeeks;
      if (isAITurn && lastPit === 5 && aiPeeks < forceCount) newAiPeeks++;
      else if (!isAITurn && lastPit === 11 && playerPeeks < 2) newPlayerPeeks++;
      const newAiScore = isAITurn ? aiScore + moveScore + blockBonus + aiKkBonus : aiScore + aiKkBonus;
      const newPlayerScore = !isAITurn ? playerScore + moveScore + playerKkBonus : playerScore + playerKkBonus;
      const fp = isFirstMove ? pit : firstPit;
      if (lastPit === storeIndex && chainDepth < 10) {
        dfs(
          depth,
          isAITurn,
          false,
          chainDepth + 1,
          newCounts,
          newAiPeeks,
          newPlayerPeeks,
          newAiScore,
          newPlayerScore,
          fp,
          newAiKk,
          newPlayerKk
        );
      } else {
        dfs(
          depth + 1,
          !isAITurn,
          false,
          0,
          newCounts,
          newAiPeeks,
          newPlayerPeeks,
          newAiScore,
          newPlayerScore,
          fp,
          newAiKk,
          newPlayerKk
        );
      }
    }
  }
  dfs(
    0,
    true,
    true,
    0,
    initCounts,
    peeksDoneAI,
    peeksDonePlayer,
    0,
    0,
    validPits[0],
    initAiKk,
    initPlayerKk
  );
  return validPits.includes(bestFirstPit) ? bestFirstPit : validPits[0];
}

// src/sim/SimRunnerTestKyubi.js
var MAX_TURNS = 300;
function _buildSowTargets(startPit, stoneCount) {
  const targets = [];
  let cursor = startPit;
  for (let i = 0; i < stoneCount; i++) {
    cursor = (cursor + 1) % 12;
    targets.push(cursor);
  }
  return targets;
}
function _invertState(state) {
  return {
    ...state,
    pits: [...state.pits.slice(6, 12), ...state.pits.slice(0, 6)]
  };
}
function _invertFortune(fortune) {
  return {
    center: (fortune.center ?? []).map((fc) => ({
      ...fc,
      seenBy: (fc.seenBy ?? []).map(
        (s) => s === "self" ? "opp" : s === "opp" ? "self" : s
      )
    })),
    opp: fortune.self,
    self: fortune.opp
  };
}
function _handleSpecialTestKyubi(gs, memoGote, p) {
  const state = gs.getState();
  const fortune = state.fortune;
  const peeksDone = gs.centerPeekProgress?.opp ?? 0;
  const canReveal = fortune.center.some((fc) => !fc.seenBy.includes("opp"));
  if (canReveal) {
    gs.revealNextCenterForPlayer("opp");
    return true;
  }
  const pit5stones = state.pits[5].stones;
  if (pit5stones.length === 0) return true;
  const ownFortune = fortune.opp?.color ?? null;
  const knownNegColor = (() => {
    const neg = fortune.center.find(
      (fc) => fc.bonus < 0 && fc.seenBy.includes("opp")
    );
    return neg?.color ?? null;
  })();
  const knownPosColors = fortune.center.filter((fc) => fc.bonus > 0 && fc.seenBy.includes("opp")).map((fc) => fc.color);
  const inferred = memoGote?.inferredPlayerColor ?? null;
  let selectedIndex = 0;
  let highestValue = -Infinity;
  pit5stones.forEach((stone, index) => {
    let val = 0;
    if (ownFortune && stone.color === ownFortune) val = p.tkPoipoiOwnFortune;
    else if (inferred && stone.color === inferred) val = p.tkPoipoiInferred;
    else if (knownPosColors.includes(stone.color)) val = p.tkPoipoiKnownPos;
    if (knownNegColor && stone.color === knownNegColor) val = -99;
    if (val > highestValue) {
      highestValue = val;
      selectedIndex = index;
    }
  });
  if (highestValue > 0) {
    gs.removeStoneFromPit(5, selectedIndex);
  }
  return true;
}
function _applyKutakuta(gs, player) {
  const laneIndexes = player === "self" ? [0, 1, 2, 3, 4] : [6, 7, 8, 9, 10];
  const storeIndex = player === "self" ? 5 : 11;
  const state = gs.getState();
  for (const idx of laneIndexes) {
    const stones = [...state.pits[idx].stones];
    state.pits[idx].stones = [];
    for (const s of stones) {
      state.pits[storeIndex].stones.push(s);
    }
  }
}
function runGameTestKyubiVsKisin(tkParams = DEFAULT_TEST_KYUBI_PARAMS, tkRole = "opp", kisinDepth = 3) {
  const gs = new GameState();
  const p = { ...DEFAULT_TEST_KYUBI_PARAMS, ...tkParams };
  const memoSente = createMemoV1();
  const memoGote = createMemoV1();
  let selfTurn = true;
  let turn = 0;
  while (!gs.isGameOver() && turn < MAX_TURNS) {
    turn++;
    const state = gs.getState();
    const fortune = state.fortune;
    if (gs.checkSennitte() >= 2) {
      return { tkScore: 0, kisinScore: 0, winner: "draw", turns: turn };
    }
    if (selfTurn) {
      const validPits = [0, 1, 2, 3, 4].filter(
        (i) => state.pits[i].stones.length > 0
      );
      if (validPits.length === 0) {
        selfTurn = false;
        continue;
      }
      const selfPeeks = gs.centerPeekProgress?.self ?? 0;
      const oppPeeks = gs.centerPeekProgress?.opp ?? 0;
      const senteSeen = fortune.center.filter((fc) => fc.seenBy.includes("self")).map((fc) => fc.color);
      updateMemoV1(memoSente, _invertState(state), senteSeen);
      let chosen;
      if (tkRole === "self") {
        const invState = _invertState(state);
        const invValidPits = validPits.map((pt) => pt + 6);
        const invChosen = pickPitTestKyubiV1(
          invValidPits,
          invState,
          selfPeeks,
          oppPeeks,
          _invertFortune(fortune),
          p,
          4
        );
        chosen = invChosen - 6;
      } else {
        const invState = _invertState(state);
        const invFortune = _invertFortune(fortune);
        const invPits = validPits.map((pt) => pt + 6);
        const invChosen = pickPitKisinV1(
          invPits,
          invState,
          selfPeeks,
          oppPeeks,
          invFortune,
          kisinDepth
        );
        chosen = invChosen - 6;
        const invS = _invertState(state);
        const invF = _invertFortune(fortune);
        const tgts = _buildSowTargets(chosen, state.pits[chosen].stones.length);
        state.pits[chosen].stones = optimizeSowOrderKisinV1(
          state.pits[chosen].stones,
          tgts.map((t) => (t + 6) % 12),
          invS,
          invF,
          memoSente
        );
      }
      if (chosen < 0 || chosen > 4) {
        selfTurn = false;
        continue;
      }
      const sowResult = gs.sow(chosen);
      if (!sowResult) {
        selfTurn = false;
        continue;
      }
      const lastPit = sowResult.lastPit;
      const capturedSente = gs.checkCaptureForPlayer("self", lastPit);
      if (capturedSente.length > 0) {
        gs.startPlacement(capturedSente);
        if (tkRole === "self") {
          while (gs.isPlacementActive()) {
            const st = gs.getState();
            const invSt = _invertState(st);
            const chirachiraSetup = [0, 1, 2, 3, 4].filter((q) => {
              const nc = invSt.pits[q + 6].stones.length + 1;
              return (q + 6 + nc) % 12 === 5;
            });
            if (chirachiraSetup.length > 0) {
              chirachiraSetup.sort((a, b) => b - a);
              gs.placePendingStone(chirachiraSetup[0], 0);
              continue;
            }
            const guruSetup = [0, 1, 2, 3, 4].filter((q) => {
              const nc = invSt.pits[q + 6].stones.length + 1;
              return (q + 6 + nc) % 12 === 11;
            });
            if (guruSetup.length > 0) {
              guruSetup.sort((a, b) => b - a);
              gs.placePendingStone(guruSetup[0], 0);
              continue;
            }
            const sortedSente = [0, 1, 2, 3, 4].slice().sort(
              (a, b) => gs.getState().pits[b].stones.length - gs.getState().pits[a].stones.length
            );
            if (sortedSente[0] !== void 0) {
              gs.placePendingStone(sortedSente[0], 0);
              continue;
            }
            const pending = gs.getPendingPlacement();
            const invF = _invertFortune(fortune);
            const placements = decidePlacementsKisinV1(
              pending,
              invSt,
              invF,
              memoSente
            );
            gs.placePendingStone(
              placements.length > 0 ? placements[0].pitIndex - 6 : 0,
              placements.length > 0 ? placements[0].stoneIndex : 0
            );
          }
        } else {
          const invState2 = _invertState(gs.getState());
          const invFortune2 = _invertFortune(gs.getState().fortune);
          const placements = decidePlacementsKisinV1(
            capturedSente,
            invState2,
            invFortune2,
            memoSente
          );
          for (const { pitIndex } of placements) {
            if (!gs.isPlacementActive()) break;
            gs.placePendingStone(pitIndex - 6, 0);
          }
          while (gs.isPlacementActive()) gs.placePendingStone(0, 0);
        }
      }
      if (lastPit === 5) continue;
      if (lastPit === 11) {
        if (tkRole === "self") {
          const canReveal = gs.getState().fortune.center.some((fc) => !fc.seenBy.includes("self"));
          if (canReveal) {
            gs.revealNextCenterForPlayer("self");
          } else {
            const pit11stones = gs.getState().pits[11].stones;
            if (pit11stones.length > 0) {
              const ownFortune = gs.getState().fortune.self?.color ?? null;
              const inferred = memoSente?.inferredPlayerColor ?? null;
              let sel = 0;
              let best = -Infinity;
              pit11stones.forEach((stone, idx) => {
                let val = 0;
                if (ownFortune && stone.color === ownFortune)
                  val = p.tkPoipoiOwnFortune;
                else if (inferred && stone.color === inferred)
                  val = p.tkPoipoiInferred;
                if (val > best) {
                  best = val;
                  sel = idx;
                }
              });
              if (best > 0) gs.removeStoneFromPit(11, sel);
            }
          }
        } else {
          const canRevealKisin = gs.getState().fortune.center.some((fc) => !fc.seenBy.includes("self"));
          if (canRevealKisin) {
            gs.revealNextCenterForPlayer("self");
          } else {
            const pit11stones = gs.getState().pits[11].stones;
            if (pit11stones.length > 0) {
              gs.removeStoneFromPit(11, 0);
            }
          }
        }
      }
      if (gs.canActivateKutakuta("self")) {
        const s = gs.getState().pits[5].stones.length;
        const o = gs.getState().pits[11].stones.length;
        if (s >= o + p.tkKutakutaBias) _applyKutakuta(gs, "self");
      }
      selfTurn = false;
    } else {
      const validPits = [6, 7, 8, 9, 10].filter(
        (i) => state.pits[i].stones.length > 0
      );
      if (validPits.length === 0) {
        selfTurn = true;
        continue;
      }
      const selfPeeks = gs.centerPeekProgress?.self ?? 0;
      const oppPeeks = gs.centerPeekProgress?.opp ?? 0;
      const goteSeen = fortune.center.filter((fc) => fc.seenBy.includes("opp")).map((fc) => fc.color);
      updateMemoV1(memoGote, state, goteSeen);
      let chosen;
      if (tkRole === "opp") {
        chosen = pickPitTestKyubiV1(
          validPits,
          state,
          oppPeeks,
          selfPeeks,
          fortune,
          p,
          4
        );
      } else {
        chosen = pickPitKisinV1(
          validPits,
          state,
          oppPeeks,
          selfPeeks,
          fortune,
          kisinDepth
        );
        const tgts = _buildSowTargets(chosen, state.pits[chosen].stones.length);
        state.pits[chosen].stones = optimizeSowOrderKisinV1(
          state.pits[chosen].stones,
          tgts,
          state,
          fortune,
          memoGote
        );
      }
      if (chosen < 6 || chosen > 10) {
        selfTurn = true;
        continue;
      }
      const pitData = state.pits[chosen];
      if (!pitData || pitData.stones.length === 0) {
        selfTurn = true;
        continue;
      }
      const stones = [...pitData.stones];
      pitData.stones = [];
      let cursor = chosen;
      for (const s of stones) {
        cursor = (cursor + 1) % 12;
        gs.getState().pits[cursor].stones.push(s);
      }
      const lastPit = cursor;
      const capturedGote = gs.checkCaptureForPlayer("opp", lastPit);
      if (capturedGote.length > 0) {
        gs.startPlacement(capturedGote);
        if (tkRole === "opp") {
          while (gs.isPlacementActive()) {
            const st = gs.getState();
            const chirachiraSetup = [6, 7, 8, 9, 10].filter((q) => {
              const nc = st.pits[q].stones.length + 1;
              return (q + nc) % 12 === 5;
            });
            if (chirachiraSetup.length > 0) {
              chirachiraSetup.sort((a, b) => b - a);
              gs.placePendingStone(chirachiraSetup[0], 0);
              continue;
            }
            const guruSetup = [6, 7, 8, 9, 10].filter((q) => {
              const nc = st.pits[q].stones.length + 1;
              return (q + nc) % 12 === 11;
            });
            if (guruSetup.length > 0) {
              guruSetup.sort((a, b) => b - a);
              gs.placePendingStone(guruSetup[0], 0);
              continue;
            }
            const sortedByCount = [6, 7, 8, 9, 10].slice().sort(
              (a, b) => gs.getState().pits[b].stones.length - gs.getState().pits[a].stones.length
            );
            const denseLane = sortedByCount[0];
            if (denseLane !== void 0) {
              gs.placePendingStone(denseLane, 0);
              continue;
            }
            const pending = gs.getPendingPlacement();
            const placements = decidePlacementsKisinV1(
              pending,
              st,
              fortune,
              memoGote
            );
            gs.placePendingStone(
              placements.length > 0 ? placements[0].pitIndex : 6,
              placements.length > 0 ? placements[0].stoneIndex : 0
            );
          }
        } else {
          const placements = decidePlacementsKisinV1(
            capturedGote,
            gs.getState(),
            fortune,
            memoGote
          );
          for (const { pitIndex } of placements) {
            if (!gs.isPlacementActive()) break;
            gs.placePendingStone(pitIndex, 0);
          }
          while (gs.isPlacementActive()) gs.placePendingStone(6, 0);
        }
      }
      if (lastPit === 11) continue;
      if (lastPit === 5) {
        if (tkRole === "opp") {
          _handleSpecialTestKyubi(gs, memoGote, p);
        } else {
          const canRevealKisin = gs.getState().fortune.center.some((fc) => !fc.seenBy.includes("opp"));
          if (canRevealKisin) {
            gs.revealNextCenterForPlayer("opp");
          } else {
            const pit5stones = gs.getState().pits[5].stones;
            if (pit5stones.length > 0) gs.removeStoneFromPit(5, 0);
          }
        }
      }
      if (gs.canActivateKutakuta("opp")) {
        const s = gs.getState().pits[5].stones.length;
        const o = gs.getState().pits[11].stones.length;
        if (o >= s + p.tkKutakutaBias) _applyKutakuta(gs, "opp");
      }
      selfTurn = true;
    }
  }
  const selfScore = gs.calcScore("self");
  const oppScore = gs.calcScore("opp");
  const tkScore = tkRole === "self" ? selfScore : oppScore;
  const kisinScore = tkRole === "self" ? oppScore : selfScore;
  return {
    tkScore,
    kisinScore,
    winner: tkScore > kisinScore ? "tk" : tkScore < kisinScore ? "kisin" : "draw",
    turns: turn
  };
}
function runManyTestKyubiVsKisin(tkParams = DEFAULT_TEST_KYUBI_PARAMS, n = 500, kisinDepth = 3) {
  let tkWins = 0, kisinWins = 0, draws = 0;
  let totalTkScore = 0, totalKisinScore = 0;
  const half = Math.floor(n / 2);
  for (let i = 0; i < half; i++) {
    const r = runGameTestKyubiVsKisin(tkParams, "opp", kisinDepth);
    if (r.winner === "tk") tkWins++;
    else if (r.winner === "kisin") kisinWins++;
    else draws++;
    totalTkScore += r.tkScore;
    totalKisinScore += r.kisinScore;
  }
  for (let i = 0; i < n - half; i++) {
    const r = runGameTestKyubiVsKisin(tkParams, "self", kisinDepth);
    if (r.winner === "tk") tkWins++;
    else if (r.winner === "kisin") kisinWins++;
    else draws++;
    totalTkScore += r.tkScore;
    totalKisinScore += r.kisinScore;
  }
  return {
    tkWins,
    kisinWins,
    draws,
    tkWinPct: parseFloat((tkWins / n * 100).toFixed(2)),
    kisinWinPct: parseFloat((kisinWins / n * 100).toFixed(2)),
    drawPct: parseFloat((draws / n * 100).toFixed(2)),
    avgTkScore: parseFloat((totalTkScore / n).toFixed(2)),
    avgKisinScore: parseFloat((totalKisinScore / n).toFixed(2)),
    n
  };
}

// tools/optim_testKyubi.js
var import_fs = require("fs");
var N_EVAL = 400;
var N_VERIFY = 1500;
var MAX_SWEEPS = 10;
var MAX_EXTEND = 6;
var KISIN_DEPTH = 3;
var STEPS = {
  tkGuruguruScore: 1,
  tkChirachiraScore: 1,
  tkChirachiraOptScore: 1,
  tkChirachiraForce: 1,
  tkZakuzakuBase: 1,
  tkOppZakuzakuPenalty: 1,
  tkGuruguruBlockBonus: 2,
  tkOppGuruguruPenalty: 1,
  tkOppChirachiraPenalty: 1,
  tkChirachiraNegBonus: 2,
  tkOppChirachiraNegBonus: 2,
  tkTakeZakuzakuBias: 2,
  tkMagatamaBias: 2,
  tkMusubiGuruguruBias: 1,
  tkChirachiraSetupBias: 1,
  tkZakuzakuStoneBias: 1,
  tkPoipoiOwnFortune: 5,
  tkPoipoiInferred: 5,
  tkPoipoiKnownPos: 5,
  tkKutakutaBias: 1
};
var PARAM_KEYS = Object.keys(STEPS);
var MINS = {
  tkGuruguruScore: 0,
  tkChirachiraScore: 0,
  tkChirachiraOptScore: 0,
  tkChirachiraForce: 0,
  tkZakuzakuBase: 0,
  tkOppZakuzakuPenalty: 0,
  tkGuruguruBlockBonus: 0,
  tkOppGuruguruPenalty: 0,
  tkOppChirachiraPenalty: 0,
  tkChirachiraNegBonus: 0,
  tkOppChirachiraNegBonus: 0,
  tkTakeZakuzakuBias: 0,
  tkMagatamaBias: 0,
  tkMusubiGuruguruBias: 0,
  tkChirachiraSetupBias: 0,
  tkZakuzakuStoneBias: 0,
  tkPoipoiOwnFortune: 0,
  tkPoipoiInferred: 0,
  tkPoipoiKnownPos: 0,
  tkKutakutaBias: -5
};
var fix = (v) => parseFloat(v.toFixed(4));
var tkRate = (r) => r.tkWinPct;
function sep(title) {
  console.log("\n" + "=".repeat(62) + "\n  " + title + "\n" + "=".repeat(62));
}
function lineSearch(key, current, curScore) {
  const step = STEPS[key];
  const cur = current[key];
  const evalFn = (params) => tkRate(runManyTestKyubiVsKisin(params, N_EVAL, KISIN_DEPTH));
  const vp = Math.max(MINS[key] ?? 0, fix(cur + step));
  const vm = Math.max(MINS[key] ?? 0, fix(cur - step));
  const sp = evalFn({ ...current, [key]: vp });
  const sm = evalFn({ ...current, [key]: vm });
  let best = curScore;
  let bestVal = cur;
  if (sp > best) {
    best = sp;
    bestVal = vp;
  }
  if (sm > best) {
    best = sm;
    bestVal = vm;
  }
  if (bestVal !== cur) {
    const dir = bestVal > cur ? 1 : -1;
    let v = bestVal;
    for (let ext = 0; ext < MAX_EXTEND; ext++) {
      const vNext = Math.max(MINS[key] ?? 0, fix(v + dir * step));
      if (vNext === v) break;
      const s = evalFn({ ...current, [key]: vNext });
      if (s > best) {
        best = s;
        v = vNext;
      } else break;
    }
    bestVal = v;
  }
  return { bestVal: fix(bestVal), bestScore: best };
}
function main() {
  (0, import_fs.mkdirSync)("dist-sim", { recursive: true });
  let current = { ...DEFAULT_TEST_KYUBI_PARAMS };
  let curScore = tkRate(runManyTestKyubiVsKisin(current, N_EVAL, KISIN_DEPTH));
  sep(`\u521D\u671F\u8A55\u4FA1: tkWinPct = ${curScore.toFixed(2)}%`);
  console.log("\u521D\u671F\u30D1\u30E9\u30E1\u30FC\u30BF:", JSON.stringify(current, null, 2));
  for (let sweep = 1; sweep <= MAX_SWEEPS; sweep++) {
    sep(`\u30B9\u30A4\u30FC\u30D7 ${sweep} / ${MAX_SWEEPS}`);
    let improved = false;
    for (const key of PARAM_KEYS) {
      const { bestVal, bestScore } = lineSearch(key, current, curScore);
      if (bestVal !== current[key]) {
        console.log(
          `  ${key}: ${current[key]} \u2192 ${bestVal}  (+${(bestScore - curScore).toFixed(2)}%)`
        );
        current = { ...current, [key]: bestVal };
        curScore = bestScore;
        improved = true;
      }
    }
    console.log(`
\u30B9\u30A4\u30FC\u30D7 ${sweep} \u5B8C\u4E86: tkWinPct = ${curScore.toFixed(2)}%`);
    console.log("\u73FE\u5728\u306E\u30D9\u30B9\u30C8:", JSON.stringify(current, null, 2));
    (0, import_fs.writeFileSync)(
      "dist-sim/testkyubi_best.json",
      JSON.stringify({ sweep, tkWinPct: curScore, params: current }, null, 2)
    );
    if (!improved) {
      console.log("\u53CE\u675F: \u6539\u5584\u306A\u3057 \u2192 \u7D42\u4E86");
      break;
    }
  }
  sep(`\u6700\u7D42\u691C\u8A3C (N=${N_VERIFY})`);
  const final = runManyTestKyubiVsKisin(current, N_VERIFY, KISIN_DEPTH);
  console.log(`\u6700\u7D42 tkWinPct: ${final.tkWinPct}%`);
  console.log(`\u6700\u7D42 kisinWinPct: ${final.kisinWinPct}%`);
  console.log(
    `\u6700\u7D42 avgScore: tk=${final.avgTkScore}, kisin=${final.avgKisinScore}`
  );
  console.log("\n\u6700\u7D42\u30D1\u30E9\u30E1\u30FC\u30BF:");
  console.log(JSON.stringify(current, null, 2));
  (0, import_fs.writeFileSync)(
    "dist-sim/testkyubi_best.json",
    JSON.stringify(
      {
        sweep: "final",
        tkWinPct: final.tkWinPct,
        kisinWinPct: final.kisinWinPct,
        avgTkScore: final.avgTkScore,
        avgKisinScore: final.avgKisinScore,
        params: current
      },
      null,
      2
    )
  );
  console.log("\n\u2713 dist-sim/testkyubi_best.json \u306B\u4FDD\u5B58\u3057\u307E\u3057\u305F");
}
main();
