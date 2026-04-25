/**
 * SimRunnerRobo.js
 * RoboV1 vs OniV3 のヘッドレス対戦ループ（フル実装版）
 *
 * フル機能:
 *  - フォーチュン追跡（ちらちらで得た情報を DFS に反映）
 *  - メモ管理（updateMemo で相手の占い色を推測）
 *  - ざくざく後石配置: gote 側は decidePlacementsV3、sente 側はランダム
 *  - ちらちら/ぽいぽい: decideSpecialAction (DEFAULT_PARAMS) で判断
 *  - くたくた: DEFAULT_PARAMS.kutakutaThresholdOffset 使用
 *
 * roboRole = "opp" : Robo が gote (pit6-10), Oni が sente (pit0-4)
 * roboRole = "self": Robo が sente (pit0-4), Oni が gote (pit6-10)
 */

import { GameState } from "../logic/GameState.js";
import {
  createMemo,
  updateMemo,
  pickPitV3,
  pickPitRoboV1,
  decidePlacementsV3,
  decideSpecialAction,
} from "./SimAI.js";
import { DEFAULT_ROBO_PARAMS, DEFAULT_PARAMS } from "./SimParams.js";

const MAX_TURNS = 300;

// ─── ヘルパー ────────────────────────────────────────────────────

/** pit0-5 と pit6-11 を入れ替え（sente ↔ gote 視点変換） */
function _invertState(state) {
  return {
    ...state,
    pits: [...state.pits.slice(6, 12), ...state.pits.slice(0, 6)],
  };
}

/** fortune の self/opp と seenBy を入れ替え（sente ↔ gote 視点変換） */
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

/** くたくた発動: 指定プレイヤーの路の石を全て賽壇に移す */
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

// ─── メインゲームループ ─────────────────────────────────────────

/**
 * 1ゲームを実行して roboScore / oniScore / winner を返す
 */
export function runGameRoboVsOni(
  roboParams = DEFAULT_ROBO_PARAMS,
  roboRole = "opp",
) {
  const gs = new GameState();

  const memoSente = createMemo(); // pit0-4 player のメモ
  const memoGote = createMemo(); // pit6-10 player のメモ

  let selfTurn = true;
  let turn = 0;

  while (!gs.isGameOver() && turn < MAX_TURNS) {
    turn++;
    const state = gs.getState();
    const fortune = state.fortune;

    // ─── sente ターン (pit0-4) ─────────────────────────────────
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

      // memoSente 更新（sente は自分を "opp" 視点として認識）
      const senteSeen = fortune.center
        .filter((fc) => fc.seenBy.includes("self"))
        .map((fc) => fc.color);
      updateMemo(memoSente, _invertState(state), senteSeen);

      let chosen;
      if (roboRole === "self") {
        // Robo as sente
        chosen = pickPitRoboV1(
          validPits,
          state,
          selfPeeks,
          oppPeeks,
          fortune,
          roboParams,
          "self",
        );
      } else {
        // Oni as sente: OniV3 は "opp"(pit6-10) 視点固定なので反転
        const invState = _invertState(state);
        const invFortune = _invertFortune(fortune);
        const invPits = validPits.map((p) => p + 6);
        const invChosen = pickPitV3(
          invPits,
          invState,
          selfPeeks,
          oppPeeks,
          invFortune,
        );
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

      // ざくざく（sente 側: ランダム配置）
      const capturedSente = gs.checkCaptureForPlayer("self", lastPit);
      if (capturedSente.length > 0) {
        gs.startPlacement(capturedSente);
        while (gs.isPlacementActive()) {
          gs.placePendingStone(Math.floor(Math.random() * 5), 0);
        }
      }

      // ぐるぐる: extra turn
      if (lastPit === 5) continue;

      // ちらちら/ぽいぽい (pit11 着地)
      if (lastPit === 11) {
        const specialAction = decideSpecialAction(
          gs.getState(),
          memoSente,
          fortune,
          selfPeeks,
          true,
          "self",
          DEFAULT_PARAMS,
        );
        if (specialAction.action === "chirachira") {
          gs.revealNextCenterForPlayer("self");
        } else if (specialAction.action === "poipoi") {
          gs.removeStoneFromPit(
            specialAction.removePitIndex,
            specialAction.removeStoneIndex,
          );
        }
      }

      // くたくた
      if (gs.canActivateKutakuta("self")) {
        const s = gs.getState().pits[5].stones.length;
        const o = gs.getState().pits[11].stones.length;
        if (s > o + (DEFAULT_PARAMS.kutakutaThresholdOffset ?? -6)) {
          _applyKutakuta(gs, "self");
        }
      }

      selfTurn = false;

      // ─── gote ターン (pit6-10) ────────────────────────────────
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

      // memoGote 更新（gote は state をそのまま "opp" 視点で参照）
      const goteSeen = fortune.center
        .filter((fc) => fc.seenBy.includes("opp"))
        .map((fc) => fc.color);
      updateMemo(memoGote, state, goteSeen);

      let chosen;
      if (roboRole === "opp") {
        // Robo as gote
        chosen = pickPitRoboV1(
          validPits,
          state,
          oppPeeks,
          selfPeeks,
          fortune,
          roboParams,
          "opp",
        );
      } else {
        // Oni as gote: 標準 opp 視点のまま
        chosen = pickPitV3(validPits, state, oppPeeks, selfPeeks, fortune);
      }

      if (chosen < 6 || chosen > 10) {
        selfTurn = true;
        continue;
      }

      // 手動撒き（gs.sow は self 専用のため）
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

      // ざくざく（gote 側: decidePlacementsV3 で戦略的配置）
      const capturedGote = gs.checkCaptureForPlayer("opp", lastPit);
      if (capturedGote.length > 0) {
        gs.startPlacement(capturedGote);
        const placements = decidePlacementsV3(
          capturedGote,
          gs.getState(),
          fortune,
          memoGote,
        );
        for (const { pitIndex } of placements) {
          if (!gs.isPlacementActive()) break;
          gs.placePendingStone(pitIndex, 0);
        }
        while (gs.isPlacementActive()) {
          gs.placePendingStone(6 + Math.floor(Math.random() * 5), 0);
        }
      }

      // ぐるぐる: extra turn
      if (lastPit === 11) continue;

      // ちらちら/ぽいぽい (pit5 着地)
      if (lastPit === 5) {
        const specialAction = decideSpecialAction(
          gs.getState(),
          memoGote,
          fortune,
          oppPeeks,
          true,
          "opp",
          DEFAULT_PARAMS,
        );
        if (specialAction.action === "chirachira") {
          gs.revealNextCenterForPlayer("opp");
        } else if (specialAction.action === "poipoi") {
          gs.removeStoneFromPit(
            specialAction.removePitIndex,
            specialAction.removeStoneIndex,
          );
        }
      }

      // くたくた
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
    winner:
      roboScore > oniScore ? "robo" : roboScore < oniScore ? "oni" : "draw",
  };
}

/**
 * N ゲームを先手・後手均等に実行して集計を返す
 */
export function runManyRoboVsOni(roboParams = DEFAULT_ROBO_PARAMS, n = 500) {
  let roboWins = 0,
    oniWins = 0,
    draws = 0;
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
    roboWinPct: (roboWins / n) * 100,
    oniWinPct: (oniWins / n) * 100,
  };
}

// ─── OniV3 depth 比較用ゲームループ ─────────────────────────────

/**
 * OniV3(depthSente) vs OniV3(depthGote) の1ゲームを実行
 * sente = pit0-4, gote = pit6-10
 * @param {number} depthSente
 * @param {number} depthGote
 * @returns {{ senteScore, goteScore, winner: "sente"|"gote"|"draw" }}
 */
export function runGameOniVsOni(depthSente, depthGote) {
  const gs = new GameState();
  const memoSente = createMemo();
  const memoGote = createMemo();

  let selfTurn = true;
  let turn = 0;

  while (!gs.isGameOver() && turn < MAX_TURNS) {
    turn++;
    const state = gs.getState();
    const fortune = state.fortune;

    // ─── sente ターン (pit0-4) ─────────────────────────────────
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

      // OniV3 は gote 視点固定なので反転して呼ぶ
      const invState = _invertState(state);
      const invFortune = _invertFortune(fortune);
      const invPits = validPits.map((p) => p + 6);
      const invChosen = pickPitV3(
        invPits,
        invState,
        selfPeeks,
        oppPeeks,
        invFortune,
        depthSente,
      );
      const chosen = invChosen - 6;

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
          DEFAULT_PARAMS,
        );
        if (specialAction.action === "chirachira")
          gs.revealNextCenterForPlayer("self");
        else if (specialAction.action === "poipoi")
          gs.removeStoneFromPit(
            specialAction.removePitIndex,
            specialAction.removeStoneIndex,
          );
      }

      if (gs.canActivateKutakuta("self")) {
        const s = gs.getState().pits[5].stones.length;
        const o = gs.getState().pits[11].stones.length;
        if (s > o + (DEFAULT_PARAMS.kutakutaThresholdOffset ?? -6))
          _applyKutakuta(gs, "self");
      }

      selfTurn = false;

      // ─── gote ターン (pit6-10) ────────────────────────────────
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

      const chosen = pickPitV3(
        validPits,
        state,
        oppPeeks,
        selfPeeks,
        fortune,
        depthGote,
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
          memoGote,
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
          DEFAULT_PARAMS,
        );
        if (specialAction.action === "chirachira")
          gs.revealNextCenterForPlayer("opp");
        else if (specialAction.action === "poipoi")
          gs.removeStoneFromPit(
            specialAction.removePitIndex,
            specialAction.removeStoneIndex,
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
    winner:
      senteScore > goteScore
        ? "sente"
        : senteScore < goteScore
          ? "gote"
          : "draw",
  };
}

/**
 * depthA vs depthB を n ゲーム（半数ずつ先後交代）実行して集計
 * @returns {{ depthAWins, depthBWins, draws, depthAWinPct, depthBWinPct }}
 */
export function runManyOniVsOni(depthA, depthB, n = 1000) {
  let aWins = 0,
    bWins = 0,
    draws = 0;
  const half = Math.floor(n / 2);

  // 前半: A=sente, B=gote
  for (let i = 0; i < half; i++) {
    const r = runGameOniVsOni(depthA, depthB);
    if (r.winner === "sente") aWins++;
    else if (r.winner === "gote") bWins++;
    else draws++;
  }
  // 後半: B=sente, A=gote
  for (let i = 0; i < n - half; i++) {
    const r = runGameOniVsOni(depthB, depthA);
    if (r.winner === "sente") bWins++;
    else if (r.winner === "gote") aWins++;
    else draws++;
  }

  return {
    depthAWins: aWins,
    depthBWins: bWins,
    draws,
    depthAWinPct: (aWins / n) * 100,
    depthBWinPct: (bWins / n) * 100,
  };
}
