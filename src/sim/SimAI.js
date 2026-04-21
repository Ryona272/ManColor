/**
 * SimAI.js
 * Phaser 非依存の純粋関数 AI（GameState を直接操作）
 * GameScene の _aiPickPitOniV2 / _aiPlaceNextStone / _aiHandleSpecialChoice
 * をパラメータ化して完全移植
 */

import { DEFAULT_PARAMS } from "./SimParams.js";

// ─── ユーティリティ ────────────────────────────────────────────

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

// ─── メモ管理 ──────────────────────────────────────────────────

export function createMemo() {
  return {
    playerColorFreq: {},
    inferredPlayerColor: null,
    playerAvoidedColor: null,
  };
}

/** ターン開始時にプレイヤー色傾向を更新 */
export function updateMemo(memo, state) {
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
    memo.playerColorFreq[color] =
      (memo.playerColorFreq[color] ?? 0) + count * 3;
  }
  for (const [color, count] of Object.entries(laneFreq)) {
    memo.playerColorFreq[color] = (memo.playerColorFreq[color] ?? 0) + count;
  }
  const sorted = Object.entries(memo.playerColorFreq).sort(
    (a, b) => b[1] - a[1],
  );
  memo.inferredPlayerColor = sorted[0]?.[0] ?? null;
  memo.playerAvoidedColor =
    sorted.length >= 3 ? sorted[sorted.length - 1][0] : null;
}

// ─── ちらちら・ぽいぽい知識 ────────────────────────────────────

function knownNegativeColor(fortune, role = "opp") {
  for (const fc of fortune.center) {
    if (fc.bonus < 0 && fc.seenBy.includes(role)) return fc.color;
  }
  return null;
}

function knownPositiveColors(fortune, role = "opp") {
  return fortune.center
    .filter((fc) => fc.bonus > 0 && fc.seenBy.includes(role))
    .map((fc) => fc.color);
}

// ─── ピット選択（OniV2相当） ────────────────────────────────────

/**
 * role: "self"（pit0-4 → pit5）または "opp"（pit6-10 → pit11）で動かす AI
 * この実装は役割逆転も可能にするため role パラメータを受け取る
 */
export function pickPit(
  role,
  validPits,
  state,
  memo,
  fortune,
  peeksDone,
  params = DEFAULT_PARAMS,
) {
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

  // role に合わせた follow-up 評価関数を選択
  // evalFollowupOpp = pit6-10視点、evalFollowupSelf = pit0-4視点
  const evalOwnFollowup = isOpp ? evalFollowupOpp : evalFollowupSelf;
  const evalOppThreat = isOpp ? evalFollowupSelf : evalFollowupOpp;

  const playerStoreColorCount = {};
  for (const s of state.pits[oppStoreIndex].stones) {
    playerStoreColorCount[s.color] = (playerStoreColorCount[s.color] ?? 0) + 1;
  }

  const emptyPlayerPits = new Set();
  for (let px = oppLaneMin; px <= oppLaneMax; px++) {
    if (state.pits[px].stones.length === 0) emptyPlayerPits.add(px);
  }

  const playerGuruguruNow = Array.from(
    { length: oppLaneMax - oppLaneMin + 1 },
    (_, i) => oppLaneMin + i,
  ).filter((q) => {
    const cnt = state.pits[q].stones.length;
    return cnt > 0 && (q + cnt) % 12 === oppStoreIndex;
  }).length;

  // 序盤フラグ
  const isEarlyGame =
    peeksDone < params.earlyGamePeekThreshold &&
    !inferred &&
    knownPos.length === 0;

  let best = validPits[0];
  let bestScore = -Infinity;

  for (const p of validPits) {
    const count = state.pits[p].stones.length;
    const lastPit = (p + count) % 12;
    let score = 0;

    const { pits: pitsAfter } = simulateSow(state.pits, p);

    // ─── プレイヤーぐるぐる破壊 ───
    if (playerGuruguruNow > 0) {
      let playerGuruguruAfter = 0;
      for (let q = oppLaneMin; q <= oppLaneMax; q++) {
        const cnt = pitsAfter[q].stones.length;
        if (cnt > 0 && (q + cnt) % 12 === oppStoreIndex) playerGuruguruAfter++;
      }
      const disrupted = playerGuruguruNow - playerGuruguruAfter;
      if (disrupted > 0) score += disrupted * params.guruguruDisrupt;
    }

    // ─── ぐるぐる ───
    if (lastPit === storeIndex) {
      const chainCount = countGuruguruChain(pitsAfter, storeIndex);
      if (isEarlyGame) {
        score +=
          params.guruguruBaseEarly + chainCount * params.guruguruChainMultEarly;
        score += evalOwnFollowup(pitsAfter) * 0.8;
      } else {
        score += params.guruguruBase + chainCount * params.guruguruChainMult;
        score += evalOwnFollowup(pitsAfter) * params.guruguruFollowupMult;
      }
      const playerThreatMult = 0.6 + playerGuruguruNow * 0.35;
      score -= evalOppThreat(pitsAfter) * playerThreatMult;
      const colorsAfter = new Set();
      for (let lIdx = laneMin; lIdx <= laneMax; lIdx++) {
        for (const s of pitsAfter[lIdx].stones) colorsAfter.add(s.color);
      }
      if (colorsAfter.size <= 2 && colorsAfter.size > 0) score += 18;
    }

    // ─── pit5着地（ちらちら/ぽいぽい）───
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
          const playerStoreHasFortune =
            inferred &&
            state.pits[oppStoreIndex].stones.some((s) => s.color === inferred);
          score += playerStoreHasFortune
            ? params.poipoiWithFortune
            : state.pits[oppStoreIndex].stones.length > 0
              ? params.poipoiGeneral
              : params.poipoiEmpty;
        }
      }
    }

    // ─── ざくざく ───
    if (
      lastPit >= laneMin &&
      lastPit <= laneMax &&
      state.pits[lastPit].stones.length === 0
    ) {
      const mirrorPit = isOpp ? lastPit - 6 : lastPit + 6;
      const mirrorStones = state.pits[mirrorPit].stones;
      score +=
        params.zakuzakuBase + mirrorStones.length * params.zakuzakuStoneMult;
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

    // ─── ざくざく防御（ちらちら着地は免除）───
    if (lastPit !== oppStoreIndex) {
      const playerMirrorOfP = isOpp ? p - 6 : p + 6;
      if (state.pits[playerMirrorOfP].stones.length > 0) {
        const mirrorStoneCount = state.pits[playerMirrorOfP].stones.length;
        score -= 10 + mirrorStoneCount * 3;
        if (inferred) {
          const inferredHere = state.pits[playerMirrorOfP].stones.filter(
            (s) => s.color === inferred,
          ).length;
          score -= inferredHere * 9;
        }
      }
    }

    // ─── 石の着地先がプレイヤー空き路のミラーなら脅威 ───
    for (let i = 0; i < count; i++) {
      const landingPit = (p + 1 + i) % 12;
      if (landingPit >= laneMin && landingPit <= laneMax) {
        const landedMirrorPlayer = isOpp ? landingPit - 6 : landingPit + 6;
        if (emptyPlayerPits.has(landedMirrorPlayer)) score -= 10;
      }
    }

    // ─── 石の色評価 ───
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
          if (
            (!inferred || stoneColor !== inferred) &&
            cancelCount >= params.midCancelThreshold
          )
            score += cancelCount * params.midCancelMult;
          if (knownNeg && stoneColor === knownNeg) score += params.midKnownNeg;
          if (playerAvoidedColor && stoneColor === playerAvoidedColor)
            score += params.midAvoidedColor;
          const isConfirmedSafe =
            (ownFortune && stoneColor === ownFortune) ||
            knownPos.includes(stoneColor) ||
            (inferred && stoneColor === inferred) ||
            cancelCount >= params.midCancelThreshold;
          if (!isConfirmedSafe) score += params.midUnknownPenalty;
        }
      }

      // 相手賽壇に推測占い色・ちらちらプラス色が流れ込まないようにする
      if (inferred && stoneColor === inferred && landingPit === oppStoreIndex)
        score -= 20;
      if (knownPos.includes(stoneColor) && landingPit === oppStoreIndex)
        score -= 14;
      if (
        ownFortune &&
        stoneColor === ownFortune &&
        landingPit === oppStoreIndex
      )
        score -= 6;
    }

    score += count * 0.1 + Math.random() * 0.06;

    if (score > bestScore) {
      bestScore = score;
      best = p;
    }
  }

  return best;
}

/**
 * ざくざく後の石配置（ヘッドレス版）
 * 手持ち stones を oppLanes（6-10）に最適配置して返す
 * 戻り値: { pitIndex, stone }[] の配置リスト
 */
export function decidePlacements(
  stones,
  state,
  memo,
  fortune,
  params = DEFAULT_PARAMS,
  role = "opp",
) {
  const isOpp = role === "opp";
  const laneOffset = isOpp ? 6 : 0; // 自分の路の先頭インデックス
  const storeIndex = isOpp ? 11 : 5; // 自分の賽壇
  const oppStoreIndex = isOpp ? 5 : 11; // 相手の賽壇（playerStoreカウント用）

  const result = [];
  const ownFortune = isOpp ? fortune.opp.color : fortune.self.color;
  const inferred = memo.inferredPlayerColor;
  const knownNeg = knownNegativeColor(fortune, role);
  const knownPos = knownPositiveColors(fortune, role);
  const playerStoreColorCount = {};
  for (const s of state.pits[oppStoreIndex].stones) {
    playerStoreColorCount[s.color] = (playerStoreColorCount[s.color] ?? 0) + 1;
  }

  // 仮の路状態（配置しながら更新）
  const pitCounts = Array.from(
    { length: 5 },
    (_, i) => state.pits[laneOffset + i].stones.length,
  );

  for (const stone of stones) {
    let bestP = laneOffset;
    let bestS = -Infinity;
    for (let qi = 0; qi < 5; qi++) {
      const q = qi + laneOffset;
      let s = 0;
      const newCount = pitCounts[qi] + 1;
      const targetPit = (q + newCount) % 12;

      if (targetPit === storeIndex) {
        // ぐるぐるセットアップ
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

/**
 * ちらちら/ぽいぽい選択（ヘッドレス版）
 * 戻り値: "chirachira" | "poipoi" | "none"
 * ぽいぽい時は removePitIndex も返す
 */
export function decideSpecialAction(
  state,
  memo,
  fortune,
  peeksDone,
  isOni = true,
  role = "opp",
) {
  const oppStoreIndex = role === "opp" ? 5 : 11; // ぽいぽいで狙う相手の賽壇

  if (peeksDone >= 3) {
    // ちらちら回数なし → ぽいぽいのみ
    return _resolvePoipoi(state, memo, fortune, role);
  }

  if (isOni && peeksDone < 2) {
    // 鬼: 最初の2回は強制ちらちら
    return { action: "chirachira" };
  }

  // ぽいぽいの価値を計算してちらちらと比較
  const inferred = memo.inferredPlayerColor;
  const playerHasInferred =
    inferred &&
    state.pits[oppStoreIndex].stones.some((s) => s.color === inferred);
  const poipoiValue = playerHasInferred
    ? 20
    : state.pits[oppStoreIndex].stones.length >= 2
      ? 8
      : 0;
  const chirachiraRemaining = 3 - peeksDone;
  const chirachiraValue = isOni
    ? chirachiraRemaining >= 2
      ? 10
      : 4
    : chirachiraRemaining >= 2
      ? 12
      : 6;

  if (poipoiValue > chirachiraValue) {
    return _resolvePoipoi(state, memo, fortune, role);
  }
  return { action: "chirachira" };
}

function _resolvePoipoi(state, memo, fortune, role = "opp") {
  const oppStoreIndex = role === "opp" ? 5 : 11;
  if (state.pits[oppStoreIndex].stones.length === 0) return { action: "none" };
  const inferred = memo.inferredPlayerColor;
  const ownFortune = role === "opp" ? fortune.opp.color : fortune.self.color;
  const knownNeg = knownNegativeColor(fortune, role);
  const knownPos = knownPositiveColors(fortune, role);

  let bestIdx = -1;
  let bestVal = 0; // 0以下なら実行しない
  state.pits[oppStoreIndex].stones.forEach((stone, index) => {
    let val = 1;
    if (ownFortune && stone.color === ownFortune) val = 30;
    else if (inferred && stone.color === inferred) val = 22;
    else if (knownPos.includes(stone.color)) val = 4;
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
    removeStoneIndex: bestIdx,
  };
}
