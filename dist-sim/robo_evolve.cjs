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
var DEFAULT_ROBO_PARAMS = {
  roboGuruguruScore: 11,
  // ぐるぐる発動スコア
  roboChirachiraScore: 15,
  // ちらちら発動スコア
  roboChirachiraNegBonus: 8,
  // ちらちら時マイナス確定ボーナス
  roboChirachiraLimit: 10,
  // ちらちら上限（10=事実上無制限, 整数）
  roboZakuzakuBase: 7,
  // ざくざく基本スコア
  roboKutakutaBonus: 2,
  // くたくた新規解放ボーナス
  roboTopN: 3,
  // 各手番で候補にする上位N手（整数）
  roboDepth: 5
  // 先読み深さ（整数）
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
    this._initBoard();
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
function pickPitV3(validPits, state, peeksDoneAI, peeksDonePlayer, fortune) {
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
  function getTopMoves(counts, isAI, peeks, n, restrictTo) {
    const laneMin = isAI ? 6 : 0;
    const laneMax = isAI ? 10 : 4;
    const pool = restrictTo ?? Array.from({ length: laneMax - laneMin + 1 }, (_, i) => laneMin + i);
    const scored = [];
    for (const p of pool) {
      if (counts[p] === 0) continue;
      const { score } = scoreSow(counts, p, isAI, peeks);
      scored.push({ pit: p, score });
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, n);
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
  function dfs(depth, counts, aiPeeks, playerPeeks, aiScore, playerScore, firstPit, prevAiKk, prevPlayerKk) {
    if (depth === 5) {
      const net = aiScore - playerScore;
      if (net > bestNet) {
        bestNet = net;
        bestFirstPit = firstPit;
      }
      return;
    }
    const isAI = depth % 2 === 0;
    const peeks = isAI ? aiPeeks : playerPeeks;
    const oppStoreIndex = isAI ? 5 : 11;
    const topMoves = depth === 0 ? getTopMoves(counts, true, aiPeeks, 3, validPits) : getTopMoves(counts, isAI, peeks, 3, null);
    if (topMoves.length === 0) {
      dfs(
        depth + 1,
        counts,
        aiPeeks,
        playerPeeks,
        aiScore,
        playerScore,
        firstPit,
        prevAiKk,
        prevPlayerKk
      );
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
      const fp = depth === 0 ? pit : firstPit;
      dfs(
        depth + 1,
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
  dfs(
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
function pickPitRoboV1(validPits, state, peeksDoneAI, peeksDonePlayer, fortune, params, role = "opp") {
  const p = params;
  const isOppRole = role === "opp";
  const aiLaneMin = isOppRole ? 6 : 0;
  const aiLaneMax = isOppRole ? 10 : 4;
  const aiStore = isOppRole ? 11 : 5;
  const playerStore = isOppRole ? 5 : 11;
  const plLaneMin = isOppRole ? 0 : 6;
  const plLaneMax = isOppRole ? 4 : 10;
  const aiFortKey = isOppRole ? "opp" : "self";
  const plFortKey = isOppRole ? "self" : "opp";
  const initCounts = state.pits.map((pt) => pt.stones.length);
  const hasUnconfirmedNegForAI = (fortune.center ?? []).some(
    (fc) => fc.bonus < 0 && !fc.seenBy.includes(aiFortKey)
  );
  const hasUnconfirmedNegForPlayer = (fortune.center ?? []).some(
    (fc) => fc.bonus < 0 && !fc.seenBy.includes(plFortKey)
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
    const laneMin = isAI ? aiLaneMin : plLaneMin;
    const laneMax = isAI ? aiLaneMax : plLaneMax;
    const storeIdx = isAI ? aiStore : playerStore;
    const oppStoreIdx = isAI ? playerStore : aiStore;
    const n = counts[pit];
    const lastPit = (pit + n) % 12;
    let score = 0;
    if (lastPit === storeIdx) score += p.roboGuruguruScore;
    if (lastPit === oppStoreIdx && peeks < p.roboChirachiraLimit) {
      score += p.roboChirachiraScore;
      const hasNeg = isAI ? hasUnconfirmedNegForAI : hasUnconfirmedNegForPlayer;
      if (hasNeg) score += p.roboChirachiraNegBonus;
    }
    if (lastPit >= laneMin && lastPit <= laneMax && counts[lastPit] === 0) {
      const mirror = isAI ? isOppRole ? lastPit - 6 : lastPit + 6 : isOppRole ? lastPit + 6 : lastPit - 6;
      if (counts[mirror] > 0) {
        score += p.roboZakuzakuBase;
      }
    }
    return { score, lastPit };
  }
  function getTopMoves(counts, isAI, topN2, peeks, restrictTo) {
    const laneMin = isAI ? aiLaneMin : plLaneMin;
    const laneMax = isAI ? aiLaneMax : plLaneMax;
    const pool = restrictTo ?? Array.from({ length: laneMax - laneMin + 1 }, (_, i) => laneMin + i);
    const scored = [];
    for (const pt of pool) {
      if (counts[pt] === 0) continue;
      const { score } = scoreSow(counts, pt, isAI, peeks);
      scored.push({ pit: pt, score });
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topN2);
  }
  function canKutakutaAI(counts) {
    return counts[aiStore] >= counts[playerStore] - 6;
  }
  function canKutakutaPlayer(counts) {
    return counts[playerStore] >= counts[aiStore];
  }
  const topN = Math.max(1, Math.round(p.roboTopN));
  const depth = Math.max(1, Math.round(p.roboDepth));
  let bestFirstPit = validPits[0];
  let bestNet = -Infinity;
  const initAiKk = canKutakutaAI(initCounts);
  const initPlayerKk = canKutakutaPlayer(initCounts);
  function dfs(d, counts, aiPeeks, playerPeeks, aiScore, playerScore, firstPit, prevAiKk, prevPlayerKk) {
    if (d === depth) {
      const net = aiScore - playerScore;
      if (net > bestNet) {
        bestNet = net;
        bestFirstPit = firstPit;
      }
      return;
    }
    const isAI = d % 2 === 0;
    const peeks = isAI ? aiPeeks : playerPeeks;
    const oppStoreIdx = isAI ? playerStore : aiStore;
    const topMoves = d === 0 ? getTopMoves(counts, true, topN, peeks, validPits) : getTopMoves(counts, isAI, topN, peeks, null);
    if (topMoves.length === 0) {
      dfs(
        d + 1,
        counts,
        aiPeeks,
        playerPeeks,
        aiScore,
        playerScore,
        firstPit,
        prevAiKk,
        prevPlayerKk
      );
      return;
    }
    for (const { pit } of topMoves) {
      const { score, lastPit } = scoreSow(counts, pit, isAI, peeks);
      const { counts: newCounts } = fastSow(counts, pit);
      let newAiPeeks = aiPeeks;
      let newPlayerPeeks = playerPeeks;
      if (lastPit === oppStoreIdx && peeks < p.roboChirachiraLimit) {
        if (isAI) newAiPeeks++;
        else newPlayerPeeks++;
      }
      const newAiKk = canKutakutaAI(newCounts);
      const newPlayerKk = canKutakutaPlayer(newCounts);
      const aiKkBonus = !prevAiKk && newAiKk ? p.roboKutakutaBonus : 0;
      const playerKkBonus = !prevPlayerKk && newPlayerKk ? p.roboKutakutaBonus : 0;
      const newAiScore = isAI ? aiScore + score + aiKkBonus : aiScore + aiKkBonus;
      const newPlayerScore = !isAI ? playerScore + score + playerKkBonus : playerScore + playerKkBonus;
      const fp = d === 0 ? pit : firstPit;
      dfs(
        d + 1,
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
  dfs(
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

// src/sim/SimRunnerRobo.js
var MAX_TURNS = 300;
function _invertState(state) {
  return {
    ...state,
    pits: [
      ...state.pits.slice(6, 12),
      ...state.pits.slice(0, 6)
    ]
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
function runGameRoboVsOni(roboParams = DEFAULT_ROBO_PARAMS, roboRole = "opp") {
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
      let chosen;
      if (roboRole === "self") {
        chosen = pickPitRoboV1(
          validPits,
          state,
          selfPeeks,
          oppPeeks,
          fortune,
          roboParams,
          "self"
        );
      } else {
        const invState = _invertState(state);
        const invFortune = _invertFortune(fortune);
        const invPits = validPits.map((p) => p + 6);
        const invChosen = pickPitV3(invPits, invState, selfPeeks, oppPeeks, invFortune);
        chosen = invChosen - 6;
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
        if (specialAction.action === "chirachira") {
          gs.revealNextCenterForPlayer("self");
        } else if (specialAction.action === "poipoi") {
          gs.removeStoneFromPit(
            specialAction.removePitIndex,
            specialAction.removeStoneIndex
          );
        }
      }
      if (gs.canActivateKutakuta("self")) {
        const s = gs.getState().pits[5].stones.length;
        const o = gs.getState().pits[11].stones.length;
        if (s > o + (DEFAULT_PARAMS.kutakutaThresholdOffset ?? -6)) {
          _applyKutakuta(gs, "self");
        }
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
      let chosen;
      if (roboRole === "opp") {
        chosen = pickPitRoboV1(
          validPits,
          state,
          oppPeeks,
          selfPeeks,
          fortune,
          roboParams,
          "opp"
        );
      } else {
        chosen = pickPitV3(validPits, state, oppPeeks, selfPeeks, fortune);
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
        while (gs.isPlacementActive()) {
          gs.placePendingStone(6 + Math.floor(Math.random() * 5), 0);
        }
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
        if (specialAction.action === "chirachira") {
          gs.revealNextCenterForPlayer("opp");
        } else if (specialAction.action === "poipoi") {
          gs.removeStoneFromPit(
            specialAction.removePitIndex,
            specialAction.removeStoneIndex
          );
        }
      }
      if (gs.canActivateKutakuta("opp")) {
        const s = gs.getState().pits[5].stones.length;
        const o = gs.getState().pits[11].stones.length;
        if (o > s + (DEFAULT_PARAMS.kutakutaThresholdOffset ?? -6)) {
          _applyKutakuta(gs, "opp");
        }
      }
      selfTurn = true;
    }
  }
  const selfScore = gs.calcScore("self");
  const oppScore = gs.calcScore("opp");
  const roboScore = roboRole === "self" ? selfScore : oppScore;
  const oniScore = roboRole === "self" ? oppScore : selfScore;
  return {
    roboScore,
    oniScore,
    winner: roboScore > oniScore ? "robo" : roboScore < oniScore ? "oni" : "draw"
  };
}
function runManyRoboVsOni(roboParams = DEFAULT_ROBO_PARAMS, n = 500) {
  let roboWins = 0, oniWins = 0, draws = 0;
  const half = Math.floor(n / 2);
  for (let i = 0; i < half; i++) {
    const r = runGameRoboVsOni(roboParams, "opp");
    if (r.winner === "robo") roboWins++;
    else if (r.winner === "oni") oniWins++;
    else draws++;
  }
  for (let i = 0; i < n - half; i++) {
    const r = runGameRoboVsOni(roboParams, "self");
    if (r.winner === "robo") roboWins++;
    else if (r.winner === "oni") oniWins++;
    else draws++;
  }
  return {
    n,
    roboWins,
    oniWins,
    draws,
    roboWinPct: roboWins / n * 100,
    oniWinPct: oniWins / n * 100
  };
}

// tools/robo_evolve.js
var import_fs = require("fs");
var LAMBDA = 12;
var MAX_GENERATIONS = 200;
var N_EVAL = 400;
var N_VERIFY = 2e3;
var VERIFY_EVERY = 5;
var CONVERGE_THRESHOLD = 1;
var CONVERGE_PATIENCE = 3;
var MUTATION_RATE = 0.4;
var MUTATION_SCALE = 0.3;
var RANGES = {
  roboGuruguruScore: [1, 25],
  roboChirachiraScore: [0, 30],
  roboChirachiraNegBonus: [0, 25],
  roboChirachiraLimit: [1, 10],
  // 整数 (10=事実上無制限)
  roboZakuzakuBase: [0, 20],
  roboKutakutaBonus: [0, 10],
  roboTopN: [2, 5],
  // 整数
  roboDepth: [3, 7]
  // 整数
};
var PARAM_KEYS = Object.keys(RANGES);
function mutate(params) {
  const child = { ...params };
  for (const key of PARAM_KEYS) {
    if (Math.random() < MUTATION_RATE) {
      const [lo, hi] = RANGES[key];
      const span = hi - lo;
      let v = child[key] + span * MUTATION_SCALE * (Math.random() * 2 - 1);
      v = Math.max(lo, Math.min(hi, v));
      child[key] = Number.isInteger(DEFAULT_ROBO_PARAMS[key]) ? Math.round(v) : parseFloat(v.toFixed(4));
    }
  }
  return child;
}
function evaluate(params, n) {
  const r = runManyRoboVsOni(params, n);
  return r.roboWinPct;
}
function main() {
  (0, import_fs.mkdirSync)("dist-sim", { recursive: true });
  let best = { ...DEFAULT_ROBO_PARAMS };
  let bestPct = evaluate(best, N_VERIFY);
  console.log(`=== RoboV1 \u9032\u5316\u7684\u6700\u9069\u5316 \u958B\u59CB ===`);
  console.log(`\u521D\u671F\u52DD\u7387 (vs OniV3, ${N_VERIFY}G): ${bestPct.toFixed(2)}%`);
  console.log(
    `\u4E0A\u9650 ${MAX_GENERATIONS} \u4E16\u4EE3 / \u53CE\u675F: ${CONVERGE_THRESHOLD}% \xD7 ${CONVERGE_PATIENCE}\u9023\u7D9A
`
  );
  let convergePct = bestPct;
  let convergeCount = 0;
  for (let gen = 1; gen <= MAX_GENERATIONS; gen++) {
    const candidates = Array.from({ length: LAMBDA }, () => mutate(best));
    let genBestPct = -Infinity;
    let genBestParams = null;
    for (let i = 0; i < candidates.length; i++) {
      const pct = evaluate(candidates[i], N_EVAL);
      if (pct > genBestPct) {
        genBestPct = pct;
        genBestParams = candidates[i];
      }
    }
    if (genBestPct > bestPct) {
      bestPct = genBestPct;
      best = genBestParams;
      console.log(`Gen ${String(gen).padStart(3)}: \u2191 ${bestPct.toFixed(2)}%`);
    } else {
      console.log(
        `Gen ${String(gen).padStart(3)}: \u2014 ${bestPct.toFixed(2)}% (\u5909\u5316\u306A\u3057)`
      );
    }
    if (gen % VERIFY_EVERY === 0) {
      const verifyPct = evaluate(best, N_VERIFY);
      const improvement = verifyPct - convergePct;
      console.log(
        `
[Verify gen ${gen}] ${verifyPct.toFixed(2)}% (\u524D\u56DE\u6BD4 ${improvement >= 0 ? "+" : ""}${improvement.toFixed(2)}%)`
      );
      if (improvement < CONVERGE_THRESHOLD) {
        convergeCount++;
        console.log(`\u53CE\u675F\u30AB\u30A6\u30F3\u30C8: ${convergeCount}/${CONVERGE_PATIENCE}`);
        if (convergeCount >= CONVERGE_PATIENCE) {
          console.log(`
=== ${gen} \u4E16\u4EE3\u3067\u53CE\u675F ===`);
          _save(best, verifyPct, gen);
          _printSummary(best, verifyPct);
          return;
        }
      } else {
        convergeCount = 0;
      }
      convergePct = verifyPct;
      _save(best, verifyPct, gen);
      console.log();
    }
  }
  const finalPct = evaluate(best, N_VERIFY);
  console.log(`
=== ${MAX_GENERATIONS} \u4E16\u4EE3\u4E0A\u9650\u5230\u9054 ===`);
  _save(best, finalPct, MAX_GENERATIONS);
  _printSummary(best, finalPct);
}
function _save(params, winPct, gen) {
  (0, import_fs.writeFileSync)(
    "dist-sim/robo_best.json",
    JSON.stringify(
      { gen, winPct: parseFloat(winPct.toFixed(2)), params },
      null,
      2
    )
  );
}
function _printSummary(params, winPct) {
  console.log(`
\u6700\u7D42\u52DD\u7387 vs OniV3: ${winPct.toFixed(2)}%`);
  console.log("\u6700\u9069\u30D1\u30E9\u30E1\u30FC\u30BF:");
  for (const key of PARAM_KEYS) {
    console.log(`  ${key}: ${params[key]}`);
  }
  console.log("\n\u2192 dist-sim/robo_best.json \u306B\u4FDD\u5B58\u6E08\u307F");
}
main();
