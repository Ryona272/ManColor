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
  createMemoV1 as createMemo,
  updateMemoV1 as updateMemo,
  pickPitKisinV1 as pickPitV3,
  pickPitKugutsuV1,
  decidePlacementsKisinV1 as decidePlacementsV3,
  decideSpecialActionV1 as decideSpecialAction,
  optimizeSowOrderKisinV1 as optimizeSowOrderV3,
} from "./SimAI.js";
import { DEFAULT_ROBO_PARAMS, DEFAULT_PARAMS } from "./SimParams.js";

const MAX_TURNS = 300;

// ─── ヘルパー ────────────────────────────────────────────────────

/** 路インデックスから各石の着地先一覧を作成 */
function _buildSowTargets(startPit, stoneCount) {
  const targets = [];
  let cursor = startPit;
  for (let i = 0; i < stoneCount; i++) {
    cursor = (cursor + 1) % 12;
    targets.push(cursor);
  }
  return targets;
}

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

/**
 * 重み付きランダムでpit選択（Robo用）
 * 各pitに対してざくざく/ぐるぐる/ちらちら着地を優先するバイアスをかける
 */
function _pickPitWeighted(validPits, state, params, role) {
  const myStore = role === "opp" ? 11 : 5;
  const oppStore = role === "opp" ? 5 : 11;
  const myLaneMin = role === "opp" ? 6 : 0;
  const myLaneMax = role === "opp" ? 10 : 4;

  const weights = validPits.map((pit) => {
    const n = state.pits[pit].stones.length;
    if (n === 0) return 0;
    const lastPit = (pit + n) % 12;
    let w = 1.0;

    // ぐるぐる着地
    if (lastPit === myStore) w *= params.roboGuruguruBias ?? 1;
    // ちらちら着地
    if (lastPit === oppStore) w *= params.roboChirachiraBias ?? 1;
    // ざくざく着地（自陣空き路 + 鏡に石あり）
    if (
      lastPit >= myLaneMin &&
      lastPit <= myLaneMax &&
      state.pits[lastPit].stones.length === 0
    ) {
      const mirror = role === "opp" ? lastPit - 6 : lastPit + 6;
      if (state.pits[mirror].stones.length > 0)
        w *= params.roboZakuzakuBias ?? 1;
    }
    return w;
  });

  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0)
    return validPits[Math.floor(Math.random() * validPits.length)];
  let r = Math.random() * total;
  for (let i = 0; i < validPits.length; i++) {
    r -= weights[i];
    if (r <= 0) return validPits[i];
  }
  return validPits[validPits.length - 1];
}

/**
 * ざくざく後の配置先を重み付きランダムで選ぶ（Robo用）
 * roboPlacementGuruBias: 配置するとぐるぐるセットアップになる路を優先
 */
function _pickPlacementWeighted(myLaneMin, myLaneMax, myStore, state, params) {
  const lanes = [];
  for (let i = myLaneMin; i <= myLaneMax; i++) lanes.push(i);
  const weights = lanes.map((pit) => {
    const newCount = state.pits[pit].stones.length + 1;
    const wouldGuru = (pit + newCount) % 12 === myStore;
    return wouldGuru ? (params.roboPlacementGuruBias ?? 1) : 1.0;
  });
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < lanes.length; i++) {
    r -= weights[i];
    if (r <= 0) return lanes[i];
  }
  return lanes[lanes.length - 1];
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
  oniDepth = 3,
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

    // 千日手チェック（2=引き分け）
    if (gs.checkSennitte() >= 2) {
      return { roboScore: 0, oniScore: 0, winner: "draw" };
    }

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
        // Robo as sente: 重み付きランダム選択
        chosen = _pickPitWeighted(validPits, state, roboParams, "self");
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
          oniDepth,
        );
        chosen = invChosen - 6;
      }

      if (chosen < 0 || chosen > 4) {
        selfTurn = false;
        continue;
      }

      // Oni as sente の撒き順最適化（実ゲームと同じロジック）
      if (roboRole === "opp") {
        const _invS = _invertState(state);
        const _invF = _invertFortune(fortune);
        const _tgts = _buildSowTargets(
          chosen,
          state.pits[chosen].stones.length,
        );
        state.pits[chosen].stones = optimizeSowOrderV3(
          state.pits[chosen].stones,
          _tgts.map((t) => (t + 6) % 12),
          _invS,
          _invF,
          memoSente,
        );
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
        if (roboRole === "opp") {
          // Oni as sente: decidePlacementsV3 で戦略的配置（視点を反転して使用）
          const invState = _invertState(gs.getState());
          const invFortune = _invertFortune(gs.getState().fortune);
          const invPlacements = decidePlacementsV3(
            capturedSente,
            invState,
            invFortune,
            memoSente,
          );
          for (const { pitIndex } of invPlacements) {
            if (!gs.isPlacementActive()) break;
            gs.placePendingStone(pitIndex - 6, 0);
          }
        }
        // Robo as sente / 残り: 重み付き配置
        while (gs.isPlacementActive()) {
          gs.placePendingStone(
            _pickPlacementWeighted(0, 4, 5, gs.getState(), roboParams),
            0,
          );
        }
      }

      // ぐるぐる: extra turn
      if (lastPit === 5) continue;

      // ちらちら/ぽいぽい (pit11 着地)
      if (lastPit === 11) {
        if (roboRole === "self") {
          // Robo as sente: easy 同等 — ちらちらは常に実行（peeks<3）、尽きたらランダムぽいぽい
          if (selfPeeks < 3) {
            gs.revealNextCenterForPlayer("self");
          } else {
            // ちらちら使い切り → 相手賞壇からランダムに1個除去
            const pit5stones = gs.getState().pits[5].stones;
            if (pit5stones.length > 0) {
              gs.removeStoneFromPit(
                5,
                Math.floor(Math.random() * pit5stones.length),
              );
            }
          }
        } else {
          // Oni as sente: decideSpecialAction で判断
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
      }

      // くたくた (sente: easy 同等 — 自分が上回ったら発動)
      if (gs.canActivateKutakuta("self")) {
        const s = gs.getState().pits[5].stones.length;
        const o = gs.getState().pits[11].stones.length;
        if (s > o) {
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
        // Robo as gote: 重み付きランダム選択
        chosen = _pickPitWeighted(validPits, state, roboParams, "opp");
      } else {
        // Oni as gote: 標準 opp 視点のまま
        chosen = pickPitV3(
          validPits,
          state,
          oppPeeks,
          selfPeeks,
          fortune,
          oniDepth,
        );
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
      // Oni as gote の撒き順最適化（実ゲームと同じロジック）
      let stones = [...pitData.stones];
      if (roboRole === "self") {
        stones = optimizeSowOrderV3(
          stones,
          _buildSowTargets(chosen, stones.length),
          state,
          fortune,
          memoGote,
        );
      }
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
        if (roboRole === "self") {
          // Oni as gote: decidePlacementsV3 で戦略的配置
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
        }
        // Robo as gote / 残り: 重み付き配置
        while (gs.isPlacementActive()) {
          gs.placePendingStone(
            _pickPlacementWeighted(6, 10, 11, gs.getState(), roboParams),
            0,
          );
        }
      }

      // ぐるぐる: extra turn
      if (lastPit === 11) continue;

      // ちらちら/ぽいぽい (pit5 着地)
      if (lastPit === 5) {
        if (roboRole === "opp") {
          // Robo as gote: easy 同等 — ちらちらは常に実行（peeks<3）、尽きたらランダムぽいぽい
          if (oppPeeks < 3) {
            gs.revealNextCenterForPlayer("opp");
          } else {
            // ちらちら使い切り → 相手賞壇からランダムに1個除去
            const pit11stones = gs.getState().pits[11].stones;
            if (pit11stones.length > 0) {
              gs.removeStoneFromPit(
                11,
                Math.floor(Math.random() * pit11stones.length),
              );
            }
          }
        } else {
          // Oni as gote: decideSpecialAction で判断
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
      }

      // くたくた (gote: easy 同等 — 自分が上回ったら発動)
      if (gs.canActivateKutakuta("opp")) {
        const s = gs.getState().pits[5].stones.length;
        const o = gs.getState().pits[11].stones.length;
        if (o > s) {
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
export function runManyRoboVsOni(
  roboParams = DEFAULT_ROBO_PARAMS,
  n = 500,
  oniDepth = 3,
) {
  let roboWins = 0,
    oniWins = 0,
    draws = 0;
  const half = Math.floor(n / 2);

  for (let i = 0; i < half; i++) {
    const r = runGameRoboVsOni(roboParams, "opp", oniDepth);
    if (r.winner === "robo") roboWins++;
    else if (r.winner === "oni") oniWins++;
    else draws++;
  }
  for (let i = 0; i < n - half; i++) {
    const r = runGameRoboVsOni(roboParams, "self", oniDepth);
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
export function runGameOniVsOni(
  depthSente,
  depthGote,
  senteOpts = {},
  goteOpts = {},
) {
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

      // 撒き順最適化（実ゲームと同じロジック）
      {
        const _tgts = _buildSowTargets(
          chosen,
          state.pits[chosen].stones.length,
        );
        state.pits[chosen].stones = optimizeSowOrderV3(
          state.pits[chosen].stones,
          _tgts.map((t) => (t + 6) % 12),
          invState,
          invFortune,
          memoSente,
          senteOpts,
        );
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
      // 撒き順最適化（実ゲームと同じロジック）
      const stones = optimizeSowOrderV3(
        [...pitData.stones],
        _buildSowTargets(chosen, pitData.stones.length),
        state,
        fortune,
        memoGote,
        goteOpts,
      );
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
export function runManyOniVsOni(
  depthA,
  depthB,
  n = 1000,
  optsA = {},
  optsB = {},
) {
  let aWins = 0,
    bWins = 0,
    draws = 0;
  const half = Math.floor(n / 2);

  // 前半: A=sente, B=gote
  for (let i = 0; i < half; i++) {
    const r = runGameOniVsOni(depthA, depthB, optsA, optsB);
    if (r.winner === "sente") aWins++;
    else if (r.winner === "gote") bWins++;
    else draws++;
  }
  // 後半: B=sente, A=gote
  for (let i = 0; i < n - half; i++) {
    const r = runGameOniVsOni(depthB, depthA, optsB, optsA);
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
