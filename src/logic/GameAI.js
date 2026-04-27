/**
 * GameAI.js
 * ゲーム AI ロジック（V1）
 * シミュレーション非依存の純粋関数 AI
 */

export function createMemoV1() {
  return {
    playerColorFreq: {},
    inferredPlayerColor: null,
    playerAvoidedColor: null,
  };
}

/**
 * 繧ｿ繝ｼ繝ｳ髢句ｧ区凾縺ｫ繝励Ξ繧､繝､繝ｼ濶ｲ蛯ｾ蜷代ｒ譖ｴ譁ｰ
 * @param {string[]} excludeColors - 遒ｺ螳壽ｸ医∩荳ｭ螟ｮ遏ｳ縺ｮ濶ｲ・亥倶ｺｺ蜊縺・〒縺ｯ縺ｪ縺・→遒ｺ隱肴ｸ医∩・・
 */
export function updateMemoV1(memo, state, excludeColors = []) {
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
  // 遒ｺ螳壽ｸ医∩荳ｭ螟ｮ遏ｳ縺ｮ濶ｲ縺ｯ蛟倶ｺｺ蜊縺・〒縺ｯ縺ｪ縺・竊・inferred縺九ｉ髯､螟・
  const sorted = Object.entries(memo.playerColorFreq)
    .filter(([color]) => !excludeColors.includes(color))
    .sort((a, b) => b[1] - a[1]);
  memo.inferredPlayerColor = sorted[0]?.[0] ?? null;
  memo.playerAvoidedColor =
    sorted.length >= 3 ? sorted[sorted.length - 1][0] : null;
}

// 笏笏笏 縺｡繧峨■繧峨・縺ｽ縺・⊃縺・衍隴・笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏

export function KugutsuV1(
  validPits,
  state,
  peeksDoneAI,
  peeksDonePlayer,
  fortune,
  maxDepth = 5,
) {
  // 蛻晄悄pit遏ｳ謨ｰ・医き繧ｦ繝ｳ繝医・縺ｿ縲・ｫ倬溘す繝溘Η繝ｬ繝ｼ繧ｷ繝ｧ繝ｳ逕ｨ・・
  const initCounts = state.pits.map((p) => p.stones.length);

  // AI縺ｮ2蝗樒岼縺｡繧峨■繧峨〒繝槭う繝翫せ濶ｲ繧堤｢ｺ螳壹〒縺阪ｋ縺・
  const hasUnconfirmedNegForAI = fortune.center.some(
    (fc) => fc.bonus < 0 && !fc.seenBy.includes("opp"),
  );
  // 繝励Ξ繧､繝､繝ｼ縺ｮ2蝗樒岼縺｡繧峨■繧峨〒繝槭う繝翫せ濶ｲ繧堤｢ｺ螳壹〒縺阪ｋ縺・
  const hasUnconfirmedNegForPlayer = fortune.center.some(
    (fc) => fc.bonus < 0 && !fc.seenBy.includes("self"),
  );

  // 笏笏笏 鬮倬滓鋳縺阪す繝溘Η繝ｬ繝ｼ繧ｷ繝ｧ繝ｳ・育浹謨ｰ繧ｫ繧ｦ繝ｳ繝医・縺ｿ・俄楳笏笏
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

  // 笏笏笏 荳謇九・繧ｹ繧ｳ繧｢險育ｮ・笏笏笏
  // isAI: true=AI(pit6-10竊恥it11), false=Player(pit0-4竊恥it5)
  // peeks: 縺昴・蠖ｹ縺ｮ縺｡繧峨■繧牙ｮ御ｺ・屓謨ｰ
  function scoreSow(counts, pit, isAI, peeks) {
    const laneMin = isAI ? 6 : 0;
    const laneMax = isAI ? 10 : 4;
    const storeIndex = isAI ? 11 : 5;
    const oppStoreIndex = isAI ? 5 : 11;
    const n = counts[pit];
    const lastPit = (pit + n) % 12;
    let score = 0;

    // 縺舌ｋ縺舌ｋ: +5
    if (lastPit === storeIndex) score += 5;

    // 縺｡繧峨■繧・ +9 (荳企剞2蝗・, 2蝗樒岼縺ｫ繝槭う繝翫せ遒ｺ螳壹↑繧・8霑ｽ蜉
    if (lastPit === oppStoreIndex && peeks < 2) {
      score += 9;
      if (peeks === 1) {
        score += isAI
          ? hasUnconfirmedNegForAI
            ? 8
            : 0
          : hasUnconfirmedNegForPlayer
            ? 8
            : 0;
      }
    }

    // 縺悶￥縺悶￥: +7 + 蜿悶ｌ縺溽浹謨ｰﾃ・ (逹蝨ｰ蜈医′閾ｪ髯｣縺ｮ遨ｺ縺阪°縺､髀｡縺ｫ遏ｳ縺ゅｊ)
    if (lastPit >= laneMin && lastPit <= laneMax && counts[lastPit] === 0) {
      const mirror = isAI ? lastPit - 6 : lastPit + 6;
      if (counts[mirror] > 0) score += 7 + counts[mirror];
    }

    return { score, lastPit };
  }

  // 笏笏笏 蜈ｨ謇九ｒ蜿門ｾ暦ｼ磯∈謚槫庄閭ｽ縺ｪ霍ｯ縺吶∋縺ｦ繧定ｩ穂ｾ｡・俄楳笏笏
  function getTopMoves(counts, isAI, peeks, restrictTo) {
    const laneMin = isAI ? 6 : 0;
    const laneMax = isAI ? 10 : 4;
    const pool =
      restrictTo ??
      Array.from({ length: laneMax - laneMin + 1 }, (_, i) => laneMin + i);

    const scored = [];
    for (const p of pool) {
      if (counts[p] === 0) continue;
      const { score } = scoreSow(counts, p, isAI, peeks);
      scored.push({ pit: p, score });
    }
    return scored;
  }

  // 笏笏笏 縺上◆縺上◆逋ｺ蜍募庄閭ｽ繝√ぉ繝・け 笏笏笏
  // AI: aiStore >= playerStore - 6 (鬯ｼ縺ｮ迪ｶ莠・
  // Player: playerStore >= aiStore
  function canKutakutaAI(counts) {
    return counts[11] >= counts[5] - 6;
  }
  function canKutakutaPlayer(counts) {
    return counts[5] >= counts[11];
  }

  // 笏笏笏 DFS・亥・蟶ｰ豺ｱ縺・・俄楳笏笏
  let bestFirstPit = validPits[0];
  let bestNet = -Infinity;

  // prevAiKk / prevPlayerKk: 蜑肴焔逡ｪ邨ゆｺ・凾轤ｹ縺ｧ縺ｮ縺上◆縺上◆逋ｺ蜍募庄閭ｽ繝輔Λ繧ｰ
  // ・域眠縺溘↓蜿ｯ閭ｽ縺ｫ縺ｪ縺｣縺滓凾縺縺・2繧貞刈邂励☆繧九◆繧・ｼ・
  const initAiKk = canKutakutaAI(initCounts);
  const initPlayerKk = canKutakutaPlayer(initCounts);

  function dfs(
    depth,
    isAITurn,
    isFirstMove,
    chainDepth,
    counts,
    aiPeeks,
    playerPeeks,
    aiScore,
    playerScore,
    firstPit,
    prevAiKk,
    prevPlayerKk,
  ) {
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

    // 謇九・蛟呵｣懶ｼ域怙蛻昴・1謇九・縺ｿvalidPits縺ｫ蛻ｶ髯撰ｼ・
    const topMoves = isFirstMove
      ? getTopMoves(counts, true, aiPeeks, validPits)
      : getTopMoves(counts, isAI, peeks, null);

    if (topMoves.length === 0) {
      // 謇薙※繧区焔縺ｪ縺・竊・縺薙・繝悶Λ繝ｳ繝√・隧穂ｾ｡縺励↑縺・
      return;
    }

    for (const { pit } of topMoves) {
      const { score, lastPit } = scoreSow(counts, pit, isAI, peeks);
      const { counts: newCounts } = fastSow(counts, pit);

      // 縺｡繧峨■繧牙屓謨ｰ譖ｴ譁ｰ
      let newAiPeeks = aiPeeks;
      let newPlayerPeeks = playerPeeks;
      if (lastPit === oppStoreIndex && peeks < 2) {
        if (isAI) newAiPeeks++;
        else newPlayerPeeks++;
      }

      // 縺上◆縺上◆譁ｰ隕剰ｧ｣謾ｾ: +2
      const newAiKk = canKutakutaAI(newCounts);
      const newPlayerKk = canKutakutaPlayer(newCounts);
      const aiKkBonus = !prevAiKk && newAiKk ? 2 : 0;
      const playerKkBonus = !prevPlayerKk && newPlayerKk ? 2 : 0;

      const newAiScore = isAI
        ? aiScore + score + aiKkBonus
        : aiScore + aiKkBonus;
      const newPlayerScore = !isAI
        ? playerScore + score + playerKkBonus
        : playerScore + playerKkBonus;

      const fp = isFirstMove ? pit : firstPit;

      if (lastPit === storeIndex && chainDepth < 10) {
        // 縺舌ｋ縺舌ｋ: depth 繧呈ｶ郁ｲｻ縺励↑縺・∝酔繝励Ξ繧､繝､繝ｼ邯咏ｶ夲ｼ医メ繧ｧ繝ｼ繝ｳ荳企剞10・・
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
          newPlayerKk,
        );
      } else {
        // 騾壼ｸｸ or 縺舌ｋ縺舌ｋ荳企剞蛻ｰ驕・ depth+1縲∫嶌謇九↓莠､莉｣
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
          newPlayerKk,
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
    initPlayerKk,
  );

  return validPits.includes(bestFirstPit) ? bestFirstPit : validPits[0];
}

// 笏笏笏 RoboV1: OniV3螳悟・繝代Λ繝｡繝ｼ繧ｿ蛹悶け繝ｭ繝ｼ繝ｳ 笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏

/**
 * RoboV1 繝斐ャ繝磯∈謚・- OniV3繧貞ｮ悟・繝代Λ繝｡繝ｼ繧ｿ蛹悶＠縺溘Δ繝・Ν
 *
 * OniV3縺ｨ蜷後§蜈郁ｪｭ縺ｿDFS讒矩縺縺後∝・繧ｹ繧ｳ繧｢蛟､縺悟庄螟峨ヱ繝ｩ繝｡繝ｼ繧ｿ縲・
 * 縺｡繧峨■繧我ｸ企剞繧・roboChirachiraLimit 縺ｧ蛻ｶ蠕｡・育┌蛻ｶ髯仙庄・峨・
 * role="opp" 縺ｪ繧・pit6-10 縺・AI 繝ｬ繝ｼ繝ｳ縲〉ole="self" 縺ｪ繧・pit0-4 縺・AI 繝ｬ繝ｼ繝ｳ縲・
 *
 * @param {number[]} validPits      - AI縺碁∈縺ｹ繧玖ｷｯ繧､繝ｳ繝・ャ繧ｯ繧ｹ
 * @param {object}   state          - GameState 繧ｹ繝翫ャ繝励す繝ｧ繝・ヨ
 * @param {number}   peeksDoneAI    - AI縺ｮ縺｡繧峨■繧牙ｮ御ｺ・屓謨ｰ
 * @param {number}   peeksDonePlayer- 繝励Ξ繧､繝､繝ｼ縺ｮ縺｡繧峨■繧牙ｮ御ｺ・屓謨ｰ
 * @param {object}   fortune        - { center: [{bonus, seenBy},...] }
 * @param {object}   params         - DEFAULT_ROBO_PARAMS 逶ｸ蠖薙・繝代Λ繝｡繝ｼ繧ｿ
 * @param {string}   role           - "opp" (繝・ヵ繧ｩ繝ｫ繝・ | "self"
 */

export function KisinV1(
  validPits,
  state,
  peeksDoneAI,
  peeksDonePlayer,
  fortune,
  params,
  role = "opp",
) {
  // ─── role対応レーン/賽壇インデックス ───
  const isOppRole = role === "opp";
  const aiLaneMin = isOppRole ? 6 : 0;
  const aiLaneMax = isOppRole ? 10 : 4;
  const aiStore = isOppRole ? 11 : 5;
  const playerStore = isOppRole ? 5 : 11;
  const plLaneMin = isOppRole ? 0 : 6;
  const plLaneMax = isOppRole ? 4 : 10;
  const aiSideKey = isOppRole ? "opp" : "self";
  const plSideKey = isOppRole ? "self" : "opp";

  const maxDepth = 5;

  const initCounts = state.pits.map((p) => p.stones.length);

  // AIの2回目ちらちらでマイナス色を確定できるか
  const hasUnconfirmedNegForAI = fortune.center.some(
    (fc) => fc.bonus < 0 && !fc.seenBy.includes(aiSideKey),
  );
  // プレイヤーの2回目ちらちらでマイナス色を確定できるか
  const hasUnconfirmedNegForPlayer = fortune.center.some(
    (fc) => fc.bonus < 0 && !fc.seenBy.includes(plSideKey),
  );

  // ─── 高速撒きシミュレーション ───
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

  // ─── 1手スコア評価 ───
  function scoreSow(counts, pit, isAI, peeks) {
    const laneMin = isAI ? aiLaneMin : plLaneMin;
    const laneMax = isAI ? aiLaneMax : plLaneMax;
    const storeIndex = isAI ? aiStore : playerStore;
    const oppStoreIndex = isAI ? playerStore : aiStore;
    const n = counts[pit];
    const lastPit = (pit + n) % 12;
    let score = 0;

    // ぐるぐる: +5
    if (lastPit === storeIndex) score += 5;

    // ちらちら: +9 (上限2回), 2回目にマイナス未確定なら+8追加
    if (lastPit === oppStoreIndex && peeks < 2) {
      score += 9;
      if (peeks === 1) {
        score += isAI
          ? hasUnconfirmedNegForAI
            ? 8
            : 0
          : hasUnconfirmedNegForPlayer
            ? 8
            : 0;
      }
    }

    // ざくざく: +7 + 取れた石数
    if (lastPit >= laneMin && lastPit <= laneMax && counts[lastPit] === 0) {
      const mirror = isAI
        ? isOppRole
          ? lastPit - 6
          : lastPit + 6
        : isOppRole
          ? lastPit + 6
          : lastPit - 6;
      if (counts[mirror] > 0) score += 7 + counts[mirror];
    }

    return { score, lastPit };
  }

  // ─── 全手を取得 ───
  function getTopMoves(counts, isAI, peeks, restrictTo) {
    const laneMin = isAI ? aiLaneMin : plLaneMin;
    const laneMax = isAI ? aiLaneMax : plLaneMax;
    const pool =
      restrictTo ??
      Array.from({ length: laneMax - laneMin + 1 }, (_, i) => laneMin + i);
    const scored = [];
    for (const p of pool) {
      if (counts[p] === 0) continue;
      const { score } = scoreSow(counts, p, isAI, peeks);
      scored.push({ pit: p, score });
    }
    return scored;
  }

  // ─── くたくた発動可能チェック ───
  function canKutakutaAI(counts) {
    return counts[aiStore] >= counts[playerStore] - 6;
  }
  function canKutakutaPlayer(counts) {
    return counts[playerStore] >= counts[aiStore];
  }

  // ─── DFS（ぐるぐる連鎖はdepthを消費しない） ───
  let bestFirstPit = validPits[0];
  let bestNet = -Infinity;

  const initAiKk = canKutakutaAI(initCounts);
  const initPlayerKk = canKutakutaPlayer(initCounts);

  function dfs(
    depth,
    isAITurn,
    isFirstMove,
    chainDepth,
    counts,
    aiPeeks,
    playerPeeks,
    aiScore,
    playerScore,
    firstPit,
    prevAiKk,
    prevPlayerKk,
  ) {
    if (depth === maxDepth) {
      const net = aiScore - playerScore;
      if (net > bestNet) {
        bestNet = net;
        bestFirstPit = firstPit;
      }
      return;
    }

    const isAI = isAITurn;
    const storeIndex = isAI ? aiStore : playerStore;
    const peeks = isAI ? aiPeeks : playerPeeks;
    const oppStoreIndex = isAI ? playerStore : aiStore;

    const topMoves = isFirstMove
      ? getTopMoves(counts, true, aiPeeks, validPits)
      : getTopMoves(counts, isAI, peeks, null);

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

      const newAiScore = isAI
        ? aiScore + score + aiKkBonus
        : aiScore + aiKkBonus;
      const newPlayerScore = !isAI
        ? playerScore + score + playerKkBonus
        : playerScore + playerKkBonus;

      const fp = isFirstMove ? pit : firstPit;

      if (lastPit === storeIndex && chainDepth < 10) {
        // ぐるぐる連鎖: depthを消費せず同プレイヤー継続
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
          newPlayerKk,
        );
      } else {
        // 通常 or ぐるぐる連鎖終了 → depth+1、次手に交代
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
          newPlayerKk,
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
    initPlayerKk,
  );

  return validPits.includes(bestFirstPit) ? bestFirstPit : validPits[0];
}

// ─── SimKisinV1: シミュ専用・params変数を実際に使うぐるぐる武闘派 ──────────────

/**
 * SimKisinV1 ピット選択
 * KisinV1 と同じ DFS 構造だが params を実際に scoreSow に適用する。
 * - guruguru: params.kisinGuruguruScore (50, kugutsuの10倍)
 * - chirachira: params.kisinChirachiraScore (55) / kisinChirachiraScore2 (25), 上限 kisinChirachiraLimit (3)
 * - zakuzaku: params.kisinZakuzakuBase (8) + 取れた石数
 * - kutakuta: params.kisinKutakutaBonus (0) → 使わない
 */
export function SimKisinV1(
  validPits,
  state,
  peeksDoneAI,
  peeksDonePlayer,
  fortune,
  params,
  role = "opp",
) {
  const isOppRole = role === "opp";
  const aiLaneMin = isOppRole ? 6 : 0;
  const aiLaneMax = isOppRole ? 10 : 4;
  const aiStore = isOppRole ? 11 : 5;
  const playerStore = isOppRole ? 5 : 11;
  const plLaneMin = isOppRole ? 0 : 6;
  const plLaneMax = isOppRole ? 4 : 10;
  const aiSideKey = isOppRole ? "opp" : "self";
  const plSideKey = isOppRole ? "self" : "opp";

  const maxDepth = params.kisinDepth ?? 5;
  const guruScore = params.kisinGuruguruScore ?? 50;
  const chiraScore1 = params.kisinChirachiraScore ?? 55;
  const chiraScore2 = params.kisinChirachiraScore2 ?? 25;
  const chiraLimit = params.kisinChirachiraLimit ?? 3;
  const zakuBase = params.kisinZakuzakuBase ?? 8;
  const kkBonus = params.kisinKutakutaBonus ?? 0;

  const initCounts = state.pits.map((p) => p.stones.length);

  const hasUnconfirmedNegForAI = fortune.center.some(
    (fc) => fc.bonus < 0 && !fc.seenBy.includes(aiSideKey),
  );
  const hasUnconfirmedNegForPlayer = fortune.center.some(
    (fc) => fc.bonus < 0 && !fc.seenBy.includes(plSideKey),
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
    const storeIndex = isAI ? aiStore : playerStore;
    const oppStoreIndex = isAI ? playerStore : aiStore;
    const n = counts[pit];
    const lastPit = (pit + n) % 12;
    let score = 0;

    // ぐるぐる: AI ターンは武闘派スコア、プレイヤーターンは kugutsu 基準(5)で推定
    if (lastPit === storeIndex) {
      score += isAI ? guruScore : 5;
    }

    // ちらちら: AI ターンはパラメータ、プレイヤーターンは kugutsu 基準(9/8)
    if (lastPit === oppStoreIndex && peeks < chiraLimit) {
      if (isAI) {
        const cs = peeks === 0 ? chiraScore1 : chiraScore2;
        score += cs;
        if (peeks === chiraLimit - 1 && hasUnconfirmedNegForAI) score += 8;
      } else {
        score += peeks === 0 ? 9 : 8;
        if (peeks === 1 && hasUnconfirmedNegForPlayer) score += 8;
      }
    }

    // ざくざく: AI ターンはパラメータ、プレイヤーターンは kugutsu 基準(7)
    if (lastPit >= laneMin && lastPit <= laneMax && counts[lastPit] === 0) {
      const mirror = isAI
        ? isOppRole
          ? lastPit - 6
          : lastPit + 6
        : isOppRole
          ? lastPit + 6
          : lastPit - 6;
      if (counts[mirror] > 0) score += (isAI ? zakuBase : 7) + counts[mirror];
    }

    return { score, lastPit };
  }

  function getTopMoves(counts, isAI, peeks, restrictTo) {
    const laneMin = isAI ? aiLaneMin : plLaneMin;
    const laneMax = isAI ? aiLaneMax : plLaneMax;
    const pool =
      restrictTo ??
      Array.from({ length: laneMax - laneMin + 1 }, (_, i) => laneMin + i);
    const scored = [];
    for (const p of pool) {
      if (counts[p] === 0) continue;
      const { score } = scoreSow(counts, p, isAI, peeks);
      scored.push({ pit: p, score });
    }
    return scored;
  }

  function canKutakutaAI(counts) {
    return counts[aiStore] >= counts[playerStore] - 6;
  }
  function canKutakutaPlayer(counts) {
    return counts[playerStore] >= counts[aiStore];
  }

  let bestFirstPit = validPits[0];
  let bestNet = -Infinity;

  const initAiKk = canKutakutaAI(initCounts);
  const initPlayerKk = canKutakutaPlayer(initCounts);

  function dfs(
    depth,
    isAITurn,
    isFirstMove,
    chainDepth,
    counts,
    aiPeeks,
    playerPeeks,
    aiScore,
    playerScore,
    firstPit,
    prevAiKk,
    prevPlayerKk,
  ) {
    if (depth === maxDepth) {
      const net = aiScore - playerScore;
      if (net > bestNet) {
        bestNet = net;
        bestFirstPit = firstPit;
      }
      return;
    }

    const storeIndex = isAITurn ? aiStore : playerStore;
    const oppStoreIndex = isAITurn ? playerStore : aiStore;
    const peeks = isAITurn ? aiPeeks : playerPeeks;

    const topMoves = isFirstMove
      ? getTopMoves(counts, true, aiPeeks, validPits)
      : getTopMoves(counts, isAITurn, peeks, null);

    if (topMoves.length === 0) return;

    for (const { pit } of topMoves) {
      const { score, lastPit } = scoreSow(counts, pit, isAITurn, peeks);
      const { counts: newCounts } = fastSow(counts, pit);

      let newAiPeeks = aiPeeks;
      let newPlayerPeeks = playerPeeks;
      if (lastPit === oppStoreIndex && peeks < chiraLimit) {
        if (isAITurn) newAiPeeks++;
        else newPlayerPeeks++;
      }

      const newAiKk = canKutakutaAI(newCounts);
      const newPlayerKk = canKutakutaPlayer(newCounts);
      const aiKkBonus = !prevAiKk && newAiKk ? kkBonus : 0;
      const playerKkBonus = !prevPlayerKk && newPlayerKk ? kkBonus : 0;

      const newAiScore = isAITurn
        ? aiScore + score + aiKkBonus
        : aiScore + aiKkBonus;
      const newPlayerScore = !isAITurn
        ? playerScore + score + playerKkBonus
        : playerScore + playerKkBonus;

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
          newPlayerKk,
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
          newPlayerKk,
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
    initPlayerKk,
  );

  return validPits.includes(bestFirstPit) ? bestFirstPit : validPits[0];
}

// ─── KisinV2: ゲーム用・ぐるぐる武闘派（SimKisinV1 の安定コピー） ─────────────

export function KisinV2(
  validPits,
  state,
  peeksDoneAI,
  peeksDonePlayer,
  fortune,
  params,
  role = "opp",
) {
  const isOppRole = role === "opp";
  const aiLaneMin = isOppRole ? 6 : 0;
  const aiLaneMax = isOppRole ? 10 : 4;
  const aiStore = isOppRole ? 11 : 5;
  const playerStore = isOppRole ? 5 : 11;
  const plLaneMin = isOppRole ? 0 : 6;
  const plLaneMax = isOppRole ? 4 : 10;
  const aiSideKey = isOppRole ? "opp" : "self";
  const plSideKey = isOppRole ? "self" : "opp";

  const maxDepth = params.kisinDepth ?? 5;
  const guruScore = params.kisinGuruguruScore ?? 50;
  const chiraScore1 = params.kisinChirachiraScore ?? 55;
  const chiraScore2 = params.kisinChirachiraScore2 ?? 25;
  const chiraLimit = params.kisinChirachiraLimit ?? 3;
  const zakuBase = params.kisinZakuzakuBase ?? 8;
  const kkBonus = params.kisinKutakutaBonus ?? 0;

  const initCounts = state.pits.map((p) => p.stones.length);

  const hasUnconfirmedNegForAI = fortune.center.some(
    (fc) => fc.bonus < 0 && !fc.seenBy.includes(aiSideKey),
  );
  const hasUnconfirmedNegForPlayer = fortune.center.some(
    (fc) => fc.bonus < 0 && !fc.seenBy.includes(plSideKey),
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
    const storeIndex = isAI ? aiStore : playerStore;
    const oppStoreIndex = isAI ? playerStore : aiStore;
    const n = counts[pit];
    const lastPit = (pit + n) % 12;
    let score = 0;

    // ぐるぐる: AI ターンは武闘派スコア、プレイヤーターンは kugutsu 基準(5)で推定
    if (lastPit === storeIndex) {
      score += isAI ? guruScore : 5;
    }

    // ちらちら: AI ターンはパラメータ、プレイヤーターンは kugutsu 基準(9/8)
    if (lastPit === oppStoreIndex && peeks < chiraLimit) {
      if (isAI) {
        const cs = peeks === 0 ? chiraScore1 : chiraScore2;
        score += cs;
        if (peeks === chiraLimit - 1 && hasUnconfirmedNegForAI) score += 8;
      } else {
        score += peeks === 0 ? 9 : 8;
        if (peeks === 1 && hasUnconfirmedNegForPlayer) score += 8;
      }
    }

    // ざくざく: AI ターンはパラメータ、プレイヤーターンは kugutsu 基準(7)
    if (lastPit >= laneMin && lastPit <= laneMax && counts[lastPit] === 0) {
      const mirror = isAI
        ? isOppRole
          ? lastPit - 6
          : lastPit + 6
        : isOppRole
          ? lastPit + 6
          : lastPit - 6;
      if (counts[mirror] > 0) score += (isAI ? zakuBase : 7) + counts[mirror];
    }

    return { score, lastPit };
  }

  function getTopMoves(counts, isAI, peeks, restrictTo) {
    const laneMin = isAI ? aiLaneMin : plLaneMin;
    const laneMax = isAI ? aiLaneMax : plLaneMax;
    const pool =
      restrictTo ??
      Array.from({ length: laneMax - laneMin + 1 }, (_, i) => laneMin + i);
    const scored = [];
    for (const p of pool) {
      if (counts[p] === 0) continue;
      const { score } = scoreSow(counts, p, isAI, peeks);
      scored.push({ pit: p, score });
    }
    return scored;
  }

  function canKutakutaAI(counts) {
    return counts[aiStore] >= counts[playerStore] - 6;
  }
  function canKutakutaPlayer(counts) {
    return counts[playerStore] >= counts[aiStore];
  }

  let bestFirstPit = validPits[0];
  let bestNet = -Infinity;

  const initAiKk = canKutakutaAI(initCounts);
  const initPlayerKk = canKutakutaPlayer(initCounts);

  function dfs(
    depth,
    isAITurn,
    isFirstMove,
    chainDepth,
    counts,
    aiPeeks,
    playerPeeks,
    aiScore,
    playerScore,
    firstPit,
    prevAiKk,
    prevPlayerKk,
  ) {
    if (depth === maxDepth) {
      const net = aiScore - playerScore;
      if (net > bestNet) {
        bestNet = net;
        bestFirstPit = firstPit;
      }
      return;
    }

    const storeIndex = isAITurn ? aiStore : playerStore;
    const oppStoreIndex = isAITurn ? playerStore : aiStore;
    const peeks = isAITurn ? aiPeeks : playerPeeks;

    const topMoves = isFirstMove
      ? getTopMoves(counts, true, aiPeeks, validPits)
      : getTopMoves(counts, isAITurn, peeks, null);

    if (topMoves.length === 0) return;

    for (const { pit } of topMoves) {
      const { score, lastPit } = scoreSow(counts, pit, isAITurn, peeks);
      const { counts: newCounts } = fastSow(counts, pit);

      let newAiPeeks = aiPeeks;
      let newPlayerPeeks = playerPeeks;
      if (lastPit === oppStoreIndex && peeks < chiraLimit) {
        if (isAITurn) newAiPeeks++;
        else newPlayerPeeks++;
      }

      const newAiKk = canKutakutaAI(newCounts);
      const newPlayerKk = canKutakutaPlayer(newCounts);
      const aiKkBonus = !prevAiKk && newAiKk ? kkBonus : 0;
      const playerKkBonus = !prevPlayerKk && newPlayerKk ? kkBonus : 0;

      const newAiScore = isAITurn
        ? aiScore + score + aiKkBonus
        : aiScore + aiKkBonus;
      const newPlayerScore = !isAITurn
        ? playerScore + score + playerKkBonus
        : playerScore + playerKkBonus;

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
          newPlayerKk,
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
          newPlayerKk,
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
    initPlayerKk,
  );

  return validPits.includes(bestFirstPit) ? bestFirstPit : validPits[0];
}

// 笏笏笏 HardV1: 3謇狗分蜈郁ｪｭ縺ｿ・医＄繧九＄繧九・縺悶￥縺悶￥迚ｹ蛹厄ｼ・笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏

/**
 * HardV1 繝斐ャ繝磯∈謚・- 3謇狗分蜈郁ｪｭ縺ｿ
 *
 * 謇狗分鬆・ AI 竊・Player 竊・AI (險・謇狗分)
 * 蜷・焔逡ｪ縺ｧ隧穂ｾ｡縺ｮ鬮倥＞荳贋ｽ・謇九ｒ蛟呵｣懊→縺励・^3 = 27 繝代せ繧貞・蛻玲嫌縲・
 * AI邏ｯ險医せ繧ｳ繧｢ - Player邏ｯ險医せ繧ｳ繧｢縺梧怙螟ｧ縺ｮ繝代せ縺ｮ譛蛻昴・霍ｯ繧定ｿ斐☆縲・
 *
 * 笘・音谿翫Ν繝ｼ繝ｫ
 *   DFS蜑阪↓縺｡繧峨■繧・pit5逹蝨ｰ)縺ｧ縺阪ｋ霍ｯ縺後≠繧後・蜊ｳ驕ｸ謚橸ｼ井ｸ企剞2蝗橸ｼ峨・
 *
 * 笘・ｩ穂ｾ｡蝓ｺ貅厄ｼ医＄繧九＄繧九・縺悶￥縺悶￥縺ｮ縺ｿ・・
 *   縺舌ｋ縺舌ｋ逋ｺ蜍・     : +5
 *   縺悶￥縺悶￥逋ｺ蜍・     : +7 + 蜿悶ｌ縺溽浹謨ｰ
 *
 * @param {number[]} validPits    - AI縺碁∈縺ｹ繧玖ｷｯ繧､繝ｳ繝・ャ繧ｯ繧ｹ
 * @param {object}   state        - GameState 縺ｮ繧ｹ繝翫ャ繝励す繝ｧ繝・ヨ
 * @param {number}   peeksDoneAI  - AI縺ｮ縺｡繧峨■繧牙ｮ御ｺ・屓謨ｰ
 */

export function pickPitTechDfsV1(validPits, state, peeksDoneAI) {
  const initCounts = state.pits.map((p) => p.stones.length);

  // 縺｡繧峨■繧牙ｼｷ蛻ｶ繝√ぉ繝・け: 縺溘∪縺溘∪pit5逹蝨ｰ縺ｧ縺阪ｋ霍ｯ縺後≠繧後・蜊ｳ驕ｸ謚橸ｼ井ｸ企剞2・・
  if (peeksDoneAI < 2) {
    const chirachiraPit = validPits.find((p) => {
      const n = initCounts[p];
      return n > 0 && (p + n) % 12 === 5;
    });
    if (chirachiraPit !== undefined) return chirachiraPit;
  }

  // 笏笏笏 鬮倬滓鋳縺阪す繝溘Η繝ｬ繝ｼ繧ｷ繝ｧ繝ｳ 笏笏笏
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

  // 笏笏笏 繧ｹ繧ｳ繧｢險育ｮ暦ｼ医＄繧九＄繧九・縺悶￥縺悶￥縺ｮ縺ｿ・俄楳笏笏
  function scoreSow(counts, pit, isAI) {
    const laneMin = isAI ? 6 : 0;
    const laneMax = isAI ? 10 : 4;
    const storeIndex = isAI ? 11 : 5;
    const n = counts[pit];
    const lastPit = (pit + n) % 12;
    let score = 0;

    // 縺舌ｋ縺舌ｋ: +5
    if (lastPit === storeIndex) score += 5;

    // 縺悶￥縺悶￥: +7 + 蜿悶ｌ縺溽浹謨ｰ
    if (lastPit >= laneMin && lastPit <= laneMax && counts[lastPit] === 0) {
      const mirror = isAI ? lastPit - 6 : lastPit + 6;
      if (counts[mirror] > 0) score += 7 + counts[mirror];
    }

    return { score, lastPit };
  }

  // 笏笏笏 荳贋ｽ康謇句叙蠕・笏笏笏
  function getTopMoves(counts, isAI, n, restrictTo) {
    const laneMin = isAI ? 6 : 0;
    const laneMax = isAI ? 10 : 4;
    const pool =
      restrictTo ??
      Array.from({ length: laneMax - laneMin + 1 }, (_, i) => laneMin + i);
    const scored = [];
    for (const p of pool) {
      if (counts[p] === 0) continue;
      const { score } = scoreSow(counts, p, isAI);
      scored.push({ pit: p, score });
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, n);
  }

  // 笏笏笏 DFS・域ｷｱ縺・: AI竊単layer竊但I・俄楳笏笏
  let bestFirstPit = validPits[0];
  let bestNet = -Infinity;

  function dfs(depth, counts, aiScore, playerScore, firstPit) {
    if (depth === 3) {
      const net = aiScore - playerScore;
      if (net > bestNet) {
        bestNet = net;
        bestFirstPit = firstPit;
      }
      return;
    }

    const isAI = depth % 2 === 0; // depth 0,2 = AI; 1 = Player
    const topMoves =
      depth === 0
        ? getTopMoves(counts, true, 3, validPits)
        : getTopMoves(counts, isAI, 3, null);

    if (topMoves.length === 0) {
      dfs(depth + 1, counts, aiScore, playerScore, firstPit);
      return;
    }

    for (const { pit } of topMoves) {
      const { score } = scoreSow(counts, pit, isAI);
      const { counts: newCounts } = fastSow(counts, pit);
      const newAiScore = isAI ? aiScore + score : aiScore;
      const newPlayerScore = !isAI ? playerScore + score : playerScore;
      const fp = depth === 0 ? pit : firstPit;
      dfs(depth + 1, newCounts, newAiScore, newPlayerScore, fp);
    }
  }

  dfs(0, initCounts, 0, 0, validPits[0]);

  return validPits.includes(bestFirstPit) ? bestFirstPit : validPits[0];
}

// 笏笏笏 OniV3: 縺悶￥縺悶￥蠕檎浹驟咲ｽｮ 笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏

/**
 * decidePlacementsKisinV1 - 縺悶￥縺悶￥蠕後・遏ｳ驟咲ｽｮ・・3迚茨ｼ・
 *
 * 閾ｪ蛻・・雉ｽ螢・pit11)縺ｫ霑代＞蛛ｴ縺九ｉ蜆ｪ蜈医＠縺ｦ蜷・Ξ繝ｼ繝ｳ繧定ｩ穂ｾ｡縺励・
 * 縺｡繧峨■繧・or 縺舌ｋ縺舌ｋ 縺ｮ縺ｩ縺｡繧峨ｒ迢吶≧縺区ｱｺ螳壹＠縺ｦ stone 繧貞牡繧雁ｽ薙※繧九・
 * 遏ｳ縺ｮ濶ｲ驕ｸ謚槭・竭｢・郁・蛻・・霍ｯ・峨Ν繝ｼ繝ｫ縺ｫ蠕薙≧縲・
 *
 * 竭  迴ｾ蝨ｨ縺ｮ遏ｳ謨ｰ > 縺舌ｋ縺舌ｋ蠢・ｦ∵焚  竊・縺｡繧峨■繧臥漁縺・
 *    竭-a  逶ｸ謇区ｬ｡謇狗分縺ｧ縺薙・霍ｯ縺ｫ縺溘←繧顔捩縺代ｋ  竊・縺｡繧峨■繧牙ｿ・ｦ∵焚 - 1 縺ｾ縺ｧ陬懷・
 *    竭-b  縺溘←繧顔捩縺代↑縺・             竊・縺｡繧峨■繧牙ｿ・ｦ∵焚 縺ｾ縺ｧ陬懷・
 * 竭｡  迴ｾ蝨ｨ縺ｮ遏ｳ謨ｰ <= 縺舌ｋ縺舌ｋ蠢・ｦ∵焚  竊・縺舌ｋ縺舌ｋ迢吶＞
 *    竭｡-a  逶ｸ謇区ｬ｡謇狗分縺ｧ縺薙・霍ｯ縺ｫ縺溘←繧顔捩縺代ｋ  竊・縺舌ｋ縺舌ｋ蠢・ｦ∵焚 - 1 縺ｾ縺ｧ陬懷・
 *    竭｡-b  縺溘←繧顔捩縺代↑縺・             竊・縺舌ｋ縺舌ｋ蠢・ｦ∵焚 縺ｾ縺ｧ陬懷・
 *
 * @param {object[]} stones  - 驟咲ｽｮ縺吶ｋ遏ｳ縺ｮ驟榊・
 * @param {object}   state   - 迴ｾ蝨ｨ縺ｮ逶､髱｢繧ｹ繝翫ャ繝励す繝ｧ繝・ヨ
 * @param {object}   fortune - fortune 諠・ｱ (center, opp, self)
 * @param {object}   memo    - AI 繝｡繝｢ (inferredPlayerColor 遲・
 * @returns {{ pitIndex: number, stoneIndex: number }[]}
 *   stoneIndex 縺ｯ蜈･蜉・stones 驟榊・縺ｮ繧､繝ｳ繝・ャ繧ｯ繧ｹ
 */

export function decidePlacementsFortuneV1(stones, state, fortune, memo) {
  if (stones.length === 0) return [];

  // AI 繝ｬ繝ｼ繝ｳ: pit11 縺ｫ霑代＞鬆・
  const aiLanes = [10, 9, 8, 7, 6];

  // 笏笏笏 fortune 遏･隴・笏笏笏
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

  // 竭｢ 閾ｪ蛻・・霍ｯ繝ｫ繝ｼ繝ｫ: 雉ｽ螢・ｿ代＞縺ｻ縺ｩ濶ｯ縺・浹縲・□縺・⊇縺ｩ謔ｪ縺・浹
  function scoreForLane(stone, pit, currentCount) {
    const stepsToStore = 11 - pit; // pit10=1 窶ｦ pit6=5
    const cls = stoneClass(stone);
    if (cls === "neg") {
      // 繝槭う繝翫せ遏ｳ縺ｯ遶ｹ(pit10)縺ｫ蜊倡峡縺ｧ鄂ｮ縺九↑縺・ 驕縺・ｷｯ繧貞━蜈・
      if (pit === 10 && currentCount === 0) return -200;
      return stepsToStore * 8 + (currentCount > 0 ? 15 : -20);
    }
    if (cls === "avoided") {
      // 謗ｨ螳壹・繧､繝翫せ: 雉ｽ螢・°繧蛾□縺・ｷｯ縺ｸ
      return stepsToStore * 3;
    }
    if (cls === "inferred" || cls === "own" || cls === "pos") {
      return (6 - stepsToStore) * 8; // pit10竊・0, pit6竊・
    }
    return Math.random() * 0.1; // 譛ｪ遒ｺ螳・ 繝ｩ繝ｳ繝繝
  }

  // pit 縺九ｉ縺舌ｋ縺舌ｋ/縺｡繧峨■繧臥匱蜍輔↓蠢・ｦ√↑遏ｳ謨ｰ
  function guruCount(pit) {
    return (11 - pit + 12) % 12;
  }
  function chirachiraCount(pit) {
    return (5 - pit + 12) % 12;
  }

  // 逶ｸ謇九・谺｡謇狗分縺ｫ縺薙・ pit 縺ｸ遏ｳ縺悟ｱ翫￥縺具ｼ医＄繧九＄繧矩｣骼・繝ｬ繝吶Ν霎ｼ縺ｿ・・
  function playerCanReach(counts, targetPit) {
    for (let p = 0; p <= 4; p++) {
      const c = counts[p];
      if (c === 0) continue;
      for (let i = 1; i <= c; i++) {
        if ((p + i) % 12 === targetPit) return true;
      }
      if ((p + c) % 12 === 5) {
        for (let p2 = 0; p2 <= 4; p2++) {
          const c2 = counts[p2];
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

  // Phase 1: 縺ｩ縺ｮ pit 縺ｫ菴募狗ｽｮ縺上°・域姶陦鍋噪豎ｺ螳夲ｼ・
  const pitAllocs = []; // { pit, count }[]
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
  // 菴吶ｊ遏ｳ: 雉ｽ螢・ｿ代＞鬆・↓霑ｽ蜉
  while (toDistribute > 0) {
    const fallbackPit = aiLanes.find((p) => counts[p] > 0) ?? aiLanes[0];
    const existing = pitAllocs.find((a) => a.pit === fallbackPit);
    if (existing) existing.count++;
    else pitAllocs.push({ pit: fallbackPit, count: 1 });
    toDistribute--;
  }

  // Phase 2: 蜷・pit 繧ｹ繝ｭ繝・ヨ縺ｫ譛驕ｩ縺ｪ濶ｲ縺ｮ遏ｳ繧貞牡繧雁ｽ薙※繧・
  const available = stones.map((_, i) => i); // 譛ｪ蜑ｲ繧雁ｽ薙※遏ｳ縺ｮ繧､繝ｳ繝・ャ繧ｯ繧ｹ
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

// ─── decidePlacementsFortuneKyubiV1: 九尾専用配置 ────────────────────────────────

/**
 * 九尾配置戦略:
 *   - pit10 / pit9（賽壇に近い路）→ ちらちら発射圏（7/8石）を目標に集中
 *   - pit8 / pit7 / pit6（遠い路）→ ぐるぐる目標（3/4/5石）の最小量
 * 「ぐるぐるでもう1手→ちらちら」や「自路を空けてざくざく準備」がしやすくなる。
 * 石の色選択は decidePlacementsFortuneV1 と同一ルール。
 */
export function decidePlacementsFortuneKyubiV1(stones, state, fortune, memo) {
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
    if (cls === "avoided") return stepsToStore * 3;
    if (cls === "inferred" || cls === "own" || cls === "pos") {
      return (6 - stepsToStore) * 8;
    }
    return Math.random() * 0.1;
  }

  function guruCount(pit) { return (11 - pit + 12) % 12; }
  function chirachiraCount(pit) { return (5 - pit + 12) % 12; }

  const counts = state.pits.map((p) => p.stones.length);

  // Phase 1: pit10/pit9 → ちらちら目標数（7/8石）、pit8/7/6 → ぐるぐる目標数（3/4/5石）
  const pitAllocs = [];
  let toDistribute = stones.length;

  for (const pit of aiLanes) {
    if (toDistribute === 0) break;
    const cur = counts[pit];
    const target = pit >= 9 ? chirachiraCount(pit) : guruCount(pit);
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

  // Phase 2: 各スロットに最適な色の石を割り当て
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

// 笏笏笏 OniV3: 謦偵″遏ｳ縺ｮ荳ｦ縺ｳ譖ｿ縺・笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏

/**
 * optimizeSowOrderKisinV1 - 謦偵″蜑阪・遏ｳ荳ｦ縺ｳ譖ｿ縺茨ｼ・3迚茨ｼ・
 *
 * 蜷・浹縺檎捩蝨ｰ縺吶ｋ pit 縺ｫ蠢懊§縺ｦ譛驕ｩ縺ｪ濶ｲ縺ｮ遏ｳ繧貞牡繧雁ｽ薙※繧九・
 * 蜆ｪ蜈医Ν繝ｼ繝ｫ・遺蔵縲懌促・・
 *   竭 閾ｪ蛻・・雉ｽ螢・(pit 11)
 *      謗ｨ貂ｬ繝励Ξ繧､繝､繝ｼ蜊縺・牡 > 閾ｪ蜊縺・牡 > 遒ｺ隱肴ｸ医∩+荳ｭ螟ｮ遏ｳ > 譛ｪ遒ｺ螳・繝ｩ繝ｳ繝繝)
 *      窶ｻ 繝槭う繝翫せ遒ｺ螳夂浹縺ｯ邨ｶ蟇ｾ蜈･繧後↑縺・
 *   竭｡ 逶ｸ謇九・雉ｽ螢・(pit 5)
 *      繝槭う繝翫せ遒ｺ螳・> 遒ｺ隱肴ｸ医∩+荳ｭ螟ｮ遏ｳ > 譛ｪ遒ｺ螳・逶ｸ謇玖ｳｽ螢・↓縺ｪ縺・牡蜆ｪ蜈・ > 逶ｸ謇句頃縺・牡 > 閾ｪ蜊縺・牡
 *   竭｢ 閾ｪ蛻・・霍ｯ (pit 6-10)
 *      蜊縺・+濶ｲ縺ｯ雉ｽ螢・↓霑代￥縲√・繧､繝翫せ濶ｲ縺ｯ驕縺・
 *      繝槭う繝翫せ遏ｳ縺ｯ遶ｹ(pit10)縺ｫ蜊倡峡縺ｧ鄂ｮ縺九↑縺・ 蜊倡峡縺励°鄂ｮ縺代↑縺・ｴ蜷医ｂ遶ｹ縺ｫ縺ｯ鄂ｮ縺九↑縺・
 *   竭｣ 逶ｸ謇九・霍ｯ (pit 0-4)
 *      蜊縺・+濶ｲ縺ｯ逶ｸ謇玖ｳｽ螢・°繧蛾□縺上√・繧､繝翫せ濶ｲ縺ｯ逶ｸ謇玖ｳｽ螢・↓霑代￥
 *      繝槭う繝翫せ遏ｳ縺ｯ逶ｸ謇九・遶ｹ(pit4)縺ｫ蜊倡峡縺ｧ鄂ｮ縺代ｋ縺ｨ逅・Φ逧・
 *
 * @param {object[]} stones  - 謦偵￥遏ｳ縺ｮ驟榊・
 * @param {number[]} targets - 蜷・浹縺檎捩蝨ｰ縺吶ｋ pit 繧､繝ｳ繝・ャ繧ｯ繧ｹ縺ｮ驟榊・
 * @param {object}   state   - 迴ｾ蝨ｨ縺ｮ逶､髱｢繧ｹ繝翫ャ繝励す繝ｧ繝・ヨ
 * @param {object}   fortune - fortune 諠・ｱ
 * @param {object}   memo    - AI 繝｡繝｢
 * @returns {object[]} 荳ｦ縺ｳ譖ｿ縺医◆ stones 驟榊・・・argets[i] 縺ｫ stones[i] 縺檎捩蝨ｰ・・
 */

export function optimizeSowOrderFortuneV1(
  stones,
  targets,
  state,
  fortune,
  memo,
  opts = {},
) {
  if (stones.length <= 1) return stones;

  const dynamicUnknownPenalty = opts.dynamicUnknownPenalty ?? false;
  const unknownPenaltyScale = opts.unknownPenaltyScale ?? 100;

  // 笏笏笏 fortune 遏･隴・笏笏笏
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

    // 竭 閾ｪ蛻・・雉ｽ螢・
    if (targetPit === 11) {
      if (cls === "neg") return -200;
      if (cls === "inferred") return 100;
      if (cls === "own") return 80;
      if (cls === "pos") return 60;
      // 謗ｨ螳壹・繧､繝翫せ・育嶌謇九′驕ｿ縺代※縺・ｋ濶ｲ・・ 繝ｪ繧ｹ繧ｯ縺ゅｊ
      if (cls === "avoided") return -15;
      // 譛ｪ遒ｺ螳・
      if (dynamicUnknownPenalty) {
        if (knownNeg) return 0; // neg蛻､譏取ｸ医∩ 竊・譛ｪ遒ｺ螳夂浹縺ｯ繝槭う繝翫せ縺ｧ縺ｪ縺・
        const knownCount = (ownFortune ? 1 : 0) + knownPos.length;
        const unknownCount = Math.max(1, 5 - knownCount);
        return Math.round(-(1 / unknownCount) * unknownPenaltyScale);
      }
      return 10 + Math.random() * 0.1; // 繝ｩ繝ｳ繝繝・域立蜍穂ｽ懶ｼ・
    }

    // 竭｡ 逶ｸ謇九・雉ｽ螢・
    if (targetPit === 5) {
      if (cls === "neg") return 90;
      if (cls === "pos") return 50;
      if (cls === "avoided") return 40; // 逶ｸ謇九′驕ｿ縺代※縺・ｋ濶ｲ 竊・逶ｸ謇玖ｳｽ螢・↓蜈･繧後ｋ縺ｨ譛牙茜
      if (cls === "inferred") return -100;
      if (cls === "own") return -80;
      // 譛ｪ遒ｺ螳・ 逶ｸ謇玖ｳｽ螢・↓縺ｪ縺・牡繧貞━蜈・
      return (
        (playerStoreColors.has(stone.color) ? -5 : 5) + Math.random() * 0.1
      );
    }

    // 竭｢ 閾ｪ蛻・・霍ｯ (pit 6-10)
    if (targetPit >= 6 && targetPit <= 10) {
      const stepsToStore = 11 - targetPit; // pit10=1 窶ｦ pit6=5
      const currentCount = state.pits[targetPit].stones.length;
      if (cls === "neg") {
        if (targetPit === 10 && currentCount === 0) return -200; // 遶ｹ縺ｫ蜊倡峡蜴ｳ遖・
        return stepsToStore * 8 + (currentCount > 0 ? 15 : -20);
      }
      if (cls === "avoided") {
        // 謗ｨ螳壹・繧､繝翫せ: 雉ｽ螢・°繧蛾□縺・ｷｯ縺ｸ・医◎縺ｮ縺ｾ縺ｾ雉ｽ螢・↓蜈･繧後◆縺上↑縺・ｼ・
        return stepsToStore * 3;
      }
      if (cls === "inferred" || cls === "own" || cls === "pos") {
        return (6 - stepsToStore) * 8; // pit10竊・0 窶ｦ pit6竊・
      }
      return Math.random() * 0.1;
    }

    // 竭｣ 逶ｸ謇九・霍ｯ (pit 0-4)
    if (targetPit >= 0 && targetPit <= 4) {
      const stepsToOppStore = 5 - targetPit; // pit4=1 窶ｦ pit0=5
      const currentCount = state.pits[targetPit].stones.length;
      if (cls === "neg") {
        // 遶ｹ(pit4)縺ｫ蜊倡峡縺ｧ鄂ｮ縺代ｋ縺ｨ逅・Φ
        const aloneBonus = targetPit === 4 && currentCount === 0 ? 25 : 0;
        return (6 - stepsToOppStore) * 8 + aloneBonus; // 逶ｸ謇玖ｳｽ螢・↓霑代＞縺ｻ縺ｩ鬮伜ｾ礼せ
      }
      if (cls === "avoided") {
        // 逶ｸ謇九・雋濶ｲ縺九ｂ縺励ｌ縺ｪ縺・竊・逶ｸ謇玖ｳｽ螢・↓霑代▼縺代ｋ
        const aloneBonus = targetPit === 4 && currentCount === 0 ? 20 : 0;
        return (6 - stepsToOppStore) * 5 + aloneBonus;
      }
      if (cls === "inferred" || cls === "own" || cls === "pos") {
        return stepsToOppStore * 5; // 逶ｸ謇玖ｳｽ螢・°繧蛾□縺・⊇縺ｩ鬮伜ｾ礼せ
      }
      return Math.random() * 0.1;
    }

    return 0;
  }

  // 驥崎ｦ∝ｺｦ鬆・↓繧ｿ繝ｼ繧ｲ繝・ヨ繧貞・逅・ pit11 > pit5 > AI霍ｯ(霑代＞鬆・ > 逶ｸ謇玖ｷｯ
  function targetPriority(pit) {
    if (pit === 11) return 1000;
    if (pit === 5) return 800;
    if (pit >= 6 && pit <= 10) return 400 + (11 - pit); // pit10竊・05
    if (pit >= 0 && pit <= 4) return 100 + (5 - pit); // pit4竊・01
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

// ─── TestKyubiV1: Defense/Disruption DFS ─────────────────────────────────────

/**
 * TestKyubi DFS pit selector.
 * testKyubi plays as "opp" (gote, pit6-10, store=pit11).
 * Opponent plays as "self" (sente, pit0-4, store=pit5).
 *
 * Scoring:
 *   - Zakuzaku high value, chirachira forced N times then optional,
 *     guruguru low, guruguru-block bonus per lane blocked.
 *   - Lane role biases: 竹(pit10)->zakuzaku, 勾玉(pit9)->chirachira, 結び(pit8)->guruguru
 *
 * @param {number[]} validPits  selectable pits (gote: 6-10)
 * @param {object}  state       GameState snapshot
 * @param {number}  peeksDoneAI testKyubi chirachira count so far
 * @param {number}  peeksDonePlayer opponent chirachira count so far
 * @param {object}  params      scoring parameters (DEFAULT_TEST_KYUBI_PARAMS)
 * @param {number}  maxDepth    DFS depth (default 3)
 */

// ─── Kisin専用 石配置決定 ─────────────────────────────────────────────────────

/**
 * decidePlacementsFortuneKisinV1
 * 鬼神専用: 確定済み情報のみ使用（memo推測なし・ランダム性なし）
 * - 基本はぐるぐる数（guruCount = 11-pit）を目標
 * - 路の現在数が [chirachiraCount-2, chirachiraCount] なら ちらちら数を目標
 * - 石割り当て: 確定ポジ/自占い→近い路、確定ネガ→遠い路
 */
export function decidePlacementsFortuneKisinV1(
  stones,
  state,
  fortune,
  memo = {},
) {
  return decidePlacementsFortuneV1(stones, state, fortune, memo);
}

// ── 旧実装（参考用・未使用） ─────────────────────────────────────────────────
function _decidePlacementsFortuneKisinV1_old(stones, state, fortune) {
  if (stones.length === 0) return [];

  const memo = {
    inferredPlayerColor: null,
    playerAvoidedColor: null,
  };

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

  function playerCanReach(counts, targetPit) {
    for (let p = 0; p <= 4; p++) {
      const c = counts[p];
      if (c === 0) continue;
      for (let i = 1; i <= c; i++) {
        if ((p + i) % 12 === targetPit) return true;
      }
      if ((p + c) % 12 === 5) {
        for (let p2 = 0; p2 <= 4; p2++) {
          const c2 = counts[p2];
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

// ─── Kisin専用 撒き順最適化 ──────────────────────────────────────────────────

/**
 * optimizeSowOrderFortuneKisinV1
 * 鬼神専用: 確定済み情報のみ使用（メモ推測なし・ランダム性なし）
 * - 自賽壇(pit11): 自占い(+3)色 > 確定ポジ(+1)色 > 不明 > ネガ厳禁
 * - 相手賽壇(pit5): ネガ色を優先して流す
 * - 自路(pit6-10): ネガ→遠い路、ポジ/自占い→近い路
 * - 相手路(pit0-4): 中立（ネガのみ相手賽壇寄りへ）
 */
export function optimizeSowOrderFortuneKisinV1(
  stones,
  targets,
  state,
  fortune,
) {
  if (stones.length <= 1) return stones;

  const ownFortune = fortune?.opp?.color ?? null;
  let knownNeg = null;
  const knownPos = [];
  for (const fc of fortune?.center ?? []) {
    if (fc.seenBy?.includes("opp")) {
      if (fc.bonus < 0) knownNeg = fc.color;
      else if (fc.bonus > 0) knownPos.push(fc.color);
    }
  }

  function scoreFor(stone, targetPit) {
    const col = stone.color;
    const isNeg = knownNeg && col === knownNeg;
    const isOwn = ownFortune && col === ownFortune;
    const isPos = knownPos.includes(col);

    if (targetPit === 11) {
      // 自賽壇: +3色(自占い) > +1色(確定ポジ) > 不明 > ネガ厳禁
      if (isNeg) return -200;
      if (isOwn) return 100;
      if (isPos) return 60;
      return 10;
    }
    if (targetPit === 5) {
      // 相手賽壇: ネガを流し込む
      if (isNeg) return 80;
      if (isOwn || isPos) return -50;
      return 5;
    }
    if (targetPit >= 6 && targetPit <= 10) {
      const stepsToStore = 11 - targetPit;
      if (isNeg) return stepsToStore * 8;
      if (isOwn || isPos) return (6 - stepsToStore) * 8;
      return 0;
    }
    if (targetPit >= 0 && targetPit <= 4) {
      if (isNeg) return (5 - targetPit) * 5;
      return 0;
    }
    return 0;
  }

  function targetPriority(pit) {
    if (pit === 11) return 1000;
    if (pit === 5) return 800;
    if (pit >= 6 && pit <= 10) return 400 + (11 - pit);
    return 100;
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
// ─── KyubiV1: 九尾・傀儡V1の完コピ（ベースライン） ──────────────────────────────

export function KyubiV1(
  validPits,
  state,
  peeksDoneAI,
  peeksDonePlayer,
  fortune,
  maxDepth = 5,
) {
  // 蛻晄悄pit遏ｳ謨ｰ・医き繧ｦ繝ｳ繝医・縺ｿ縲・ｫ倬溘す繝溘Η繝ｬ繝ｼ繧ｷ繝ｧ繝ｳ逕ｨ・・
  const initCounts = state.pits.map((p) => p.stones.length);

  // AI縺ｮ2蝗樒岼縺｡繧峨■繧峨〒繝槭う繝翫せ濶ｲ繧堤｢ｺ螳壹〒縺阪ｋ縺・
  const hasUnconfirmedNegForAI = fortune.center.some(
    (fc) => fc.bonus < 0 && !fc.seenBy.includes("opp"),
  );
  // 繝励Ξ繧､繝､繝ｼ縺ｮ2蝗樒岼縺｡繧峨■繧峨〒繝槭う繝翫せ濶ｲ繧堤｢ｺ螳壹〒縺阪ｋ縺・
  const hasUnconfirmedNegForPlayer = fortune.center.some(
    (fc) => fc.bonus < 0 && !fc.seenBy.includes("self"),
  );

  // 笏笏笏 鬮倬滓鋳縺阪す繝溘Η繝ｬ繝ｼ繧ｷ繝ｧ繝ｳ・育浹謨ｰ繧ｫ繧ｦ繝ｳ繝医・縺ｿ・俄楳笏笏
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

  // 笏笏笏 荳謇九・繧ｹ繧ｳ繧｢險育ｮ・笏笏笏
  // isAI: true=AI(pit6-10竊恥it11), false=Player(pit0-4竊恥it5)
  // peeks: 縺昴・蠖ｹ縺ｮ縺｡繧峨■繧牙ｮ御ｺ・屓謨ｰ
  function scoreSow(counts, pit, isAI, peeks) {
    const laneMin = isAI ? 6 : 0;
    const laneMax = isAI ? 10 : 4;
    const storeIndex = isAI ? 11 : 5;
    const oppStoreIndex = isAI ? 5 : 11;
    const n = counts[pit];
    const lastPit = (pit + n) % 12;
    let score = 0;

    // 縺舌ｋ縺舌ｋ: +5
    if (lastPit === storeIndex) score += 5;

    // 縺｡繧峨■繧・ +9 (荳企剞2蝗・, 2蝗樒岼縺ｫ繝槭う繝翫せ遒ｺ螳壹↑繧・8霑ｽ蜉
    if (lastPit === oppStoreIndex && peeks < 2) {
      score += 9;
      if (peeks === 1) {
        score += isAI
          ? hasUnconfirmedNegForAI
            ? 8
            : 0
          : hasUnconfirmedNegForPlayer
            ? 8
            : 0;
      }
    }

    // 縺悶￥縺悶￥: +7 + 蜿悶ｌ縺溽浹謨ｰﾃ・ (逹蝨ｰ蜈医′閾ｪ髯｣縺ｮ遨ｺ縺阪°縺､髀｡縺ｫ遏ｳ縺ゅｊ)
    if (lastPit >= laneMin && lastPit <= laneMax && counts[lastPit] === 0) {
      const mirror = isAI ? lastPit - 6 : lastPit + 6;
      if (counts[mirror] > 0) score += 7 + counts[mirror];
    }

    return { score, lastPit };
  }

  // 笏笏笏 蜈ｨ謇九ｒ蜿門ｾ暦ｼ磯∈謚槫庄閭ｽ縺ｪ霍ｯ縺吶∋縺ｦ繧定ｩ穂ｾ｡・俄楳笏笏
  function getTopMoves(counts, isAI, peeks, restrictTo) {
    const laneMin = isAI ? 6 : 0;
    const laneMax = isAI ? 10 : 4;
    const pool =
      restrictTo ??
      Array.from({ length: laneMax - laneMin + 1 }, (_, i) => laneMin + i);

    const scored = [];
    for (const p of pool) {
      if (counts[p] === 0) continue;
      const { score } = scoreSow(counts, p, isAI, peeks);
      scored.push({ pit: p, score });
    }
    return scored;
  }

  // 笏笏笏 縺上◆縺上◆逋ｺ蜍募庄閭ｽ繝√ぉ繝・け 笏笏笏
  // AI: aiStore >= playerStore - 6 (鬯ｼ縺ｮ迪ｶ莠・
  // Player: playerStore >= aiStore
  function canKutakutaAI(counts) {
    return counts[11] >= counts[5] - 6;
  }
  function canKutakutaPlayer(counts) {
    return counts[5] >= counts[11];
  }

  // 笏笏笏 DFS・亥・蟶ｰ豺ｱ縺・・俄楳笏笏
  let bestFirstPit = validPits[0];
  let bestNet = -Infinity;

  // prevAiKk / prevPlayerKk: 蜑肴焔逡ｪ邨ゆｺ・凾轤ｹ縺ｧ縺ｮ縺上◆縺上◆逋ｺ蜍募庄閭ｽ繝輔Λ繧ｰ
  // ・域眠縺溘↓蜿ｯ閭ｽ縺ｫ縺ｪ縺｣縺滓凾縺縺・2繧貞刈邂励☆繧九◆繧・ｼ・
  const initAiKk = canKutakutaAI(initCounts);
  const initPlayerKk = canKutakutaPlayer(initCounts);

  function dfs(
    depth,
    isAITurn,
    isFirstMove,
    chainDepth,
    counts,
    aiPeeks,
    playerPeeks,
    aiScore,
    playerScore,
    firstPit,
    prevAiKk,
    prevPlayerKk,
  ) {
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

    // 謇九・蛟呵｣懶ｼ域怙蛻昴・1謇九・縺ｿvalidPits縺ｫ蛻ｶ髯撰ｼ・
    const topMoves = isFirstMove
      ? getTopMoves(counts, true, aiPeeks, validPits)
      : getTopMoves(counts, isAI, peeks, null);

    if (topMoves.length === 0) {
      // 謇薙※繧区焔縺ｪ縺・竊・縺薙・繝悶Λ繝ｳ繝√・隧穂ｾ｡縺励↑縺・
      return;
    }

    for (const { pit } of topMoves) {
      const { score, lastPit } = scoreSow(counts, pit, isAI, peeks);
      const { counts: newCounts } = fastSow(counts, pit);

      // 縺｡繧峨■繧牙屓謨ｰ譖ｴ譁ｰ
      let newAiPeeks = aiPeeks;
      let newPlayerPeeks = playerPeeks;
      if (lastPit === oppStoreIndex && peeks < 2) {
        if (isAI) newAiPeeks++;
        else newPlayerPeeks++;
      }

      // 縺上◆縺上◆譁ｰ隕剰ｧ｣謾ｾ: +2
      const newAiKk = canKutakutaAI(newCounts);
      const newPlayerKk = canKutakutaPlayer(newCounts);
      const aiKkBonus = !prevAiKk && newAiKk ? 2 : 0;
      const playerKkBonus = !prevPlayerKk && newPlayerKk ? 2 : 0;

      const newAiScore = isAI
        ? aiScore + score + aiKkBonus
        : aiScore + aiKkBonus;
      const newPlayerScore = !isAI
        ? playerScore + score + playerKkBonus
        : playerScore + playerKkBonus;

      const fp = isFirstMove ? pit : firstPit;

      if (lastPit === storeIndex && chainDepth < 10) {
        // 縺舌ｋ縺舌ｋ: depth 繧呈ｶ郁ｲｻ縺励↑縺・∝酔繝励Ξ繧､繝､繝ｼ邯咏ｶ夲ｼ医メ繧ｧ繝ｼ繝ｳ荳企剞10・・
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
          newPlayerKk,
        );
      } else {
        // 騾壼ｸｸ or 縺舌ｋ縺舌ｋ荳企剞蛻ｰ驕・ depth+1縲∫嶌謇九↓莠､莉｣
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
          newPlayerKk,
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
    initPlayerKk,
  );

  return validPits.includes(bestFirstPit) ? bestFirstPit : validPits[0];
}

// ─── SimKyubiV1: シミュ専用・知力型（ちらちら×3・ざくざく超優先） ──────────────

/**
 * SimKyubiV1 ピット選択
 * KyubiV1 (= KugutsuV1) の DFS 構造をベースに知力型スコアリングを適用。
 * - AI ターン: chirachira 全3回優先 > zakuzaku 超優先 > guruguru 低評価
 * - 相手ターン: kugutsu 基準でモデリング（guru=5, chira=9 limit2, zaku=7）
 */
export function SimKyubiV1(
  validPits,
  state,
  peeksDoneAI,
  peeksDonePlayer,
  fortune,
  params,
  role = "opp",
) {
  const isOppRole = role === "opp";
  const aiLaneMin = isOppRole ? 6 : 0;
  const aiLaneMax = isOppRole ? 10 : 4;
  const aiStore = isOppRole ? 11 : 5;
  const playerStore = isOppRole ? 5 : 11;
  const plLaneMin = isOppRole ? 0 : 6;
  const plLaneMax = isOppRole ? 4 : 10;
  const aiSideKey = isOppRole ? "opp" : "self";
  const plSideKey = isOppRole ? "self" : "opp";

  const maxDepth = params.kyubiDepth ?? 5;
  const guruScore = params.kyubiGuruguruScore ?? 3;
  const chiraScore1 = params.kyubiChirachiraScore ?? 25;
  const chiraScore2 = params.kyubiChirachiraScore2 ?? 20;
  const chiraLimit = params.kyubiChirachiraLimit ?? 3;
  const zakuBase = params.kyubiZakuzakuBase ?? 15;
  const kkBonus = params.kyubiKutakutaBonus ?? 0;
  const oppChiraScore = params.kyubiOppChiraScore ?? 9; // 相手ちらちら脅威
  const oppZakuBase = params.kyubiOppZakuBase ?? 7; // 相手ざくざく脅威
  const zakuSetupBonus = params.kyubiZakuzakuSetupBonus ?? 0; // ざくざく仕掛けボーナス

  const initCounts = state.pits.map((p) => p.stones.length);

  const hasUnconfirmedNegForAI = fortune.center.some(
    (fc) => fc.bonus < 0 && !fc.seenBy.includes(aiSideKey),
  );
  const hasUnconfirmedNegForPlayer = fortune.center.some(
    (fc) => fc.bonus < 0 && !fc.seenBy.includes(plSideKey),
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
    const storeIndex = isAI ? aiStore : playerStore;
    const oppStoreIndex = isAI ? playerStore : aiStore;
    const n = counts[pit];
    const lastPit = (pit + n) % 12;
    let score = 0;

    // ぐるぐる: AI ターンは低評価、相手ターンは kugutsu 基準(5)
    if (lastPit === storeIndex) {
      score += isAI ? guruScore : 5;
    }

    // ちらちら: AI ターンはパラメータ(limit 3)、相手ターンは妨害スコア(limit 2)
    if (isAI) {
      if (lastPit === oppStoreIndex && peeks < chiraLimit) {
        const cs = peeks === 0 ? chiraScore1 : chiraScore2;
        score += cs;
        if (peeks === chiraLimit - 1 && hasUnconfirmedNegForAI) score += 8;
      }
    } else {
      if (lastPit === oppStoreIndex && peeks < 2) {
        score += oppChiraScore;
        if (peeks === 1 && hasUnconfirmedNegForPlayer) score += 8;
      }
    }

    // ざくざく: AI ターンはパラメータ(超高)、相手ターンは妨害スコア
    if (lastPit >= laneMin && lastPit <= laneMax && counts[lastPit] === 0) {
      const mirror = isAI
        ? isOppRole
          ? lastPit - 6
          : lastPit + 6
        : isOppRole
          ? lastPit + 6
          : lastPit - 6;
      if (counts[mirror] > 0)
        score += (isAI ? zakuBase : oppZakuBase) + counts[mirror];
    }

    // ざくざく仕掛けボーナス: この路(pit)を空にすると相手鏡路の石が狙いやすくなる
    if (isAI && zakuSetupBonus > 0) {
      const srcMirror = isOppRole ? pit - 6 : pit + 6;
      if (
        srcMirror >= plLaneMin &&
        srcMirror <= plLaneMax &&
        counts[srcMirror] > 0
      ) {
        score += zakuSetupBonus;
      }
    }

    return { score, lastPit };
  }

  function getTopMoves(counts, isAI, peeks, restrictTo) {
    const laneMin = isAI ? aiLaneMin : plLaneMin;
    const laneMax = isAI ? aiLaneMax : plLaneMax;
    const pool =
      restrictTo ??
      Array.from({ length: laneMax - laneMin + 1 }, (_, i) => laneMin + i);
    const scored = [];
    for (const p of pool) {
      if (counts[p] === 0) continue;
      const { score } = scoreSow(counts, p, isAI, peeks);
      scored.push({ pit: p, score });
    }
    return scored;
  }

  function canKutakutaAI(counts) {
    return counts[aiStore] >= counts[playerStore] - 6;
  }
  function canKutakutaPlayer(counts) {
    return counts[playerStore] >= counts[aiStore];
  }

  let bestFirstPit = validPits[0];
  let bestNet = -Infinity;

  const initAiKk = canKutakutaAI(initCounts);
  const initPlayerKk = canKutakutaPlayer(initCounts);

  function dfs(
    depth,
    isAITurn,
    isFirstMove,
    chainDepth,
    counts,
    aiPeeks,
    playerPeeks,
    aiScore,
    playerScore,
    firstPit,
    prevAiKk,
    prevPlayerKk,
  ) {
    if (depth === maxDepth) {
      const net = aiScore - playerScore;
      if (net > bestNet) {
        bestNet = net;
        bestFirstPit = firstPit;
      }
      return;
    }

    const storeIndex = isAITurn ? aiStore : playerStore;
    const oppStoreIndex = isAITurn ? playerStore : aiStore;
    const peeks = isAITurn ? aiPeeks : playerPeeks;

    const topMoves = isFirstMove
      ? getTopMoves(counts, true, aiPeeks, validPits)
      : getTopMoves(counts, isAITurn, peeks, null);

    if (topMoves.length === 0) return;

    for (const { pit } of topMoves) {
      const { score, lastPit } = scoreSow(counts, pit, isAITurn, peeks);
      const { counts: newCounts } = fastSow(counts, pit);

      let newAiPeeks = aiPeeks;
      let newPlayerPeeks = playerPeeks;
      if (isAITurn && lastPit === oppStoreIndex && peeks < chiraLimit) {
        newAiPeeks++;
      } else if (!isAITurn && lastPit === oppStoreIndex && peeks < 2) {
        newPlayerPeeks++;
      }

      const newAiKk = canKutakutaAI(newCounts);
      const newPlayerKk = canKutakutaPlayer(newCounts);
      const aiKkBonus = !prevAiKk && newAiKk ? kkBonus : 0;
      const playerKkBonus = !prevPlayerKk && newPlayerKk ? kkBonus : 0;

      const newAiScore = isAITurn
        ? aiScore + score + aiKkBonus
        : aiScore + aiKkBonus;
      const newPlayerScore = !isAITurn
        ? playerScore + score + playerKkBonus
        : playerScore + playerKkBonus;

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
          newPlayerKk,
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
          newPlayerKk,
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
    initPlayerKk,
  );

  return validPits.includes(bestFirstPit) ? bestFirstPit : validPits[0];
}

// ─── KyubiV2: 九尾ゲーム用安定版（SimKyubiV1の完コピ） ──────────────────────────

export function KyubiV2(
  validPits,
  state,
  peeksDoneAI,
  peeksDonePlayer,
  fortune,
  params,
  role = "opp",
) {
  const isOppRole = role === "opp";
  const aiLaneMin = isOppRole ? 6 : 0;
  const aiLaneMax = isOppRole ? 10 : 4;
  const aiStore = isOppRole ? 11 : 5;
  const playerStore = isOppRole ? 5 : 11;
  const plLaneMin = isOppRole ? 0 : 6;
  const plLaneMax = isOppRole ? 4 : 10;
  const aiSideKey = isOppRole ? "opp" : "self";
  const plSideKey = isOppRole ? "self" : "opp";

  const maxDepth = params.kyubiDepth ?? 5;
  const guruScore = params.kyubiGuruguruScore ?? 3;
  const chiraScore1 = params.kyubiChirachiraScore ?? 25;
  const chiraScore2 = params.kyubiChirachiraScore2 ?? 20;
  const chiraLimit = params.kyubiChirachiraLimit ?? 3;
  const zakuBase = params.kyubiZakuzakuBase ?? 15;
  const kkBonus = params.kyubiKutakutaBonus ?? 0;
  const oppChiraScore = params.kyubiOppChiraScore ?? 9; // 相手ちらちら脅威
  const oppZakuBase = params.kyubiOppZakuBase ?? 7; // 相手ざくざく脅威
  const zakuSetupBonus = params.kyubiZakuzakuSetupBonus ?? 0; // ざくざく仕掛けボーナス

  const initCounts = state.pits.map((p) => p.stones.length);

  const hasUnconfirmedNegForAI = fortune.center.some(
    (fc) => fc.bonus < 0 && !fc.seenBy.includes(aiSideKey),
  );
  const hasUnconfirmedNegForPlayer = fortune.center.some(
    (fc) => fc.bonus < 0 && !fc.seenBy.includes(plSideKey),
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
    const storeIndex = isAI ? aiStore : playerStore;
    const oppStoreIndex = isAI ? playerStore : aiStore;
    const n = counts[pit];
    const lastPit = (pit + n) % 12;
    let score = 0;

    // ぐるぐる: AI ターンは低評価、相手ターンは kugutsu 基準(5)
    if (lastPit === storeIndex) {
      score += isAI ? guruScore : 5;
    }

    // ちらちら: AI ターンはパラメータ(limit 3)、相手ターンは妨害スコア(limit 2)
    if (isAI) {
      if (lastPit === oppStoreIndex && peeks < chiraLimit) {
        const cs = peeks === 0 ? chiraScore1 : chiraScore2;
        score += cs;
        if (peeks === chiraLimit - 1 && hasUnconfirmedNegForAI) score += 8;
      }
    } else {
      if (lastPit === oppStoreIndex && peeks < 2) {
        score += oppChiraScore;
        if (peeks === 1 && hasUnconfirmedNegForPlayer) score += 8;
      }
    }

    // ざくざく: AI ターンはパラメータ(超高)、相手ターンは妨害スコア
    if (lastPit >= laneMin && lastPit <= laneMax && counts[lastPit] === 0) {
      const mirror = isAI
        ? isOppRole
          ? lastPit - 6
          : lastPit + 6
        : isOppRole
          ? lastPit + 6
          : lastPit - 6;
      if (counts[mirror] > 0)
        score += (isAI ? zakuBase : oppZakuBase) + counts[mirror];
    }

    // ざくざく仕掛けボーナス: この路(pit)を空にすると相手鏡路の石が狙いやすくなる
    if (isAI && zakuSetupBonus > 0) {
      const srcMirror = isOppRole ? pit - 6 : pit + 6;
      if (
        srcMirror >= plLaneMin &&
        srcMirror <= plLaneMax &&
        counts[srcMirror] > 0
      ) {
        score += zakuSetupBonus;
      }
    }

    return { score, lastPit };
  }

  function getTopMoves(counts, isAI, peeks, restrictTo) {
    const laneMin = isAI ? aiLaneMin : plLaneMin;
    const laneMax = isAI ? aiLaneMax : plLaneMax;
    const pool =
      restrictTo ??
      Array.from({ length: laneMax - laneMin + 1 }, (_, i) => laneMin + i);
    const scored = [];
    for (const p of pool) {
      if (counts[p] === 0) continue;
      const { score } = scoreSow(counts, p, isAI, peeks);
      scored.push({ pit: p, score });
    }
    return scored;
  }

  function canKutakutaAI(counts) {
    return counts[aiStore] >= counts[playerStore] - 6;
  }
  function canKutakutaPlayer(counts) {
    return counts[playerStore] >= counts[aiStore];
  }

  let bestFirstPit = validPits[0];
  let bestNet = -Infinity;

  const initAiKk = canKutakutaAI(initCounts);
  const initPlayerKk = canKutakutaPlayer(initCounts);

  function dfs(
    depth,
    isAITurn,
    isFirstMove,
    chainDepth,
    counts,
    aiPeeks,
    playerPeeks,
    aiScore,
    playerScore,
    firstPit,
    prevAiKk,
    prevPlayerKk,
  ) {
    if (depth === maxDepth) {
      const net = aiScore - playerScore;
      if (net > bestNet) {
        bestNet = net;
        bestFirstPit = firstPit;
      }
      return;
    }

    const storeIndex = isAITurn ? aiStore : playerStore;
    const oppStoreIndex = isAITurn ? playerStore : aiStore;
    const peeks = isAITurn ? aiPeeks : playerPeeks;

    const topMoves = isFirstMove
      ? getTopMoves(counts, true, aiPeeks, validPits)
      : getTopMoves(counts, isAITurn, peeks, null);

    if (topMoves.length === 0) return;

    for (const { pit } of topMoves) {
      const { score, lastPit } = scoreSow(counts, pit, isAITurn, peeks);
      const { counts: newCounts } = fastSow(counts, pit);

      let newAiPeeks = aiPeeks;
      let newPlayerPeeks = playerPeeks;
      if (isAITurn && lastPit === oppStoreIndex && peeks < chiraLimit) {
        newAiPeeks++;
      } else if (!isAITurn && lastPit === oppStoreIndex && peeks < 2) {
        newPlayerPeeks++;
      }

      const newAiKk = canKutakutaAI(newCounts);
      const newPlayerKk = canKutakutaPlayer(newCounts);
      const aiKkBonus = !prevAiKk && newAiKk ? kkBonus : 0;
      const playerKkBonus = !prevPlayerKk && newPlayerKk ? kkBonus : 0;

      const newAiScore = isAITurn
        ? aiScore + score + aiKkBonus
        : aiScore + aiKkBonus;
      const newPlayerScore = !isAITurn
        ? playerScore + score + playerKkBonus
        : playerScore + playerKkBonus;

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
          newPlayerKk,
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
          newPlayerKk,
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
    initPlayerKk,
  );

  return validPits.includes(bestFirstPit) ? bestFirstPit : validPits[0];
}
