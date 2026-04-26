/**
 * SimRunnerTestKyubi.js
 * testKyubi（防御・妨害特化） vs Kisin（OniV3, 5手DFS）の
 * ヘッドレス対戦ループ
 *
 * ビルド & 実行:
 *   node node_modules/vite/bin/vite.js build は不要
 *   tools/optim_testKyubi.js から esbuild でバンドルして使う
 *
 * testKyubi の動作（パラメータ化）:
 *   - ピット選択: peeksDone===0 → pit5強制、以降はスコアで選択
 *   - 配置: ざくざく後にちらちらセットアップ路を優先
 *   - 特殊行動: センター全確認前は常にちらちら、確認後は積極こびふり
 */

import { GameState } from "../logic/GameState.js";
import {
  createMemoV1 as createMemo,
  updateMemoV1 as updateMemo,
  pickPitKisinV1,
  pickPitTestKyubiV1,
  decidePlacementsKisinV1,
  optimizeSowOrderKisinV1,
} from "./SimAI.js";
import { DEFAULT_TEST_KYUBI_PARAMS } from "./SimParams.js";

const MAX_TURNS = 300;

// ─── ヘルパー ────────────────────────────────────────────────────

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
    pits: [...state.pits.slice(6, 12), ...state.pits.slice(0, 6)],
  };
}

function _invertFortune(fortune) {
  return {
    center: (fortune.center ?? []).map((fc) => ({
      ...fc,
      seenBy: (fc.seenBy ?? []).map((s) =>
        s === "self" ? "opp" : s === "opp" ? "self" : s,
      ),
    })),
    opp: fortune.self,
    self: fortune.opp,
  };
}

// ─── testKyubi 配置選択 ──────────────────────────────────────────

/**
 * ざくざく後の配置先を選ぶ
 * ちらちらセットアップ路（(pit + newCount) % 12 === 5）を優先
 */
function _pickPlacementTestKyubi(state, p) {
  const lanes = [6, 7, 8, 9, 10];
  let bestPit = lanes[0];
  let bestScore = -Infinity;
  for (const pit of lanes) {
    const newCount = state.pits[pit].stones.length + 1;
    let score = 0;
    if ((pit + newCount) % 12 === 5) score += p.tkChirachiraSetupBias * 10;
    // 既存石が多い路は少し避ける（密集を避ける）
    score -= state.pits[pit].stones.length * 0.5;
    if (score > bestScore) {
      bestScore = score;
      bestPit = pit;
    }
  }
  return bestPit;
}

// ─── testKyubi 特殊行動（ちらちら/こびふり） ─────────────────────

/**
 * pit5 着地後の特殊行動を実行して true を返す（ぐるぐるで追加ターンが必要な場合は false）
 * - センター未全確認: 常にちらちら
 * - センター全確認済み: 積極こびふり
 */
function _handleSpecialTestKyubi(gs, memoGote, p) {
  const state = gs.getState();
  const fortune = state.fortune;
  const peeksDone = gs.centerPeekProgress?.opp ?? 0;

  // センターに未確認石が残っているか
  const canReveal = fortune.center.some((fc) => !fc.seenBy.includes("opp"));

  if (canReveal) {
    // 常にちらちら
    gs.revealNextCenterForPlayer("opp");
    return true;
  }

  // 全確認済み → 積極こびふり
  const pit5stones = state.pits[5].stones;
  if (pit5stones.length === 0) return true;

  const ownFortune = fortune.opp?.color ?? null;
  const knownNegColor = (() => {
    const neg = fortune.center.find(
      (fc) => fc.bonus < 0 && fc.seenBy.includes("opp"),
    );
    return neg?.color ?? null;
  })();
  const knownPosColors = fortune.center
    .filter((fc) => fc.bonus > 0 && fc.seenBy.includes("opp"))
    .map((fc) => fc.color);
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

// ─── くたくた適用 ──────────────────────────────────────────────

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

// ─── メインゲームループ ──────────────────────────────────────────

/**
 * 1ゲーム: testKyubi vs Kisin
 * @param {object} tkParams - testKyubi パラメータ
 * @param {"opp"|"self"} tkRole - testKyubi が gote(pit6-10)か sente(pit0-4)か
 * @param {number} kisinDepth - Kisin の DFS 深さ（デフォルト 3）
 */
export function runGameTestKyubiVsKisin(
  tkParams = DEFAULT_TEST_KYUBI_PARAMS,
  tkRole = "opp",
  kisinDepth = 3,
) {
  const gs = new GameState();
  const p = { ...DEFAULT_TEST_KYUBI_PARAMS, ...tkParams };

  const memoSente = createMemo(); // sente 側メモ
  const memoGote = createMemo(); // gote 側メモ

  let selfTurn = true;
  let turn = 0;

  while (!gs.isGameOver() && turn < MAX_TURNS) {
    turn++;
    const state = gs.getState();
    const fortune = state.fortune;

    if (gs.checkSennitte() >= 2) {
      return { tkScore: 0, kisinScore: 0, winner: "draw", turns: turn };
    }

    // ─── sente ターン (pit0-4) ────────────────────────────────────
    if (selfTurn) {
      const validPits = [0, 1, 2, 3, 4].filter(
        (i) => state.pits[i].stones.length > 0,
      );
      if (validPits.length === 0) {
        selfTurn = false;
        continue;
      }

      const selfPeeks = gs.centerPeekProgress?.self ?? 0;
      const oppPeeks = gs.centerPeekProgress?.opp ?? 0;

      const senteSeen = fortune.center
        .filter((fc) => fc.seenBy.includes("self"))
        .map((fc) => fc.color);
      updateMemo(memoSente, _invertState(state), senteSeen);

      let chosen;
      if (tkRole === "self") {
        // testKyubi as sente: pit選択（state を sente 視点に変換）
        // sente 視点では pit0-4 が "自分の路"、pit5 が "自賽壇"
        // pickPitTestKyubiV1 は gote 視点(6-10)前提なので、インデックスを変換
        const invState = _invertState(state);
        const invValidPits = validPits.map((pt) => pt + 6);
        const invChosen = pickPitTestKyubiV1(
          invValidPits,
          invState,
          selfPeeks,
          oppPeeks,
          _invertFortune(fortune),
          p,
          4,
        );
        chosen = invChosen - 6;
      } else {
        // Kisin as sente: OniV3 は "opp"(pit6-10) 視点固定なので反転
        const invState = _invertState(state);
        const invFortune = _invertFortune(fortune);
        const invPits = validPits.map((pt) => pt + 6);
        const invChosen = pickPitKisinV1(
          invPits,
          invState,
          selfPeeks,
          oppPeeks,
          invFortune,
          kisinDepth,
        );
        chosen = invChosen - 6;

        // Kisin の撒き順最適化
        const invS = _invertState(state);
        const invF = _invertFortune(fortune);
        const tgts = _buildSowTargets(chosen, state.pits[chosen].stones.length);
        state.pits[chosen].stones = optimizeSowOrderKisinV1(
          state.pits[chosen].stones,
          tgts.map((t) => (t + 6) % 12),
          invS,
          invF,
          memoSente,
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

      // ざくざく（sente 側）
      const capturedSente = gs.checkCaptureForPlayer("self", lastPit);
      if (capturedSente.length > 0) {
        gs.startPlacement(capturedSente);
        if (tkRole === "self") {
          // testKyubi のざくざく後配置（sente 視点変換）
          // 優先1: ちらちらセットアップ sente→pit11 → inverted では pit5
          // 優先2: ぐるぐるセットアップ sente→pit5  → inverted では pit11
          // フォールバック: Kisin 配置ロジック
          while (gs.isPlacementActive()) {
            const st = gs.getState();
            const invSt = _invertState(st);
            // 優先1: ちらちらセットアップ (inverted pit 6-10 → land on inverted pit5)
            const chirachiraSetup = [0, 1, 2, 3, 4].filter((q) => {
              const nc = invSt.pits[q + 6].stones.length + 1;
              return (q + 6 + nc) % 12 === 5;
            });
            if (chirachiraSetup.length > 0) {
              chirachiraSetup.sort((a, b) => b - a);
              gs.placePendingStone(chirachiraSetup[0], 0);
              continue;
            }
            // 優先2: ぐるぐるセットアップ (inverted pit 6-10 → land on inverted pit11)
            const guruSetup = [0, 1, 2, 3, 4].filter((q) => {
              const nc = invSt.pits[q + 6].stones.length + 1;
              return (q + 6 + nc) % 12 === 11;
            });
            if (guruSetup.length > 0) {
              guruSetup.sort((a, b) => b - a);
              gs.placePendingStone(guruSetup[0], 0);
              continue;
            }
            // 優先3: 石が多い路に集中（sente 自路 0-4）
            const sortedSente = [0, 1, 2, 3, 4]
              .slice()
              .sort(
                (a, b) =>
                  gs.getState().pits[b].stones.length -
                  gs.getState().pits[a].stones.length,
              );
            if (sortedSente[0] !== undefined) {
              gs.placePendingStone(sortedSente[0], 0);
              continue;
            }
            // フォールバック: Kisin 配置ロジック
            const pending = gs.getPendingPlacement();
            const invF = _invertFortune(fortune);
            const placements = decidePlacementsKisinV1(
              pending,
              invSt,
              invF,
              memoSente,
            );
            gs.placePendingStone(
              placements.length > 0 ? placements[0].pitIndex - 6 : 0,
              placements.length > 0 ? placements[0].stoneIndex : 0,
            );
          }
        } else {
          // Kisin ざくざく後配置
          const invState2 = _invertState(gs.getState());
          const invFortune2 = _invertFortune(gs.getState().fortune);
          const placements = decidePlacementsKisinV1(
            capturedSente,
            invState2,
            invFortune2,
            memoSente,
          );
          for (const { pitIndex } of placements) {
            if (!gs.isPlacementActive()) break;
            gs.placePendingStone(pitIndex - 6, 0);
          }
          while (gs.isPlacementActive()) gs.placePendingStone(0, 0);
        }
      }

      if (lastPit === 5) continue; // ぐるぐる

      // ちらちら/こびふり (pit11 着地 → sente 視点でのちらちら)
      if (lastPit === 11) {
        if (tkRole === "self") {
          // testKyubi as sente: sente 視点でちらちら
          // sente がちらちら = gs.revealNextCenterForPlayer("self")
          const canReveal = gs
            .getState()
            .fortune.center.some((fc) => !fc.seenBy.includes("self"));
          if (canReveal) {
            gs.revealNextCenterForPlayer("self");
          } else {
            // 全確認 → 積極こびふり（相手賽壇 pit11 から除去）
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
          // Kisin のちらちら/こびふり（simple: 常にちらちら→全確認後ランダムこびふり）
          const canRevealKisin = gs
            .getState()
            .fortune.center.some((fc) => !fc.seenBy.includes("self"));
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

      // くたくた (sente)
      if (gs.canActivateKutakuta("self")) {
        const s = gs.getState().pits[5].stones.length;
        const o = gs.getState().pits[11].stones.length;
        if (s >= o + p.tkKutakutaBias) _applyKutakuta(gs, "self");
      }

      selfTurn = false;

      // ─── gote ターン (pit6-10) ──────────────────────────────────
    } else {
      const validPits = [6, 7, 8, 9, 10].filter(
        (i) => state.pits[i].stones.length > 0,
      );
      if (validPits.length === 0) {
        selfTurn = true;
        continue;
      }

      const selfPeeks = gs.centerPeekProgress?.self ?? 0;
      const oppPeeks = gs.centerPeekProgress?.opp ?? 0;

      const goteSeen = fortune.center
        .filter((fc) => fc.seenBy.includes("opp"))
        .map((fc) => fc.color);
      updateMemo(memoGote, state, goteSeen);

      let chosen;
      if (tkRole === "opp") {
        // testKyubi as gote: そのまま gote 視点
        chosen = pickPitTestKyubiV1(
          validPits,
          state,
          oppPeeks,
          selfPeeks,
          fortune,
          p,
          4,
        );
      } else {
        // Kisin as gote
        chosen = pickPitKisinV1(
          validPits,
          state,
          oppPeeks,
          selfPeeks,
          fortune,
          kisinDepth,
        );
        // Kisin の撒き順最適化
        const tgts = _buildSowTargets(chosen, state.pits[chosen].stones.length);
        state.pits[chosen].stones = optimizeSowOrderKisinV1(
          state.pits[chosen].stones,
          tgts,
          state,
          fortune,
          memoGote,
        );
      }

      if (chosen < 6 || chosen > 10) {
        selfTurn = true;
        continue;
      }

      // 手動撒き（GameState.sow は self 専用のため gote は直接操作）
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

      // ざくざく（gote 側）
      const capturedGote = gs.checkCaptureForPlayer("opp", lastPit);
      if (capturedGote.length > 0) {
        gs.startPlacement(capturedGote);
        if (tkRole === "opp") {
          // testKyubi のざくざく後配置
          // 優先1: ちらちらセットアップ (q+nc)%12===5 (gote→pit5)
          // 優先2: ぐるぐるセットアップ (q+nc)%12===11 (gote→pit11)
          // フォールバック: Kisin配置
          while (gs.isPlacementActive()) {
            const st = gs.getState();
            // 優先1: ちらちらセットアップ (着地pit5)
            const chirachiraSetup = [6, 7, 8, 9, 10].filter((q) => {
              const nc = st.pits[q].stones.length + 1;
              return (q + nc) % 12 === 5;
            });
            if (chirachiraSetup.length > 0) {
              chirachiraSetup.sort((a, b) => b - a);
              gs.placePendingStone(chirachiraSetup[0], 0);
              continue;
            }
            // 優先2: ぐるぐるセットアップ (着地pit11)
            const guruSetup = [6, 7, 8, 9, 10].filter((q) => {
              const nc = st.pits[q].stones.length + 1;
              return (q + nc) % 12 === 11;
            });
            if (guruSetup.length > 0) {
              guruSetup.sort((a, b) => b - a);
              gs.placePendingStone(guruSetup[0], 0);
              continue;
            }
            // 優先3: 石が多い路に集中（ざくざく連打しやすくする）
            const sortedByCount = [6, 7, 8, 9, 10]
              .slice()
              .sort(
                (a, b) =>
                  gs.getState().pits[b].stones.length -
                  gs.getState().pits[a].stones.length,
              );
            const denseLane = sortedByCount[0];
            if (denseLane !== undefined) {
              gs.placePendingStone(denseLane, 0);
              continue;
            }
            // フォールバック: Kisin配置
            const pending = gs.getPendingPlacement();
            const placements = decidePlacementsKisinV1(
              pending,
              st,
              fortune,
              memoGote,
            );
            gs.placePendingStone(
              placements.length > 0 ? placements[0].pitIndex : 6,
              placements.length > 0 ? placements[0].stoneIndex : 0,
            );
          }
        } else {
          // Kisin のざくざく後配置
          const placements = decidePlacementsKisinV1(
            capturedGote,
            gs.getState(),
            fortune,
            memoGote,
          );
          for (const { pitIndex } of placements) {
            if (!gs.isPlacementActive()) break;
            gs.placePendingStone(pitIndex, 0);
          }
          while (gs.isPlacementActive()) gs.placePendingStone(6, 0);
        }
      }

      if (lastPit === 11) continue; // ぐるぐる

      // ちらちら/こびふり (pit5 着地)
      if (lastPit === 5) {
        if (tkRole === "opp") {
          _handleSpecialTestKyubi(gs, memoGote, p);
        } else {
          // Kisin のちらちら
          const canRevealKisin = gs
            .getState()
            .fortune.center.some((fc) => !fc.seenBy.includes("opp"));
          if (canRevealKisin) {
            gs.revealNextCenterForPlayer("opp");
          } else {
            const pit5stones = gs.getState().pits[5].stones;
            if (pit5stones.length > 0) gs.removeStoneFromPit(5, 0);
          }
        }
      }

      // くたくた (gote)
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
    winner:
      tkScore > kisinScore ? "tk" : tkScore < kisinScore ? "kisin" : "draw",
    turns: turn,
  };
}

/**
 * N ゲームを先手・後手均等に実行して集計を返す
 * @param {object} tkParams
 * @param {number} n - ゲーム数
 * @param {number} kisinDepth
 * @returns {{ tkWins, kisinWins, draws, tkWinPct, avgTkScore, avgKisinScore }}
 */
export function runManyTestKyubiVsKisin(
  tkParams = DEFAULT_TEST_KYUBI_PARAMS,
  n = 500,
  kisinDepth = 3,
) {
  let tkWins = 0,
    kisinWins = 0,
    draws = 0;
  let totalTkScore = 0,
    totalKisinScore = 0;
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
    tkWinPct: parseFloat(((tkWins / n) * 100).toFixed(2)),
    kisinWinPct: parseFloat(((kisinWins / n) * 100).toFixed(2)),
    drawPct: parseFloat(((draws / n) * 100).toFixed(2)),
    avgTkScore: parseFloat((totalTkScore / n).toFixed(2)),
    avgKisinScore: parseFloat((totalKisinScore / n).toFixed(2)),
    n,
  };
}
