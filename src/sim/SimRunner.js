/**
 * SimRunner.js
 * 1ゲームをヘッドレス（描画・待機なし）で同期実行する
 * GameState をそのまま使い、SimAI が両プレイヤーを操作する
 *
 * 使い方:
 *   import { runGame, runMany } from "./SimRunner.js";
 *   const result = runGame(paramsA, paramsB);
 *   const stats = runMany(paramsA, paramsB, 1000);
 */

import { GameState } from "../logic/GameState.js";
import {
  createMemo,
  updateMemo,
  pickPit,
  decidePlacements,
  decideSpecialAction,
} from "./SimAI.js";
import { DEFAULT_PARAMS } from "./SimParams.js";

const MAX_TURNS = 300; // 無限ループ防止

/**
 * 1ゲームを実行して結果を返す
 * @param {object} paramsA - "self"（先手プレイヤー側） の AI パラメータ
 * @param {object} paramsB - "opp"（後手 AI 側） の AI パラメータ
 * @returns {{
 *   selfScore: number,
 *   oppScore: number,
 *   winner: "self"|"opp"|"draw",
 *   turns: number,
 *   selfPeeks: number,
 *   oppPeeks: number,
 *   selfGuruCount: number,
 *   oppGuruCount: number,
 *   selfZakuCount: number,
 *   oppZakuCount: number,
 * }}
 */
export function runGame(paramsA = DEFAULT_PARAMS, paramsB = DEFAULT_PARAMS) {
  const gs = new GameState();
  const memoSelf = createMemo();
  const memoOpp = createMemo();

  // 個人占い石を両者が自分のものだけ確認（ゲーム開始時の仕様）
  // ※ ゲームルール: 開始時に個人占い石を確認（中央は確認しない）
  // memoSelf / memoOpp は占い情報を持たない状態からスタート

  let selfTurn = true; // true = self(pit0-4), false = opp(pit6-10)
  let turn = 0;

  // 統計カウンタ
  let selfGuruCount = 0;
  let oppGuruCount = 0;
  let selfZakuCount = 0;
  let oppZakuCount = 0;

  while (!gs.isGameOver() && turn < MAX_TURNS) {
    turn++;
    const state = gs.getState();
    const fortune = state.fortune;

    if (selfTurn) {
      // ─── self ターン ───
      updateMemo(memoSelf, _invertStateForSelf(state));
      const peeksDone = gs.centerPeekProgress.self ?? 0;
      const validPits = [0, 1, 2, 3, 4].filter(
        (i) => state.pits[i].stones.length > 0,
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
        paramsA,
      );
      const sowResult = gs.sow(chosen);
      if (!sowResult) {
        selfTurn = false;
        continue;
      }

      const lastPit = sowResult.lastPit;

      // ざくざく
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
          "self",
        );
        for (const { pitIndex, stone } of placements) {
          const pending = gs.getPendingPlacement();
          if (pending.length === 0) break;
          gs.placePendingStone(pitIndex, 0);
        }
        // 残りはランダム配置（pit0-4）
        while (gs.isPlacementActive()) {
          const remaining = gs.getPendingPlacement();
          if (remaining.length === 0) break;
          gs.placePendingStone(Math.floor(Math.random() * 5), 0);
        }
      }

      // ぐるぐる（余分ターン）
      if (lastPit === 5) {
        selfGuruCount++;
        // ちらちら/ぽいぽい
        const specialAction = decideSpecialAction(
          gs.getState(),
          memoSelf,
          fortune,
          peeksDone,
          true,
          "self",
        );
        if (specialAction.action === "chirachira") {
          gs.revealNextCenterForPlayer("self");
        } else if (specialAction.action === "poipoi") {
          gs.removeStoneFromPit(
            specialAction.removePitIndex,
            specialAction.removeStoneIndex,
          );
        }
        // ぐるぐる = extra turn → selfTurn は変えない
        continue;
      }

      // くたくた チェック
      if (gs.canActivateKutakuta("self")) {
        const selfStore = gs.getState().pits[5].stones.length;
        const oppStore = gs.getState().pits[11].stones.length;
        if (selfStore > oppStore - 2) {
          _applyKutakuta(gs, "self");
        }
      }

      selfTurn = false;
    } else {
      // ─── opp ターン ───
      updateMemo(memoOpp, state);
      const peeksDone = gs.centerPeekProgress.opp ?? 0;
      const validPits = [6, 7, 8, 9, 10].filter(
        (i) => state.pits[i].stones.length > 0,
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
        paramsB,
      );

      // opp の撒きは gameState.sow() が "self" 前提なので手動実装
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

      // ざくざく
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
          "opp",
        );
        for (const { pitIndex, stone } of placements) {
          if (!gs.isPlacementActive()) break;
          gs.placePendingStone(pitIndex, 0);
        }
        while (gs.isPlacementActive()) {
          gs.placePendingStone(6 + Math.floor(Math.random() * 5), 0);
        }
      }

      // ぐるぐる
      if (lastPit === 11) {
        oppGuruCount++;
        const specialAction = decideSpecialAction(
          gs.getState(),
          memoOpp,
          fortune,
          peeksDone,
          true,
          "opp",
        );
        if (specialAction.action === "chirachira") {
          gs.revealNextCenterForPlayer("opp");
        } else if (specialAction.action === "poipoi") {
          gs.removeStoneFromPit(
            specialAction.removePitIndex,
            specialAction.removeStoneIndex,
          );
        }
        continue; // extra turn
      }

      // くたくた
      if (gs.canActivateKutakuta("opp")) {
        const selfStore = gs.getState().pits[5].stones.length;
        const oppStore = gs.getState().pits[11].stones.length;
        if (oppStore > selfStore - 2) {
          _applyKutakuta(gs, "opp");
        }
      }

      selfTurn = true;
    }
  }

  const selfScore = gs.calcScore("self");
  const oppScore = gs.calcScore("opp");
  const winner =
    selfScore > oppScore ? "self" : selfScore < oppScore ? "opp" : "draw";

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
    oppZakuCount,
  };
}

/**
 * N ゲームを実行して集計統計を返す
 */
export function runMany(
  paramsA = DEFAULT_PARAMS,
  paramsB = DEFAULT_PARAMS,
  n = 500,
) {
  let selfWins = 0,
    oppWins = 0,
    draws = 0;
  let selfScoreSum = 0,
    oppScoreSum = 0;
  let totalTurns = 0;
  let selfGuruSum = 0,
    oppGuruSum = 0;
  let selfZakuSum = 0,
    oppZakuSum = 0;
  let selfPeekSum = 0,
    oppPeekSum = 0;
  const scores = []; // 得点差の分布用

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
    selfWinRate: ((selfWins / n) * 100).toFixed(1) + "%",
    oppWinRate: ((oppWins / n) * 100).toFixed(1) + "%",
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
    avgOppPeeks: (oppPeekSum / n).toFixed(2),
  };
}

// ─── 内部ヘルパー ──────────────────────────────────────────────

/**
 * self 側 AI が "opp" 視点で観察するように state を mirror する
 * （self の memo は pit0-4 の状態から相手 opp を読む必要がある）
 */
function _invertStateForSelf(state) {
  // self AI は自分が「opp」として見た場合の相手（opp＝pit6-10）を追う
  // updateMemo は「pit5 の石 + pit0-4 の石」を観察するため
  // self 視点では相手は pit6-11 なので入れ替えが必要
  return {
    pits: [
      ...state.pits.slice(6, 12), // [0-5] = 旧 pit6-11 (oppの路・賽壇)
      ...state.pits.slice(0, 6), // [6-11] = 旧 pit0-5 (selfの路・賽壇)
    ],
  };
}

/**
 * くたくた発動: 相手の路の石を全て賽壇に移す
 */
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
