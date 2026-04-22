// src/sim/SimParams.js
var DEFAULT_PARAMS = {
  // ─── フェーズ切り替え ───
  earlyGamePeekThreshold: 2,
  // peeksDone < X && inferredなし && knownPosなし → 序盤
  // ─── ぐるぐる ───
  guruguruBaseEarly: 30,
  // 序盤のぐるぐるベース
  guruguruChainMultEarly: 9,
  // 序盤の連鎖ボーナス乗数
  guruguruBase: 71,
  // 中盤以降のぐるぐるベース
  guruguruChainMult: 28,
  // 中盤以降の連鎖ボーナス乗数
  guruguruFollowupMult: 1.725,
  // 2手先読み乗数
  guruguruDisrupt: 28,
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
  zakuzakuInferred: 0,
  // 奪う石がinferred色
  zakuzakuKnownPos: 10,
  // 奪う石がknownPos色
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
  midUnknownPenalty: -12,
  // 未確定色ペナルティ
  midCancelMult: 7,
  // 相手賽壇にN枚 → N×この値
  midCancelThreshold: 2,
  // キャンセルが有効になる枚数下限
  // ─── 自路の石の色品質 ───
  laneOwnFortune: 3,
  laneInferred: 4,
  laneKnownPos: 2,
  laneKnownNegPenalty: 8,
  sendKnownNegToOpp: 12,
  // ─── 先後手制御 ───
  forceChirachiraThreshold: 2,
  // 強制ちらちら回数（先手=2、後手=1、通常=2）
  forceChirachiraMinLane: 3,
  // 強制ちらちら発動に必要な自陣の最低石数（これ未満なら点数稼ぎ優先）
  // ─── くたくた ───
  kutakutaThresholdOffset: -6
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
  // AI先手特化（座標降下法最適化済み）
  senteStrategy: mergeParams({
    forceChirachiraThreshold: 2,
    guruguruBase: 70,
    guruguruChainMult: 27,
    guruguruDisrupt: 29,
    chirachira1st: 52,
    chirachira2nd: 48,
    chirachira3rd: 40,
    chirachira1stMid: 50,
    chirachira2ndMid: 47,
    poipoiWithFortune: 26,
    poipoiEmpty: 2,
    poipoiStoneOwnFortune: 44,
    zakuzakuKnownPos: 11,
    earlyOwnFortune: 27,
    earlyCancelThreshold: 1,
    midInferred: 32,
    midKnownNeg: -50,
    midUnknownPenalty: -13,
    midCancelMult: 6,
    sendKnownNegToOpp: 18
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
    midCancelMult: 9
  }),
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
      // 中央 -2
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
      bonus: i === 1 ? -3 : 1
      // 中央は-3、左右は+1
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
function simulateSow(pits, pitIndex) {
  const nPits = pits.map((p) => ({ stones: [...p.stones] }));
  const stones = nPits[pitIndex].stones;
  const count = stones.length;
  if (count === 0) return { pits: nPits, lastPit: -1 };
  nPits[pitIndex].stones = [];
  let cur = pitIndex;
  for (let i = 0; i < count; i++) {
    cur = (cur + 1) % 12;
    nPits[cur].stones.push(stones[i]);
  }
  return { pits: nPits, lastPit: cur };
}
function countGuruguruChain(pits, storeIndex = 11, depth = 0) {
  if (depth >= 4) return 0;
  const laneMin = storeIndex === 11 ? 6 : 0;
  const laneMax = storeIndex === 11 ? 10 : 4;
  let best = 0;
  for (let q = laneMin; q <= laneMax; q++) {
    if (pits[q].stones.length === 0) continue;
    const count = pits[q].stones.length;
    const last = (q + count) % 12;
    if (last === storeIndex) {
      const { pits: pitsAfter } = simulateSow(pits, q);
      const chain = 1 + countGuruguruChain(pitsAfter, storeIndex, depth + 1);
      if (chain > best) best = chain;
    }
  }
  return best;
}
function evalFollowupOpp(pits) {
  let bonus = 0;
  for (let q = 6; q <= 10; q++) {
    if (pits[q].stones.length === 0) continue;
    const count = pits[q].stones.length;
    const last = (q + count) % 12;
    if (last === 11) {
      const { pits: p2 } = simulateSow(pits, q);
      const depth = countGuruguruChain(p2, 11, 1);
      bonus += 10 + depth * 12;
    }
    if (last >= 6 && last <= 10 && pits[last].stones.length === 0) {
      const mirrorCount = pits[last - 6].stones.length;
      bonus += 8 + mirrorCount * 3;
    }
  }
  return bonus;
}
function evalFollowupSelf(pits) {
  let bonus = 0;
  for (let q = 0; q <= 4; q++) {
    if (pits[q].stones.length === 0) continue;
    const count = pits[q].stones.length;
    const last = (q + count) % 12;
    if (last === 5) {
      const { pits: p2 } = simulateSow(pits, q);
      const depth = countGuruguruChain(p2, 5, 1);
      bonus += 10 + depth * 12;
    }
    if (last >= 0 && last <= 4 && pits[last].stones.length === 0) {
      const mirrorCount = pits[last + 6]?.stones.length ?? 0;
      bonus += 8 + mirrorCount * 3;
    }
  }
  return bonus;
}
function createMemo() {
  return {
    playerColorFreq: {},
    inferredPlayerColor: null,
    playerAvoidedColor: null
  };
}
function updateMemo(memo, state) {
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
  const sorted = Object.entries(memo.playerColorFreq).sort(
    (a, b) => b[1] - a[1]
  );
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
function pickPit(role, validPits, state, memo, fortune, peeksDone, params = DEFAULT_PARAMS) {
  const isOpp = role === "opp";
  const storeIndex = isOpp ? 11 : 5;
  const oppStoreIndex = isOpp ? 5 : 11;
  const laneMin = isOpp ? 6 : 0;
  const laneMax = isOpp ? 10 : 4;
  const oppLaneMin = isOpp ? 0 : 6;
  const oppLaneMax = isOpp ? 4 : 10;
  const inferred = memo.inferredPlayerColor;
  const playerAvoidedColor = memo.playerAvoidedColor;
  const ownFortune = isOpp ? fortune.opp.color : fortune.self.color;
  const knownNeg = knownNegativeColor(fortune, role);
  const knownPos = knownPositiveColors(fortune, role);
  const evalOwnFollowup = isOpp ? evalFollowupOpp : evalFollowupSelf;
  const evalOppThreat = isOpp ? evalFollowupSelf : evalFollowupOpp;
  const playerStoreColorCount = {};
  for (const s of state.pits[oppStoreIndex].stones) {
    playerStoreColorCount[s.color] = (playerStoreColorCount[s.color] ?? 0) + 1;
  }
  const emptyPlayerPits = /* @__PURE__ */ new Set();
  for (let px = oppLaneMin; px <= oppLaneMax; px++) {
    if (state.pits[px].stones.length === 0) emptyPlayerPits.add(px);
  }
  const playerGuruguruNow = Array.from(
    { length: oppLaneMax - oppLaneMin + 1 },
    (_, i) => oppLaneMin + i
  ).filter((q) => {
    const cnt = state.pits[q].stones.length;
    return cnt > 0 && (q + cnt) % 12 === oppStoreIndex;
  }).length;
  const isEarlyGame = peeksDone < params.earlyGamePeekThreshold && !inferred && knownPos.length === 0;
  let best = validPits[0];
  let bestScore = -Infinity;
  for (const p of validPits) {
    const count = state.pits[p].stones.length;
    const lastPit = (p + count) % 12;
    let score = 0;
    const { pits: pitsAfter } = simulateSow(state.pits, p);
    if (playerGuruguruNow > 0) {
      let playerGuruguruAfter = 0;
      for (let q = oppLaneMin; q <= oppLaneMax; q++) {
        const cnt = pitsAfter[q].stones.length;
        if (cnt > 0 && (q + cnt) % 12 === oppStoreIndex) playerGuruguruAfter++;
      }
      const disrupted = playerGuruguruNow - playerGuruguruAfter;
      if (disrupted > 0) score += disrupted * params.guruguruDisrupt;
    }
    if (lastPit === storeIndex) {
      const chainCount = countGuruguruChain(pitsAfter, storeIndex);
      if (isEarlyGame) {
        score += params.guruguruBaseEarly + chainCount * params.guruguruChainMultEarly;
        score += evalOwnFollowup(pitsAfter) * 0.8;
      } else {
        score += params.guruguruBase + chainCount * params.guruguruChainMult;
        score += evalOwnFollowup(pitsAfter) * params.guruguruFollowupMult;
      }
      const playerThreatMult = 0.6 + playerGuruguruNow * 0.35;
      score -= evalOppThreat(pitsAfter) * playerThreatMult;
      const colorsAfter = /* @__PURE__ */ new Set();
      for (let lIdx = laneMin; lIdx <= laneMax; lIdx++) {
        for (const s of pitsAfter[lIdx].stones) colorsAfter.add(s.color);
      }
      if (colorsAfter.size <= 2 && colorsAfter.size > 0) score += 18;
    }
    if (lastPit === oppStoreIndex) {
      if (isEarlyGame) {
        if (peeksDone === 0) score += params.chirachira1st;
        else if (peeksDone === 1) score += params.chirachira2nd;
        else score += params.chirachira3rd;
      } else {
        if (peeksDone === 0) score += params.chirachira1stMid;
        else if (peeksDone === 1) score += params.chirachira2ndMid;
        else if (peeksDone === 2) score += params.chirachira3rd;
        else {
          const playerStoreHasFortune = inferred && state.pits[oppStoreIndex].stones.some((s) => s.color === inferred);
          score += playerStoreHasFortune ? params.poipoiWithFortune : state.pits[oppStoreIndex].stones.length > 0 ? params.poipoiGeneral : params.poipoiEmpty;
        }
      }
    }
    if (lastPit >= laneMin && lastPit <= laneMax && state.pits[lastPit].stones.length === 0) {
      const mirrorPit = isOpp ? lastPit - 6 : lastPit + 6;
      const mirrorStones = state.pits[mirrorPit].stones;
      score += params.zakuzakuBase + mirrorStones.length * params.zakuzakuStoneMult;
      for (const s of mirrorStones) {
        if (ownFortune && s.color === ownFortune)
          score += params.zakuzakuOwnFortune;
        if (inferred && s.color === inferred) score += params.zakuzakuInferred;
        if (knownPos.includes(s.color)) score += params.zakuzakuKnownPos;
      }
      score += evalOwnFollowup(pitsAfter) * 0.8;
      const playerThreatMult = 0.5 + playerGuruguruNow * 0.3;
      score -= evalOppThreat(pitsAfter) * playerThreatMult;
    }
    if (lastPit !== oppStoreIndex) {
      const playerMirrorOfP = isOpp ? p - 6 : p + 6;
      if (state.pits[playerMirrorOfP].stones.length > 0) {
        const mirrorStoneCount = state.pits[playerMirrorOfP].stones.length;
        score -= 10 + mirrorStoneCount * 3;
        if (inferred) {
          const inferredHere = state.pits[playerMirrorOfP].stones.filter(
            (s) => s.color === inferred
          ).length;
          score -= inferredHere * 9;
        }
      }
    }
    for (let i = 0; i < count; i++) {
      const landingPit = (p + 1 + i) % 12;
      if (landingPit >= laneMin && landingPit <= laneMax) {
        const landedMirrorPlayer = isOpp ? landingPit - 6 : landingPit + 6;
        if (emptyPlayerPits.has(landedMirrorPlayer)) score -= 10;
      }
    }
    for (let i = 0; i < count; i++) {
      const landingPit = (p + 1 + i) % 12;
      const stoneColor = state.pits[p].stones[i]?.color;
      if (!stoneColor) continue;
      if (landingPit === storeIndex) {
        if (isEarlyGame) {
          if (ownFortune && stoneColor === ownFortune) {
            score += params.earlyOwnFortune;
          } else {
            const cancelCount = playerStoreColorCount[stoneColor] ?? 0;
            if (cancelCount >= params.earlyCancelThreshold)
              score += cancelCount * params.earlyCancelMult;
            else score += params.earlyUnknownPenalty;
          }
        } else {
          if (inferred && stoneColor === inferred) score += params.midInferred;
          else if (ownFortune && stoneColor === ownFortune)
            score += params.midOwnFortune;
          if (knownPos.includes(stoneColor)) score += params.midKnownPos;
          const cancelCount = playerStoreColorCount[stoneColor] ?? 0;
          if ((!inferred || stoneColor !== inferred) && cancelCount >= params.midCancelThreshold)
            score += cancelCount * params.midCancelMult;
          if (knownNeg && stoneColor === knownNeg) score += params.midKnownNeg;
          if (playerAvoidedColor && stoneColor === playerAvoidedColor)
            score += params.midAvoidedColor;
          const isConfirmedSafe = ownFortune && stoneColor === ownFortune || knownPos.includes(stoneColor) || inferred && stoneColor === inferred || cancelCount >= params.midCancelThreshold;
          if (!isConfirmedSafe) score += params.midUnknownPenalty;
        }
      }
      if (inferred && stoneColor === inferred && landingPit === oppStoreIndex)
        score -= 20;
      if (knownPos.includes(stoneColor) && landingPit === oppStoreIndex)
        score -= 14;
      if (ownFortune && stoneColor === ownFortune && landingPit === oppStoreIndex)
        score -= 6;
      if (landingPit >= laneMin && landingPit <= laneMax) {
        if (ownFortune && stoneColor === ownFortune)
          score += params.laneOwnFortune ?? 3;
        else if (inferred && stoneColor === inferred)
          score += params.laneInferred ?? 4;
        else if (knownPos.includes(stoneColor))
          score += params.laneKnownPos ?? 2;
        if (knownNeg && stoneColor === knownNeg)
          score -= params.laneKnownNegPenalty ?? 8;
      }
      if (knownNeg && stoneColor === knownNeg && (landingPit >= oppLaneMin && landingPit <= oppLaneMax || landingPit === oppStoreIndex)) {
        score += params.sendKnownNegToOpp ?? 12;
      }
    }
    score += count * 0.1 + Math.random() * 0.06;
    if (score > bestScore) {
      bestScore = score;
      best = p;
    }
  }
  return best;
}
function decidePlacements(stones, state, memo, fortune, params = DEFAULT_PARAMS, role = "opp") {
  const isOpp = role === "opp";
  const laneOffset = isOpp ? 6 : 0;
  const storeIndex = isOpp ? 11 : 5;
  const oppStoreIndex = isOpp ? 5 : 11;
  const result = [];
  const ownFortune = isOpp ? fortune.opp.color : fortune.self.color;
  const inferred = memo.inferredPlayerColor;
  const knownNeg = knownNegativeColor(fortune, role);
  const knownPos = knownPositiveColors(fortune, role);
  const playerStoreColorCount = {};
  for (const s of state.pits[oppStoreIndex].stones) {
    playerStoreColorCount[s.color] = (playerStoreColorCount[s.color] ?? 0) + 1;
  }
  const pitCounts = Array.from(
    { length: 5 },
    (_, i) => state.pits[laneOffset + i].stones.length
  );
  for (const stone of stones) {
    let bestP = laneOffset;
    let bestS = -Infinity;
    for (let qi2 = 0; qi2 < 5; qi2++) {
      const q = qi2 + laneOffset;
      let s = 0;
      const newCount = pitCounts[qi2] + 1;
      const targetPit = (q + newCount) % 12;
      if (targetPit === storeIndex) {
        s += 18;
        if (ownFortune && stone.color === ownFortune) s += 12;
        if (inferred && stone.color === inferred) s += 20;
        if (knownPos.includes(stone.color)) s += 16;
        const cancelCount = playerStoreColorCount[stone.color] ?? 0;
        if (cancelCount >= params.midCancelThreshold) s += cancelCount * 8;
        if (knownNeg && stone.color === knownNeg) s -= 40;
      }
      const playerMirror = isOpp ? q - 6 : q + 6;
      if (state.pits[playerMirror].stones.length === 0) s -= 8;
      else s += 4;
      s += Math.random() * 0.1;
      if (s > bestS) {
        bestS = s;
        bestP = q;
      }
    }
    result.push({ pitIndex: bestP, stone });
    const qi = bestP - laneOffset;
    pitCounts[qi]++;
  }
  return result;
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
  if (state.pits[oppStoreIndex].stones.length === 0) return { action: "none" };
  const inferred = memo.inferredPlayerColor;
  const ownFortune = role === "opp" ? fortune.opp.color : fortune.self.color;
  const knownNeg = knownNegativeColor(fortune, role);
  const knownPos = knownPositiveColors(fortune, role);
  const vOwnFortune = params.poipoiStoneOwnFortune ?? 30;
  const vInferred = params.poipoiStoneInferred ?? 22;
  const vKnownPos = params.poipoiStoneKnownPos ?? 4;
  let bestIdx = -1;
  let bestVal = 0;
  state.pits[oppStoreIndex].stones.forEach((stone, index) => {
    let val = 1;
    if (ownFortune && stone.color === ownFortune) val = vOwnFortune;
    else if (inferred && stone.color === inferred) val = vInferred;
    else if (knownPos.includes(stone.color)) val = vKnownPos;
    if (knownNeg && stone.color === knownNeg) val = -99;
    if (val > bestVal) {
      bestVal = val;
      bestIdx = index;
    }
  });
  if (bestIdx < 0) return { action: "none" };
  return {
    action: "poipoi",
    removePitIndex: oppStoreIndex,
    removeStoneIndex: bestIdx
  };
}

// src/sim/SimRunner.js
var MAX_TURNS = 300;
function runGame(paramsA = DEFAULT_PARAMS, paramsB = DEFAULT_PARAMS) {
  const gs = new GameState();
  const memoSelf = createMemo();
  const memoOpp = createMemo();
  let selfTurn = true;
  let turn = 0;
  let selfGuruCount = 0;
  let oppGuruCount = 0;
  let selfZakuCount = 0;
  let oppZakuCount = 0;
  while (!gs.isGameOver() && turn < MAX_TURNS) {
    turn++;
    const state = gs.getState();
    const fortune = state.fortune;
    if (selfTurn) {
      updateMemo(memoSelf, _invertStateForSelf(state));
      const peeksDone = gs.centerPeekProgress.self ?? 0;
      const validPits = [0, 1, 2, 3, 4].filter(
        (i) => state.pits[i].stones.length > 0
      );
      if (validPits.length === 0) {
        selfTurn = false;
        continue;
      }
      const chosen = pickPit(
        "self",
        validPits,
        state,
        memoSelf,
        fortune,
        peeksDone,
        paramsA
      );
      const sowResult = gs.sow(chosen);
      if (!sowResult) {
        selfTurn = false;
        continue;
      }
      const lastPit = sowResult.lastPit;
      const captured = gs.checkCaptureForPlayer("self", lastPit);
      if (captured.length > 0) {
        selfZakuCount++;
        gs.startPlacement(captured);
        const placements = decidePlacements(
          captured,
          gs.getState(),
          memoSelf,
          fortune,
          paramsA,
          "self"
        );
        for (const { pitIndex, stone } of placements) {
          const pending = gs.getPendingPlacement();
          if (pending.length === 0) break;
          gs.placePendingStone(pitIndex, 0);
        }
        while (gs.isPlacementActive()) {
          const remaining = gs.getPendingPlacement();
          if (remaining.length === 0) break;
          gs.placePendingStone(Math.floor(Math.random() * 5), 0);
        }
      }
      if (lastPit === 5) {
        selfGuruCount++;
        continue;
      }
      if (lastPit === 11) {
        const specialAction = decideSpecialAction(
          gs.getState(),
          memoSelf,
          fortune,
          peeksDone,
          true,
          "self",
          paramsA
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
        const selfStore = gs.getState().pits[5].stones.length;
        const oppStore = gs.getState().pits[11].stones.length;
        if (selfStore > oppStore + (paramsA.kutakutaThresholdOffset ?? -2)) {
          _applyKutakuta(gs, "self");
        }
      }
      selfTurn = false;
    } else {
      updateMemo(memoOpp, state);
      const peeksDone = gs.centerPeekProgress.opp ?? 0;
      const validPits = [6, 7, 8, 9, 10].filter(
        (i) => state.pits[i].stones.length > 0
      );
      if (validPits.length === 0) {
        selfTurn = true;
        continue;
      }
      const chosen = pickPit(
        "opp",
        validPits,
        state,
        memoOpp,
        fortune,
        peeksDone,
        paramsB
      );
      const pitData = state.pits[chosen];
      if (!pitData || pitData.stones.length === 0) {
        selfTurn = true;
        continue;
      }
      const stones = [...pitData.stones];
      pitData.stones = [];
      let cursor = chosen;
      for (const stone of stones) {
        cursor = (cursor + 1) % 12;
        gs.getState().pits[cursor].stones.push(stone);
      }
      const lastPit = cursor;
      const captured = gs.checkCaptureForPlayer("opp", lastPit);
      if (captured.length > 0) {
        oppZakuCount++;
        gs.startPlacement(captured);
        const placements = decidePlacements(
          captured,
          gs.getState(),
          memoOpp,
          fortune,
          paramsB,
          "opp"
        );
        for (const { pitIndex, stone } of placements) {
          if (!gs.isPlacementActive()) break;
          gs.placePendingStone(pitIndex, 0);
        }
        while (gs.isPlacementActive()) {
          gs.placePendingStone(6 + Math.floor(Math.random() * 5), 0);
        }
      }
      if (lastPit === 11) {
        oppGuruCount++;
        continue;
      }
      if (lastPit === 5) {
        const specialAction = decideSpecialAction(
          gs.getState(),
          memoOpp,
          fortune,
          peeksDone,
          true,
          "opp",
          paramsB
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
        const selfStore = gs.getState().pits[5].stones.length;
        const oppStore = gs.getState().pits[11].stones.length;
        if (oppStore > selfStore + (paramsB.kutakutaThresholdOffset ?? -2)) {
          _applyKutakuta(gs, "opp");
        }
      }
      selfTurn = true;
    }
  }
  const selfScore = gs.calcScore("self");
  const oppScore = gs.calcScore("opp");
  const winner = selfScore > oppScore ? "self" : selfScore < oppScore ? "opp" : "draw";
  return {
    selfScore,
    oppScore,
    winner,
    turns: turn,
    selfPeeks: gs.centerPeekProgress.self ?? 0,
    oppPeeks: gs.centerPeekProgress.opp ?? 0,
    selfGuruCount,
    oppGuruCount,
    selfZakuCount,
    oppZakuCount
  };
}
function runMany(paramsA = DEFAULT_PARAMS, paramsB = DEFAULT_PARAMS, n = 500) {
  let selfWins = 0, oppWins = 0, draws = 0;
  let selfScoreSum = 0, oppScoreSum = 0;
  let totalTurns = 0;
  let selfGuruSum = 0, oppGuruSum = 0;
  let selfZakuSum = 0, oppZakuSum = 0;
  let selfPeekSum = 0, oppPeekSum = 0;
  const scores = [];
  for (let i = 0; i < n; i++) {
    const r = runGame(paramsA, paramsB);
    if (r.winner === "self") selfWins++;
    else if (r.winner === "opp") oppWins++;
    else draws++;
    selfScoreSum += r.selfScore;
    oppScoreSum += r.oppScore;
    totalTurns += r.turns;
    selfGuruSum += r.selfGuruCount;
    oppGuruSum += r.oppGuruCount;
    selfZakuSum += r.selfZakuCount;
    oppZakuSum += r.oppZakuCount;
    selfPeekSum += r.selfPeeks;
    oppPeekSum += r.oppPeeks;
    scores.push(r.selfScore - r.oppScore);
  }
  scores.sort((a, b) => a - b);
  const median = scores[Math.floor(n / 2)];
  return {
    n,
    selfWins,
    oppWins,
    draws,
    selfWinRate: (selfWins / n * 100).toFixed(1) + "%",
    oppWinRate: (oppWins / n * 100).toFixed(1) + "%",
    avgSelfScore: (selfScoreSum / n).toFixed(2),
    avgOppScore: (oppScoreSum / n).toFixed(2),
    avgScoreDiff: ((selfScoreSum - oppScoreSum) / n).toFixed(2),
    medianScoreDiff: median,
    avgTurns: (totalTurns / n).toFixed(1),
    avgSelfGuru: (selfGuruSum / n).toFixed(2),
    avgOppGuru: (oppGuruSum / n).toFixed(2),
    avgSelfZaku: (selfZakuSum / n).toFixed(2),
    avgOppZaku: (oppZakuSum / n).toFixed(2),
    avgSelfPeeks: (selfPeekSum / n).toFixed(2),
    avgOppPeeks: (oppPeekSum / n).toFixed(2)
  };
}
function _invertStateForSelf(state) {
  return {
    pits: [
      ...state.pits.slice(6, 12),
      // [0-5] = 旧 pit6-11 (oppの路・賽壇)
      ...state.pits.slice(0, 6)
      // [6-11] = 旧 pit0-5 (selfの路・賽壇)
    ]
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

// src/sim/optim_sente.js
var N_EVAL = 400;
var N_VERIFY = 1e3;
var MAX_SWEEPS = 8;
var MAX_EXTEND = 8;
var STEPS = {
  guruguruBaseEarly: 1,
  guruguruChainMultEarly: 1,
  guruguruBase: 1,
  guruguruChainMult: 1,
  guruguruFollowupMult: 0.05,
  guruguruDisrupt: 1,
  chirachira1st: 1,
  chirachira2nd: 1,
  chirachira1stMid: 1,
  chirachira2ndMid: 1,
  chirachira3rd: 1,
  poipoiWithFortune: 1,
  poipoiGeneral: 1,
  poipoiEmpty: 1,
  chirachiraThresholdHigh: 1,
  chirachiraThresholdLow: 1,
  poipoiStoneOwnFortune: 1,
  poipoiStoneInferred: 1,
  poipoiStoneKnownPos: 1,
  zakuzakuBase: 1,
  zakuzakuStoneMult: 1,
  zakuzakuOwnFortune: 1,
  zakuzakuInferred: 1,
  zakuzakuKnownPos: 1,
  earlyOwnFortune: 1,
  earlyCancelMult: 1,
  earlyCancelThreshold: 1,
  earlyUnknownPenalty: 1,
  midInferred: 1,
  midOwnFortune: 1,
  midKnownPos: 1,
  midKnownNeg: 1,
  midAvoidedColor: 1,
  midUnknownPenalty: 1,
  midCancelMult: 1,
  midCancelThreshold: 1,
  laneOwnFortune: 1,
  laneInferred: 1,
  laneKnownPos: 1,
  laneKnownNegPenalty: 1,
  sendKnownNegToOpp: 1,
  forceChirachiraThreshold: 1,
  forceChirachiraMinLane: 1,
  kutakutaThresholdOffset: 1
};
var PARAM_KEYS = Object.keys(STEPS);
var fix = (v) => parseFloat(v.toFixed(4));
var selfRate = (s) => parseFloat(s.selfWinRate);
function sep(title) {
  console.log("\n" + "=".repeat(62) + "\n  " + title + "\n" + "=".repeat(62));
}
function lineSearch(key, current, curScore, gote) {
  const step = STEPS[key];
  const cur = current[key];
  const evalFn = (p) => selfRate(runMany(p, gote, N_EVAL));
  const sp = evalFn({ ...current, [key]: fix(cur + step) });
  const sm = evalFn({ ...current, [key]: fix(cur - step) });
  let best = cur, bestScore = curScore;
  if (sp > bestScore) {
    best = fix(cur + step);
    bestScore = sp;
  }
  if (sm > bestScore) {
    best = fix(cur - step);
    bestScore = sm;
  }
  if (best !== cur) {
    const dir = best > cur ? step : -step;
    for (let ex = 0; ex < MAX_EXTEND; ex++) {
      const nxt = fix(best + dir);
      const score = evalFn({ ...current, [key]: nxt });
      if (score > bestScore) {
        bestScore = score;
        best = nxt;
      } else break;
    }
    const delta = (bestScore - curScore).toFixed(1);
    console.log(
      `    [${key}] ${cur} \u2192 ${best}  (${delta >= 0 ? "+" : ""}${delta}%  now:${bestScore.toFixed(1)}%)`
    );
  }
  return { value: best, score: bestScore };
}
function sweep(params, gote, label) {
  console.log(`
  -- ${label} --`);
  let cur = { ...params };
  let score = selfRate(runMany(cur, gote, N_EVAL));
  console.log(`  \u958B\u59CB: ${score.toFixed(1)}%`);
  let improved = 0;
  for (const key of PARAM_KEYS) {
    const r = lineSearch(key, cur, score, gote);
    if (r.value !== cur[key]) {
      cur = { ...cur, [key]: r.value };
      score = r.score;
      improved++;
    }
  }
  console.log(`  \u5B8C\u4E86: ${improved}\u500B\u6539\u5584 \u2192 ${score.toFixed(1)}%`);
  return { params: cur, improved, score };
}
var GOTE = PRESETS.goteStrategy;
var sente = { ...PRESETS.senteStrategy };
var initSente = { ...sente };
sep(`senteStrategy \u6700\u9069\u5316 vs \u56FA\u5B9A goteStrategy  N_EVAL=${N_EVAL}`);
console.log(`  \u521D\u671F: ${selfRate(runMany(sente, GOTE, N_EVAL)).toFixed(1)}%`);
for (let i = 1; i <= MAX_SWEEPS; i++) {
  const r = sweep(sente, GOTE, `Sweep ${i}`);
  sente = r.params;
  if (r.improved === 0) {
    console.log("  \u2192 \u53CE\u675F");
    break;
  }
}
sep(`\u6700\u7D42\u691C\u8A3C ${N_VERIFY}\u8A66\u5408`);
var vSG = runMany(sente, GOTE, N_VERIFY);
var vSD = runMany(sente, DEFAULT_PARAMS, N_VERIFY);
var vDD = runMany(DEFAULT_PARAMS, DEFAULT_PARAMS, N_VERIFY);
console.log(
  `  sente vs gote:    self ${vSG.selfWinRate}  opp ${vSG.oppWinRate}  avgDiff:${vSG.avgScoreDiff}`
);
console.log(
  `  sente vs default: self ${vSD.selfWinRate}  opp ${vSD.oppWinRate}  avgDiff:${vSD.avgScoreDiff}`
);
console.log(
  `  default vs default: self ${vDD.selfWinRate}  opp ${vDD.oppWinRate}`
);
console.log(`  peeks sente:${vSG.avgSelfPeeks}  gote:${vSG.avgOppPeeks}`);
console.log(`  guru  sente:${vSG.avgSelfGuru}  gote:${vSG.avgOppGuru}`);
console.log("\n\u3010\u6700\u9069\u5316\u6E08\u307F senteStrategy (\u5909\u66F4\u70B9\u306E\u307F)\u3011");
var diffs = PARAM_KEYS.filter(
  (k) => sente[k] !== void 0 && sente[k] !== initSente[k]
);
if (diffs.length === 0) {
  console.log("  (\u5909\u66F4\u306A\u3057)");
} else {
  console.log("  senteStrategy: mergeParams({");
  diffs.forEach(
    (k) => console.log(`    ${k}: ${sente[k]},  // (was ${initSente[k]})`)
  );
  console.log("  }),");
}
