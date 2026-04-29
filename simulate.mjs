/**
 * simulate.mjs
 * AI vs AI シミュレーター
 *
 * 使い方:
 *   node simulate.mjs <ai1> <ai2> [試合数]
 *   例: node simulate.mjs rasetsu kisin 500
 *
 * 利用可能な AI:
 *   kooni / yasha / rasetsu / kisin / kyubi / kugutsu
 */

import { GameState } from "./src/logic/GameState.js";
import { shuffle } from "./src/data/constants.js";
import {
  KisinV1,
  KisinV2,
  KisinV3,
  SimKisinV1,
  KugutsuV1,
  KyubiV1,
  KyubiV3,
  SimKyubiV1,
  AshuraV1,
  pickPitTechDfsV1,
  decidePlacementsFortuneV1,
  decidePlacementsFortuneKisinV1,
  decidePlacementsFortuneKisinV3,
  decidePlacementsFortuneKyubiV1,
  decidePlacementsFortuneKyubiV3,
  optimizeSowOrderFortuneV1,
  optimizeSowOrderFortuneKisinV1,
} from "./src/logic/GameAI.js";
import {
  DEFAULT_KISIN_PARAMS,
  DEFAULT_TEST_KYUBI_PARAMS,
  DEFAULT_KYUBI_PARAMS,
} from "./src/data/GameParams.js";

// ─────────────────────────────────────────────────────────────
// CLI
// ─────────────────────────────────────────────────────────────
const AI_LIST = [
  "kooni",
  "yasha",
  "rasetsu",
  "kisin",
  "kyubi",
  "kugutsu",
  "ashura",
];
const AI_LABELS = {
  kooni: "小鬼",
  yasha: "夜叉",
  rasetsu: "羅刺",
  kisin: "鬼神",
  kyubi: "九尾",
  kugutsu: "傀倶",
  ashura: "阿修羅",
};

const args = process.argv.slice(2);
if (args.length < 2) {
  console.log("使い方: node simulate.mjs <ai1> <ai2> [試合数]");
  console.log("  AI: " + AI_LIST.join(" / "));
  console.log("  例: node simulate.mjs rasetsu kisin 500");
  process.exit(1);
}
const ai1Name = args[0].toLowerCase();
const ai2Name = args[1].toLowerCase();
const N = parseInt(args[2] ?? "200", 10);
const kkSweep = args.includes("--kk-sweep");
const kkThresholdArg = args.find((a) => a.startsWith("--kk-threshold="));
const kkThreshold = kkThresholdArg
  ? parseFloat(kkThresholdArg.split("=")[1])
  : Infinity; // デフォルト: くたくたしない

if (!AI_LIST.includes(ai1Name) || !AI_LIST.includes(ai2Name)) {
  console.error("不明な AI: " + AI_LIST.join(", ") + " から選んでください");
  process.exit(1);
}

// ─────────────────────────────────────────────────────────────
// ヘルパー: pit インデックス変換 (0-4 ↔ 6-10, 5 ↔ 11)
// ─────────────────────────────────────────────────────────────
const flipPit = (p) => (p + 6) % 12;

/** 盤面の自陣・相手陣を入れ替えた state コピーを返す */
function flipState(state) {
  return {
    pits: Array.from({ length: 12 }, (_, i) => ({
      stones: state.pits[flipPit(i)].stones.map((s) => ({ ...s })),
    })),
    fortune: {
      self: { ...state.fortune.opp },
      opp: { ...state.fortune.self },
      center: state.fortune.center.map((fc) => ({
        ...fc,
        seenBy: fc.seenBy.map((s) =>
          s === "self" ? "opp" : s === "opp" ? "self" : s,
        ),
        selfPeekOrder: fc.oppPeekOrder ?? 0,
        oppPeekOrder: fc.selfPeekOrder ?? 0,
      })),
    },
    turn: state.turn ?? 1,
    discard: [...(state.discard ?? [])],
  };
}

// ─────────────────────────────────────────────────────────────
// AI: ピット選択 (常に opp=pit6-10 視点で動作)
// ─────────────────────────────────────────────────────────────
function pickPitOppView(aiName, validPits, state, peeksAI, peeksPlayer) {
  const fortune = {
    center: state.fortune.center,
    opp: { color: state.fortune.opp.color },
    self: { color: state.fortune.self.color },
  };

  if (aiName === "kooni") {
    return validPits[Math.floor(Math.random() * validPits.length)];
  }
  if (aiName === "yasha") {
    const tech = validPits.filter((p) => {
      const n = state.pits[p].stones.length;
      const last = (p + n) % 12;
      if (last === 11) return true; // ぐるぐる
      if (
        last >= 6 &&
        last <= 10 &&
        state.pits[last].stones.length === 0 &&
        state.pits[last - 6].stones.length > 0
      )
        return true; // ざくざく
      return false;
    });
    if (tech.length > 0) return tech[Math.floor(Math.random() * tech.length)];
    for (const p of [10, 9, 8, 7, 6]) {
      if (validPits.includes(p)) return p;
    }
    return validPits[0];
  }
  if (aiName === "rasetsu") {
    return pickPitTechDfsV1(validPits, state, peeksAI);
  }
  if (aiName === "kisin") {
    return KisinV3(
      validPits,
      state,
      peeksAI,
      peeksPlayer,
      fortune,
      DEFAULT_KISIN_PARAMS,
      "opp",
    );
  }
  if (aiName === "kyubi") {
    return SimKyubiV1(
      validPits,
      state,
      peeksAI,
      peeksPlayer,
      fortune,
      DEFAULT_KYUBI_PARAMS,
      "opp",
    );
  }
  if (aiName === "kugutsu") {
    return KugutsuV1(validPits, state, peeksAI, peeksPlayer, fortune, 3);
  }
  if (aiName === "ashura") {
    return AshuraV1(
      validPits,
      state,
      peeksAI,
      peeksPlayer,
      fortune,
      null,
      "opp",
    );
  }
  return validPits[Math.floor(Math.random() * validPits.length)];
}

/**
 * 指定 role (opp/self) のために適切な視点でピット選択し、実際の pit index を返す。
 */
function pickPitForRole(aiName, validPits, state, peeksAI, peeksPlayer, role) {
  if (role === "opp") {
    return pickPitOppView(aiName, validPits, state, peeksAI, peeksPlayer);
  }
  // self 側 (pit0-4): state を反転して opp として扱い、結果を flip して戻す
  const flipped = flipState(state);
  const flippedPits = validPits.map(flipPit);
  const result = pickPitOppView(
    aiName,
    flippedPits,
    flipped,
    peeksAI,
    peeksPlayer,
  );
  return flipPit(result);
}

// ─────────────────────────────────────────────────────────────
// AI: 撒き順最適化 (常に opp=pit6-10 視点で動作)
// ─────────────────────────────────────────────────────────────
function getSowOrderForRole(aiName, stones, targets, state, role) {
  if (stones.length <= 1) return stones;
  if (["kooni", "yasha", "kugutsu"].includes(aiName)) return stones;

  let workState = state;
  let workTargets = targets;
  if (role === "self") {
    workState = flipState(state);
    workTargets = targets.map(flipPit);
  }

  const fortune = {
    center: workState.fortune.center,
    opp: { color: workState.fortune.opp.color },
    self: { color: workState.fortune.self.color },
  };

  // kisin / rasetsu / kyubi
  return optimizeSowOrderFortuneV1(
    stones,
    workTargets,
    workState,
    fortune,
    {},
    {
      dynamicUnknownPenalty: true,
      unknownPenaltyScale: 30,
    },
  );
}

// ─────────────────────────────────────────────────────────────
// AI: ざくざく後の配置
// ─────────────────────────────────────────────────────────────
function getPlacementForRole(aiName, pending, state, role) {
  if (pending.length === 0) return [];

  let workState = state;
  if (role === "self") {
    workState = flipState(state);
  }

  const fortune = {
    center: workState.fortune.center,
    opp: { color: workState.fortune.opp.color },
    self: { color: workState.fortune.self.color },
  };

  let placements;
  if (aiName === "kisin") {
    placements = decidePlacementsFortuneKisinV3(
      pending,
      workState,
      fortune,
      {},
    );
  } else if (aiName === "kyubi" || aiName === "ashura") {
    placements = decidePlacementsFortuneKyubiV3(
      pending,
      workState,
      fortune,
      {},
    );
  } else if (["kugutsu", "rasetsu"].includes(aiName)) {
    placements = decidePlacementsFortuneV1(pending, workState, fortune, {});
  } else {
    // kooni / yasha: 石数が多い路から順に配置
    const lanes = [10, 9, 8, 7, 6];
    placements = pending.map((_, si) => {
      const pitInFlipped = lanes[Math.min(si, lanes.length - 1)];
      return { pitIndex: pitInFlipped, stoneIndex: 0 };
    });
  }

  if (role === "self") {
    return placements.map((p) => ({ ...p, pitIndex: flipPit(p.pitIndex) }));
  }
  return placements;
}

// ─────────────────────────────────────────────────────────────
// AI: pit5着地後のちらちら/ぽいぽい選択
// ─────────────────────────────────────────────────────────────
function chooseSpecialAction(aiName, gs, role) {
  const state = gs.getState();
  const peeks = gs.centerPeekProgress[role] ?? 0;

  // ashura/kyubi は peeks < 3 なら常にちらちら
  if (aiName === "ashura" || aiName === "kyubi") {
    if (peeks < 3) return "chirachira";
    // ちらちら使い切り → ぽいぽい（相手賽壇に石があれば）
    const oppStoreIdx = role === "opp" ? 5 : 11;
    if (state.pits[oppStoreIdx].stones.length > 0) return "poipoi";
    return "pass";
  }

  // rasetsu: peeks < 2 ならちらちら優先
  if (aiName === "rasetsu") {
    if (peeks < 2) return "chirachira";
    const oppStoreIdx = role === "opp" ? 5 : 11;
    if (state.pits[oppStoreIdx].stones.length > 0) return "poipoi";
    if (peeks < 3) return "chirachira";
    return "pass";
  }

  // 鬼神: ちらちらで情報収集（全回）→ 以降ぽいぽい
  if (aiName === "kisin") {
    if (peeks < 3) return "chirachira";
    const oppStoreIdx = role === "opp" ? 5 : 11;
    if (state.pits[oppStoreIdx].stones.length > 0) return "poipoi";
    return "pass";
  }
  // 傀儡: peeks<2ならちらちら優先、peeks=2でぽいぽい検討
  if (aiName === "kugutsu") {
    const oppStoreIdx = role === "opp" ? 5 : 11;
    if (peeks < 2) return "chirachira";
    if (state.pits[oppStoreIdx].stones.length > 0) return "poipoi";
    if (peeks < 3) return "chirachira";
    return "pass";
  }

  // yasha / kooni: ちらちら優先
  if (peeks < 3) return "chirachira";
  return "pass";
}

/**
 * ぽいぽい: 指定側が対象 store から最も有利な石を1個除去する
 * role=opp なら pit5 から除去、role=self なら pit11 から除去
 */
function doPoipoi(gs, role) {
  const state = gs.getState();
  const targetPit = role === "opp" ? 5 : 11;
  const ownStoreIdx = role === "opp" ? 11 : 5;

  if (state.pits[targetPit].stones.length === 0) {
    // 相手賽壇が空なら自分の賽壇のマイナス石を捨てる
    const ownFortune = state.fortune[role === "opp" ? "opp" : "self"].color;
    const negColor = getKnownNegColor(state, role);
    let worst = -1;
    let worstVal = 0;
    state.pits[ownStoreIdx].stones.forEach((s, idx) => {
      if (negColor && s.color === negColor) {
        if (50 > worstVal) {
          worstVal = 50;
          worst = idx;
        }
      }
    });
    if (worst >= 0) gs.removeStoneFromPit(ownStoreIdx, worst);
    return;
  }

  // 相手賽壇から最も価値の高い石を除去
  const ownFortune = state.fortune[role === "opp" ? "opp" : "self"].color;
  const playerFortune = state.fortune[role === "opp" ? "self" : "opp"].color;
  const negColor = getKnownNegColor(state, role);
  const posColors = getKnownPosColors(state, role);

  let best = 0;
  let bestVal = -Infinity;
  state.pits[targetPit].stones.forEach((s, idx) => {
    let val = 0;
    if (ownFortune && s.color === ownFortune)
      val = 40; // 自占い色 = 相手に+5点源
    else if (playerFortune && s.color === playerFortune)
      val = 25; // 相手占い色 = +3点
    else if (posColors.includes(s.color)) val = 10;
    if (negColor && s.color === negColor) val = -99; // マイナス石は除去しない
    if (val > bestVal) {
      bestVal = val;
      best = idx;
    }
  });
  if (bestVal >= 0) gs.removeStoneFromPit(targetPit, best);
}

function getKnownNegColor(state, role) {
  for (const fc of state.fortune.center) {
    if (fc.bonus < 0 && fc.seenBy.includes(role)) return fc.color;
  }
  return null;
}
function getKnownPosColors(state, role) {
  return state.fortune.center
    .filter((fc) => fc.bonus > 0 && fc.seenBy.includes(role))
    .map((fc) => fc.color);
}

// ─────────────────────────────────────────────────────────────
// AI: 最終フェーズ占い予測
// ─────────────────────────────────────────────────────────────
function predictOpponentColor(aiName, gs, role) {
  const state = gs.getState();
  const COLORS = ["red", "blue", "green", "yellow", "purple"];

  // スマートAI: 相手賽壇の石の色頻度で推測
  if (
    ["rasetsu", "kisin", "yasha", "kugutsu", "kyubi", "ashura"].includes(aiName)
  ) {
    const oppStore = role === "opp" ? 5 : 11;
    const freq = {};
    for (const s of state.pits[oppStore].stones) {
      freq[s.color] = (freq[s.color] ?? 0) + 1;
    }
    // ちらちらで確認済みの中央石色を除外
    const knownCenterColors = state.fortune.center
      .filter((fc) => fc.seenBy.includes(role))
      .map((fc) => fc.color);
    const sorted = Object.entries(freq)
      .filter(([c]) => !knownCenterColors.includes(c))
      .sort((a, b) => b[1] - a[1]);
    if (sorted.length > 0) return sorted[0][0];

    // フォールバック: 路上の石の頻度
    const laneMin = role === "opp" ? 0 : 6;
    const laneMax = role === "opp" ? 4 : 10;
    const laneFreq = {};
    for (let i = laneMin; i <= laneMax; i++) {
      for (const s of state.pits[i].stones) {
        laneFreq[s.color] = (laneFreq[s.color] ?? 0) + 1;
      }
    }
    const laneSorted = Object.entries(laneFreq).sort((a, b) => b[1] - a[1]);
    if (laneSorted.length > 0) return laneSorted[0][0];
  }

  // kooni / kisin: ランダム
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

// ─────────────────────────────────────────────────────────────
// 最終ぽいぽい (予測的中時の2回除去)
// ─────────────────────────────────────────────────────────────
function finalPoipoi(gs, role, times, oppFortuneColor) {
  // 個人占い石が公開済みなのでより正確に判断できる
  for (let i = 0; i < times; i++) {
    const state = gs.getState();
    const targetPit = role === "opp" ? 5 : 11;
    if (state.pits[targetPit].stones.length === 0) break;

    const playerFortune = gs.getFortuneColorForPlayer(
      role === "opp" ? "self" : "opp",
    );
    const negColor = getKnownNegColor(state, role);
    const posColors = getKnownPosColors(state, role);
    const ownFortune = gs.getFortuneColorForPlayer(role);

    let best = 0;
    let bestVal = -Infinity;
    state.pits[targetPit].stones.forEach((s, idx) => {
      let val = 0;
      if (ownFortune && s.color === ownFortune) val = 40;
      else if (playerFortune && s.color === playerFortune) val = 25;
      else if (posColors.includes(s.color)) val = 10;
      else val = 1;
      if (negColor && s.color === negColor) val = -99;
      if (val > bestVal) {
        bestVal = val;
        best = idx;
      }
    });
    if (bestVal >= 0) gs.removeStoneFromPit(targetPit, best);
  }
}

// ─────────────────────────────────────────────────────────────
// 1試合のシミュレーション
// ─────────────────────────────────────────────────────────────
function runOneGame(ai1, ai2, ai1Role, kkThresh) {
  // ai1Role: 'opp'=pit6-10, 'self'=pit0-4
  const ai2Role = ai1Role === "opp" ? "self" : "opp";
  const gs = new GameState();

  // ゲームループ用の変数
  let currentRole = ai1Role === "opp" ? "opp" : "self"; // opp側が先手にする（先手/後手は呼び元が決定）
  // NOTE: ai1Role='opp' → ai1が先手(opp), ai2が後手(self)
  //        ai1Role='self' → ai1が後手(self), ai2が先手(opp)

  // 統計カウンター (ゲーム内)
  const techCounts = {
    opp: { guru: 0, zaku: 0, chira: 0 },
    self: { guru: 0, zaku: 0, chira: 0 },
  };
  const MAX_TURNS = 300; // 無限ループ防止
  let turns = 0;
  let sennitte = false;
  let isExtraTurn = false;
  let kutakutaRole = null;

  while (turns < MAX_TURNS) {
    turns++;
    const state = gs.getState();

    // ─── くたくたチェック（ぐるぐる継続ターンはスキップ）─────────
    if (!isExtraTurn && kkThresh !== Infinity) {
      const ownStoreIdx = currentRole === "opp" ? 11 : 5;
      const oppStoreIdx = currentRole === "opp" ? 5 : 11;
      const own = state.pits[ownStoreIdx].stones.length;
      const opp = state.pits[oppStoreIdx].stones.length;
      if (gs.canActivateKutakuta(currentRole) && own >= opp * kkThresh) {
        kutakutaRole = currentRole;
        break;
      }
    }
    isExtraTurn = false;

    // 千日手チェック
    const sennitteLevel = gs.checkSennitte();
    if (sennitteLevel >= 2) {
      sennitte = true;
      break;
    }

    // 現在の役割に応じた有効路
    const laneMin = currentRole === "opp" ? 6 : 0;
    const laneMax = currentRole === "opp" ? 10 : 4;
    const validPits = [];
    for (let i = laneMin; i <= laneMax; i++) {
      if (state.pits[i].stones.length > 0) validPits.push(i);
    }

    if (validPits.length === 0) {
      // ゲーム終了
      break;
    }

    if (gs.isGameOver()) break;

    // 現在の側の AI 名
    const aiName = currentRole === ai1Role ? ai1 : ai2;
    const peeksThisSide = gs.centerPeekProgress[currentRole] ?? 0;
    const peeksOtherSide =
      gs.centerPeekProgress[currentRole === "opp" ? "self" : "opp"] ?? 0;

    // ピット選択
    const chosenPit = pickPitForRole(
      aiName,
      validPits,
      state,
      peeksThisSide,
      peeksOtherSide,
      currentRole,
    );

    // 撒き
    const stones = [...state.pits[chosenPit].stones];
    state.pits[chosenPit].stones = [];
    const targets = [];
    let cur = chosenPit;
    for (let i = 0; i < stones.length; i++) {
      cur = (cur + 1) % 12;
      targets.push(cur);
    }

    // 撒き順最適化
    const orderedStones = getSowOrderForRole(
      aiName,
      stones,
      [...targets],
      state,
      currentRole,
    );

    // 実際に撒く
    for (let i = 0; i < orderedStones.length; i++) {
      state.pits[targets[i]].stones.push(orderedStones[i]);
    }
    const lastPit = targets[targets.length - 1];

    const ownStore = currentRole === "opp" ? 11 : 5;
    const oppStore = currentRole === "opp" ? 5 : 11;

    // ─── ぐるぐる判定 ───────────────────────────────────────────
    if (lastPit === ownStore) {
      techCounts[currentRole].guru++;
      // extra turn: currentRole はそのまま
      isExtraTurn = true;
      continue;
    }

    // ─── ざくざく判定 ────────────────────────────────────────────
    const ownLaneMin = currentRole === "opp" ? 6 : 0;
    const ownLaneMax = currentRole === "opp" ? 10 : 4;
    if (
      lastPit >= ownLaneMin &&
      lastPit <= ownLaneMax &&
      state.pits[lastPit].stones.length === 1 // 置いた1個だけ = 元々空だった
    ) {
      const mirrorPit = currentRole === "opp" ? lastPit - 6 : lastPit + 6;
      const captured = [...state.pits[mirrorPit].stones];
      if (captured.length > 0) {
        techCounts[currentRole].zaku++;
        state.pits[mirrorPit].stones = [];

        // ざくざく後の配置
        let pending = captured;
        let safety = 0;
        while (pending.length > 0 && safety < 20) {
          safety++;
          const placements = getPlacementForRole(
            aiName,
            pending,
            state,
            currentRole,
          );
          if (placements.length === 0) break;
          const { pitIndex, stoneIndex } = placements[0];
          const stoneIdx = Math.min(stoneIndex ?? 0, pending.length - 1);
          const [placed] = pending.splice(stoneIdx, 1);
          state.pits[pitIndex].stones.push(placed);
        }
      }
      currentRole = currentRole === "opp" ? "self" : "opp";
      continue;
    }

    // ─── ちらちら判定 (相手賽壇着地) ─────────────────────────────
    if (lastPit === oppStore) {
      const action = chooseSpecialAction(aiName, gs, currentRole);
      if (action === "chirachira") {
        if (gs.canUseChirachira(currentRole)) {
          gs.revealNextCenterForPlayer(currentRole);
          techCounts[currentRole].chira++;
        }
      } else if (action === "poipoi") {
        doPoipoi(gs, currentRole);
      }
      // extra turn はなし（手番交代）
      currentRole = currentRole === "opp" ? "self" : "opp";
      continue;
    }

    // 通常手番交代
    currentRole = currentRole === "opp" ? "self" : "opp";
  }

  // ─────────────────────────────────────────────────────────────
  // 最終フェーズ: 占い予測
  // ─────────────────────────────────────────────────────────────
  // くたくた終了: 最終フェーズをスキップして即時勝利判定
  if (kutakutaRole !== null) {
    const kkWinRole = kutakutaRole;
    const kkLoseRole = kkWinRole === "opp" ? "self" : "opp";
    const ai1Win = ai1Role === kkWinRole ? 1 : 0;
    const ai2Win = ai1Role === kkLoseRole ? 1 : 0;
    const ai1GoesFirst = ai1Role === "opp";
    const ai1Tech = ai1Role === "opp" ? techCounts.opp : techCounts.self;
    const ai2Tech = ai1Role === "opp" ? techCounts.self : techCounts.opp;
    const empty = { own3: 0, opp5: 0, pos1: 0, neg2: 0, neu0: 0 };
    return {
      ai1Score: ai1Win ? 1 : 0,
      ai2Score: ai2Win ? 1 : 0,
      ai1Win,
      ai2Win,
      draw: 0,
      ai1First: ai1GoesFirst,
      ai1PredHit: false,
      ai2PredHit: false,
      ai1Guru: ai1Tech.guru,
      ai1Zaku: ai1Tech.zaku,
      ai1Chira: ai1Tech.chira,
      ai2Guru: ai2Tech.guru,
      ai2Zaku: ai2Tech.zaku,
      ai2Chira: ai2Tech.chira,
      sennitte: 0,
      ai1Break: empty,
      ai2Break: empty,
    };
  }

  // 個人占い石を公開
  gs.revealPersonalFortunes();

  const oppAiName = ai1Role === "opp" ? ai1 : ai2;
  const selfAiName = ai1Role === "opp" ? ai2 : ai1;

  const oppPrediction = predictOpponentColor(oppAiName, gs, "opp"); // opp → selfの占い色を予測
  const selfPrediction = predictOpponentColor(selfAiName, gs, "self"); // self → oppの占い色を予測

  const selfActual = gs.getFortuneColorForPlayer("self");
  const oppActual = gs.getFortuneColorForPlayer("opp");

  const oppHit = oppPrediction === selfActual;
  const selfHit = selfPrediction === oppActual;

  // 予測的中ぽいぽい (opp が先: 相手賽壇pit5から2個除去)
  if (oppHit) finalPoipoi(gs, "opp", 2, selfActual);
  if (selfHit) finalPoipoi(gs, "self", 2, oppActual);

  // ─────────────────────────────────────────────────────────────
  // 得点計算
  // ─────────────────────────────────────────────────────────────
  const selfScore = gs.calcScore("self");
  const oppScore = gs.calcScore("opp");

  // 賽壇の石内訳（自占い+3 / 相手占い+5 / 中央+1 / 中央-2 / 中立0）を計算
  function storeBreakdown(role) {
    const storeIdx = role === "self" ? 5 : 11;
    const st = gs.getState();
    const ownCol =
      role === "self" ? st.fortune.self.color : st.fortune.opp.color;
    const oppCol =
      role === "self" ? st.fortune.opp.color : st.fortune.self.color;
    let own3 = 0,
      opp5 = 0,
      pos1 = 0,
      neg2 = 0,
      neu0 = 0;
    for (const stone of st.pits[storeIdx].stones) {
      if (stone.color === ownCol) {
        own3++;
        continue;
      }
      if (stone.color === oppCol) {
        opp5++;
        continue;
      }
      const fc = st.fortune.center.find((c) => c.color === stone.color);
      if (fc) {
        if (fc.bonus > 0) pos1++;
        else if (fc.bonus < 0) neg2++;
        else neu0++;
      } else {
        neu0++;
      }
    }
    return { own3, opp5, pos1, neg2, neu0 };
  }
  const selfBreak = storeBreakdown("self");
  const oppBreak = storeBreakdown("opp");

  // ai1 の role に応じて勝敗を判定
  const ai1Score = ai1Role === "opp" ? oppScore : selfScore;
  const ai2Score = ai1Role === "opp" ? selfScore : oppScore;
  const ai1Break = ai1Role === "opp" ? oppBreak : selfBreak;
  const ai2Break = ai1Role === "opp" ? selfBreak : oppBreak;
  const ai1PredHit = ai1Role === "opp" ? oppHit : selfHit;
  const ai2PredHit = ai1Role === "opp" ? selfHit : oppHit;

  // ai1 が先手かどうか
  // opp が先手: ai1Role='opp' → ai1が先手
  //             ai1Role='self' → ai2が先手
  const ai1GoesFirst = ai1Role === "opp";

  // 技カウント
  const ai1Tech = ai1Role === "opp" ? techCounts.opp : techCounts.self;
  const ai2Tech = ai1Role === "opp" ? techCounts.self : techCounts.opp;

  return {
    ai1Score,
    ai2Score,
    ai1Win: ai1Score > ai2Score ? 1 : 0,
    ai2Win: ai2Score > ai1Score ? 1 : 0,
    draw: ai1Score === ai2Score ? 1 : 0,
    ai1First: ai1GoesFirst,
    ai1PredHit,
    ai2PredHit,
    ai1Guru: ai1Tech.guru,
    ai1Zaku: ai1Tech.zaku,
    ai1Chira: ai1Tech.chira,
    ai2Guru: ai2Tech.guru,
    ai2Zaku: ai2Tech.zaku,
    ai2Chira: ai2Tech.chira,
    sennitte: sennitte ? 1 : 0,
    ai1Break,
    ai2Break,
  };
}

// ─────────────────────────────────────────────────────────────
// メインシミュレーション
// ─────────────────────────────────────────────────────────────
const label1 = `${AI_LABELS[ai1Name]}(${ai1Name})`;
const label2 = `${AI_LABELS[ai2Name]}(${ai2Name})`;
console.log(`\n${"═".repeat(60)}`);
console.log(
  ` ${label1} vs ${label2}  —  ${N} 試合${kkSweep ? "  [くたくた閾値sweep]" : kkThreshold === Infinity ? "" : `  [くたくた≥${kkThreshold}倍]`}`,
);
console.log(`${"═".repeat(60)}\n`);

// ─────────────────────────────────────────────────────────────
// sweep モード: 複数閾値で比較
// ─────────────────────────────────────────────────────────────
if (kkSweep) {
  const sweepThresholds = [Infinity, 3.0, 2.5, 2.0, 1.75, 1.5, 1.25, 1.0];
  const sweepResults = [];
  for (const thr of sweepThresholds) {
    const label = thr === Infinity ? "  なし(∞)" : `≥${thr.toFixed(2)}倍`;
    process.stdout.write(`  閾値 ${label.padEnd(10)} 計算中...`);
    let wins = 0,
      losses = 0,
      draws = 0;
    for (let i = 0; i < N; i++) {
      const r = runOneGame(ai1Name, ai2Name, i % 2 === 0 ? "opp" : "self", thr);
      wins += r.ai1Win;
      losses += r.ai2Win;
      draws += r.draw;
    }
    const pct = ((wins / N) * 100).toFixed(1);
    sweepResults.push({ thr, wins, losses, draws, pct });
    process.stdout.write(
      `\r  閾値 ${label.padEnd(10)}: ${wins}勝 ${losses}負 ${draws}分 (${pct}%)\n`,
    );
  }
  console.log(`\n${"─".repeat(60)}`);
  const best = sweepResults.reduce((a, b) => (a.wins > b.wins ? a : b));
  const bestLabel =
    best.thr === Infinity ? "なし(∞)" : `≥${best.thr.toFixed(2)}倍`;
  console.log(` ★ 最適閾値: ${bestLabel}  →  ${best.wins}勝 (${best.pct}%)`);
  console.log(`${"═".repeat(60)}\n`);
  process.exit(0);
}

// ─────────────────────────────────────────────────────────────
// 通常モード
// ─────────────────────────────────────────────────────────────
console.log("シミュレーション中...");

const totals = {
  ai1Wins: 0,
  ai2Wins: 0,
  draws: 0,
  sennitte: 0,
  // 先手時
  ai1FirstWins: 0,
  ai1FirstGames: 0,
  ai2FirstWins: 0,
  ai2FirstGames: 0,
  // 得点合計
  ai1ScoreSum: 0,
  ai2ScoreSum: 0,
  // 技
  ai1Guru: 0,
  ai1Zaku: 0,
  ai1Chira: 0,
  ai2Guru: 0,
  ai2Zaku: 0,
  ai2Chira: 0,
  // 予測的中
  ai1PredHits: 0,
  ai2PredHits: 0,
  // 賽壇石内訳
  ai1Own3: 0,
  ai1Opp5: 0,
  ai1Pos1: 0,
  ai1Neg2: 0,
  ai1Neu0: 0,
  ai2Own3: 0,
  ai2Opp5: 0,
  ai2Pos1: 0,
  ai2Neg2: 0,
  ai2Neu0: 0,
};

for (let i = 0; i < N; i++) {
  // 半数ずつ先手後手を交代
  const ai1Role = i % 2 === 0 ? "opp" : "self";
  const result = runOneGame(ai1Name, ai2Name, ai1Role, kkThreshold);

  totals.ai1Wins += result.ai1Win;
  totals.ai2Wins += result.ai2Win;
  totals.draws += result.draw;
  totals.sennitte += result.sennitte;
  totals.ai1ScoreSum += result.ai1Score;
  totals.ai2ScoreSum += result.ai2Score;
  totals.ai1Guru += result.ai1Guru;
  totals.ai1Zaku += result.ai1Zaku;
  totals.ai1Chira += result.ai1Chira;
  totals.ai2Guru += result.ai2Guru;
  totals.ai2Zaku += result.ai2Zaku;
  totals.ai2Chira += result.ai2Chira;
  totals.ai1PredHits += result.ai1PredHit ? 1 : 0;
  totals.ai2PredHits += result.ai2PredHit ? 1 : 0;
  totals.ai1Own3 += result.ai1Break.own3;
  totals.ai1Opp5 += result.ai1Break.opp5;
  totals.ai1Pos1 += result.ai1Break.pos1;
  totals.ai1Neg2 += result.ai1Break.neg2;
  totals.ai1Neu0 += result.ai1Break.neu0;
  totals.ai2Own3 += result.ai2Break.own3;
  totals.ai2Opp5 += result.ai2Break.opp5;
  totals.ai2Pos1 += result.ai2Break.pos1;
  totals.ai2Neg2 += result.ai2Break.neg2;
  totals.ai2Neu0 += result.ai2Break.neu0;

  // 先手時の成績
  if (result.ai1First) {
    totals.ai1FirstGames++;
    totals.ai1FirstWins += result.ai1Win;
  } else {
    totals.ai2FirstGames++;
    totals.ai2FirstWins += result.ai2Win;
  }

  // 進捗表示
  if ((i + 1) % Math.max(1, Math.floor(N / 10)) === 0) {
    process.stdout.write(`  ${i + 1}/${N} 完了\r`);
  }
}
console.log(`  ${N}/${N} 完了    \n`);

// ─────────────────────────────────────────────────────────────
// 結果出力
// ─────────────────────────────────────────────────────────────
const pct = (n, d) => (d === 0 ? "—" : ((n / d) * 100).toFixed(1) + "%");
const avg = (n, d) => (d === 0 ? "—" : (n / d).toFixed(2));

console.log(`${"─".repeat(60)}`);
console.log(` ■ 全体勝率`);
console.log(
  `   ${label1.padEnd(18)} : ${totals.ai1Wins} 勝 / ${N}  (${pct(totals.ai1Wins, N)})`,
);
console.log(
  `   ${label2.padEnd(18)} : ${totals.ai2Wins} 勝 / ${N}  (${pct(totals.ai2Wins, N)})`,
);
console.log(
  `   引き分け              : ${totals.draws} 局  (${pct(totals.draws, N)})`,
);
if (totals.sennitte > 0) {
  console.log(`   千日手               : ${totals.sennitte} 局`);
}

console.log(`\n${"─".repeat(60)}`);
console.log(` ■ 先手・後手別勝率`);
console.log(
  `   ${label1.padEnd(18)} 先手時 : ${totals.ai1FirstWins} 勝 / ${totals.ai1FirstGames}  (${pct(totals.ai1FirstWins, totals.ai1FirstGames)})`,
);
console.log(
  `   ${label1.padEnd(18)} 後手時 : ${totals.ai1Wins - totals.ai1FirstWins} 勝 / ${N - totals.ai1FirstGames}  (${pct(totals.ai1Wins - totals.ai1FirstWins, N - totals.ai1FirstGames)})`,
);
console.log(
  `   ${label2.padEnd(18)} 先手時 : ${totals.ai2FirstWins} 勝 / ${totals.ai2FirstGames}  (${pct(totals.ai2FirstWins, totals.ai2FirstGames)})`,
);
console.log(
  `   ${label2.padEnd(18)} 後手時 : ${totals.ai2Wins - totals.ai2FirstWins} 勝 / ${N - totals.ai2FirstGames}  (${pct(totals.ai2Wins - totals.ai2FirstWins, N - totals.ai2FirstGames)})`,
);
// 全体の先手・後手勝率（各試合に必ず先手1人・後手1人いるので分母はN）
const totalFirstWins = totals.ai1FirstWins + totals.ai2FirstWins;
const totalSecondWins =
  totals.ai1Wins - totals.ai1FirstWins + (totals.ai2Wins - totals.ai2FirstWins);
console.log(
  `\n   先手全体勝率           : ${totalFirstWins} 勝 / ${N}  (${pct(totalFirstWins, N)})`,
);
console.log(
  `   後手全体勝率           : ${totalSecondWins} 勝 / ${N}  (${pct(totalSecondWins, N)})`,
);

console.log(`\n${"─".repeat(60)}`);
console.log(` ■ 平均得点`);
console.log(`   ${label1.padEnd(18)} : ${avg(totals.ai1ScoreSum, N)} 点/試合`);
console.log(`   ${label2.padEnd(18)} : ${avg(totals.ai2ScoreSum, N)} 点/試合`);

console.log(`\n${"─".repeat(60)}`);
console.log(` ■ 技の平均発動回数 (1試合あたり)`);
console.log(
  `   ${label1.padEnd(18)} : ぐるぐる ${avg(totals.ai1Guru, N)} / ざくざく ${avg(totals.ai1Zaku, N)} / ちらちら ${avg(totals.ai1Chira, N)}`,
);
console.log(
  `   ${label2.padEnd(18)} : ぐるぐる ${avg(totals.ai2Guru, N)} / ざくざく ${avg(totals.ai2Zaku, N)} / ちらちら ${avg(totals.ai2Chira, N)}`,
);

console.log(`\n${"─".repeat(60)}`);
console.log(` ■ 占い予測的中率`);
console.log(
  `   ${label1.padEnd(18)} : ${totals.ai1PredHits} 的中 / ${N}  (${pct(totals.ai1PredHits, N)})`,
);
console.log(
  `   ${label2.padEnd(18)} : ${totals.ai2PredHits} 的中 / ${N}  (${pct(totals.ai2PredHits, N)})`,
);

console.log(`\n${"─".repeat(60)}`);
console.log(` ■ 賽壇の石内訳 (平均/試合)`);
console.log(`   ${"".padEnd(18)} 自占(+3) 相手占(+5) 中央+(+1) 中央-(−2) 中立`);
console.log(
  `   ${label1.padEnd(18)} ${avg(totals.ai1Own3, N).padStart(8)} ${avg(totals.ai1Opp5, N).padStart(10)} ${avg(totals.ai1Pos1, N).padStart(9)} ${avg(totals.ai1Neg2, N).padStart(9)} ${avg(totals.ai1Neu0, N)}`,
);
console.log(
  `   ${label2.padEnd(18)} ${avg(totals.ai2Own3, N).padStart(8)} ${avg(totals.ai2Opp5, N).padStart(10)} ${avg(totals.ai2Pos1, N).padStart(9)} ${avg(totals.ai2Neg2, N).padStart(9)} ${avg(totals.ai2Neu0, N)}`,
);
const ai1NegLoss = (totals.ai1Neg2 * 2) / N;
const ai2NegLoss = (totals.ai2Neg2 * 2) / N;
console.log(
  `\n   マイナス石による失点: ${label1} -${ai1NegLoss.toFixed(2)}点/試合 / ${label2} -${ai2NegLoss.toFixed(2)}点/試合`,
);
console.log(`\n${"═".repeat(60)}\n`);
