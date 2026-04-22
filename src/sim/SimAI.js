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
    // 次ターンにちらちら/ぽいぽいできる路がある
    if (last === 5) {
      bonus += 14;
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
    // 次ターンにちらちら/ぽいぽいできる路がある（AIへの脅威として計上）
    if (last === 11) {
      bonus += 14;
    }
    if (last >= 0 && last <= 4 && pits[last].stones.length === 0) {
      const mirrorCount = pits[last + 6]?.stones.length ?? 0;
      bonus += 8 + mirrorCount * 3;
    }
  }
  return bonus;
}

// ─── メモ管理 ──────────────────────────────────────────────────

/**
 * プレイヤーの最善応手を予測して撒き後盤面を返す
 * ぐるぐる連鎖 > ちらちら > ざくざく の優先度でシミュレート
 * role="opp" 視点なので self（pit0-4）が相手（プレイヤー）
 */
function predictPlayerResponse(pits) {
  let bestPit = -1;
  let bestScore = -Infinity;
  for (let q = 0; q <= 4; q++) {
    const cnt = pits[q].stones.length;
    if (cnt === 0) continue;
    const last = (q + cnt) % 12;
    let s = 0;
    const { pits: p2 } = simulateSow(pits, q);
    // ぐるぐる: 連鎖深度²で評価
    if (last === 5) {
      const depth = countGuruguruChain(p2, 5, 1);
      s += 50 + (1 + depth) * (1 + depth) * 18;
      s += evalFollowupSelf(p2) * 1.2;
    }
    // ちらちら準備 (pit11 着地)
    if (last === 11) s += 36;
    // ざくざく
    if (last >= 0 && last <= 4 && pits[last].stones.length === 0) {
      const mirror = pits[last + 6]?.stones.length ?? 0;
      s += 15 + mirror * 4;
    }
    // 撒き後の次手脅威
    s += evalFollowupSelf(p2) * 0.4;
    if (s > bestScore) {
      bestScore = s;
      bestPit = q;
    }
  }
  if (bestPit === -1) return pits;
  return simulateSow(pits, bestPit).pits;
}

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

  // ちらちら被弾数（撒く前）: 相手路のうち自賽壇に着地できる穴の数
  const chirachiraNow = Array.from(
    { length: oppLaneMax - oppLaneMin + 1 },
    (_, i) => oppLaneMin + i,
  ).filter((q) => {
    const cnt = state.pits[q].stones.length;
    return cnt > 0 && (q + cnt) % 12 === storeIndex;
  }).length;

  // 自分のちらちら準備数（撒く前）: 自路のうちpit5（相手賽壇）に着地できる穴の数
  const ownChirachiraNow = Array.from(
    { length: laneMax - laneMin + 1 },
    (_, i) => laneMin + i,
  ).filter((q) => {
    const cnt = state.pits[q].stones.length;
    return cnt > 0 && (q + cnt) % 12 === oppStoreIndex;
  }).length;

  // くたくた発動判定: 相手路の色を2色以下に整理している + 賽壇差条件を満たす場合に発動リスクあり
  const playerLaneColors = new Set();
  for (let q = oppLaneMin; q <= oppLaneMax; q++) {
    for (const s of state.pits[q].stones) playerLaneColors.add(s.color);
  }
  const playerLaneConsolidated =
    playerLaneColors.size > 0 && playerLaneColors.size <= 2;
  const playerStoreNow = state.pits[oppStoreIndex].stones.length;
  const aiStoreNow = state.pits[storeIndex].stones.length;
  const playerCanKutakuta =
    playerLaneConsolidated &&
    playerStoreNow > aiStoreNow + (params.kutakutaThresholdOffset ?? -6);

  // 序盤フラグ
  const isEarlyGame =
    peeksDone < params.earlyGamePeekThreshold &&
    !inferred &&
    knownPos.length === 0;

  // ─── 気分（ターンごとのランダム重み: 心理戦用）───
  // 占い色重視度を毎ターンゆらがせる → 行動パターンが読まれにくい
  const moodRoll = Math.random();
  // fortune意識度: 0.3（今回は敢え無視 = ブラフ・躺増）～ 1.7（強く重視 = 安全路密著）
  const moodFortuneMult = 0.3 + moodRoll * 1.4;
  // 占い重視度が高いときは序盤グルグルベースを微縮してfortune路が屏に入りやすくする
  // （moodFortuneMult=1.7→約-21%、=1.0→変化なし、<1.0→変化なし）
  const moodGuruguruMult = isEarlyGame
    ? 1.0 - Math.max(0, moodFortuneMult - 1.0) * 0.3
    : 1.0;

  let best = validPits[0];
  let bestScore = -Infinity;
  const pitScores = [];

  // 全手共通: 撒く前のプレイヤー脅威度ベースライン
  const basePlayerThreat = evalOppThreat(state.pits);

  for (const p of validPits) {
    const count = state.pits[p].stones.length;
    const lastPit = (p + count) % 12;
    let score = 0;
    let defPenalty = 0;

    const { pits: pitsAfter } = simulateSow(state.pits, p);

    // ─── 2手先読み: プレイヤーの最善応手後の盤面を評価 ───
    const pitsAfterResponse = predictPlayerResponse(pitsAfter);
    // 応手後にAIが取れる行動の質
    const lookaheadOwnThreat = evalOwnFollowup(pitsAfterResponse);
    // 応手後にプレイヤーが取れる行動の質（2手先の脅威）
    const lookaheadPlayerThreat = evalOppThreat(pitsAfterResponse);
    score += lookaheadOwnThreat * (params.lookaheadOwnMult ?? 0.35);
    score -= lookaheadPlayerThreat * (params.lookaheadPlayerMult ?? 0.55);

    // ─── 全手共通: 撒いた後のプレイヤー脅威増加を硬ペナルティとして適用───
    // 通常手で相手路に石が流れ込んでグルグル連鎖が増える場合も送んない
    const playerThreatAfter = evalOppThreat(pitsAfter);
    {
      const threatGrowth = playerThreatAfter - basePlayerThreat;
      if (threatGrowth > 0)
        score -= threatGrowth * (params.playerThreatGrowthMult ?? 1.0);
    }
    // ─── プレイヤーぐるぐる変化（破壊ボーナス）───
    // 自分がぐるぐるする手（lastPit===storeIndex）では生成ペナルティを無効化：
    // ぐるぐる > 妨害 の優先順位を維持する
    {
      let playerGuruguruAfter = 0;
      for (let q = oppLaneMin; q <= oppLaneMax; q++) {
        const cnt = pitsAfter[q].stones.length;
        if (cnt > 0 && (q + cnt) % 12 === oppStoreIndex) playerGuruguruAfter++;
      }
      const disrupted = playerGuruguruNow - playerGuruguruAfter;
      if (disrupted > 0) score += disrupted * params.guruguruDisrupt;
      // 新規ぐるぐる倉の増加は playerThreatGrowth で聖流負担済み
    }

    // ─── ちらちら被弾防止（撒いた後に増えた被弾可能穴をペナルティ）───
    {
      let chirachiraAfter = 0;
      for (let q = oppLaneMin; q <= oppLaneMax; q++) {
        const cnt = pitsAfter[q].stones.length;
        if (cnt > 0 && (q + cnt) % 12 === storeIndex) chirachiraAfter++;
      }
      const newChirachira = chirachiraAfter - chirachiraNow;
      if (newChirachira > 0)
        defPenalty -= newChirachira * (params.oppChirachiraCreate ?? 12);
    }

    // ─── 自分のちらちら準備破壊防止（撒いた結果ちらちら狙い路が崩れたらペナルティ）───
    // lastPit === oppStoreIndex の手は意図的な使用なので免除
    if (lastPit !== oppStoreIndex) {
      let ownChirachiraAfter = 0;
      for (let q = laneMin; q <= laneMax; q++) {
        const cnt = pitsAfter[q].stones.length;
        if (cnt > 0 && (q + cnt) % 12 === oppStoreIndex) ownChirachiraAfter++;
      }
      const lost = ownChirachiraNow - ownChirachiraAfter;
      if (lost > 0) defPenalty -= lost * (params.ownChirachiraLost ?? 20);
    }

    // ─── くたくた妨害（相手がくたくた発動可能なら相手路への着地を避ける）───
    if (playerCanKutakuta) {
      for (let i = 0; i < count; i++) {
        const landingPit = (p + 1 + i) % 12;
        if (landingPit >= oppLaneMin && landingPit <= oppLaneMax) {
          defPenalty -= params.kutakutaLanePenalty ?? 6;
        }
      }
    }

    // ─── ぐるぐる ───
    if (lastPit === storeIndex) {
      const chainCount = countGuruguruChain(pitsAfter, storeIndex);
      if (isEarlyGame) {
        score +=
          params.guruguruBaseEarly * moodGuruguruMult +
          chainCount * chainCount * params.guruguruChainMultEarly;
        score += evalOwnFollowup(pitsAfter) * 0.8;
      } else {
        score +=
          params.guruguruBase +
          chainCount * chainCount * params.guruguruChainMult;
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
      const oppStoreColorSet = new Set(
        state.pits[oppStoreIndex].stones.map((s) => s.color),
      );
      for (const s of mirrorStones) {
        if (ownFortune && s.color === ownFortune)
          score += params.zakuzakuOwnFortune;
        // 相手の推定占い色（+3石）を奪う
        if (inferred && s.color === inferred) score += params.zakuzakuInferred;
        if (knownPos.includes(s.color)) score += params.zakuzakuKnownPos;
        // 相手賽壇に既にある色の石を奪う（相手の戦略否定）
        if (oppStoreColorSet.has(s.color))
          score += params.zakuzakuOppStoreColor ?? 5;
      }
      score += evalOwnFollowup(pitsAfter) * 0.8;
      const playerThreatMult = 0.5 + playerGuruguruNow * 0.3;
      score -= evalOppThreat(pitsAfter) * playerThreatMult;
    }

    // ─── ざくざく防御（撒き元の鏡穴に石があれば非線形ペナルティ）───
    if (lastPit !== oppStoreIndex) {
      const playerMirrorOfP = isOpp ? p - 6 : p + 6;
      if (state.pits[playerMirrorOfP].stones.length > 0) {
        const c = state.pits[playerMirrorOfP].stones.length;
        // 非線形: 1→-13, 2→-20, 3→-31, 4→-46, 5→-65
        score -= 10 + c * c * 2 + c;
        if (inferred) {
          const inferredHere = state.pits[playerMirrorOfP].stones.filter(
            (s) => s.color === inferred,
          ).length;
          score -= inferredHere * 9;
        }
      }
    }

    // ─── 石の着地先が相手空き路のミラー → 被ざくざくリスク（石数考慮）───
    for (let i = 0; i < count; i++) {
      const landingPit = (p + 1 + i) % 12;
      if (landingPit >= laneMin && landingPit <= laneMax) {
        const landedMirrorPlayer = isOpp ? landingPit - 6 : landingPit + 6;
        if (emptyPlayerPits.has(landedMirrorPlayer)) {
          const stonesInPit = pitsAfter[landingPit].stones.length;
          // 3石以上で急増: 1→-10, 2→-12, 3→-25, 4→-44, 5→-69
          score -=
            stonesInPit >= 3
              ? stonesInPit * stonesInPit * 3 - 2
              : 10 + stonesInPit;
        }
      }
    }

    // ─── 被ざくざく露出（撒き後に即取られ可能な高石穴）───
    // 自陣に石が多くて相手の対応穴が空 → 相手は次の手番で即座にざくざく可能
    for (let q = laneMin; q <= laneMax; q++) {
      const exposed = pitsAfter[q].stones.length;
      if (exposed < 3) continue; // 3石未満は安全圏
      const playerMirror = isOpp ? q - 6 : q + 6;
      if (pitsAfter[playerMirror].stones.length === 0) {
        // 石数^2 乗数: 3→-39, 4→-60, 5→-87, 6→-120
        defPenalty -=
          (params.zakuzakuExposedBase ?? 12) +
          exposed * exposed * (params.zakuzakuExposedMult ?? 3);
      }
    }

    // ─── 路の色品質評価（知識ベース: 占い/推測/確定情報を活用）───
    for (const s of state.pits[p].stones) {
      if (ownFortune && s.color === ownFortune)
        score += (params.pitColorOwnFortune ?? 2) * moodFortuneMult;
      if (inferred && s.color === inferred)
        score += params.pitColorInferred ?? 2.5;
      if (knownPos.includes(s.color)) score += params.pitColorKnownPos ?? 1.5;
      if (knownNeg && s.color === knownNeg)
        score -= params.pitColorKnownNeg ?? 6;
      // ownFortune / knownPos が確定している色は playerAvoidedColor で上書きしない
      if (
        playerAvoidedColor &&
        s.color === playerAvoidedColor &&
        !(ownFortune && s.color === ownFortune) &&
        !knownPos.includes(s.color)
      )
        score -= params.pitColorAvoided ?? 3;
    }

    // ─── 石の色評価 ───
    for (let i = 0; i < count; i++) {
      const landingPit = (p + 1 + i) % 12;
      const stoneColor = state.pits[p].stones[i]?.color;
      if (!stoneColor) continue;

      if (landingPit === storeIndex) {
        if (isEarlyGame) {
          if (ownFortune && stoneColor === ownFortune) {
            score += params.earlyOwnFortune * moodFortuneMult;
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
          // ownFortune / knownPos が確定している色は playerAvoidedColor で上書きしない
          if (
            playerAvoidedColor &&
            stoneColor === playerAvoidedColor &&
            !(ownFortune && stoneColor === ownFortune) &&
            !knownPos.includes(stoneColor)
          )
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

      // 自路に着地する石の色評価（将来の賽壇入り品質）
      if (landingPit >= laneMin && landingPit <= laneMax) {
        if (ownFortune && stoneColor === ownFortune)
          score += params.laneOwnFortune ?? 3;
        else if (inferred && stoneColor === inferred)
          score += params.laneInferred ?? 4;
        else if (knownPos.includes(stoneColor))
          score += params.laneKnownPos ?? 2;
        // 確定マイナス石が自路に残ると将来-3点確定
        if (knownNeg && stoneColor === knownNeg)
          score -= params.laneKnownNegPenalty ?? 8;
        // 相手が避けている色（推定マイナス）を自路に貯めない
        // ただし ownFortune / knownPos で確定済みなら上書きしない
        if (
          playerAvoidedColor &&
          stoneColor === playerAvoidedColor &&
          !(ownFortune && stoneColor === ownFortune) &&
          !knownPos.includes(stoneColor)
        )
          score -= params.laneAvoidedPenalty ?? 5;
      }

      // 確定マイナス石を相手路・相手賽壇に送り込めたらボーナス
      if (
        knownNeg &&
        stoneColor === knownNeg &&
        ((landingPit >= oppLaneMin && landingPit <= oppLaneMax) ||
          landingPit === oppStoreIndex)
      ) {
        score += params.sendKnownNegToOpp ?? 12;
      }
    }

    score += count * 0.1 + Math.random() * 0.06;
    pitScores.push({ pit: p, score, defPenalty });
  }

  // 防御ペナルティはタイブレーカーとしてのみ適用:
  // 最良攻撃スコアから window 以内の手にのみ defPenalty を加算して最終選択
  const _maxOff = Math.max(...pitScores.map((x) => x.score));
  const _window = params.defensiveTiebreakWindow ?? 8;
  for (const { pit, score: os, defPenalty: dp } of pitScores) {
    const finalScore = os + (os >= _maxOff - _window ? dp : 0);
    if (finalScore > bestScore) {
      bestScore = finalScore;
      best = pit;
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
  params = null,
) {
  const p = params || {};
  const oppStoreIndex = role === "opp" ? 5 : 11; // ぽいぽいで狙う相手の賽壇

  if (peeksDone >= 3) {
    // ちらちら回数なし → ぽいぽいのみ
    return _resolvePoipoi(state, memo, fortune, role, p);
  }

  // 自陣の石が少ない場合は強制ちらちらを解除（点数稼ぎ優先）
  const ownLaneMin = role === "opp" ? 6 : 0;
  const ownLaneMax = role === "opp" ? 10 : 4;
  const selfLaneStones = state.pits
    .slice(ownLaneMin, ownLaneMax + 1)
    .reduce((sum, pit) => sum + pit.stones.length, 0);
  const laneRich = selfLaneStones >= (p.forceChirachiraMinLane ?? 3);
  if (isOni && laneRich && peeksDone < (p.forceChirachiraThreshold ?? 2)) {
    // 鬼: 自陣に石がある間だけ強制ちらちら
    return { action: "chirachira" };
  }

  // ぽいぽいの価値を計算してちらちらと比較
  const inferred = memo.inferredPlayerColor;
  const playerHasInferred =
    inferred &&
    state.pits[oppStoreIndex].stones.some((s) => s.color === inferred);
  const poipoiValue = playerHasInferred
    ? (p.poipoiWithFortune ?? 20)
    : state.pits[oppStoreIndex].stones.length >= 2
      ? (p.poipoiGeneral ?? 8)
      : 0;
  const chirachiraRemaining = 3 - peeksDone;
  const chirachiraValue = isOni
    ? chirachiraRemaining >= 2
      ? (p.chirachiraThresholdHigh ?? 10)
      : (p.chirachiraThresholdLow ?? 4)
    : chirachiraRemaining >= 2
      ? 12
      : 6;

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
  let bestVal = 0; // 0以下なら実行しない
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
    removeStoneIndex: bestIdx,
  };
}
