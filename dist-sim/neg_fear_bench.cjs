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

// src/sim/SimAI.js
function createMemo() {
  return {
    playerColorFreq: {},
    inferredPlayerColor: null,
    playerAvoidedColor: null
  };
}
function updateMemo(memo, state, excludeColors = []) {
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
function knownNegativeColor(fortune, role = "opp") {
  for (const fc of fortune.center) {
    if (fc.bonus < 0 && fc.seenBy.includes(role)) return fc.color;
  }
  return null;
}
function knownPositiveColors(fortune, role = "opp") {
  return fortune.center.filter((fc) => fc.bonus > 0 && fc.seenBy.includes(role)).map((fc) => fc.color);
}
function decideSpecialAction(state, memo, fortune, peeksDone, isOni = true, role = "opp", params = null) {
  const p = params || {};
  const oppStoreIndex = role === "opp" ? 5 : 11;
  if (peeksDone >= 3) {
    return _resolvePoipoi(state, memo, fortune, role, p);
  }
  const ownLaneMin = role === "opp" ? 6 : 0;
  const ownLaneMax = role === "opp" ? 10 : 4;
  const selfLaneStones = state.pits.slice(ownLaneMin, ownLaneMax + 1).reduce((sum, pit) => sum + pit.stones.length, 0);
  const laneRich = selfLaneStones >= (p.forceChirachiraMinLane ?? 3);
  if (isOni && laneRich && peeksDone < (p.forceChirachiraThreshold ?? 2)) {
    return { action: "chirachira" };
  }
  const inferred = memo.inferredPlayerColor;
  const playerHasInferred = inferred && state.pits[oppStoreIndex].stones.some((s) => s.color === inferred);
  const poipoiValue = playerHasInferred ? p.poipoiWithFortune ?? 20 : state.pits[oppStoreIndex].stones.length >= 2 ? p.poipoiGeneral ?? 8 : 0;
  const chirachiraRemaining = 3 - peeksDone;
  const chirachiraValue = isOni ? chirachiraRemaining >= 2 ? p.chirachiraThresholdHigh ?? 10 : p.chirachiraThresholdLow ?? 4 : chirachiraRemaining >= 2 ? 12 : 6;
  if (poipoiValue > chirachiraValue) {
    return _resolvePoipoi(state, memo, fortune, role, p);
  }
  return { action: "chirachira" };
}
function _resolvePoipoi(state, memo, fortune, role = "opp", params = {}) {
  const oppStoreIndex = role === "opp" ? 5 : 11;
  const ownStoreIndex = role === "opp" ? 11 : 5;
  const inferred = memo.inferredPlayerColor;
  const ownFortune = role === "opp" ? fortune.opp.color : fortune.self.color;
  const knownNeg = knownNegativeColor(fortune, role);
  const knownPos = knownPositiveColors(fortune, role);
  const vOwnFortune = params.poipoiStoneOwnFortune ?? 30;
  const vInferred = params.poipoiStoneInferred ?? 22;
  const vKnownPos = params.poipoiStoneKnownPos ?? 4;
  let bestOppIdx = -1;
  let bestOppVal = 0;
  state.pits[oppStoreIndex].stones.forEach((stone, index) => {
    let val = 1;
    if (ownFortune && stone.color === ownFortune) val = vOwnFortune;
    else if (inferred && stone.color === inferred) val = vInferred;
    else if (knownPos.includes(stone.color)) val = vKnownPos;
    if (knownNeg && stone.color === knownNeg) val = -99;
    if (val > bestOppVal) {
      bestOppVal = val;
      bestOppIdx = index;
    }
  });
  let bestOwnIdx = -1;
  let bestOwnVal = 0;
  state.pits[ownStoreIndex].stones.forEach((stone, index) => {
    let val = 0;
    if (knownNeg && stone.color === knownNeg) val = 40;
    if (ownFortune && stone.color === ownFortune) val = -99;
    if (knownPos.includes(stone.color)) val = -99;
    if (val > bestOwnVal) {
      bestOwnVal = val;
      bestOwnIdx = index;
    }
  });
  if (bestOwnIdx >= 0 && bestOwnVal > bestOppVal) {
    return {
      action: "poipoi",
      removePitIndex: ownStoreIndex,
      removeStoneIndex: bestOwnIdx
    };
  }
  if (bestOppIdx < 0) return { action: "none" };
  return {
    action: "poipoi",
    removePitIndex: oppStoreIndex,
    removeStoneIndex: bestOppIdx
  };
}
function pickPitV3(validPits, state, peeksDoneAI, peeksDonePlayer, fortune, maxDepth = 5) {
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
function decidePlacementsV3(stones, state, fortune, memo) {
  if (stones.length === 0) return [];
  const aiLanes = [10, 9, 8, 7, 6];
  const ownFortune = fortune?.opp?.color ?? null;
  const inferredPlayer = memo?.inferredPlayerColor ?? null;
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
    return "unknown";
  }
  function scoreForLane(stone, pit, currentCount) {
    const stepsToStore = 11 - pit;
    const cls = stoneClass(stone);
    if (cls === "neg") {
      if (pit === 10 && currentCount === 0) return -200;
      return stepsToStore * 8 + (currentCount > 0 ? 15 : -20);
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
  const result2 = [];
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
      result2.push({ pitIndex: pit, stoneIndex: available[bestAvailIdx] });
      available.splice(bestAvailIdx, 1);
      counts[pit]++;
    }
  }
  return result2;
}
function optimizeSowOrderV3(stones, targets, state, fortune, memo, opts = {}) {
  if (stones.length <= 1) return stones;
  const dynamicUnknownPenalty = opts.dynamicUnknownPenalty ?? false;
  const ownFortune = fortune?.opp?.color ?? null;
  const inferredPlayer = memo?.inferredPlayerColor ?? null;
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
    return "unknown";
  }
  function scoreFor(stone, targetPit) {
    const cls = stoneClass(stone);
    if (targetPit === 11) {
      if (cls === "neg") return -200;
      if (cls === "inferred") return 100;
      if (cls === "own") return 80;
      if (cls === "pos") return 60;
      if (dynamicUnknownPenalty) {
        if (knownNeg) return 0;
        const knownCount = (ownFortune ? 1 : 0) + knownPos.length;
        const unknownCount = Math.max(1, 5 - knownCount);
        return Math.round(-(1 / unknownCount) * 100);
      }
      return 10 + Math.random() * 0.1;
    }
    if (targetPit === 5) {
      if (cls === "neg") return 90;
      if (cls === "pos") return 50;
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
  const result2 = new Array(stones.length);
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
    result2[pos] = available[bestIdx].s;
    available.splice(bestIdx, 1);
  }
  return result2;
}

// src/sim/SimRunnerRobo.js
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
function runGameOniVsOni(depthSente, depthGote, senteOpts = {}, goteOpts = {}) {
  const gs = new GameState();
  const memoSente = createMemo();
  const memoGote = createMemo();
  let selfTurn = true;
  let turn = 0;
  while (!gs.isGameOver() && turn < MAX_TURNS) {
    turn++;
    const state = gs.getState();
    const fortune = state.fortune;
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
      updateMemo(memoSente, _invertState(state), senteSeen);
      const invState = _invertState(state);
      const invFortune = _invertFortune(fortune);
      const invPits = validPits.map((p) => p + 6);
      const invChosen = pickPitV3(
        invPits,
        invState,
        selfPeeks,
        oppPeeks,
        invFortune,
        depthSente
      );
      const chosen = invChosen - 6;
      if (chosen < 0 || chosen > 4) {
        selfTurn = false;
        continue;
      }
      {
        const _tgts = _buildSowTargets(
          chosen,
          state.pits[chosen].stones.length
        );
        state.pits[chosen].stones = optimizeSowOrderV3(
          state.pits[chosen].stones,
          _tgts.map((t) => (t + 6) % 12),
          invState,
          invFortune,
          memoSente,
          senteOpts
        );
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
        while (gs.isPlacementActive()) {
          gs.placePendingStone(Math.floor(Math.random() * 5), 0);
        }
      }
      if (lastPit === 5) continue;
      if (lastPit === 11) {
        const specialAction = decideSpecialAction(
          gs.getState(),
          memoSente,
          fortune,
          selfPeeks,
          true,
          "self",
          DEFAULT_PARAMS
        );
        if (specialAction.action === "chirachira")
          gs.revealNextCenterForPlayer("self");
        else if (specialAction.action === "poipoi")
          gs.removeStoneFromPit(
            specialAction.removePitIndex,
            specialAction.removeStoneIndex
          );
      }
      if (gs.canActivateKutakuta("self")) {
        const s = gs.getState().pits[5].stones.length;
        const o = gs.getState().pits[11].stones.length;
        if (s > o + (DEFAULT_PARAMS.kutakutaThresholdOffset ?? -6))
          _applyKutakuta(gs, "self");
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
      updateMemo(memoGote, state, goteSeen);
      const chosen = pickPitV3(
        validPits,
        state,
        oppPeeks,
        selfPeeks,
        fortune,
        depthGote
      );
      if (chosen < 6 || chosen > 10) {
        selfTurn = true;
        continue;
      }
      const pitData = state.pits[chosen];
      if (!pitData || pitData.stones.length === 0) {
        selfTurn = true;
        continue;
      }
      const stones = optimizeSowOrderV3(
        [...pitData.stones],
        _buildSowTargets(chosen, pitData.stones.length),
        state,
        fortune,
        memoGote,
        goteOpts
      );
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
        const placements = decidePlacementsV3(
          capturedGote,
          gs.getState(),
          fortune,
          memoGote
        );
        for (const { pitIndex } of placements) {
          if (!gs.isPlacementActive()) break;
          gs.placePendingStone(pitIndex, 0);
        }
        while (gs.isPlacementActive())
          gs.placePendingStone(6 + Math.floor(Math.random() * 5), 0);
      }
      if (lastPit === 11) continue;
      if (lastPit === 5) {
        const specialAction = decideSpecialAction(
          gs.getState(),
          memoGote,
          fortune,
          oppPeeks,
          true,
          "opp",
          DEFAULT_PARAMS
        );
        if (specialAction.action === "chirachira")
          gs.revealNextCenterForPlayer("opp");
        else if (specialAction.action === "poipoi")
          gs.removeStoneFromPit(
            specialAction.removePitIndex,
            specialAction.removeStoneIndex
          );
      }
      if (gs.canActivateKutakuta("opp")) {
        const s = gs.getState().pits[5].stones.length;
        const o = gs.getState().pits[11].stones.length;
        if (o > s + (DEFAULT_PARAMS.kutakutaThresholdOffset ?? -6))
          _applyKutakuta(gs, "opp");
      }
      selfTurn = true;
    }
  }
  const senteScore = gs.calcScore("self");
  const goteScore = gs.calcScore("opp");
  return {
    senteScore,
    goteScore,
    winner: senteScore > goteScore ? "sente" : senteScore < goteScore ? "gote" : "draw"
  };
}
function runManyOniVsOni(depthA, depthB, n = 1e3, optsA = {}, optsB = {}) {
  let aWins = 0, bWins = 0, draws = 0;
  const half = Math.floor(n / 2);
  for (let i = 0; i < half; i++) {
    const r = runGameOniVsOni(depthA, depthB, optsA, optsB);
    if (r.winner === "sente") aWins++;
    else if (r.winner === "gote") bWins++;
    else draws++;
  }
  for (let i = 0; i < n - half; i++) {
    const r = runGameOniVsOni(depthB, depthA, optsB, optsA);
    if (r.winner === "sente") bWins++;
    else if (r.winner === "gote") aWins++;
    else draws++;
  }
  return {
    depthAWins: aWins,
    depthBWins: bWins,
    draws,
    depthAWinPct: aWins / n * 100,
    depthBWinPct: bWins / n * 100
  };
}

// tools/neg_fear_bench.js
var N = 500;
var DEPTH = 3;
var NEW_OPTS = { dynamicUnknownPenalty: true };
var OLD_OPTS = {};
console.log("=".repeat(60));
console.log(
  "  \u52D5\u7684\u30DE\u30A4\u30CA\u30B9\u6050\u6016 vs \u73FE\u9B3C  (" + N + " games, depth=" + DEPTH + ")"
);
console.log("=".repeat(60));
var result = runManyOniVsOni(DEPTH, DEPTH, N, NEW_OPTS, OLD_OPTS);
var newPct = result.depthAWinPct.toFixed(1);
var oldPct = result.depthBWinPct.toFixed(1);
var drawPct = (100 - result.depthAWinPct - result.depthBWinPct).toFixed(1);
console.log("");
console.log("  \u65B0AI\uFF08\u52D5\u7684\u6050\u6016\uFF09: " + result.depthAWins + "\u52DD  " + newPct + "%");
console.log("  \u73FE\u9B3C\uFF08\u56FA\u5B9A+10\uFF09: " + result.depthBWins + "\u52DD  " + oldPct + "%");
console.log("  \u5F15\u5206:             " + result.draws + "  " + drawPct + "%");
console.log("");
if (result.depthAWinPct > result.depthBWinPct + 3) {
  console.log("  \u2192 \u65B0AI\u304C\u6709\u610F\u306B\u5F37\u3044\u3002\u30B2\u30FC\u30E0\u306B\u3082\u5C0E\u5165\u3092\u63A8\u5968\u3002");
} else if (result.depthBWinPct > result.depthAWinPct + 3) {
  console.log("  \u2192 \u73FE\u9B3C\u306E\u65B9\u304C\u5F37\u3044\u3002\u30DA\u30CA\u30EB\u30C6\u30A3\u5024\u3092\u518D\u8ABF\u6574\u304C\u5FC5\u8981\u3002");
} else {
  console.log("  \u2192 \u5DEE\u306A\u3057\uFF08\xB13%\u4EE5\u5185\uFF09\u3002\u8FFD\u52A0\u3067 large N \u30C6\u30B9\u30C8\u63A8\u5968\u3002");
}
