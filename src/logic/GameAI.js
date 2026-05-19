/**
 * GameAI.js
 * 繧ｲ繝ｼ繝 AI 繝ｭ繧ｸ繝・け・・1・・
 * 繧ｷ繝溘Η繝ｬ繝ｼ繧ｷ繝ｧ繝ｳ髱樔ｾ晏ｭ倥・邏皮ｲ矩未謨ｰ AI
 */

/**
 * 郢ｧ・ｿ郢晢ｽｼ郢晢ｽｳ鬮｢蜿･・ｧ蛹ｺ蜃ｾ邵ｺ・ｫ郢晏干ﾎ樒ｹｧ・､郢晢ｽ､郢晢ｽｼ豼ｶ・ｲ陋ｯ・ｾ陷ｷ莉｣・定ｭ厄ｽｴ隴・ｽｰ
 * @param {string[]} excludeColors - 驕抵ｽｺ陞ｳ螢ｽ・ｸ蛹ｻ竏ｩ闕ｳ・ｭ陞滂ｽｮ驕擾ｽｳ邵ｺ・ｮ豼ｶ・ｲ繝ｻ莠･ﾂ蛟ｶ・ｺ・ｺ陷奇｣ｰ邵ｺ繝ｻ縲堤ｸｺ・ｯ邵ｺ・ｪ邵ｺ繝ｻ竊帝￡・ｺ髫ｱ閧ｴ・ｸ蛹ｻ竏ｩ繝ｻ繝ｻ
 */
export function updateMemo(memo, state, excludeColors = []) {
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
  // 驕抵ｽｺ陞ｳ螢ｽ・ｸ蛹ｻ竏ｩ闕ｳ・ｭ陞滂ｽｮ驕擾ｽｳ邵ｺ・ｮ豼ｶ・ｲ邵ｺ・ｯ陋溷ｶ・ｺ・ｺ陷奇｣ｰ邵ｺ繝ｻ縲堤ｸｺ・ｯ邵ｺ・ｪ邵ｺ繝ｻ遶翫・inferred邵ｺ荵晢ｽ蛾ｫｯ・､陞溘・
  const sorted = Object.entries(memo.playerColorFreq)
    .filter(([color]) => !excludeColors.includes(color))
    .sort((a, b) => b[1] - a[1]);
  memo.inferredPlayerColor = sorted[0]?.[0] ?? null;
  memo.playerAvoidedColor =
    sorted.length >= 3 ? sorted[sorted.length - 1][0] : null;
}

// 隨渉隨渉隨渉 邵ｺ・｡郢ｧ蟲ｨ笆郢ｧ蟲ｨ繝ｻ邵ｺ・ｽ邵ｺ繝ｻ竓・ｸｺ繝ｻ陦埼垓繝ｻ隨渉隨渉隨渉隨渉隨渉隨渉隨渉隨渉隨渉隨渉隨渉隨渉隨渉隨渉隨渉隨渉隨渉隨渉隨渉隨渉隨渉隨渉隨渉隨渉隨渉隨渉隨渉隨渉隨渉隨渉隨渉隨渉隨渉隨渉隨渉隨渉

export function Kugutsu(
  validPits,
  state,
  peeksDoneAI,
  peeksDonePlayer,
  fortune,
  maxDepth = 5,
  params = {},
) {
  const initCounts = state.pits.map((p) => p.stones.length);

  // === Color inference (from center peeks + opponent sent colors) ===
  const ownFortuneK = fortune?.opp?.color ?? null;
  let knownNegK = null;
  const knownPosK = [];
  for (const fc of fortune?.center ?? []) {
    if (fc.seenBy?.includes("opp")) {
      if (fc.bonus < 0) knownNegK = fc.color;
      else if (fc.bonus > 0) knownPosK.push(fc.color);
    }
  }

  // Infer neg color from opponent stones sent into AI store
  if (!knownNegK) {
    const sentColors = params?.opponentSentColors ?? [];
    if (sentColors.length > 0) {
      const oppSeenColors = new Set(
        (fortune?.center ?? [])
          .filter((fc) => fc.seenBy?.includes("self"))
          .map((fc) => fc.color),
      );
      const colorCount = {};
      for (const c of sentColors) {
        if (c === ownFortuneK) continue;
        if (knownPosK.includes(c)) continue;
        colorCount[c] = (colorCount[c] ?? 0) + 1;
      }
      let inferredNeg = null;
      let bestSc = -1;
      for (const [color, cnt] of Object.entries(colorCount)) {
        const isSeen = oppSeenColors.has(color);
        let sc = 0;
        if (cnt >= 3) sc = 100;
        else if (cnt >= 2 && isSeen) sc = 90;
        else if (cnt >= 2) sc = 80;
        if (sc > bestSc) {
          bestSc = sc;
          inferredNeg = color;
        }
      }
      if (inferredNeg && bestSc >= 80) knownNegK = inferredNeg;
    }
  }

  // Infer neg from absence in player's store (player avoids guru with neg color,
  // so neg stays out of their shrine while other colors accumulate there)
  if (!knownNegK) {
    const playerStore = state.pits[5]?.stones ?? [];
    if (playerStore.length >= 4) {
      // Collect all colors in circulation, excluding kugutsu's own fortune and known pos
      const gameColors = new Set();
      for (const pit of state.pits) {
        for (const s of pit.stones) {
          if (
            s.color &&
            s.color !== ownFortuneK &&
            !knownPosK.includes(s.color)
          ) {
            gameColors.add(s.color);
          }
        }
      }
      // Count each color in player's store
      const storeCount = {};
      for (const c of gameColors) storeCount[c] = 0;
      for (const s of playerStore) {
        if (s.color && storeCount[s.color] !== undefined) storeCount[s.color]++;
      }
      // Absent color with 3+ others present = strong neg signal
      const absent = [...gameColors].filter((c) => storeCount[c] === 0);
      const present = [...gameColors].filter((c) => storeCount[c] >= 1);
      if (absent.length === 1 && present.length >= 3) {
        knownNegK = absent[0];
      }
    }
  }

  // neg stone counts per pit
  const initNegCounts = initCounts.map((cnt, pit) => {
    if (!knownNegK || cnt === 0) return 0;
    return (state.pits[pit]?.stones ?? []).filter((s) => s.color === knownNegK)
      .length;
  });

  // === Fast sow with proportional neg tracking ===
  function fastSowWithNeg(counts, negCounts, pitIndex) {
    const nc = counts.slice();
    const ng = negCounts.slice();
    const n = nc[pitIndex];
    if (n === 0) return { counts: nc, negCounts: ng, lastPit: -1 };
    const negFrac = n > 0 ? ng[pitIndex] / n : 0;
    nc[pitIndex] = 0;
    ng[pitIndex] = 0;
    let cur = pitIndex;
    for (let i = 0; i < n; i++) {
      cur = (cur + 1) % 12;
      nc[cur]++;
      ng[cur] += negFrac;
    }
    return { counts: nc, negCounts: ng, lastPit: cur };
  }

  // === Neg dump pre-check ===
  if (knownNegK) {
    // Priority 1: 2+ neg stones in a chirachira pit → always dump (even if guru available)
    const highNegDump = validPits.filter((p) => {
      const n = initCounts[p];
      if (n === 0) return false;
      if ((p + n) % 12 !== 5) return false;
      return (
        (state.pits[p]?.stones ?? []).filter((s) => s.color === knownNegK)
          .length >= 2
      );
    });
    if (highNegDump.length > 0) {
      highNegDump.sort((a, b) => {
        const aN = (state.pits[a]?.stones ?? []).filter(
          (s) => s.color === knownNegK,
        ).length;
        const bN = (state.pits[b]?.stones ?? []).filter(
          (s) => s.color === knownNegK,
        ).length;
        return bN - aN;
      });
      return highNegDump[0];
    }
    // Priority 2: No guru available → dump any neg via chirachira
    const guruExists = validPits.some((p) => {
      const n = initCounts[p];
      return n > 0 && (p + n) % 12 === 11;
    });
    if (!guruExists) {
      const dumpCandidates = validPits.filter((p) => {
        const n = initCounts[p];
        if (n === 0) return false;
        if ((p + n) % 12 !== 5) return false;
        return (state.pits[p]?.stones ?? []).some((s) => s.color === knownNegK);
      });
      if (dumpCandidates.length > 0) {
        dumpCandidates.sort((a, b) => {
          const aN = (state.pits[a]?.stones ?? []).filter(
            (s) => s.color === knownNegK,
          ).length;
          const bN = (state.pits[b]?.stones ?? []).filter(
            (s) => s.color === knownNegK,
          ).length;
          return bN - aN;
        });
        return dumpCandidates[0];
      }
    }
  }

  // === Chirachira trap score ===
  // When player does chirachira, their sow passes through AI lane pits (6-10)
  // adding +1 to each. Pits where (pit+count)%12===10 are "one short" of guru
  // and will become guru-ready after any player chirachira. This creates a
  // dilemma: player chirachira feeds AI's guru chain; not chirachira = less info.
  function trapScore(counts) {
    let traps = 0;
    for (let p = 6; p <= 10; p++) {
      if (counts[p] > 0 && (p + counts[p] + 1) % 12 === 11) traps++;
    }
    return traps * 8 + (traps >= 2 ? 6 : 0);
  }

  // === Scoring function ===
  function scoreSow(counts, negCounts, pit, isAI, peeks) {
    const storeIndex = isAI ? 11 : 5;
    const oppStoreIndex = isAI ? 5 : 11;
    const laneMin = isAI ? 6 : 0;
    const laneMax = isAI ? 10 : 4;
    const n = counts[pit];
    const lastPit = (pit + n) % 12;
    let score = 0;

    if (lastPit === storeIndex) {
      // guru: high base + stone quality
      if (isAI) {
        const negInPit = negCounts[pit] ?? 0;
        const safeStones = Math.max(0, n - negInPit);
        score += 55 + safeStones * 2 - negInPit * 28;
      } else {
        score += 13; // player guru — higher to make kugutsu block more actively
      }
    } else if (lastPit === oppStoreIndex) {
      // chirachira
      if (isAI) {
        if (!knownNegK) {
          // Peek for information: highly valuable before neg is known
          score += peeks < 2 ? 28 : peeks < 3 ? 18 : 4;
        } else {
          // Neg dump: send neg stones to opponent
          const negInPit = negCounts[pit] ?? 0;
          score += negInPit > 0 ? 10 + negInPit * 12 : 2;
        }
      } else {
        score += 5;
      }
    } else if (
      lastPit >= laneMin &&
      lastPit <= laneMax &&
      counts[lastPit] === 0
    ) {
      // zakuzaku: capture opponent stones
      const mirror = isAI ? lastPit - 6 : lastPit + 6;
      if (mirror >= 0 && mirror < 12 && counts[mirror] > 0) {
        const negInMirror = negCounts[mirror] ?? 0;
        let zakuScore = 7 + counts[mirror] - negInMirror * 20;
        if (isAI) {
          // Bonus for blocking opponent's guru or chirachira path
          const mirrorFinal = (mirror + counts[mirror]) % 12;
          if (mirrorFinal === oppStoreIndex)
            zakuScore += 25; // block opp guru
          else if (mirrorFinal === storeIndex) zakuScore += 15; // block opp chirachira
        }
        score += zakuScore;
      }
    }

    return { score, lastPit };
  }

  function getTopMoves(counts, negCounts, isAI, peeks, restrictTo) {
    const laneMin = isAI ? 6 : 0;
    const laneMax = isAI ? 10 : 4;
    const pool =
      restrictTo ??
      Array.from({ length: laneMax - laneMin + 1 }, (_, i) => laneMin + i);
    const scored = [];
    for (const p of pool) {
      if (counts[p] === 0) continue;
      const { score } = scoreSow(counts, negCounts, p, isAI, peeks);
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

  // === DFS ===
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
    negCounts,
    aiPeeks,
    playerPeeks,
    aiScore,
    playerScore,
    firstPit,
    prevAiKk,
    prevPlayerKk,
  ) {
    if (depth === maxDepth) {
      // At leaf: add trap score + store advantage (can end game when ahead)
      const trap = trapScore(counts);
      const storeAdv = Math.max(0, counts[11] - counts[5]) * 4;
      const kkBonus = canKutakutaAI(counts) ? 12 : 0;
      const net = aiScore - playerScore + trap + storeAdv + kkBonus;
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

    const topMoves = isFirstMove
      ? getTopMoves(counts, negCounts, true, aiPeeks, validPits)
      : getTopMoves(counts, negCounts, isAI, peeks, null);

    if (topMoves.length === 0) return;

    const oldTrap = isAI ? trapScore(counts) : 0;

    for (const { pit } of topMoves) {
      const { score, lastPit } = scoreSow(counts, negCounts, pit, isAI, peeks);
      const { counts: newCounts, negCounts: newNegCounts } = fastSowWithNeg(
        counts,
        negCounts,
        pit,
      );

      // Trap setup bonus: reward moves that increase "one short" pit count
      let trapBonus = 0;
      if (isAI && lastPit !== storeIndex && lastPit !== oppStoreIndex) {
        const newTrap = trapScore(newCounts);
        trapBonus = Math.max(0, newTrap - oldTrap);
      }

      let newAiPeeks = aiPeeks;
      let newPlayerPeeks = playerPeeks;
      if (lastPit === oppStoreIndex && peeks < 3) {
        if (isAI) newAiPeeks++;
        else newPlayerPeeks++;
      }

      const newAiKk = canKutakutaAI(newCounts);
      const newPlayerKk = canKutakutaPlayer(newCounts);
      const aiKkBonus = !prevAiKk && newAiKk ? 2 : 0;
      const playerKkBonus = !prevPlayerKk && newPlayerKk ? 2 : 0;

      const newAiScore = isAI
        ? aiScore + score + trapBonus + aiKkBonus
        : aiScore + aiKkBonus;
      const newPlayerScore = !isAI
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
          newNegCounts,
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
          newNegCounts,
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
    initNegCounts,
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
// ===== Kisin: 1深ぐるぐる特化型 =====

/**
 * Kisin - 1深グリーディなぐるぐる押し付けAI（相手手番考慮なし）
 *
 * ぐるぐるが何回連鎖できるかを主評価とする1深グリーディAI。
 * 相手の手は一切考慮しない。シンプルにぐるぐるごり押しタイプ。
 *
 * 評価ルール:
 *   1. ぐるぐる連鎖数が最大のピットを選択（貪欲な連鎖シミュレート）
 *   2. ぐるぐる連鎖後にちらちら/ざくざくが可能なら+ボーナス（tiebreaker）
 *   3. ぐるぐるなしの場合もちらちら/ざくざく直接可能なら+ボーナス
 *
 * @param {number[]} validPits  - 有効なピット番号リスト（撒ける穴のインデックス）
 * @param {object}   state      - GameState の getState() 返り値
 * @param {*}        _unused1   - 未使用（旧互換シグネチャ維持用）
 * @param {*}        _unused2   - 未使用
 * @param {*}        _unused3   - 未使用
 * @param {*}        _unused4   - 未使用
 * @param {string}   role       - "opp" | "self"
 */
export function Kisin(
  validPits,
  state,
  _unused1,
  _unused2,
  _unused3,
  _unused4,
  role = "opp",
) {
  // SEARCH_DEPTH=3 → 自分→相手→自分 の3ターン交互ミニマックス
  // ぐるぐる連鎖はターン内に含む（ターン数にカウントしない）
  const SEARCH_DEPTH = 3;

  const isOppRole = role === "opp";
  const aiLaneMin = isOppRole ? 6 : 0;
  const aiLaneMax = isOppRole ? 10 : 4;
  const aiStore = isOppRole ? 11 : 5;
  const playerStore = isOppRole ? 5 : 11;
  const playerLaneMin = isOppRole ? 0 : 6;
  const playerLaneMax = isOppRole ? 4 : 10;

  const initCounts = state.pits.map((p) => p.stones.length);

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

  // 指定プレイヤーのぐるぐる連鎖を貪欲シミュレート。
  // 返り値: { chainCount, endBonus, finalCounts }
  //   chainCount: ぐるぐる（賽壇着地）の回数
  //   endBonus:   連鎖の最後にちらちら/ざくざくが可能なら 0.1×ボーナス（tiebreaker）
  //               ぐるぐる途中のちらちら/ざくざく機会は無視（ぐるぐる最優先）
  function simulateChain(pit, counts, storeIdx, laneMin, laneMax, guard) {
    if (guard > 15) return { chainCount: 0, endBonus: 0, finalCounts: counts };
    const { counts: nc, lastPit } = fastSow(counts, pit);
    if (lastPit === -1)
      return { chainCount: 0, endBonus: 0, finalCounts: counts };

    if (lastPit === storeIdx) {
      const nextGurus = [];
      for (let p = laneMin; p <= laneMax; p++) {
        if (nc[p] > 0 && (p + nc[p]) % 12 === storeIdx) nextGurus.push(p);
      }
      if (nextGurus.length === 0) {
        // 連鎖終了 → AI連鎖のみちらちら/ざくざくをendBonusとして付与
        const endBonus = storeIdx === aiStore ? afterChainBonus(nc) * 0.1 : 0;
        return { chainCount: 1, endBonus, finalCounts: nc };
      }
      let best = { chainCount: 0, endBonus: 0, finalCounts: nc };
      for (const np of nextGurus) {
        const r = simulateChain(np, nc, storeIdx, laneMin, laneMax, guard + 1);
        if (
          r.chainCount > best.chainCount ||
          (r.chainCount === best.chainCount && r.endBonus > best.endBonus)
        )
          best = r;
      }
      return {
        chainCount: 1 + best.chainCount,
        endBonus: best.endBonus,
        finalCounts: best.finalCounts,
      };
    } else {
      return { chainCount: 0, endBonus: 0, finalCounts: nc };
    }
  }

  // 連鎖終了後にちらちら/ざくざくが可能かチェック（tiebreaker用）
  function afterChainBonus(counts) {
    for (let p = aiLaneMin; p <= aiLaneMax; p++) {
      if (counts[p] === 0) continue;
      if ((p + counts[p]) % 12 === playerStore) return 10;
    }
    for (let p = aiLaneMin; p <= aiLaneMax; p++) {
      if (counts[p] === 0) continue;
      const land = (p + counts[p]) % 12;
      if (land >= aiLaneMin && land <= aiLaneMax) {
        const mirror = isOppRole ? land - 6 : land + 6;
        if (
          counts[land] === 0 &&
          mirror >= 0 &&
          mirror < 12 &&
          counts[mirror] > 0
        )
          return 8;
      }
    }
    return 0;
  }

  // ミニマックスDFS
  // isAiTurn=true  → AI最大化（ぐるぐる数を増やす）
  // isAiTurn=false → プレイヤー最小化（AIのぐるぐる数を減らす方向）
  function dfs(counts, depthLeft, isAiTurn) {
    if (depthLeft === 0) return 0;

    if (isAiTurn) {
      const candidates = [];
      for (let p = aiLaneMin; p <= aiLaneMax; p++) {
        if (counts[p] > 0) candidates.push(p);
      }
      if (candidates.length === 0) return 0;

      let best = -Infinity;
      for (const p of candidates) {
        const chain = simulateChain(
          p,
          counts,
          aiStore,
          aiLaneMin,
          aiLaneMax,
          0,
        );
        const score =
          chain.chainCount +
          chain.endBonus +
          dfs(chain.finalCounts, depthLeft - 1, false);
        if (score > best) best = score;
      }
      return best;
    } else {
      // プレイヤーターン: AIのぐるぐる数を最小化
      const candidates = [];
      for (let p = playerLaneMin; p <= playerLaneMax; p++) {
        if (counts[p] > 0) candidates.push(p);
      }
      // プレイヤー手なし → スキップしてAIターンへ
      if (candidates.length === 0) return dfs(counts, depthLeft - 1, true);

      let worst = Infinity;
      for (const p of candidates) {
        const chain = simulateChain(
          p,
          counts,
          playerStore,
          playerLaneMin,
          playerLaneMax,
          0,
        );
        const score = dfs(chain.finalCounts, depthLeft - 1, true);
        if (score < worst) worst = score;
      }
      return worst === Infinity ? 0 : worst;
    }
  }

  let bestPit = validPits[0];
  let bestScore = -Infinity;

  // ぐるぐるが1つでも狙える路があるなら候補をその路だけに絞る（ぐるぐる最優先ハード保証）
  const guruPits = validPits.filter(
    (p) =>
      initCounts[p] > 0 &&
      simulateChain(p, initCounts, aiStore, aiLaneMin, aiLaneMax, 0)
        .chainCount > 0,
  );
  const candidates = guruPits.length > 0 ? guruPits : validPits;

  for (const p of candidates) {
    if (initCounts[p] === 0) continue;
    const chain = simulateChain(
      p,
      initCounts,
      aiStore,
      aiLaneMin,
      aiLaneMax,
      0,
    );
    const score =
      chain.chainCount +
      chain.endBonus +
      dfs(chain.finalCounts, SEARCH_DEPTH - 1, false);
    if (score > bestScore) {
      bestScore = score;
      bestPit = p;
    }
  }

  return bestPit;
}

// 隨渉隨渉隨渉 HardV1: 3隰・距蛻・怦驛・ｽｪ・ｭ邵ｺ・ｿ繝ｻ蛹ｻ・・ｹｧ荵晢ｼ・ｹｧ荵昴・邵ｺ謔ｶ・･邵ｺ謔ｶ・･霑夲ｽｹ陋ｹ蜴・ｽｼ繝ｻ隨渉隨渉隨渉隨渉隨渉隨渉隨渉隨渉隨渉隨渉隨渉隨渉隨渉隨渉隨渉隨渉隨渉隨渉隨渉隨渉隨渉隨渉

/**
 * HardV1 郢晄鱒繝｣郢晉｣ｯ竏郁ｬ壹・- 3隰・距蛻・怦驛・ｽｪ・ｭ邵ｺ・ｿ
 *
 * 隰・距蛻・ｬ・・ AI 遶翫・Player 遶翫・AI (髫ｪ繝ｻ隰・距蛻・
 * 陷ｷ繝ｻ辟秘｡・ｪ邵ｺ・ｧ髫ｧ遨ゑｽｾ・｡邵ｺ・ｮ鬯ｮ蛟･・櫁叉雍具ｽｽ繝ｻ隰・ｹ晢ｽ定屐蜻ｵ・｣諛岩・邵ｺ蜉ｱﾂ繝ｻ^3 = 27 郢昜ｻ｣縺帷ｹｧ雋槭・陋ｻ邇ｲ雖檎ｸｲ繝ｻ
 * AI驍擾ｽｯ髫ｪ蛹ｻ縺帷ｹｧ・ｳ郢ｧ・｢ - Player驍擾ｽｯ髫ｪ蛹ｻ縺帷ｹｧ・ｳ郢ｧ・｢邵ｺ譴ｧ諤呵棔・ｧ邵ｺ・ｮ郢昜ｻ｣縺帷ｸｺ・ｮ隴崢陋ｻ譏ｴ繝ｻ髴搾ｽｯ郢ｧ螳夲ｽｿ譁絶・邵ｲ繝ｻ
 *
 * 隨倥・髻ｳ隹ｿ鄙ｫﾎ晉ｹ晢ｽｼ郢晢ｽｫ
 *   DFS陷鷹亂竊鍋ｸｺ・｡郢ｧ蟲ｨ笆郢ｧ繝ｻpit5騾ｹﾂ陜ｨ・ｰ)邵ｺ・ｧ邵ｺ髦ｪ・矩恪・ｯ邵ｺ蠕娯旺郢ｧ蠕後・陷奇ｽｳ鬩包ｽｸ隰壽ｩｸ・ｼ莠包ｽｸ莨∝応2陜玲ｩｸ・ｼ蟲ｨﾂ繝ｻ
 *
 * 隨倥・・ｩ遨ゑｽｾ・｡陜難ｽｺ雋・私・ｼ蛹ｻ・・ｹｧ荵晢ｼ・ｹｧ荵昴・邵ｺ謔ｶ・･邵ｺ謔ｶ・･邵ｺ・ｮ邵ｺ・ｿ繝ｻ繝ｻ
 *   邵ｺ闊鯉ｽ狗ｸｺ闊鯉ｽ矩具ｽｺ陷阪・     : +5
 *   邵ｺ謔ｶ・･邵ｺ謔ｶ・･騾具ｽｺ陷阪・     : +7 + 陷ｿ謔ｶ・檎ｸｺ貅ｽ豬ｹ隰ｨ・ｰ
 *
 * @param {number[]} validPits    - AI邵ｺ遒≫・邵ｺ・ｹ郢ｧ邇厄ｽｷ・ｯ郢ｧ・､郢晢ｽｳ郢昴・繝｣郢ｧ・ｯ郢ｧ・ｹ
 * @param {object}   state        - GameState 邵ｺ・ｮ郢ｧ・ｹ郢晉ｿｫ繝｣郢晏干縺咏ｹ晢ｽｧ郢昴・繝ｨ
 * @param {number}   peeksDoneAI  - AI邵ｺ・ｮ邵ｺ・｡郢ｧ蟲ｨ笆郢ｧ迚呻ｽｮ蠕｡・ｺ繝ｻ螻楢ｬｨ・ｰ
 */

export function pickPitTechDfs(validPits, state, peeksDoneAI) {
  const initCounts = state.pits.map((p) => p.stones.length);

  // 邵ｺ・｡郢ｧ蟲ｨ笆郢ｧ迚呻ｽｼ・ｷ陋ｻ・ｶ郢昶・縺臥ｹ昴・縺・ 邵ｺ貅倪穐邵ｺ貅倪穐pit5騾ｹﾂ陜ｨ・ｰ邵ｺ・ｧ邵ｺ髦ｪ・矩恪・ｯ邵ｺ蠕娯旺郢ｧ蠕後・陷奇ｽｳ鬩包ｽｸ隰壽ｩｸ・ｼ莠包ｽｸ莨∝応2繝ｻ繝ｻ
  if (peeksDoneAI < 2) {
    const chirachiraPit = validPits.find((p) => {
      const n = initCounts[p];
      return n > 0 && (p + n) % 12 === 5;
    });
    if (chirachiraPit !== undefined) return chirachiraPit;
  }

  // 隨渉隨渉隨渉 鬯ｮ蛟ｬﾂ貊馴教邵ｺ髦ｪ縺咏ｹ晄ｺ佩礼ｹ晢ｽｬ郢晢ｽｼ郢ｧ・ｷ郢晢ｽｧ郢晢ｽｳ 隨渉隨渉隨渉
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

  // 隨渉隨渉隨渉 郢ｧ・ｹ郢ｧ・ｳ郢ｧ・｢髫ｪ閧ｲ・ｮ證ｦ・ｼ蛹ｻ・・ｹｧ荵晢ｼ・ｹｧ荵昴・邵ｺ謔ｶ・･邵ｺ謔ｶ・･邵ｺ・ｮ邵ｺ・ｿ繝ｻ菫・･ｳ隨渉隨渉
  function scoreSow(counts, pit, isAI) {
    const laneMin = isAI ? 6 : 0;
    const laneMax = isAI ? 10 : 4;
    const storeIndex = isAI ? 11 : 5;
    const n = counts[pit];
    const lastPit = (pit + n) % 12;
    let score = 0;

    // 邵ｺ闊鯉ｽ狗ｸｺ闊鯉ｽ・ +5
    if (lastPit === storeIndex) score += 5;

    // 邵ｺ謔ｶ・･邵ｺ謔ｶ・･: +7 + 陷ｿ謔ｶ・檎ｸｺ貅ｽ豬ｹ隰ｨ・ｰ
    if (lastPit >= laneMin && lastPit <= laneMax && counts[lastPit] === 0) {
      const mirror = isAI ? lastPit - 6 : lastPit + 6;
      if (counts[mirror] > 0) score += 7 + counts[mirror];
    }

    return { score, lastPit };
  }

  // 隨渉隨渉隨渉 闕ｳ雍具ｽｽ蠎ｷ隰・唱蜿呵輔・隨渉隨渉隨渉
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

  // 隨渉隨渉隨渉 DFS繝ｻ蝓滂ｽｷ・ｱ邵ｺ繝ｻ: AI遶雁腰layer遶贋ｽ・繝ｻ菫・･ｳ隨渉隨渉
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

// 隨渉隨渉隨渉 OniV3: 邵ｺ謔ｶ・･邵ｺ謔ｶ・･陟墓ｪ取ｵｹ鬩溷調・ｽ・ｮ 隨渉隨渉隨渉隨渉隨渉隨渉隨渉隨渉隨渉隨渉隨渉隨渉隨渉隨渉隨渉隨渉隨渉隨渉隨渉隨渉隨渉隨渉隨渉隨渉隨渉隨渉隨渉隨渉隨渉隨渉隨渉隨渉隨渉隨渉隨渉隨渉隨渉隨渉隨渉隨渉隨渉隨渉隨渉隨渉隨渉隨渉

/**
 * decidePlacementsKisinV1 - 邵ｺ謔ｶ・･邵ｺ謔ｶ・･陟募ｾ後・驕擾ｽｳ鬩溷調・ｽ・ｮ繝ｻ繝ｻ3霑夊肩・ｼ繝ｻ
 *
 * 髢ｾ・ｪ陋ｻ繝ｻ繝ｻ髮会ｽｽ陞｢繝ｻpit11)邵ｺ・ｫ髴台ｻ｣・櫁屁・ｴ邵ｺ荵晢ｽ芽怕・ｪ陷亥現・邵ｺ・ｦ陷ｷ繝ｻﾎ樒ｹ晢ｽｼ郢晢ｽｳ郢ｧ螳夲ｽｩ遨ゑｽｾ・｡邵ｺ蜉ｱﾂ繝ｻ
 * 邵ｺ・｡郢ｧ蟲ｨ笆郢ｧ繝ｻor 邵ｺ闊鯉ｽ狗ｸｺ闊鯉ｽ・邵ｺ・ｮ邵ｺ・ｩ邵ｺ・｡郢ｧ蟲ｨ・定ｿ｢蜷ｶ竕ｧ邵ｺ蛹ｺ・ｱ・ｺ陞ｳ螢ｹ・邵ｺ・ｦ stone 郢ｧ雋樒横郢ｧ髮・ｽｽ阮吮ｻ郢ｧ荵敖繝ｻ
 * 驕擾ｽｳ邵ｺ・ｮ豼ｶ・ｲ鬩包ｽｸ隰壽ｧｭ繝ｻ遶ｭ・｢繝ｻ驛√・陋ｻ繝ｻ繝ｻ髴搾ｽｯ繝ｻ蟲ｨﾎ晉ｹ晢ｽｼ郢晢ｽｫ邵ｺ・ｫ陟戊侭竕ｧ邵ｲ繝ｻ
 *
 * 遶ｭ・ｰ  霑ｴ・ｾ陜ｨ・ｨ邵ｺ・ｮ驕擾ｽｳ隰ｨ・ｰ > 邵ｺ闊鯉ｽ狗ｸｺ闊鯉ｽ玖｢繝ｻ・ｦ竏ｵ辟・ 遶翫・邵ｺ・｡郢ｧ蟲ｨ笆郢ｧ閾･貍∫ｸｺ繝ｻ
 *    遶ｭ・ｰ-a  騾ｶ・ｸ隰・玄・ｬ・｡隰・距蛻・ｸｺ・ｧ邵ｺ阮吶・髴搾ｽｯ邵ｺ・ｫ邵ｺ貅倪・郢ｧ鬘疲昆邵ｺ莉｣・・ 遶翫・邵ｺ・｡郢ｧ蟲ｨ笆郢ｧ迚呻ｽｿ繝ｻ・ｦ竏ｵ辟・- 1 邵ｺ・ｾ邵ｺ・ｧ髯ｬ諛ｷ繝ｻ
 *    遶ｭ・ｰ-b  邵ｺ貅倪・郢ｧ鬘疲昆邵ｺ莉｣竊醍ｸｺ繝ｻ             遶翫・邵ｺ・｡郢ｧ蟲ｨ笆郢ｧ迚呻ｽｿ繝ｻ・ｦ竏ｵ辟・邵ｺ・ｾ邵ｺ・ｧ髯ｬ諛ｷ繝ｻ
 * 遶ｭ・｡  霑ｴ・ｾ陜ｨ・ｨ邵ｺ・ｮ驕擾ｽｳ隰ｨ・ｰ <= 邵ｺ闊鯉ｽ狗ｸｺ闊鯉ｽ玖｢繝ｻ・ｦ竏ｵ辟・ 遶翫・邵ｺ闊鯉ｽ狗ｸｺ闊鯉ｽ玖ｿ｢蜷ｶ・・
 *    遶ｭ・｡-a  騾ｶ・ｸ隰・玄・ｬ・｡隰・距蛻・ｸｺ・ｧ邵ｺ阮吶・髴搾ｽｯ邵ｺ・ｫ邵ｺ貅倪・郢ｧ鬘疲昆邵ｺ莉｣・・ 遶翫・邵ｺ闊鯉ｽ狗ｸｺ闊鯉ｽ玖｢繝ｻ・ｦ竏ｵ辟・- 1 邵ｺ・ｾ邵ｺ・ｧ髯ｬ諛ｷ繝ｻ
 *    遶ｭ・｡-b  邵ｺ貅倪・郢ｧ鬘疲昆邵ｺ莉｣竊醍ｸｺ繝ｻ             遶翫・邵ｺ闊鯉ｽ狗ｸｺ闊鯉ｽ玖｢繝ｻ・ｦ竏ｵ辟・邵ｺ・ｾ邵ｺ・ｧ髯ｬ諛ｷ繝ｻ
 *
 * @param {object[]} stones  - 鬩溷調・ｽ・ｮ邵ｺ蜷ｶ・矩￥・ｳ邵ｺ・ｮ鬩滓ｦ翫・
 * @param {object}   state   - 霑ｴ・ｾ陜ｨ・ｨ邵ｺ・ｮ騾ｶ・､鬮ｱ・｢郢ｧ・ｹ郢晉ｿｫ繝｣郢晏干縺咏ｹ晢ｽｧ郢昴・繝ｨ
 * @param {object}   fortune - fortune 隲繝ｻ・ｰ・ｱ (center, opp, self)
 * @param {object}   memo    - AI 郢晢ｽ｡郢晢ｽ｢ (inferredPlayerColor 驕ｲ繝ｻ
 * @returns {{ pitIndex: number, stoneIndex: number }[]}
 *   stoneIndex 邵ｺ・ｯ陷茨ｽ･陷峨・stones 鬩滓ｦ翫・邵ｺ・ｮ郢ｧ・､郢晢ｽｳ郢昴・繝｣郢ｧ・ｯ郢ｧ・ｹ
 */

export function decidePlacementsFortune(stones, state, fortune, memo) {
  if (stones.length === 0) return [];

  // AI 郢晢ｽｬ郢晢ｽｼ郢晢ｽｳ: pit11 邵ｺ・ｫ髴台ｻ｣・樣ｬ・・
  const aiLanes = [10, 9, 8, 7, 6];

  // 隨渉隨渉隨渉 fortune 驕擾ｽ･髫ｴ繝ｻ隨渉隨渉隨渉
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

  // 遶ｭ・｢ 髢ｾ・ｪ陋ｻ繝ｻ繝ｻ髴搾ｽｯ郢晢ｽｫ郢晢ｽｼ郢晢ｽｫ: 髮会ｽｽ陞｢繝ｻ・ｿ莉｣・樒ｸｺ・ｻ邵ｺ・ｩ豼ｶ・ｯ邵ｺ繝ｻ豬ｹ邵ｲ繝ｻ笆｡邵ｺ繝ｻ竓・ｸｺ・ｩ隰費ｽｪ邵ｺ繝ｻ豬ｹ
  function scoreForLane(stone, pit, currentCount) {
    const stepsToStore = 11 - pit; // pit10=1 遯ｶ・ｦ pit6=5
    const cls = stoneClass(stone);
    if (cls === "neg") {
      // 郢晄ｧｭ縺・ｹ晉ｿｫ縺幃￥・ｳ邵ｺ・ｯ驕ｶ・ｹ(pit10)邵ｺ・ｫ陷雁｡蟲｡邵ｺ・ｧ驗ゑｽｮ邵ｺ荵昶・邵ｺ繝ｻ 鬩包｣ｰ邵ｺ繝ｻ・ｷ・ｯ郢ｧ雋樞煤陷医・
      if (pit === 10 && currentCount === 0) return -200;
      return stepsToStore * 8 + (currentCount > 0 ? 15 : -20);
    }
    if (cls === "avoided") {
      // 隰暦ｽｨ陞ｳ螢ｹ繝ｻ郢ｧ・､郢晉ｿｫ縺・ 髮会ｽｽ陞｢繝ｻﾂｰ郢ｧ陋ｾ笆｡邵ｺ繝ｻ・ｷ・ｯ邵ｺ・ｸ
      return stepsToStore * 3;
    }
    if (cls === "inferred" || cls === "own" || cls === "pos") {
      return (6 - stepsToStore) * 8; // pit10遶翫・0, pit6遶翫・
    }
    return Math.random() * 0.1; // 隴幢ｽｪ驕抵ｽｺ陞ｳ繝ｻ 郢晢ｽｩ郢晢ｽｳ郢敖郢晢｣ｰ
  }

  // pit 邵ｺ荵晢ｽ臥ｸｺ闊鯉ｽ狗ｸｺ闊鯉ｽ・邵ｺ・｡郢ｧ蟲ｨ笆郢ｧ閾･蛹ｱ陷崎ｼ披・陟｢繝ｻ・ｦ竏壺・驕擾ｽｳ隰ｨ・ｰ
  function guruCount(pit) {
    return (11 - pit + 12) % 12;
  }
  function chirachiraCount(pit) {
    return (5 - pit + 12) % 12;
  }

  // 騾ｶ・ｸ隰・ｹ昴・隹ｺ・｡隰・距蛻・ｸｺ・ｫ邵ｺ阮吶・ pit 邵ｺ・ｸ驕擾ｽｳ邵ｺ謔滂ｽｱ鄙ｫ・･邵ｺ蜈ｷ・ｼ蛹ｻ・・ｹｧ荵晢ｼ・ｹｧ遏ｩﾂ・｣鬪ｼ繝ｻ郢晢ｽｬ郢晏生ﾎ晞恷・ｼ邵ｺ・ｿ繝ｻ繝ｻ
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

  // Phase 1: 邵ｺ・ｩ邵ｺ・ｮ pit 邵ｺ・ｫ闖ｴ蜍淞迢暦ｽｽ・ｮ邵ｺ荳環ｰ繝ｻ蝓溷ｧｶ髯ｦ骰句飭雎趣ｽｺ陞ｳ螟ｲ・ｼ繝ｻ
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
  // 闖ｴ蜷ｶ・企￥・ｳ: 髮会ｽｽ陞｢繝ｻ・ｿ莉｣・樣ｬ・・竊馴恆・ｽ陷会｣ｰ
  while (toDistribute > 0) {
    const fallbackPit = aiLanes.find((p) => counts[p] > 0) ?? aiLanes[0];
    const existing = pitAllocs.find((a) => a.pit === fallbackPit);
    if (existing) existing.count++;
    else pitAllocs.push({ pit: fallbackPit, count: 1 });
    toDistribute--;
  }

  // Phase 2: 陷ｷ繝ｻpit 郢ｧ・ｹ郢晢ｽｭ郢昴・繝ｨ邵ｺ・ｫ隴崢鬩包ｽｩ邵ｺ・ｪ豼ｶ・ｲ邵ｺ・ｮ驕擾ｽｳ郢ｧ雋樒横郢ｧ髮・ｽｽ阮吮ｻ郢ｧ繝ｻ
  const available = stones.map((_, i) => i); // 隴幢ｽｪ陷托ｽｲ郢ｧ髮・ｽｽ阮吮ｻ驕擾ｽｳ邵ｺ・ｮ郢ｧ・､郢晢ｽｳ郢昴・繝｣郢ｧ・ｯ郢ｧ・ｹ
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

// 隨渉隨渉隨渉 OniV3: 隰ｦ蛛ｵ窶ｳ驕擾ｽｳ邵ｺ・ｮ闕ｳ・ｦ邵ｺ・ｳ隴厄ｽｿ邵ｺ繝ｻ隨渉隨渉隨渉隨渉隨渉隨渉隨渉隨渉隨渉隨渉隨渉隨渉隨渉隨渉隨渉隨渉隨渉隨渉隨渉隨渉隨渉隨渉隨渉隨渉隨渉隨渉隨渉隨渉隨渉隨渉隨渉隨渉隨渉隨渉隨渉隨渉隨渉隨渉隨渉隨渉隨渉隨渉隨渉隨渉隨渉隨渉

/**
 * optimizeSowOrderKisinV1 - 隰ｦ蛛ｵ窶ｳ陷鷹亂繝ｻ驕擾ｽｳ闕ｳ・ｦ邵ｺ・ｳ隴厄ｽｿ邵ｺ闌ｨ・ｼ繝ｻ3霑夊肩・ｼ繝ｻ
 *
 * 陷ｷ繝ｻ豬ｹ邵ｺ讙取昆陜ｨ・ｰ邵ｺ蜷ｶ・・pit 邵ｺ・ｫ陟｢諛環ｧ邵ｺ・ｦ隴崢鬩包ｽｩ邵ｺ・ｪ豼ｶ・ｲ邵ｺ・ｮ驕擾ｽｳ郢ｧ雋樒横郢ｧ髮・ｽｽ阮吮ｻ郢ｧ荵敖繝ｻ
 * 陷・ｽｪ陷亥現ﾎ晉ｹ晢ｽｼ郢晢ｽｫ繝ｻ驕ｺ阡ｵ邵ｲ諛御ｿ・・繝ｻ
 *   遶ｭ・ｰ 髢ｾ・ｪ陋ｻ繝ｻ繝ｻ髮会ｽｽ陞｢繝ｻ(pit 11)
 *      隰暦ｽｨ雋ゑｽｬ郢晏干ﾎ樒ｹｧ・､郢晢ｽ､郢晢ｽｼ陷奇｣ｰ邵ｺ繝ｻ迚｡ > 髢ｾ・ｪ陷奇｣ｰ邵ｺ繝ｻ迚｡ > 驕抵ｽｺ髫ｱ閧ｴ・ｸ蛹ｻ竏ｩ+闕ｳ・ｭ陞滂ｽｮ驕擾ｽｳ > 隴幢ｽｪ驕抵ｽｺ陞ｳ繝ｻ郢晢ｽｩ郢晢ｽｳ郢敖郢晢｣ｰ)
 *      遯ｶ・ｻ 郢晄ｧｭ縺・ｹ晉ｿｫ縺幃￡・ｺ陞ｳ螟よｵｹ邵ｺ・ｯ驍ｨ・ｶ陝・ｽｾ陷茨ｽ･郢ｧ蠕娯・邵ｺ繝ｻ
 *   遶ｭ・｡ 騾ｶ・ｸ隰・ｹ昴・髮会ｽｽ陞｢繝ｻ(pit 5)
 *      郢晄ｧｭ縺・ｹ晉ｿｫ縺幃￡・ｺ陞ｳ繝ｻ> 驕抵ｽｺ髫ｱ閧ｴ・ｸ蛹ｻ竏ｩ+闕ｳ・ｭ陞滂ｽｮ驕擾ｽｳ > 隴幢ｽｪ驕抵ｽｺ陞ｳ繝ｻ騾ｶ・ｸ隰・事・ｳ・ｽ陞｢繝ｻ竊鍋ｸｺ・ｪ邵ｺ繝ｻ迚｡陷・ｽｪ陷医・ > 騾ｶ・ｸ隰・唱鬆・ｸｺ繝ｻ迚｡ > 髢ｾ・ｪ陷奇｣ｰ邵ｺ繝ｻ迚｡
 *   遶ｭ・｢ 髢ｾ・ｪ陋ｻ繝ｻ繝ｻ髴搾ｽｯ (pit 6-10)
 *      陷奇｣ｰ邵ｺ繝ｻ+豼ｶ・ｲ邵ｺ・ｯ髮会ｽｽ陞｢繝ｻ竊馴恆莉｣・･邵ｲ竏壹・郢ｧ・､郢晉ｿｫ縺帶ｿｶ・ｲ邵ｺ・ｯ鬩包｣ｰ邵ｺ繝ｻ
 *      郢晄ｧｭ縺・ｹ晉ｿｫ縺幃￥・ｳ邵ｺ・ｯ驕ｶ・ｹ(pit10)邵ｺ・ｫ陷雁｡蟲｡邵ｺ・ｧ驗ゑｽｮ邵ｺ荵昶・邵ｺ繝ｻ 陷雁｡蟲｡邵ｺ蜉ｱﾂｰ驗ゑｽｮ邵ｺ莉｣竊醍ｸｺ繝ｻ・ｰ・ｴ陷ｷ蛹ｻ・る・・ｹ邵ｺ・ｫ邵ｺ・ｯ驗ゑｽｮ邵ｺ荵昶・邵ｺ繝ｻ
 *   遶ｭ・｣ 騾ｶ・ｸ隰・ｹ昴・髴搾ｽｯ (pit 0-4)
 *      陷奇｣ｰ邵ｺ繝ｻ+豼ｶ・ｲ邵ｺ・ｯ騾ｶ・ｸ隰・事・ｳ・ｽ陞｢繝ｻﾂｰ郢ｧ陋ｾ笆｡邵ｺ荳環竏壹・郢ｧ・､郢晉ｿｫ縺帶ｿｶ・ｲ邵ｺ・ｯ騾ｶ・ｸ隰・事・ｳ・ｽ陞｢繝ｻ竊馴恆莉｣・･
 *      郢晄ｧｭ縺・ｹ晉ｿｫ縺幃￥・ｳ邵ｺ・ｯ騾ｶ・ｸ隰・ｹ昴・驕ｶ・ｹ(pit4)邵ｺ・ｫ陷雁｡蟲｡邵ｺ・ｧ驗ゑｽｮ邵ｺ莉｣・狗ｸｺ・ｨ騾・・ﾎｦ騾ｧ繝ｻ
 *
 * @param {object[]} stones  - 隰ｦ蛛ｵ・･驕擾ｽｳ邵ｺ・ｮ鬩滓ｦ翫・
 * @param {number[]} targets - 陷ｷ繝ｻ豬ｹ邵ｺ讙取昆陜ｨ・ｰ邵ｺ蜷ｶ・・pit 郢ｧ・､郢晢ｽｳ郢昴・繝｣郢ｧ・ｯ郢ｧ・ｹ邵ｺ・ｮ鬩滓ｦ翫・
 * @param {object}   state   - 霑ｴ・ｾ陜ｨ・ｨ邵ｺ・ｮ騾ｶ・､鬮ｱ・｢郢ｧ・ｹ郢晉ｿｫ繝｣郢晏干縺咏ｹ晢ｽｧ郢昴・繝ｨ
 * @param {object}   fortune - fortune 隲繝ｻ・ｰ・ｱ
 * @param {object}   memo    - AI 郢晢ｽ｡郢晢ｽ｢
 * @returns {object[]} 闕ｳ・ｦ邵ｺ・ｳ隴厄ｽｿ邵ｺ蛹ｻ笳・stones 鬩滓ｦ翫・繝ｻ繝ｻargets[i] 邵ｺ・ｫ stones[i] 邵ｺ讙取昆陜ｨ・ｰ繝ｻ繝ｻ
 */

export function optimizeSowOrderFortune(
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
  const ignoreNegForStore = opts.ignoreNegForStore ?? false;

  // 隨渉隨渉隨渉 fortune 驕擾ｽ･髫ｴ繝ｻ隨渉隨渉隨渉
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

    // 遶ｭ・ｰ 髢ｾ・ｪ陋ｻ繝ｻ繝ｻ髮会ｽｽ陞｢繝ｻ
    if (targetPit === 11) {
      if (cls === "neg" && !ignoreNegForStore) return -200;
      if (cls === "inferred") return 100;
      if (cls === "own") return 80;
      if (cls === "pos") return 60;
      // 隰暦ｽｨ陞ｳ螢ｹ繝ｻ郢ｧ・､郢晉ｿｫ縺帙・閧ｲ蠍瑚ｬ・ｹ昶ｲ鬩包ｽｿ邵ｺ莉｣窶ｻ邵ｺ繝ｻ・区ｿｶ・ｲ繝ｻ繝ｻ 郢晢ｽｪ郢ｧ・ｹ郢ｧ・ｯ邵ｺ繧・ｽ・
      if (cls === "avoided") return -15;
      // 隴幢ｽｪ驕抵ｽｺ陞ｳ繝ｻ
      if (dynamicUnknownPenalty) {
        if (knownNeg) return 0; // neg陋ｻ・､隴丞叙・ｸ蛹ｻ竏ｩ 遶翫・隴幢ｽｪ驕抵ｽｺ陞ｳ螟よｵｹ邵ｺ・ｯ郢晄ｧｭ縺・ｹ晉ｿｫ縺帷ｸｺ・ｧ邵ｺ・ｪ邵ｺ繝ｻ
        const knownCount = (ownFortune ? 1 : 0) + knownPos.length;
        const unknownCount = Math.max(1, 5 - knownCount);
        return Math.round(-(1 / unknownCount) * unknownPenaltyScale);
      }
      return 10 + Math.random() * 0.1; // 郢晢ｽｩ郢晢ｽｳ郢敖郢晢｣ｰ繝ｻ蝓溽ｫ玖恪遨ゑｽｽ諛ｶ・ｼ繝ｻ
    }

    // 遶ｭ・｡ 騾ｶ・ｸ隰・ｹ昴・髮会ｽｽ陞｢繝ｻ
    if (targetPit === 5) {
      if (cls === "neg") return 90;
      if (cls === "pos") return 50;
      if (cls === "avoided") return 40; // 騾ｶ・ｸ隰・ｹ昶ｲ鬩包ｽｿ邵ｺ莉｣窶ｻ邵ｺ繝ｻ・区ｿｶ・ｲ 遶翫・騾ｶ・ｸ隰・事・ｳ・ｽ陞｢繝ｻ竊楢怦・･郢ｧ蠕鯉ｽ狗ｸｺ・ｨ隴帷甥闌・
      if (cls === "inferred") return -100;
      if (cls === "own") return -80;
      // 隴幢ｽｪ驕抵ｽｺ陞ｳ繝ｻ 騾ｶ・ｸ隰・事・ｳ・ｽ陞｢繝ｻ竊鍋ｸｺ・ｪ邵ｺ繝ｻ迚｡郢ｧ雋樞煤陷医・
      return (
        (playerStoreColors.has(stone.color) ? -5 : 5) + Math.random() * 0.1
      );
    }

    // 遶ｭ・｢ 髢ｾ・ｪ陋ｻ繝ｻ繝ｻ髴搾ｽｯ (pit 6-10)
    if (targetPit >= 6 && targetPit <= 10) {
      const stepsToStore = 11 - targetPit; // pit10=1 遯ｶ・ｦ pit6=5
      const currentCount = state.pits[targetPit].stones.length;
      if (cls === "neg") {
        if (targetPit === 10 && currentCount === 0) return -200; // 驕ｶ・ｹ邵ｺ・ｫ陷雁｡蟲｡陷ｴ・ｳ驕悶・
        return stepsToStore * 8 + (currentCount > 0 ? 15 : -20);
      }
      if (cls === "avoided") {
        // 隰暦ｽｨ陞ｳ螢ｹ繝ｻ郢ｧ・､郢晉ｿｫ縺・ 髮会ｽｽ陞｢繝ｻﾂｰ郢ｧ陋ｾ笆｡邵ｺ繝ｻ・ｷ・ｯ邵ｺ・ｸ繝ｻ蛹ｻ笳守ｸｺ・ｮ邵ｺ・ｾ邵ｺ・ｾ髮会ｽｽ陞｢繝ｻ竊楢怦・･郢ｧ蠕娯螺邵ｺ荳岩・邵ｺ繝ｻ・ｼ繝ｻ
        return stepsToStore * 3;
      }
      if (cls === "inferred" || cls === "own" || cls === "pos") {
        return (6 - stepsToStore) * 8; // pit10遶翫・0 遯ｶ・ｦ pit6遶翫・
      }
      return Math.random() * 0.1;
    }

    // 遶ｭ・｣ 騾ｶ・ｸ隰・ｹ昴・髴搾ｽｯ (pit 0-4)
    if (targetPit >= 0 && targetPit <= 4) {
      const stepsToOppStore = 5 - targetPit; // pit4=1 遯ｶ・ｦ pit0=5
      const currentCount = state.pits[targetPit].stones.length;
      if (cls === "neg") {
        // 驕ｶ・ｹ(pit4)邵ｺ・ｫ陷雁｡蟲｡邵ｺ・ｧ驗ゑｽｮ邵ｺ莉｣・狗ｸｺ・ｨ騾・・ﾎｦ
        const aloneBonus = targetPit === 4 && currentCount === 0 ? 25 : 0;
        return (6 - stepsToOppStore) * 8 + aloneBonus; // 騾ｶ・ｸ隰・事・ｳ・ｽ陞｢繝ｻ竊馴恆莉｣・樒ｸｺ・ｻ邵ｺ・ｩ鬯ｮ莨懶ｽｾ遉ｼ縺・
      }
      if (cls === "avoided") {
        // 騾ｶ・ｸ隰・ｹ昴・髮具｣ｰ豼ｶ・ｲ邵ｺ荵晢ｽらｸｺ蜉ｱ・檎ｸｺ・ｪ邵ｺ繝ｻ遶翫・騾ｶ・ｸ隰・事・ｳ・ｽ陞｢繝ｻ竊馴恆莉｣笆ｼ邵ｺ莉｣・・
        const aloneBonus = targetPit === 4 && currentCount === 0 ? 20 : 0;
        return (6 - stepsToOppStore) * 5 + aloneBonus;
      }
      if (cls === "inferred" || cls === "own" || cls === "pos") {
        return stepsToOppStore * 5; // 騾ｶ・ｸ隰・事・ｳ・ｽ陞｢繝ｻﾂｰ郢ｧ陋ｾ笆｡邵ｺ繝ｻ竓・ｸｺ・ｩ鬯ｮ莨懶ｽｾ遉ｼ縺・
      }
      return Math.random() * 0.1;
    }

    return 0;
  }

  // 鬩･蟠趣ｽｦ竏晢ｽｺ・ｦ鬯・・竊鍋ｹｧ・ｿ郢晢ｽｼ郢ｧ・ｲ郢昴・繝ｨ郢ｧ雋槭・騾・・ pit11 > pit5 > AI髴搾ｽｯ(髴台ｻ｣・樣ｬ・・ > 騾ｶ・ｸ隰・事・ｷ・ｯ
  function targetPriority(pit) {
    if (pit === 11) return 1000;
    if (pit === 5) return 800;
    if (pit >= 6 && pit <= 10) return 400 + (11 - pit); // pit10遶翫・05
    if (pit >= 0 && pit <= 4) return 100 + (5 - pit); // pit4遶翫・01
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

// 笏笏笏 TestKyubiV1: Defense/Disruption DFS 笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏

/**
 * TestKyubi DFS pit selector.
 * testKyubi plays as "opp" (gote, pit6-10, store=pit11).
 * Opponent plays as "self" (sente, pit0-4, store=pit5).
 *
 * Scoring:
 *   - Zakuzaku high value, chirachira forced N times then optional,
 *     guruguru low, guruguru-block bonus per lane blocked.
 *   - Lane role biases: 遶ｹ(pit10)->zakuzaku, 蜍ｾ邇・pit9)->chirachira, 邨舌・(pit8)->guruguru
 *
 * @param {number[]} validPits  selectable pits (gote: 6-10)
 * @param {object}  state       GameState snapshot
 * @param {number}  peeksDoneAI testKyubi chirachira count so far
 * @param {number}  peeksDonePlayer opponent chirachira count so far
 * @param {object}  params      scoring parameters (DEFAULT_TEST_KYUBI_PARAMS)
 * @param {number}  maxDepth    DFS depth (default 3)
 */

/**
 * decidePlacementsFortuneKisinV3
 * KisinV3蟆ら畑驟咲ｽｮ: 繝阪ぎ遏ｳ繧偵＊縺上＊縺丞岼縺ｨ縺励※驟咲ｽｮ
 * - 繝阪ぎ遏ｳ: 蜊倡峡縺ｧ蟇ｾ髱｢縺ｫ逶ｸ謇狗浹縺後≠繧玖ｷｯ 竊・縺悶￥縺悶￥隱伜ｰ趣ｼ育嶌謇玖ｳｽ螢・↓豬√＆縺帙ｋ・・
 *   蜿悶ｉ繧後↑縺代ｌ縺ｰ縺舌ｋ縺舌ｋ縺ｧ蝗槫庶縺輔ｌ繧具ｼ医＄繧九＄繧狗音蛹悶・蜑ｲ繧雁・繧奇ｼ・
 * - 繝昴ず/閾ｪ蜊縺・inferred: pit11蟇・ｊ・磯壼ｸｸ騾壹ｊ・・
 * Phase1驟咲ｽｮ謨ｰ縺ｮ豎ｺ螳壹・decidePlacementsFortuneV1縺ｨ蜷御ｸ縲・
 */
export function decidePlacementsFortuneKisin(
  stones,
  state,
  fortune,
  memo = {},
) {
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
    const stepsToStore = 11 - pit; // pit10=1 窶ｦ pit6=5
    const cls = stoneClass(stone);
    if (cls === "neg") {
      // 縺悶￥縺悶￥蝗ｮ: 蜊倡峡驟咲ｽｮ縺ｧ蟇ｾ髱｢(pit-6)縺ｫ逶ｸ謇狗浹縺後≠繧後・鬮倥せ繧ｳ繧｢
      const mirrorPit = pit - 6; // pit6竊・, pit10竊・
      const mirrorCount = counts[mirrorPit];
      if (currentCount === 0 && mirrorCount > 0) {
        return 20 + mirrorCount * 3; // 蟇ｾ髱｢縺悟､壹＞縺ｻ縺ｩ縺悶￥縺悶￥隱伜ｰ弱＠繧・☆縺・
      }
      // 蝗ｮ縺ｧ縺阪↑縺・ｴ蜷医・驕縺・ｷｯ縺ｸ・・it10蜊倡峡縺ｯ霑代☆縺弱※縺舌ｋ縺舌ｋ蜊ｳ蝗槫庶縺ｪ縺ｮ縺ｧ驕ｿ縺代ｋ・・
      if (pit === 10 && currentCount === 0) return -200;
      return stepsToStore * 8 + (currentCount > 0 ? 15 : -20);
    }
    if (cls === "avoided") {
      return stepsToStore * 3;
    }
    if (cls === "inferred" || cls === "own" || cls === "pos") {
      return (6 - stepsToStore) * 8; // pit10竊・0, pit6竊・
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

  // Phase 1: pit蜑ｲ繧雁ｽ薙※謨ｰ縺ｮ豎ｺ螳夲ｼ・ecidePlacementsFortuneV1縺ｨ蜷御ｸ・・
  const pitAllocs = [];
  let toDistribute = stones.length;

  // Phase 1a: ぐるぐる未達のpitに優先配分（pit10→9→8→7→6順）
  // cur >= gNeeded のpitはスキップ（すでに達成・超過）
  for (const pit of aiLanes) {
    if (toDistribute === 0) break;
    const cur = counts[pit];
    const gNeeded = guruCount(pit);
    if (cur >= gNeeded) continue; // 既達成・超過pitはスキップ
    const toPlace = Math.min(gNeeded - cur, toDistribute);
    pitAllocs.push({ pit, count: toPlace });
    toDistribute -= toPlace;
  }

  // Phase 1b: 残り石は現在の合計が最も少ないpitへ1個ずつ配布
  // （次ラウンドのぐるぐるセットアップ準備）
  while (toDistribute > 0) {
    const effectiveCounts = aiLanes.map((p) => {
      const alloc = pitAllocs.find((a) => a.pit === p);
      return { pit: p, total: counts[p] + (alloc?.count ?? 0) };
    });
    effectiveCounts.sort((a, b) => a.total - b.total);
    const fallbackPit = effectiveCounts[0].pit;
    const existing = pitAllocs.find((a) => a.pit === fallbackPit);
    if (existing) existing.count++;
    else pitAllocs.push({ pit: fallbackPit, count: 1 });
    toDistribute--;
  }

  // Phase 2: 蜷・せ繝ｭ繝・ヨ縺ｫ譛驕ｩ縺ｪ濶ｲ縺ｮ遏ｳ繧貞牡繧雁ｽ薙※
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

// 笏笏 譌ｧ螳溯｣・ｼ亥盾閠・畑繝ｻ譛ｪ菴ｿ逕ｨ・・笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏
// 笏笏笏 Kisin蟆ら畑 謦偵″鬆・怙驕ｩ蛹・笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏

/**
 * optimizeSowOrderFortuneKisinV1
 * 鬯ｼ逾槫ｰら畑: 遒ｺ螳壽ｸ医∩諠・ｱ縺ｮ縺ｿ菴ｿ逕ｨ・医Γ繝｢謗ｨ貂ｬ縺ｪ縺励・繝ｩ繝ｳ繝繝諤ｧ縺ｪ縺暦ｼ・
 * - 閾ｪ雉ｽ螢・pit11): 閾ｪ蜊縺・+3)濶ｲ > 遒ｺ螳壹・繧ｸ(+1)濶ｲ > 荳肴・ > 繝阪ぎ蜴ｳ遖・
 * - 逶ｸ謇玖ｳｽ螢・pit5): 繝阪ぎ濶ｲ繧貞━蜈医＠縺ｦ豬√☆
 * - 閾ｪ霍ｯ(pit6-10): 繝阪ぎ竊帝□縺・ｷｯ縲√・繧ｸ/閾ｪ蜊縺・・霑代＞霍ｯ
 * - 逶ｸ謇玖ｷｯ(pit0-4): 荳ｭ遶具ｼ医ロ繧ｬ縺ｮ縺ｿ逶ｸ謇玖ｳｽ螢・ｯ・ｊ縺ｸ・・
 */
export function optimizeSowOrderFortuneKisin(stones, targets, state, fortune) {
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
      // 閾ｪ雉ｽ螢・ +3濶ｲ(閾ｪ蜊縺・ > +1濶ｲ(遒ｺ螳壹・繧ｸ) > 荳肴・ > 繝阪ぎ蜴ｳ遖・
      if (isNeg) return -200;
      if (isOwn) return 100;
      if (isPos) return 60;
      return 10;
    }
    if (targetPit === 5) {
      // 逶ｸ謇玖ｳｽ螢・ 繝阪ぎ繧呈ｵ√＠霎ｼ繧
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

// 笏笏笏 KyubiV3: 荵晏ｰｾ繧ｲ繝ｼ繝逕ｨ繝ｻ螯ｨ螳ｳ迚ｹ蛹・笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏

/**
 * KyubiV3 繝斐ャ繝磯∈謚・- 螯ｨ螳ｳ迚ｹ蛹門梛
 *
 * - 縺｡繧峨■繧・蝗槫ｼｷ蛻ｶ・医〒縺阪ｋ縺ｪ繧牙叉螳溯｡鯉ｼ・
 * - 逶ｸ謇九・縺舌ｋ縺舌ｋ繧呈怙蜆ｪ蜈医〒髦ｻ豁｢・医・繝翫Ν繝・ぅ +25・・
 * - 逶ｸ謇九・縺悶￥縺悶￥繧帝仆豁｢・医・繝翫Ν繝・ぅ +15+遏ｳ謨ｰ・・
 * - 逶ｸ謇九↓縺｡繧峨■繧峨ｒ隱伜ｰ趣ｼ育浹縺窟I蛛ｴ縺ｫ蝗槭▲縺ｦ縺上ｋ縲√せ繧ｳ繧｢ 竏・ = AI譛牙茜・・
 * - 閾ｪ蛻・・縺舌ｋ縺舌ｋ繝ｻ縺悶￥縺悶￥縺ｯ莠後・谺｡・・2 / +4・・
 *
 * @param {number[]} validPits       - AI 縺碁∈縺ｹ繧玖ｷｯ繧､繝ｳ繝・ャ繧ｯ繧ｹ
 * @param {object}   state           - GameState 繧ｹ繝翫ャ繝励す繝ｧ繝・ヨ
 * @param {number}   peeksDoneAI     - AI 縺ｮ縺｡繧峨■繧牙ｮ御ｺ・屓謨ｰ
 * @param {number}   peeksDonePlayer - 繝励Ξ繧､繝､繝ｼ縺ｮ縺｡繧峨■繧牙ｮ御ｺ・屓謨ｰ・井ｺ呈鋤諤ｧ縺ｮ縺溘ａ・・
 * @param {object}   fortune         - fortune 諠・ｱ・井ｺ呈鋤諤ｧ縺ｮ縺溘ａ・・
 * @param {object}   params          - 譛ｪ菴ｿ逕ｨ・井ｺ呈鋤諤ｧ縺ｮ縺溘ａ・・
 * @param {string}   role            - "opp" | "self"
 */
export function Kyubi(
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

  const initCounts = state.pits.map((p) => p.stones.length);

  // 笏笏 fortune 縺九ｉ遏ｳ繧ｯ繝ｩ繧ｹ繧貞愛螳夲ｼ・epth=0 繧ｹ繧ｳ繧｢陬懈ｭ｣逕ｨ・・笏笏
  const ownFortuneK = fortune?.opp?.color ?? null;
  let knownNegK = null;
  const knownPosK = [];
  for (const fc of fortune?.center ?? []) {
    if (fc.seenBy?.includes("opp")) {
      if (fc.bonus < 0) knownNegK = fc.color;
      else if (fc.bonus > 0) knownPosK.push(fc.color);
    }
  }
  function stoneClassK(stone) {
    const c = stone.color;
    if (knownNegK && c === knownNegK) return "neg";
    if (ownFortuneK && c === ownFortuneK) return "own";
    if (knownPosK.includes(c)) return "pos";
    return "unknown";
  }
  // 霍ｯ縺ｮ遏ｳ縺ｮ濶ｲ隧穂ｾ｡: 遒ｺ螳夊憶遏ｳ+3/neg遏ｳ-5・・epth=0 AI謇九・縺ｿ・・
  function pitStoneColorScore(pit) {
    const stones = state.pits[pit]?.stones ?? [];
    let bonus = 0;
    for (const s of stones) {
      const cls = stoneClassK(s);
      if (cls === "own" || cls === "pos") bonus += 1;
      else if (cls === "neg") bonus -= 2;
    }
    return bonus;
  }

  // 縺｡繧峨■繧牙ｼｷ蛻ｶ: 逶ｸ謇九↓迴ｾ蝨ｨ縺舌ｋ縺舌ｋ閼・ｨ√′縺ｪ縺・ｴ蜷医・縺ｿ・井ｸ企剞3蝗橸ｼ・
  // \u30c1\u30e9\u30c1\u30e9\u512a\u5148: \u30de\u30a4\u30ca\u30b9\u672a\u78ba\u5b9a \u304b\u3064 \u307e\u30603\u56de\u6d88\u8cbb\u3057\u3066\u3044\u306a\u3044\u5834\u5408\u306e\u307f
  if (peeksDoneAI < 3 && knownNegK === null) {
    // 窶ｻAI縺ｮ縺｡繧峨■繧画鋳縺阪′逶ｸ謇玖ｷｯ繧帝夐℃縺励※遏ｳ謨ｰ繧貞､峨∴繧九→縲・｣骼冶у螽√ｒ隕玖誠縺ｨ縺吶◆繧∽ｺ句燕縺ｫ蛻､螳壹☆繧・
    const oppHasGuruNow = Array.from(
      { length: plLaneMax - plLaneMin + 1 },
      (_, i) => plLaneMin + i,
    ).some(
      (pp) => initCounts[pp] > 0 && (pp + initCounts[pp]) % 12 === aiStore,
    );

    if (!oppHasGuruNow) {
      const chirachiraCandidates = validPits.filter((p) => {
        const n = initCounts[p];
        return n > 0 && (p + n) % 12 === playerStore;
      });
      if (chirachiraCandidates.length > 0) {
        const safePit = chirachiraCandidates.find((p) => {
          const { counts: nc } = fastSow(initCounts, p);
          const oppCanGuru = Array.from(
            { length: plLaneMax - plLaneMin + 1 },
            (_, i) => plLaneMin + i,
          ).some((pp) => nc[pp] > 0 && (pp + nc[pp]) % 12 === aiStore);
          return !oppCanGuru;
        });
        if (safePit !== undefined) return safePit;
        // 蜈ｨ蛟呵｣懊′逶ｸ謇九＄繧九＄繧九ｒ諡帙￥ 竊・縺｡繧峨■繧峨せ繧ｭ繝・・縺励※DFS縺ｫ莉ｻ縺帙ｋ
      }
    }
  }

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

  // 繧ｹ繧ｳ繧｢隧穂ｾ｡
  // AI: 縺舌ｋ縺舌ｋ繝ｻ縺悶￥縺悶￥縺ｯ菴手ｩ穂ｾ｡・井ｺ後・谺｡・・
  // 逶ｸ謇・ 縺舌ｋ縺舌ｋ竊貞､ｧ繝壹リ繝ｫ繝・ぅ縲√＊縺上＊縺鞘・繝壹リ繝ｫ繝・ぅ縲√■繧峨■繧・aiStore逹蝨ｰ)竊定ｪ伜ｰ弱・繝ｼ繝翫せ(雋繧ｹ繧ｳ繧｢)
  function scoreSow(counts, pit, isAI) {
    const laneMin = isAI ? aiLaneMin : plLaneMin;
    const laneMax = isAI ? aiLaneMax : plLaneMax;
    const storeIndex = isAI ? aiStore : playerStore;
    const oppStoreIndex = isAI ? playerStore : aiStore;
    const n = counts[pit];
    const lastPit = (pit + n) % 12;
    let score = 0;

    // 縺舌ｋ縺舌ｋ・郁・雉ｽ螢・捩蝨ｰ・・
    if (lastPit === storeIndex) {
      // AI: \u30de\u30a4\u30ca\u30b9\u78ba\u5b9a\u5f8c\u306f\u7a4d\u6975\u7684\u306b\u3050\u308b\u3050\u308b\u512a\u5148 / \u672a\u78ba\u5b9a\u306f\u4f4e\u52a0\u70b9 / \u76f8\u624b: \u6700\u5927\u30da\u30ca\u30eb\u30c6\u30a3
      score += isAI ? (knownNegK !== null ? 20 : 2) : 25;
    }
    if (lastPit === oppStoreIndex) {
      // AI: DFS蜑阪↓蠑ｷ蛻ｶ貂医∩縺ｮ縺溘ａ隧穂ｾ｡縺励↑縺・/ 逶ｸ謇・ 隱伜ｰ弱＠縺溘＞ 竊・雋繧ｹ繧ｳ繧｢縺ｧnet繧剃ｸ翫￡繧・
      if (!isAI) score -= 8;
    }

    // 縺悶￥縺悶￥・郁・繝ｬ繝ｼ繝ｳ縺ｮ遨ｺ縺阪↓逹蝨ｰ・・
    if (lastPit >= laneMin && lastPit <= laneMax && counts[lastPit] === 0) {
      const mirror = isAI
        ? isOppRole
          ? lastPit - 6
          : lastPit + 6
        : isOppRole
          ? lastPit + 6
          : lastPit - 6;
      if (counts[mirror] > 0) {
        score += isAI ? 4 : 15 + Math.min(counts[mirror], 4); // AI: 菴手ｩ穂ｾ｡ / 逶ｸ謇・ 繝壹リ繝ｫ繝・ぅ(荳企剞19)
      }
    }

    return { score, lastPit };
  }

  function getTopMoves(counts, isAI, n, restrictTo, useColorBonus = false) {
    const laneMin = isAI ? aiLaneMin : plLaneMin;
    const laneMax = isAI ? aiLaneMax : plLaneMax;
    const pool =
      restrictTo ??
      Array.from({ length: laneMax - laneMin + 1 }, (_, i) => laneMin + i);
    const scored = [];
    for (const p of pool) {
      if (counts[p] === 0) continue;
      const { score } = scoreSow(counts, p, isAI);
      const colorBonus = useColorBonus && isAI ? pitStoneColorScore(p) : 0;
      // depth=0 縺ｮ縺ｿ: 逶ｸ謇九・縺舌ｋ縺舌ｋ閼・ｨ√ｒ隗｣豸医☆繧区焔縺ｫ繝懊・繝翫せ
      let guruPreventBonus = 0;
      if (useColorBonus && isAI) {
        const oppCouldGuru = Array.from(
          { length: plLaneMax - plLaneMin + 1 },
          (_, i) => plLaneMin + i,
        ).some((pp) => counts[pp] > 0 && (pp + counts[pp]) % 12 === aiStore);
        if (oppCouldGuru) {
          const { counts: nc } = fastSow(counts, p);
          const oppCanStillGuru = Array.from(
            { length: plLaneMax - plLaneMin + 1 },
            (_, i) => plLaneMin + i,
          ).some((pp) => nc[pp] > 0 && (pp + nc[pp]) % 12 === aiStore);
          if (!oppCanStillGuru) guruPreventBonus = 18; // 縺舌ｋ縺舌ｋ閼・ｨ√ｒ隗｣豸医〒縺阪ｋ謇九ｒ蜆ｪ驕・
        }
      }
      scored.push({ pit: p, score: score + colorBonus + guruPreventBonus });
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, n);
  }

  // DFS・域ｷｱ縺・: AI 竊・Player 竊・AI・・
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
        ? getTopMoves(counts, true, 5, validPits, true) // 蜈ｨvalidPits繧定・・・医＄繧九＄繧矩仆豁｢貍上ｌ繧帝亟縺撰ｼ・
        : getTopMoves(counts, isAI, 3, null, false);

    if (topMoves.length === 0) {
      dfs(depth + 1, counts, aiScore, playerScore, firstPit);
      return;
    }

    for (const { pit, score: moveScore } of topMoves) {
      const { counts: newCounts } = fastSow(counts, pit);
      const newAiScore = isAI ? aiScore + moveScore : aiScore;
      const newPlayerScore = !isAI ? playerScore + moveScore : playerScore;
      const fp = depth === 0 ? pit : firstPit;
      dfs(depth + 1, newCounts, newAiScore, newPlayerScore, fp);
    }
  }

  dfs(0, initCounts, 0, 0, validPits[0]);

  return validPits.includes(bestFirstPit) ? bestFirstPit : validPits[0];
}

// 笏笏笏 decidePlacementsFortuneKyubiV3: 荵晏ｰｾ驟咲ｽｮ繝ｻ遏ｳ螳牙・迚ｹ蛹・笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏

/**
 * decidePlacementsFortuneKyubiV3 - 遏ｳ螳牙・迚ｹ蛹夜・鄂ｮ
 *
 * 蜷・浹縺梧鋳縺肴凾縺ｫ逹蝨ｰ縺吶ｋpit繧剃ｺ句燕險育ｮ励＠縺ｦ繧ｹ繧ｳ繧｢繝ｪ繝ｳ繧ｰ縺吶ｋ縲・
 * - 閾ｪ雉ｽ螢・aiStore)逹蝨ｰ繧ｹ繝ｭ繝・ヨ: 遒ｺ隱肴ｸ医∩髱槭・繧､繝翫せ遏ｳ縺ｮ縺ｿ・医・繧､繝翫せ竊・1000・・
 * - 逶ｸ謇玖ｳｽ螢・playerStore)逹蝨ｰ繧ｹ繝ｭ繝・ヨ: 繝槭う繝翫せ遏ｳ繧貞━蜈域兜蜈･・郁憶遏ｳ竊・200・・
 * - 縺昴ｌ莉･螟・ 繝槭う繝翫せ遏ｳ縺ｯ驕繧∬ｷｯ縺ｸ縲∬憶遏ｳ縺ｯ雉ｽ螢・ｿ代￥縺ｸ
 *
 * 霍ｯ蜑ｲ繧雁ｽ薙※:
 * - pit10/pit9: 縺｡繧峨■繧臥岼讓呎焚・・/8遏ｳ 竊・譛蠕後・遏ｳ縺継layer雉ｽ螢㎝it5縺ｸ・・
 * - pit8/pit7/pit6: 縺舌ｋ縺舌ｋ逶ｮ讓呎焚・・/4/5遏ｳ 竊・譛蠕後・遏ｳ縺継it11縺ｸ・・
 *
 * @param {object[]} stones  - 驟咲ｽｮ縺吶ｋ遏ｳ縺ｮ驟榊・
 * @param {object}   state   - 迴ｾ蝨ｨ縺ｮ逶､髱｢繧ｹ繝翫ャ繝励す繝ｧ繝・ヨ
 * @param {object}   fortune - fortune 諠・ｱ
 * @param {object}   memo    - AI 繝｡繝｢・井ｺ呈鋤諤ｧ縺ｮ縺溘ａ・・
 * @returns {{ pitIndex: number, stoneIndex: number }[]}
 */
export function decidePlacementsFortuneKyubi(
  stones,
  state,
  fortune,
  memo = {},
) {
  if (stones.length === 0) return [];

  const aiLanes = [10, 9, 8, 7, 6];
  const aiStore = 11;
  const playerStore = 5;

  let knownNeg = null;
  const knownPos = [];
  const ownFortune = fortune?.opp?.color ?? null;
  for (const fc of fortune?.center ?? []) {
    if (fc.seenBy?.includes("opp")) {
      if (fc.bonus < 0) knownNeg = fc.color;
      else if (fc.bonus > 0) knownPos.push(fc.color);
    }
  }

  function stoneClass(stone) {
    const c = stone.color;
    if (knownNeg && c === knownNeg) return "neg";
    if (ownFortune && c === ownFortune) return "own";
    if (knownPos.includes(c)) return "pos";
    return "unknown";
  }

  // landingPit 縺ｫ蝓ｺ縺･縺上せ繧ｳ繧｢
  // - aiStore逹蝨ｰ: 遒ｺ隱肴ｸ医∩螳牙・遏ｳ縺ｮ縺ｿ・医・繧､繝翫せ繝ｻ譛ｪ遒ｺ螳壹・蜴ｳ遖・ｼ・
  // - playerStore逹蝨ｰ: 繝槭う繝翫せ遏ｳ繧呈怙蜆ｪ蜈医∵悴遒ｺ螳夂浹繧ゅ≠繧狗ｨ句ｺｦ謚募・
  // landingPit に基づくスコア
  // マイナス未確定（knownNeg===null）時は aiStore 着地スロットに own/pos 以外を入れない
  function scoreForSlot(stone, landingPit) {
    const cls = stoneClass(stone);
    if (landingPit === aiStore) {
      if (cls === "neg") return -1000;
      if (knownNeg === null) {
        // マイナスがどの色かまだわからない → own/pos のみ安全
        if (cls === "own" || cls === "pos") return 50;
        return -500; // unknown は絶対に入れない
      }
      // マイナス確定後
      if (cls === "unknown") return -300;
      if (cls === "own" || cls === "pos") return 50;
      return 50;
    }
    if (landingPit === playerStore) {
      if (cls === "neg") return 100;
      if (cls === "unknown") return 30;
      if (cls === "own" || cls === "pos") return -200;
      return 30;
    }
    // その他pit
    if (cls === "neg") return 8;
    if (cls === "unknown") return -5;
    if (cls === "own" || cls === "pos") return -2;
    return 0;
  }

  // 縺｡繧峨■繧臥岼讓呎焚: (playerStore - pit + 12) % 12
  // 縺舌ｋ縺舌ｋ逶ｮ讓呎焚: (aiStore - pit + 12) % 12
  function chirachiraCount(pit) {
    return (playerStore - pit + 12) % 12;
  }
  function guruCount(pit) {
    return (aiStore - pit + 12) % 12;
  }

  const counts = state.pits.map((p) => p.stones.length);

  // Phase 1: pit蜑ｲ繧雁ｽ薙※謨ｰ縺ｮ豎ｺ螳・
  const pitAllocs = [];
  let toDistribute = stones.length;
  for (const pit of aiLanes) {
    if (toDistribute === 0) break;
    const cur = counts[pit];
    // pit10, pit9: 縺｡繧峨■繧臥岼讓・/ 縺昴ｌ莉･螟・ 縺舌ｋ縺舌ｋ逶ｮ讓・
    const target = pit >= 9 ? chirachiraCount(pit) : guruCount(pit);
    // 縺悶￥縺悶￥閼・ｼｱ諤ｧ繝√ぉ繝・け: 繝溘Λ繝ｼpit・育嶌謇句・・峨′遨ｺ縺ｮ蝣ｴ蜷医∝､ｧ驥冗ｩ阪∩繧帝∩縺代ｋ
    // pit10竊知irror pit4, pit9竊・, pit8竊・, pit7竊・, pit6竊・
    const mirrorPit = pit - 6;
    const zakuzakuRisk = (counts[mirrorPit] ?? 0) === 0;
    // 繝溘Λ繝ｼ縺檎ｩｺ縺ｪ繧画怙螟ｧ縺ｧ繧ゅ＄繧九＄繧狗岼讓呎焚縺ｫ謚代∴繧具ｼ医■繧峨■繧臥岼讓吶・螟ｧ驥冗ｩ阪∩繧帝亟縺撰ｼ・
    const effectiveTarget = zakuzakuRisk
      ? Math.min(target, guruCount(pit))
      : target;
    const toPlace = Math.min(Math.max(0, effectiveTarget - cur), toDistribute);
    if (toPlace > 0) {
      pitAllocs.push({ pit, count: toPlace });
      toDistribute -= toPlace;
    }
  }
  // 縺ゅ・繧後◆遏ｳ縺ｯ譛蛻昴・髱樒ｩｺ霍ｯ縺ｾ縺溘・蜈磯ｭ霍ｯ縺ｫ遨阪・
  while (toDistribute > 0) {
    const fallbackPit = aiLanes.find((p) => counts[p] > 0) ?? aiLanes[0];
    const existing = pitAllocs.find((a) => a.pit === fallbackPit);
    if (existing) existing.count++;
    else pitAllocs.push({ pit: fallbackPit, count: 1 });
    toDistribute--;
  }

  // Phase 2: 蜈ｨ繧ｹ繝ｭ繝・ヨ縺ｮ逹蝨ｰ蜈医ｒ莠句燕險育ｮ・
  const tempCounts = state.pits.map((p) => p.stones.length);
  const slotList = []; // { pit, slotPos, landingPit }
  for (const { pit, count } of pitAllocs) {
    for (let s = 0; s < count; s++) {
      const landingPit = (pit + tempCounts[pit] + 1) % 12;
      slotList.push({ pit, slotPos: s, landingPit });
      tempCounts[pit]++;
    }
  }

  // 遏ｳ縺ｮ蜑ｲ繧雁ｽ薙※鬆・ playerStore逹蝨ｰ 竊・縺昴・莉朴it 竊・aiStore逹蝨ｰ
  // ・・eg繧恥layerStore/縺昴・莉悶↓蜈域ｶ郁ｲｻ縺励∥iStore縺ｫ縺ｯ濶ｯ遏ｳ縺縺第ｮ九☆・・
  function slotPriority(lp) {
    if (lp === playerStore) return 0;
    if (lp === aiStore) return 2;
    return 1;
  }
  const sortedSlots = [...slotList].sort(
    (a, b) => slotPriority(a.landingPit) - slotPriority(b.landingPit),
  );

  // 逶ｸ謇九′playerStore縺ｫ蜈･繧後※縺・ｋunknown遏ｳ縺ｮ謨ｰ 竊・AI閾ｪ雉ｽ螢・∈縺ｮunknown險ｱ螳ｹ譫
  const unknownBudget = (state.pits[playerStore]?.stones ?? []).filter(
    (s) => stoneClass(s) === "unknown",
  ).length;
  let unknownAiStoreUsed = 0;

  const available = stones.map((_, i) => i);
  const stoneAssign = new Map(); // `${pit}-${slotPos}` 竊・stoneIndex
  for (const slot of sortedSlots) {
    if (available.length === 0) break;
    let bestAvailIdx = 0;
    let bestScore = -Infinity;
    for (let ai = 0; ai < available.length; ai++) {
      const stone = stones[available[ai]];
      let sc;
      // aiStore着地のunknown: マイナス確定後のみ playerStore の unknown 数だけ許可
      if (
        slot.landingPit === aiStore &&
        stoneClass(stone) === "unknown" &&
        knownNeg !== null
      ) {
        sc = unknownAiStoreUsed < unknownBudget ? 20 : -300;
      } else {
        sc = scoreForSlot(stone, slot.landingPit);
      }
      if (sc > bestScore) {
        bestScore = sc;
        bestAvailIdx = ai;
      }
    }
    const chosenIdx = available[bestAvailIdx];
    stoneAssign.set(`${slot.pit}-${slot.slotPos}`, chosenIdx);
    if (
      slot.landingPit === aiStore &&
      stoneClass(stones[chosenIdx]) === "unknown"
    ) {
      unknownAiStoreUsed++;
    }
    available.splice(bestAvailIdx, 1);
  }

  // 蜃ｺ蜉帙・蜈・・繧ｹ繝ｭ繝・ヨ鬆・ｼ・it蜀・・謚募・鬆・′豁｣縺励＞逹蝨ｰ蜈医↓蟇ｾ蠢懶ｼ・
  return slotList.map(({ pit, slotPos }) => ({
    pitIndex: pit,
    stoneIndex: stoneAssign.get(`${pit}-${slotPos}`),
  }));
}

// ─── Ashura: 阿修羅（AshuraKiller対策強化版） ──────────────────────────────
/**
 * Ashura - 阿修羅（AshuraKillerに勝つための強化版）
 * DFS深さ5 / ぐるぐる連鎖ボーナス+18 / neg送出+38 / 相手ざくざく妨害強化
 */
export function Ashura(
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
  const initCounts = state.pits.map((p) => p.stones.length);

  const ownFortuneA = fortune?.opp?.color ?? null;
  let knownNegA = null;
  const knownPosA = [];
  for (const fc of fortune?.center ?? []) {
    if (fc.seenBy?.includes("opp")) {
      if (fc.bonus < 0) knownNegA = fc.color;
      else if (fc.bonus > 0) knownPosA.push(fc.color);
    }
  }

  if (!knownNegA) {
    const sentColors = params?.opponentSentColors ?? [];
    if (sentColors.length > 0) {
      const oppSeenColors = new Set(
        (fortune?.center ?? [])
          .filter((fc) => fc.seenBy?.includes("self"))
          .map((fc) => fc.color),
      );
      const colorCount = {};
      for (const c of sentColors) {
        if (c === ownFortuneA) continue;
        if (knownPosA.includes(c)) continue;
        colorCount[c] = (colorCount[c] ?? 0) + 1;
      }
      let inferredNeg = null;
      let bestScore = -1;
      for (const [color, cnt] of Object.entries(colorCount)) {
        const isSeen = oppSeenColors.has(color);
        let sc = 0;
        if (cnt >= 3) sc = 100;
        else if (cnt >= 2 && isSeen) sc = 90;
        else if (cnt >= 2) sc = 80;
        if (sc > bestScore) {
          bestScore = sc;
          inferredNeg = color;
        }
      }
      if (inferredNeg && bestScore >= 80) knownNegA = inferredNeg;
    }
  }

  // 相手賽壇の多い色でneg推論（二択時の追加シグナル）
  if (!knownNegA) {
    const playerStorePit = state.pits[playerStore]?.stones ?? [];
    if (playerStorePit.length >= 4) {
      const storeCounts = {};
      for (const s of playerStorePit) {
        const c = s.color;
        if (c === ownFortuneA) continue;
        if (knownPosA.includes(c)) continue;
        storeCounts[c] = (storeCounts[c] ?? 0) + 1;
      }
      let bestColor = null;
      let bestCnt = 0;
      for (const [c, cnt] of Object.entries(storeCounts)) {
        if (cnt > bestCnt) {
          bestCnt = cnt;
          bestColor = c;
        }
      }
      if (bestColor && bestCnt >= 3) knownNegA = bestColor;
    }
  }

  const initNegCounts = initCounts.map((cnt, pit) => {
    if (!knownNegA || cnt === 0) return 0;
    return (state.pits[pit]?.stones ?? []).filter((s) => s.color === knownNegA)
      .length;
  });

  // params から推測済みプレイヤー占い色を取得（5pt石の優先ぐるぐる用）
  const inferredPlayerColorA = params?.inferredPlayerColor ?? null;

  function stoneClassA(stone) {
    const c = stone.color;
    if (knownNegA && c === knownNegA) return "neg";
    if (ownFortuneA && c === ownFortuneA) return "own";
    if (inferredPlayerColorA && c === inferredPlayerColorA) return "player"; // 5pt stone
    if (knownPosA.includes(c)) return "pos";
    return "unknown";
  }

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

  function fastSowWithNeg(counts, negCounts, pitIndex) {
    const nc = counts.slice();
    const ng = negCounts.slice();
    const n = nc[pitIndex];
    if (n === 0) return { counts: nc, negCounts: ng, lastPit: -1 };
    const negFrac = n > 0 ? ng[pitIndex] / n : 0;
    nc[pitIndex] = 0;
    ng[pitIndex] = 0;
    let cur = pitIndex;
    for (let i = 0; i < n; i++) {
      cur = (cur + 1) % 12;
      nc[cur]++;
      ng[cur] += negFrac;
    }
    return { counts: nc, negCounts: ng, lastPit: cur };
  }

  // === Priority 1: ぐるぐる最優先（neg石のみのpitを除外してランダム選択）===
  // neg石のみのpitは選ばない。一つでもプラスがあれば賽壇に置けるので。
  // ランダム選択で相手への攪乱になる。
  {
    const guruEligible = validPits.filter((p) => {
      const n = initCounts[p];
      if (n === 0) return false;
      if ((p + n) % 12 !== aiStore) return false;
      if (knownNegA) {
        const stones = state.pits[p]?.stones ?? [];
        if (stones.length > 0 && stones.every((s) => s.color === knownNegA))
          return false;
      }
      return true;
    });
    if (guruEligible.length > 0) {
      return guruEligible[Math.floor(Math.random() * guruEligible.length)];
    }
  }

  // ちらちら強制（neg確定済みの場合はスキップしてぐるぐる優先）
  if (peeksDoneAI < 3 && !knownNegA) {
    const oppGuruPits = Array.from(
      { length: plLaneMax - plLaneMin + 1 },
      (_, i) => plLaneMin + i,
    ).filter(
      (pp) => initCounts[pp] > 0 && (pp + initCounts[pp]) % 12 === aiStore,
    );
    const oppHasGuruNow = oppGuruPits.length > 0;
    const candidates = validPits.filter((p) => {
      const n = initCounts[p];
      return n > 0 && (p + n) % 12 === playerStore;
    });
    if (candidates.length > 0) {
      const blockAndChira = candidates.find((p) => {
        const { counts: nc } = fastSow(initCounts, p);
        return !Array.from(
          { length: plLaneMax - plLaneMin + 1 },
          (_, i) => plLaneMin + i,
        ).some((pp) => nc[pp] > 0 && (pp + nc[pp]) % 12 === aiStore);
      });
      if (blockAndChira !== undefined) return blockAndChira;
      if (peeksDoneAI === 0) return candidates[0];
      if (!oppHasGuruNow) {
        const s = candidates[0];
        if (s !== undefined) return s;
      }
    }
  }

  // === Priority 2: ぐるぐる不可時のneg廃棄（neg多い順にちらちらで相手賽壇へ）===
  if (knownNegA) {
    const minusDumpCandidates = validPits.filter((p) => {
      const n = initCounts[p];
      if (n === 0) return false;
      if ((p + n) % 12 !== playerStore) return false;
      return (state.pits[p]?.stones ?? []).some((s) => s.color === knownNegA);
    });
    if (minusDumpCandidates.length > 0) {
      minusDumpCandidates.sort((a, b) => {
        const aN = (state.pits[a]?.stones ?? []).filter(
          (s) => s.color === knownNegA,
        ).length;
        const bN = (state.pits[b]?.stones ?? []).filter(
          (s) => s.color === knownNegA,
        ).length;
        return bN - aN;
      });
      return minusDumpCandidates[0];
    }
  }

  function scoreSow(counts, negCounts, pit, isAI, peeks) {
    const laneMin = isAI ? aiLaneMin : plLaneMin;
    const laneMax = isAI ? aiLaneMax : plLaneMax;
    const storeIndex = isAI ? aiStore : playerStore;
    const oppStoreIndex = isAI ? playerStore : aiStore;
    const n = counts[pit];
    const lastPit = (pit + n) % 12;
    let score = 0;

    // ぐるぐる: 高価値石の質を反映したスコア最優先
    if (lastPit === storeIndex) {
      score += isAI ? 55 : 16;
      if (isAI) {
        for (const s of state.pits[pit]?.stones ?? []) {
          const cls = stoneClassA(s);
          if (cls === "own")
            score += 8; // AI占い色 → 3pt
          else if (cls === "player")
            score += 12; // 相手占い色 → 5pt（最高価値）
          else if (cls === "pos")
            score += 4; // 中央+1石（意図的に混ぜる）
          else if (cls === "neg")
            score -= 10; // neg石は軽くペナルティ（ぐるぐる優先のため低く設定）
          else score += 1; // 中立石（混ぜることで予測困難化）
        }
      }
    }

    // ちらちら / neg送出: ぐるぐるより低優先
    if (lastPit === oppStoreIndex) {
      if (!isAI) score -= 6;
      if (isAI) {
        if (peeks < 3 && !knownNegA) score += 28; // neg色未特定 → ちらちら優先
        // neg判明済みでもぐるぐる連鎖を優先するため、neg送出ボーナスは与えない
      }
    }

    // ざくざく
    if (lastPit >= laneMin && lastPit <= laneMax && counts[lastPit] === 0) {
      const mirror = isAI
        ? isOppRole
          ? lastPit - 6
          : lastPit + 6
        : isOppRole
          ? lastPit + 6
          : lastPit - 6;
      if (counts[mirror] > 0) {
        const expectedNegMirror = negCounts[mirror] ?? 0;
        if (isAI) {
          score += 7 + counts[mirror] - expectedNegMirror * 20;
        } else {
          score += 10 + Math.min(counts[mirror], 4) - expectedNegMirror * 14;
        }
      }
    }

    return { score, lastPit };
  }

  function getTopMovesV2(
    counts,
    negCounts,
    isAI,
    peeks,
    n,
    restrictTo,
    useColorBonus = false,
  ) {
    const laneMin = isAI ? aiLaneMin : plLaneMin;
    const laneMax = isAI ? aiLaneMax : plLaneMax;
    const pool =
      restrictTo ??
      Array.from({ length: laneMax - laneMin + 1 }, (_, i) => laneMin + i);
    const scored = [];
    for (const p of pool) {
      if (counts[p] === 0) continue;
      let { score } = scoreSow(counts, negCounts, p, isAI, peeks);
      if (useColorBonus && isAI) {
        const { counts: nc } = fastSow(counts, p);
        const hadGuru = Array.from(
          { length: plLaneMax - plLaneMin + 1 },
          (_, i) => plLaneMin + i,
        ).some((pp) => counts[pp] > 0 && (pp + counts[pp]) % 12 === aiStore);
        const stillHasGuru = Array.from(
          { length: plLaneMax - plLaneMin + 1 },
          (_, i) => plLaneMin + i,
        ).some((pp) => nc[pp] > 0 && (pp + nc[pp]) % 12 === aiStore);
        if (hadGuru && !stillHasGuru) score += 20; // 相手ぐるぐる機会を潰す
      }
      scored.push({ pit: p, score });
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, n);
  }

  let bestFirstPit = validPits[0];
  let bestNet = -Infinity;
  const guruChainBonus = 0;

  function dfs(
    depth,
    isAITurn,
    isFirstMove,
    chainDepth,
    counts,
    negCounts,
    aiPeeks,
    playerPeeks,
    aiScore,
    playerScore,
    firstPit,
    guruChainCount,
  ) {
    if (depth === 5) {
      const expectedMinusInStore = negCounts[aiStore] ?? 0;
      const net =
        aiScore -
        playerScore +
        guruChainCount * guruChainBonus -
        expectedMinusInStore * 8;
      if (net > bestNet) {
        bestNet = net;
        bestFirstPit = firstPit;
      }
      return;
    }

    const isAI = isAITurn;
    const storeIdx = isAI ? aiStore : playerStore;
    const peeks = isAI ? aiPeeks : playerPeeks;
    const topMoves = isFirstMove
      ? getTopMovesV2(counts, negCounts, true, peeks, 6, validPits, true)
      : getTopMovesV2(counts, negCounts, isAI, peeks, 3, null, false);

    if (topMoves.length === 0) {
      dfs(
        depth + 1,
        !isAITurn,
        false,
        0,
        counts,
        negCounts,
        aiPeeks,
        playerPeeks,
        aiScore,
        playerScore,
        firstPit,
        guruChainCount,
      );
      return;
    }

    for (const { pit, score: moveScore } of topMoves) {
      const { lastPit } = scoreSow(counts, negCounts, pit, isAI, peeks);
      const { counts: newCounts, negCounts: newNegCounts } = fastSowWithNeg(
        counts,
        negCounts,
        pit,
      );
      let newAiPeeks = aiPeeks;
      let newPlayerPeeks = playerPeeks;
      const oppStoreIdx = isAI ? playerStore : aiStore;
      if (isAI && lastPit === oppStoreIdx && aiPeeks < 3) newAiPeeks++;
      else if (!isAI && lastPit === oppStoreIdx && playerPeeks < 3)
        newPlayerPeeks++;
      const newAiScore = isAI ? aiScore + moveScore : aiScore;
      const newPlayerScore = !isAI ? playerScore + moveScore : playerScore;
      const fp = isFirstMove ? pit : firstPit;

      if (isAI && lastPit === storeIdx && chainDepth < 10) {
        dfs(
          depth,
          isAITurn,
          false,
          chainDepth + 1,
          newCounts,
          newNegCounts,
          newAiPeeks,
          newPlayerPeeks,
          newAiScore,
          newPlayerScore,
          fp,
          guruChainCount + 1,
        );
      } else {
        dfs(
          depth + 1,
          !isAITurn,
          false,
          0,
          newCounts,
          newNegCounts,
          newAiPeeks,
          newPlayerPeeks,
          newAiScore,
          newPlayerScore,
          fp,
          guruChainCount,
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
    initNegCounts,
    peeksDoneAI,
    peeksDonePlayer,
    0,
    0,
    validPits[0],
    0,
  );

  return validPits.includes(bestFirstPit) ? bestFirstPit : validPits[0];
}

// 笏笏笏 SimKooniV1: 蟆城ｬｼ繝吶・繧ｹ隍堤ｾ守音蛹門梛・亥ｯｾ髦ｿ菫ｮ鄒・畑繧ｷ繝溘ΗAI・・笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏
/**
 * SimKooniV1 - 蟆城ｬｼ繝吶・繧ｹ繝ｻ隍堤ｾ守音蛹門梛・亥ｯｾ髦ｿ菫ｮ鄒・す繝溘Η繝ｬ繝ｼ繧ｷ繝ｧ繝ｳ蟆ら畑・・
 *
 * 蟆城ｬｼ・医Λ繝ｳ繝繝・峨ｒ蝓ｺ逶､縺ｨ縺励√ご繝ｼ繝縺ｮ縲瑚､堤ｾ弱阪ｒ譛螟ｧ蛹悶☆繧区焔繧貞━蜈医☆繧九・
 * neg遏ｳ繧奪FS蜈ｨ豺ｱ縺輔〒繝医Λ繝・く繝ｳ繧ｰ縺励√■繧峨■繧臥ｵ瑚ｷｯ縺ｧ縺ｮ逶ｸ謇玖ｳｽ螢・∝・繧帝㍾隕悶・
 *
 * 隍堤ｾ弱せ繧ｳ繧｢:
 *   縺｡繧峨■繧・  +30・亥渕譛ｬ・・ neg遏ｳ謨ｰﾃ・0・・eg遏ｳ繧堤嶌謇玖ｳｽ螢・∈騾√ｋ隍堤ｾ趣ｼ・
 *   縺舌ｋ縺舌ｋ:  +15 - neg遏ｳ謨ｰﾃ・2・・eg螟壹＞縺ｨ螟ｧ蟷・ｸ帷せ・・
 *   縺悶￥縺悶￥:  +16 + 螂ｪ縺医ｋ遏ｳ謨ｰ
 *   逶ｸ謇九■繧峨■繧牙ｦｨ螳ｳ: +9
 *   逶ｸ謇九＊縺上＊縺丞ｦｨ螳ｳ: +8 + 遏ｳ謨ｰ
 *
 * neg遏ｳ謨ｰ繧貞・DFS豺ｱ縺輔〒繝医Λ繝・く繝ｳ繧ｰ縺励∫ｲｾ蠎ｦ縺ｮ鬮倥＞謇玖ｩ穂ｾ｡繧貞ｮ溽樟縲・
 */
export function AshuraKiller(
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

  const maxDepth = params?.depth ?? 5;
  const guruScore = params?.guruScore ?? 15;
  const chiraScoreBase = params?.chiraScore ?? 30;
  const negChiraBonus = params?.negChiraBonus ?? 30;
  const negGuruPenalty = params?.negGuruPenalty ?? 22;
  const zakuBase = params?.zakuBase ?? 16;
  const zakuNegPenalty = params?.zakuNegPenalty ?? 0;
  const oppChiraScore = params?.oppChiraScore ?? 9;
  const oppZakuBase = params?.oppZakuBase ?? 8;
  const chiraLimit = 3;

  const initCounts = state.pits.map((p) => p.stones.length);

  // 縺｡繧峨■繧臥｢ｺ隱肴ｸ医∩縺ｮneg濶ｲ繧呈滑謠｡
  let knownNeg = null;
  for (const fc of fortune?.center ?? []) {
    if (fc.bonus < 0 && fc.seenBy?.includes(aiSideKey)) {
      knownNeg = fc.color;
      break;
    }
  }

  // neg遏ｳ謨ｰ・・it豈趣ｼ・
  const initNegCounts = state.pits.map((p) =>
    knownNeg ? p.stones.filter((s) => s.color === knownNeg).length : 0,
  );

  const hasUnconfirmedNegForAI =
    fortune?.center?.some(
      (fc) => fc.bonus < 0 && !fc.seenBy?.includes(aiSideKey),
    ) ?? false;
  const hasUnconfirmedNegForPlayer =
    fortune?.center?.some(
      (fc) => fc.bonus < 0 && !fc.seenBy?.includes(plSideKey),
    ) ?? false;

  // 鬮倬滓鋳縺阪す繝溘Η繝ｬ繝ｼ繧ｷ繝ｧ繝ｳ・育浹謨ｰ + neg遏ｳ謨ｰ 荳ｦ陦瑚ｿｽ霍｡・・
  function fastSowWithNeg(counts, negCounts, pitIndex) {
    const nc = counts.slice();
    const nnc = negCounts.slice();
    const n = nc[pitIndex];
    if (n === 0) return { counts: nc, negCounts: nnc, lastPit: -1 };
    const negN = nnc[pitIndex];
    nc[pitIndex] = 0;
    nnc[pitIndex] = 0;
    let cur = pitIndex;
    // neg遏ｳ繧貞庄閭ｽ縺ｪ髯舌ｊ譛ｫ蟆ｾ縺ｫ驟咲ｽｮ・育嶌謇玖ｳｽ螢・or 逶ｸ謇玖ｷｯ縺ｫ霑代▼縺代ｋ・・
    // 邁｡逡･蛹・ neg遏ｳ縺ｯ蝮・ｭ牙・謨｣
    const negPerSlot = negN > 0 ? negN / n : 0;
    for (let i = 0; i < n; i++) {
      cur = (cur + 1) % 12;
      nc[cur]++;
      if (negN > 0) nnc[cur] += negPerSlot;
    }
    return { counts: nc, negCounts: nnc, lastPit: cur };
  }

  function scoreSow(counts, negCounts, pit, isAI, peeks) {
    const laneMin = isAI ? aiLaneMin : plLaneMin;
    const laneMax = isAI ? aiLaneMax : plLaneMax;
    const storeIndex = isAI ? aiStore : playerStore;
    const oppStoreIndex = isAI ? playerStore : aiStore;
    const n = counts[pit];
    const lastPit = (pit + n) % 12;
    const negN = negCounts[pit];
    let score = 0;

    // 縺舌ｋ縺舌ｋ・・eg遏ｳ縺悟､壹＞縺ｻ縺ｩ貂帷せ・・
    if (lastPit === storeIndex) {
      if (isAI) {
        score += Math.max(-10, guruScore - negN * negGuruPenalty);
      } else {
        score += 5;
      }
    }

    // 縺｡繧峨■繧会ｼ・eg遏ｳ縺悟､壹＞縺ｻ縺ｩ蜉轤ｹ・・
    if (isAI) {
      if (lastPit === oppStoreIndex && peeks < chiraLimit) {
        score += chiraScoreBase + negN * negChiraBonus;
        if (peeks === chiraLimit - 1 && hasUnconfirmedNegForAI) score += 10;
      }
    } else {
      if (lastPit === oppStoreIndex && peeks < 2) {
        score += oppChiraScore;
        if (peeks === 1 && hasUnconfirmedNegForPlayer) score += 8;
      }
    }

    // ざくざく（neg石が多いミラー路は低評価）
    if (lastPit >= laneMin && lastPit <= laneMax && counts[lastPit] === 0) {
      const mirror = isAI
        ? isOppRole
          ? lastPit - 6
          : lastPit + 6
        : isOppRole
          ? lastPit + 6
          : lastPit - 6;
      if (counts[mirror] > 0) {
        const mirrorNeg = negCounts[mirror];
        const rawScore = (isAI ? zakuBase : oppZakuBase) + counts[mirror];
        score += Math.max(0, rawScore - mirrorNeg * zakuNegPenalty);
      }
    }

    return { score, lastPit };
  }

  function getTopMoves(counts, negCounts, isAI, peeks, restrictTo) {
    const laneMin = isAI ? aiLaneMin : plLaneMin;
    const laneMax = isAI ? aiLaneMax : plLaneMax;
    const pool =
      restrictTo ??
      Array.from({ length: laneMax - laneMin + 1 }, (_, i) => laneMin + i);
    const scored = [];
    for (const p of pool) {
      if (counts[p] === 0) continue;
      const { score } = scoreSow(counts, negCounts, p, isAI, peeks);
      scored.push({ pit: p, score });
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, restrictTo ? 6 : 3);
  }

  let bestFirstPit = validPits[0];
  let bestNet = -Infinity;

  function dfs(
    depth,
    isAITurn,
    isFirstMove,
    chainDepth,
    counts,
    negCounts,
    aiPeeks,
    playerPeeks,
    aiScore,
    playerScore,
    firstPit,
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
      ? getTopMoves(counts, negCounts, true, aiPeeks, validPits)
      : getTopMoves(counts, negCounts, isAITurn, peeks, null);

    if (topMoves.length === 0) return;

    for (const { pit } of topMoves) {
      const { score, lastPit } = scoreSow(
        counts,
        negCounts,
        pit,
        isAITurn,
        peeks,
      );
      const { counts: newCounts, negCounts: newNegCounts } = fastSowWithNeg(
        counts,
        negCounts,
        pit,
      );

      let newAiPeeks = aiPeeks;
      let newPlayerPeeks = playerPeeks;
      if (isAITurn && lastPit === oppStoreIndex && peeks < chiraLimit) {
        newAiPeeks++;
      } else if (!isAITurn && lastPit === oppStoreIndex && peeks < 2) {
        newPlayerPeeks++;
      }

      const newAiScore = isAITurn ? aiScore + score : aiScore;
      const newPlayerScore = !isAITurn ? playerScore + score : playerScore;
      const fp = isFirstMove ? pit : firstPit;

      if (lastPit === storeIndex && chainDepth < 10) {
        dfs(
          depth,
          isAITurn,
          false,
          chainDepth + 1,
          newCounts,
          newNegCounts,
          newAiPeeks,
          newPlayerPeeks,
          newAiScore,
          newPlayerScore,
          fp,
        );
      } else {
        dfs(
          depth + 1,
          !isAITurn,
          false,
          0,
          newCounts,
          newNegCounts,
          newAiPeeks,
          newPlayerPeeks,
          newAiScore,
          newPlayerScore,
          fp,
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
    initNegCounts,
    peeksDoneAI,
    peeksDonePlayer,
    0,
    0,
    validPits[0],
  );

  return validPits.includes(bestFirstPit) ? bestFirstPit : validPits[0];
}
