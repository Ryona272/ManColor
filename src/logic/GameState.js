import {
  INITIAL_STATE,
  createPlayerStones,
  shuffle,
} from "../data/constants.js";

/**
 * GameState - ゲームロジックを担当するステートマシン
 */
export class GameState {
  constructor() {
    this.reset();
  }

  reset() {
    // deep copy
    this.state = JSON.parse(JSON.stringify(INITIAL_STATE));
    this.pendingPlacement = [];
    this.placementHistory = [];
    this.centerPeekProgress = { self: 0, opp: 0 };
    this.state.discard = [];
    // 千日手検出
    this._sennitteMap = new Map(); // hash → 出現回数
    this._sennitteLastStoreTotal = -1; // 前回記録時の賽壇総石数（self+opp）
    this._sennitteLastHash = null; // 直前に記録したハッシュ（undoSennitteCheck用）
    this._initBoard();
  }

  /**
   * 千日手検出 — 各ターン開始時（撒く前）に呼ぶ
   * どちらかの賽壇の石数が増えたらリセット（ぽいぽいで減るのは無視）。
   * 同数期間中に同一盤面ハッシュが出現した回数を返す。
   * @returns {number} 0=問題なし, 1=2回目(警告), 2以上=3回目(引き分け)
   */
  checkSennitte() {
    const storeTotal =
      this.state.pits[5].stones.length + this.state.pits[11].stones.length;

    // 賽壇の合計が増えた（ざくざくで石が移動した）→ 過去の記録をリセット
    if (storeTotal > this._sennitteLastStoreTotal) {
      this._sennitteMap.clear();
    }
    this._sennitteLastStoreTotal = storeTotal;

    // 盤面ハッシュ: 各pitの石の色の多重集合（順序不問）をパイプ区切りで連結
    const hash = this.state.pits
      .map((pit) => [...pit.stones.map((s) => s.color)].sort().join(","))
      .join("|");

    const count = (this._sennitteMap.get(hash) ?? 0) + 1;
    this._sennitteMap.set(hash, count);
    this._sennitteLastHash = hash; // アンドゥ用に保持

    // 1=初出(問題なし), 2=2回目(警告), 3以上=3回目(引き分け)
    return count - 1; // 0=OK, 1=警告, 2=引き分け
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

    // 自分（pit 0-4）に各3個
    for (let i = 0; i < 5; i++) {
      this.state.pits[i].stones = selfStones.splice(0, 3).map((s) => ({
        ...s,
        face: "front",
      }));
    }
    // 相手（pit 6-10）に各3個
    for (let i = 0; i < 5; i++) {
      this.state.pits[6 + i].stones = oppStones.splice(0, 3).map((s) => ({
        ...s,
        face: "front",
      }));
    }

    // 占い石の配置
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
      bonus: i === 1 ? -4 : +1, // 中央は-4、左右は+1
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

    // 反時計回り: 下段は左→右、右賽壇を通って、上段は右→左へ進む
    // index順では 0→1→2→3→4→5(自賽壇)→6→7→8→9→10→11(相手賽壇)→0...
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
    if (pit.stones.length !== 1) return []; // 置いた1個だけ = 元々空だった

    const matchingIndex = this._getMatchingPatternPit(player, lastPit);
    if (matchingIndex == null) return [];

    const oppPit = this.state.pits[matchingIndex];

    const captured = [...oppPit.stones];
    oppPit.stones = [];

    // 奪った石を自路に配置できる（仕様: 好きな路に好きな数だけ）
    return captured;
  }

  checkCapture(lastPit) {
    return this.checkCaptureForPlayer("self", lastPit);
  }

  /** ゲーム終了判定 */
  isGameOver() {
    // 強制終了: どちらかの路(5マス)が完全に空
    const selfEmpty = this.state.pits
      .slice(0, 5)
      .every((p) => p.stones.length === 0);
    const oppEmpty = this.state.pits
      .slice(6, 11)
      .every((p) => p.stones.length === 0);
    return selfEmpty || oppEmpty;
  }

  /** 得点計算 */
  calcScore(player) {
    // player: 'self'(pit5) or 'opp'(pit11)
    const storeIndex = player === "self" ? 5 : 11;
    const store = this.state.pits[storeIndex].stones;
    const ownFortuneColor =
      player === "self"
        ? this.state.fortune.self.color
        : this.state.fortune.opp.color;
    const oppFortuneColor =
      player === "self"
        ? this.state.fortune.opp.color
        : this.state.fortune.self.color;

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
    const targetIndex =
      player === "opp" ? (viewIndex != null ? 2 - viewIndex : null) : viewIndex;
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
      revealOrder: progress + 1,
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
    const ownFortuneColor =
      player === "self"
        ? this.state.fortune.self.color
        : this.state.fortune.opp.color;
    const oppFortuneColor =
      player === "self"
        ? this.state.fortune.opp.color
        : this.state.fortune.self.color;

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
    const colors = new Set();

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
}
