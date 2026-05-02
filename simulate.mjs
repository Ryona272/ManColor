/**
 * simulate.mjs
 * AI vs AI 繧ｷ繝溘Η繝ｬ繝ｼ繧ｿ繝ｼ
 *
 * 菴ｿ縺・婿:
 *   node simulate.mjs <ai1> <ai2> [隧ｦ蜷域焚]
 *   萓・ node simulate.mjs rasetsu kisin 500
 *
 * 蛻ｩ逕ｨ蜿ｯ閭ｽ縺ｪ AI:
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
  AshuraV2,
  AshuraKiller,
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

// 笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏
// CLI
// 笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏
const AI_LIST = [
  "kooni",
  "yasha",
  "rasetsu",
  "kisin",
  "kyubi",
  "kugutsu",
  "ashura",
  "ashurav2",
  "ashuraki",
];
const AI_LABELS = {
  kooni: "小鬼",
  yasha: "夜叉",
  rasetsu: "羅刹",
  kisin: "鬼神",
  kyubi: "九尾",
  ashura: "阿修羅",
  ashurav2: "阿修羅V2",
  ashuraki: "阿修羅キラー",
};

const args = process.argv.slice(2);
if (args.length < 2) {
  console.log("菴ｿ縺・婿: node simulate.mjs <ai1> <ai2> [隧ｦ蜷域焚]");
  console.log("  AI: " + AI_LIST.join(" / "));
  console.log("  萓・ node simulate.mjs rasetsu kisin 500");
  process.exit(1);
}
const ai1Name = args[0].toLowerCase();
const ai2Name = args[1].toLowerCase();
const N = parseInt(args[2] ?? "200", 10);
const kkSweep = args.includes("--kk-sweep");
const kkThresholdArg = args.find((a) => a.startsWith("--kk-threshold="));
const kkThreshold = kkThresholdArg
  ? parseFloat(kkThresholdArg.split("=")[1])
  : Infinity; // 繝・ヵ繧ｩ繝ｫ繝・ 縺上◆縺上◆縺励↑縺・

if (!AI_LIST.includes(ai1Name) || !AI_LIST.includes(ai2Name)) {
  console.error(
    "荳肴・縺ｪ AI: " + AI_LIST.join(", ") + " 縺九ｉ驕ｸ繧薙〒縺上□縺輔＞",
  );
  process.exit(1);
}

// 笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏
// 繝倥Ν繝代・: pit 繧､繝ｳ繝・ャ繧ｯ繧ｹ螟画鋤 (0-4 竊・6-10, 5 竊・11)
// 笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏
const flipPit = (p) => (p + 6) % 12;

/** 逶､髱｢縺ｮ閾ｪ髯｣繝ｻ逶ｸ謇矩劵繧貞・繧梧崛縺医◆ state 繧ｳ繝斐・繧定ｿ斐☆ */
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

// 笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏
// AI: 繝斐ャ繝磯∈謚・(蟶ｸ縺ｫ opp=pit6-10 隕也せ縺ｧ蜍穂ｽ・
// 笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏
function pickPitOppView(
  aiName,
  validPits,
  state,
  peeksAI,
  peeksPlayer,
  params,
) {
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
      if (last === 11) return true; // 縺舌ｋ縺舌ｋ
      if (
        last >= 6 &&
        last <= 10 &&
        state.pits[last].stones.length === 0 &&
        state.pits[last - 6].stones.length > 0
      )
        return true; // 縺悶￥縺悶￥
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
  if (aiName === "ashurav2") {
    return AshuraV2(
      validPits,
      state,
      peeksAI,
      peeksPlayer,
      fortune,
      params ?? null,
      "opp",
    );
  }
  if (aiName === "ashura") {
    return AshuraV1(
      validPits,
      state,
      peeksAI,
      peeksPlayer,
      fortune,
      params ?? null,
      "opp",
    );
  }
  if (aiName === "ashuraki") {
    return AshuraKiller(
      validPits,
      state,
      peeksAI,
      peeksPlayer,
      fortune,
      params ?? null,
      "opp",
    );
  }
  return validPits[Math.floor(Math.random() * validPits.length)];
}

/**
 * 謖・ｮ・role (opp/self) 縺ｮ縺溘ａ縺ｫ驕ｩ蛻・↑隕也せ縺ｧ繝斐ャ繝磯∈謚槭＠縲∝ｮ滄圀縺ｮ pit index 繧定ｿ斐☆縲・
 */
function pickPitForRole(
  aiName,
  validPits,
  state,
  peeksAI,
  peeksPlayer,
  role,
  params,
) {
  if (role === "opp") {
    return pickPitOppView(
      aiName,
      validPits,
      state,
      peeksAI,
      peeksPlayer,
      params,
    );
  }
  // self 蛛ｴ (pit0-4): state 繧貞渚霆｢縺励※ opp 縺ｨ縺励※謇ｱ縺・∫ｵ先棡繧・flip 縺励※謌ｻ縺・
  const flipped = flipState(state);
  const flippedPits = validPits.map(flipPit);
  const result = pickPitOppView(
    aiName,
    flippedPits,
    flipped,
    peeksAI,
    peeksPlayer,
    params,
  );
  return flipPit(result);
}

// 笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏
// AI: 謦偵″鬆・怙驕ｩ蛹・(蟶ｸ縺ｫ opp=pit6-10 隕也せ縺ｧ蜍穂ｽ・
// 笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏
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

  if (aiName === "ashuraki") {
    // ashuraki: neg遏ｳ繧堤嶌謇句・縺ｸ騾√ｋ謦偵″鬆・怙驕ｩ蛹・
    return optimizeSowOrderFortuneV1(
      stones,
      workTargets,
      workState,
      fortune,
      {},
      { dynamicUnknownPenalty: true, unknownPenaltyScale: 30 },
    );
  }

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

// 笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏
// AI: 縺悶￥縺悶￥蠕後・驟咲ｽｮ
// 笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏
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
  } else if (
    aiName === "kyubi" ||
    aiName === "ashura" ||
    aiName === "ashurav2"
  ) {
    placements = decidePlacementsFortuneKyubiV3(
      pending,
      workState,
      fortune,
      {},
    );
  } else if (aiName === "ashuraki") {
    placements = decidePlacementsFortuneKyubiV3(
      pending,
      workState,
      fortune,
      {},
    );
  } else if (["kugutsu", "rasetsu"].includes(aiName)) {
    placements = decidePlacementsFortuneV1(pending, workState, fortune, {});
  } else {
    // kooni / yasha: 遏ｳ謨ｰ縺悟､壹＞霍ｯ縺九ｉ鬆・↓驟咲ｽｮ
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

// 笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏
// AI: pit5逹蝨ｰ蠕後・縺｡繧峨■繧・縺ｽ縺・⊃縺・∈謚・
// 笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏
function chooseSpecialAction(aiName, gs, role) {
  const state = gs.getState();
  const peeks = gs.centerPeekProgress[role] ?? 0;

  // ashura/kyubi/ashuraki 縺ｯ peeks < 3 縺ｪ繧牙ｸｸ縺ｫ縺｡繧峨■繧・
  if (
    aiName === "ashura" ||
    aiName === "kyubi" ||
    aiName === "ashuraki" ||
    aiName === "ashurav2"
  ) {
    if (peeks < 3) return "chirachira";
    // 縺｡繧峨■繧我ｽｿ縺・・繧・竊・縺ｽ縺・⊃縺・ｼ育嶌謇玖ｳｽ螢・↓遏ｳ縺後≠繧後・・・
    const oppStoreIdx = role === "opp" ? 5 : 11;
    if (state.pits[oppStoreIdx].stones.length > 0) return "poipoi";
    return "pass";
  }

  // rasetsu: peeks < 2 縺ｪ繧峨■繧峨■繧牙━蜈・
  if (aiName === "rasetsu") {
    if (peeks < 2) return "chirachira";
    const oppStoreIdx = role === "opp" ? 5 : 11;
    if (state.pits[oppStoreIdx].stones.length > 0) return "poipoi";
    if (peeks < 3) return "chirachira";
    return "pass";
  }

  // 鬯ｼ逾・ 縺｡繧峨■繧峨〒諠・ｱ蜿朱寔・亥・蝗橸ｼ俄・ 莉･髯阪⊃縺・⊃縺・
  if (aiName === "kisin") {
    if (peeks < 3) return "chirachira";
    const oppStoreIdx = role === "opp" ? 5 : 11;
    if (state.pits[oppStoreIdx].stones.length > 0) return "poipoi";
    return "pass";
  }
  // 蛯蜆｡: peeks<2縺ｪ繧峨■繧峨■繧牙━蜈医｝eeks=2縺ｧ縺ｽ縺・⊃縺・､懆ｨ・
  if (aiName === "kugutsu") {
    const oppStoreIdx = role === "opp" ? 5 : 11;
    if (peeks < 2) return "chirachira";
    if (state.pits[oppStoreIdx].stones.length > 0) return "poipoi";
    if (peeks < 3) return "chirachira";
    return "pass";
  }

  // yasha / kooni: 縺｡繧峨■繧牙━蜈・
  if (peeks < 3) return "chirachira";
  return "pass";
}

/**
 * 縺ｽ縺・⊃縺・ 謖・ｮ壼・縺悟ｯｾ雎｡ store 縺九ｉ譛繧よ怏蛻ｩ縺ｪ遏ｳ繧・蛟矩勁蜴ｻ縺吶ｋ
 * role=opp 縺ｪ繧・pit5 縺九ｉ髯､蜴ｻ縲〉ole=self 縺ｪ繧・pit11 縺九ｉ髯､蜴ｻ
 */
function doPoipoi(gs, role) {
  const state = gs.getState();
  const targetPit = role === "opp" ? 5 : 11;
  const ownStoreIdx = role === "opp" ? 11 : 5;

  if (state.pits[targetPit].stones.length === 0) {
    // 逶ｸ謇玖ｳｽ螢・′遨ｺ縺ｪ繧芽・蛻・・雉ｽ螢・・繝槭う繝翫せ遏ｳ繧呈昏縺ｦ繧・
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

  // 逶ｸ謇玖ｳｽ螢・°繧画怙繧ゆｾ｡蛟､縺ｮ鬮倥＞遏ｳ繧帝勁蜴ｻ
  const ownFortune = state.fortune[role === "opp" ? "opp" : "self"].color;
  const playerFortune = state.fortune[role === "opp" ? "self" : "opp"].color;
  const negColor = getKnownNegColor(state, role);
  const posColors = getKnownPosColors(state, role);

  let best = 0;
  let bestVal = -Infinity;
  state.pits[targetPit].stones.forEach((s, idx) => {
    let val = 0;
    if (ownFortune && s.color === ownFortune)
      val = 40; // 閾ｪ蜊縺・牡 = 逶ｸ謇九↓+5轤ｹ貅・
    else if (playerFortune && s.color === playerFortune)
      val = 25; // 逶ｸ謇句頃縺・牡 = +3轤ｹ
    else if (posColors.includes(s.color)) val = 10;
    if (negColor && s.color === negColor) val = -99; // 繝槭う繝翫せ遏ｳ縺ｯ髯､蜴ｻ縺励↑縺・
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

// 笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏
// AI: 譛邨ゅヵ繧ｧ繝ｼ繧ｺ蜊縺・ｺ域ｸｬ
// 笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏
function predictOpponentColor(aiName, gs, role) {
  const state = gs.getState();
  const COLORS = ["red", "blue", "green", "yellow", "purple"];

  // 繧ｹ繝槭・繝・I: 逶ｸ謇玖ｳｽ螢・・遏ｳ縺ｮ濶ｲ鬆ｻ蠎ｦ縺ｧ謗ｨ貂ｬ
  if (
    [
      "rasetsu",
      "kisin",
      "yasha",
      "kugutsu",
      "kyubi",
      "ashura",
      "ashurav2",
      "ashuraki",
    ].includes(aiName)
  ) {
    const oppStore = role === "opp" ? 5 : 11;
    const freq = {};
    for (const s of state.pits[oppStore].stones) {
      freq[s.color] = (freq[s.color] ?? 0) + 1;
    }
    // 縺｡繧峨■繧峨〒遒ｺ隱肴ｸ医∩縺ｮ荳ｭ螟ｮ遏ｳ濶ｲ繧帝勁螟・
    const knownCenterColors = state.fortune.center
      .filter((fc) => fc.seenBy.includes(role))
      .map((fc) => fc.color);
    const sorted = Object.entries(freq)
      .filter(([c]) => !knownCenterColors.includes(c))
      .sort((a, b) => b[1] - a[1]);
    if (sorted.length > 0) return sorted[0][0];

    // 繝輔か繝ｼ繝ｫ繝舌ャ繧ｯ: 霍ｯ荳翫・遏ｳ縺ｮ鬆ｻ蠎ｦ
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

  // kooni / kisin: 繝ｩ繝ｳ繝繝
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

// 笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏
// 譛邨ゅ⊃縺・⊃縺・(莠域ｸｬ逧・ｸｭ譎ゅ・2蝗樣勁蜴ｻ)
// 笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏
function finalPoipoi(gs, role, times, oppFortuneColor) {
  // 蛟倶ｺｺ蜊縺・浹縺悟・髢区ｸ医∩縺ｪ縺ｮ縺ｧ繧医ｊ豁｣遒ｺ縺ｫ蛻､譁ｭ縺ｧ縺阪ｋ
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

// 笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏
// 1隧ｦ蜷医・繧ｷ繝溘Η繝ｬ繝ｼ繧ｷ繝ｧ繝ｳ
// 笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏
function runOneGame(ai1, ai2, ai1Role, kkThresh) {
  // ai1Role: 'opp'=pit6-10, 'self'=pit0-4
  const ai2Role = ai1Role === "opp" ? "self" : "opp";
  const gs = new GameState();

  // 繧ｲ繝ｼ繝繝ｫ繝ｼ繝礼畑縺ｮ螟画焚
  let currentRole = ai1Role === "opp" ? "opp" : "self"; // opp蛛ｴ縺悟・謇九↓縺吶ｋ・亥・謇・蠕梧焔縺ｯ蜻ｼ縺ｳ蜈・′豎ｺ螳夲ｼ・
  // NOTE: ai1Role='opp' 竊・ai1縺悟・謇・opp), ai2縺悟ｾ梧焔(self)
  //        ai1Role='self' 竊・ai1縺悟ｾ梧焔(self), ai2縺悟・謇・opp)

  // 邨ｱ險医き繧ｦ繝ｳ繧ｿ繝ｼ (繧ｲ繝ｼ繝蜀・
  const techCounts = {
    opp: { guru: 0, zaku: 0, chira: 0 },
    self: { guru: 0, zaku: 0, chira: 0 },
  };
  // ashura 逕ｨ: 逶ｸ謇区焔逡ｪ縺ｧ pit11 縺ｫ逹蝨ｰ縺励◆遏ｳ縺ｮ濶ｲ螻･豁ｴ
  // ai1Role==='opp' 縺ｪ繧・ashura 縺ｯ opp 竊・逶ｸ謇九・ self 竊・oppStore 縺ｯ pit11 for self
  // ai1Role==='self' 縺ｪ繧・ashura 縺ｯ self 竊・逶ｸ謇九・ opp  竊・oppStore 縺ｯ pit5  for opp (pit11 繧定ｿｽ霍｡荳崎ｦ・
  const ashuraIsOpp = ai1Role === "opp";
  const ashuraParams = { opponentSentColors: [] };
  const MAX_TURNS = 300; // 辟｡髯舌Ν繝ｼ繝鈴亟豁｢
  let turns = 0;
  let sennitte = false;
  let isExtraTurn = false;
  let kutakutaRole = null;

  while (turns < MAX_TURNS) {
    turns++;
    const state = gs.getState();

    // 笏笏笏 縺上◆縺上◆繝√ぉ繝・け・医＄繧九＄繧狗ｶ咏ｶ壹ち繝ｼ繝ｳ縺ｯ繧ｹ繧ｭ繝・・・俄楳笏笏笏笏笏笏笏笏
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

    // 蜊・律謇九メ繧ｧ繝・け
    const sennitteLevel = gs.checkSennitte();
    if (sennitteLevel >= 2) {
      sennitte = true;
      break;
    }

    // 迴ｾ蝨ｨ縺ｮ蠖ｹ蜑ｲ縺ｫ蠢懊§縺滓怏蜉ｹ霍ｯ
    const laneMin = currentRole === "opp" ? 6 : 0;
    const laneMax = currentRole === "opp" ? 10 : 4;
    const validPits = [];
    for (let i = laneMin; i <= laneMax; i++) {
      if (state.pits[i].stones.length > 0) validPits.push(i);
    }

    if (validPits.length === 0) {
      // 繧ｲ繝ｼ繝邨ゆｺ・
      break;
    }

    if (gs.isGameOver()) break;

    // 迴ｾ蝨ｨ縺ｮ蛛ｴ縺ｮ AI 蜷・
    const aiName = currentRole === ai1Role ? ai1 : ai2;
    const peeksThisSide = gs.centerPeekProgress[currentRole] ?? 0;
    const peeksOtherSide =
      gs.centerPeekProgress[currentRole === "opp" ? "self" : "opp"] ?? 0;

    // 繝斐ャ繝磯∈謚・
    const pickParams =
      aiName === (ashuraIsOpp ? ai1 : ai2) ? ashuraParams : null;
    const chosenPit = pickPitForRole(
      aiName,
      validPits,
      state,
      peeksThisSide,
      peeksOtherSide,
      currentRole,
      pickParams,
    );

    // 謦偵″
    const stones = [...state.pits[chosenPit].stones];
    state.pits[chosenPit].stones = [];
    const targets = [];
    let cur = chosenPit;
    for (let i = 0; i < stones.length; i++) {
      cur = (cur + 1) % 12;
      targets.push(cur);
    }

    // 謦偵″鬆・怙驕ｩ蛹・
    const orderedStones = getSowOrderForRole(
      aiName,
      stones,
      [...targets],
      state,
      currentRole,
    );

    // 螳滄圀縺ｫ謦偵￥
    for (let i = 0; i < orderedStones.length; i++) {
      state.pits[targets[i]].stones.push(orderedStones[i]);
    }
    const lastPit = targets[targets.length - 1];

    const ownStore = currentRole === "opp" ? 11 : 5;
    const oppStore = currentRole === "opp" ? 5 : 11;

    // 笏笏笏 ashura 蜷代￠: 逶ｸ謇・self)縺ｮ謦偵″縺ｧ pit11 縺ｫ蜈･縺｣縺溽浹縺ｮ濶ｲ繧定ｨ倬鹸 笏笏笏笏
    if (ashuraIsOpp && currentRole === "self") {
      for (let i = 0; i < targets.length; i++) {
        if (targets[i] === 11) {
          ashuraParams.opponentSentColors.push(orderedStones[i].color);
        }
      }
    }

    // 笏笏笏 縺舌ｋ縺舌ｋ蛻､螳・笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏
    if (lastPit === ownStore) {
      techCounts[currentRole].guru++;
      // extra turn: currentRole 縺ｯ縺昴・縺ｾ縺ｾ
      isExtraTurn = true;
      continue;
    }

    // 笏笏笏 縺悶￥縺悶￥蛻､螳・笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏
    const ownLaneMin = currentRole === "opp" ? 6 : 0;
    const ownLaneMax = currentRole === "opp" ? 10 : 4;
    if (
      lastPit >= ownLaneMin &&
      lastPit <= ownLaneMax &&
      state.pits[lastPit].stones.length === 1 // 鄂ｮ縺・◆1蛟九□縺・= 蜈・・ｩｺ縺縺｣縺・
    ) {
      const mirrorPit = currentRole === "opp" ? lastPit - 6 : lastPit + 6;
      const captured = [...state.pits[mirrorPit].stones];
      if (captured.length > 0) {
        techCounts[currentRole].zaku++;
        state.pits[mirrorPit].stones = [];

        // 縺悶￥縺悶￥蠕後・驟咲ｽｮ
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

    // 笏笏笏 縺｡繧峨■繧牙愛螳・(逶ｸ謇玖ｳｽ螢・捩蝨ｰ) 笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏
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
      // extra turn 縺ｯ縺ｪ縺暦ｼ域焔逡ｪ莠､莉｣・・
      currentRole = currentRole === "opp" ? "self" : "opp";
      continue;
    }

    // 騾壼ｸｸ謇狗分莠､莉｣
    currentRole = currentRole === "opp" ? "self" : "opp";
  }

  // 笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏
  // 譛邨ゅヵ繧ｧ繝ｼ繧ｺ: 蜊縺・ｺ域ｸｬ
  // 笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏
  // 縺上◆縺上◆邨ゆｺ・ 譛邨ゅヵ繧ｧ繝ｼ繧ｺ繧偵せ繧ｭ繝・・縺励※蜊ｳ譎ょ享蛻ｩ蛻､螳・
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

  // 蛟倶ｺｺ蜊縺・浹繧貞・髢・
  gs.revealPersonalFortunes();

  const oppAiName = ai1Role === "opp" ? ai1 : ai2;
  const selfAiName = ai1Role === "opp" ? ai2 : ai1;

  const oppPrediction = predictOpponentColor(oppAiName, gs, "opp"); // opp 竊・self縺ｮ蜊縺・牡繧剃ｺ域ｸｬ
  const selfPrediction = predictOpponentColor(selfAiName, gs, "self"); // self 竊・opp縺ｮ蜊縺・牡繧剃ｺ域ｸｬ

  const selfActual = gs.getFortuneColorForPlayer("self");
  const oppActual = gs.getFortuneColorForPlayer("opp");

  const oppHit = oppPrediction === selfActual;
  const selfHit = selfPrediction === oppActual;

  // 莠域ｸｬ逧・ｸｭ縺ｽ縺・⊃縺・(opp 縺悟・: 逶ｸ謇玖ｳｽ螢㎝it5縺九ｉ2蛟矩勁蜴ｻ)
  if (oppHit) finalPoipoi(gs, "opp", 2, selfActual);
  if (selfHit) finalPoipoi(gs, "self", 2, oppActual);

  // 笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏
  // 蠕礼せ險育ｮ・
  // 笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏
  const selfScore = gs.calcScore("self");
  const oppScore = gs.calcScore("opp");

  // 雉ｽ螢・・遏ｳ蜀・ｨｳ・郁・蜊縺・3 / 逶ｸ謇句頃縺・5 / 荳ｭ螟ｮ+1 / 荳ｭ螟ｮ-2 / 荳ｭ遶・・峨ｒ險育ｮ・
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

  // ai1 縺ｮ role 縺ｫ蠢懊§縺ｦ蜍晄風繧貞愛螳・
  const ai1Score = ai1Role === "opp" ? oppScore : selfScore;
  const ai2Score = ai1Role === "opp" ? selfScore : oppScore;
  const ai1Break = ai1Role === "opp" ? oppBreak : selfBreak;
  const ai2Break = ai1Role === "opp" ? selfBreak : oppBreak;
  const ai1PredHit = ai1Role === "opp" ? oppHit : selfHit;
  const ai2PredHit = ai1Role === "opp" ? selfHit : oppHit;

  // ai1 縺悟・謇九°縺ｩ縺・°
  // opp 縺悟・謇・ ai1Role='opp' 竊・ai1縺悟・謇・
  //             ai1Role='self' 竊・ai2縺悟・謇・
  const ai1GoesFirst = ai1Role === "opp";

  // 謚繧ｫ繧ｦ繝ｳ繝・
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

// 笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏
// 繝｡繧､繝ｳ繧ｷ繝溘Η繝ｬ繝ｼ繧ｷ繝ｧ繝ｳ
// 笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏
const label1 = `${AI_LABELS[ai1Name]}(${ai1Name})`;
const label2 = `${AI_LABELS[ai2Name]}(${ai2Name})`;
console.log(`\n${"━".repeat(60)}`);
console.log(
  ` ${label1} vs ${label2}  窶・ ${N} 隧ｦ蜷・${kkSweep ? "  [縺上◆縺上◆髢ｾ蛟､sweep]" : kkThreshold === Infinity ? "" : `  [縺上◆縺上◆竕･${kkThreshold}蛟江`}`,
);
console.log(`${"━".repeat(60)}\n`);

// 笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏
// sweep 繝｢繝ｼ繝・ 隍・焚髢ｾ蛟､縺ｧ豈碑ｼ・
// 笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏
if (kkSweep) {
  const sweepThresholds = [Infinity, 3.0, 2.5, 2.0, 1.75, 1.5, 1.25, 1.0];
  const sweepResults = [];
  for (const thr of sweepThresholds) {
    const label = thr === Infinity ? "  縺ｪ縺・竏・" : `竕･${thr.toFixed(2)}個`;
    process.stdout.write(`  髢ｾ蛟､ ${label.padEnd(10)} 險育ｮ嶺ｸｭ...`);
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
      `\r  髢ｾ蛟､ ${label.padEnd(10)}: ${wins}蜍・${losses}雋 ${draws}蛻・(${pct}%)\n`,
    );
  }
  console.log(`\n${"笏".repeat(60)}`);
  const best = sweepResults.reduce((a, b) => (a.wins > b.wins ? a : b));
  const bestLabel =
    best.thr === Infinity ? "縺ｪ縺・竏・" : `竕･${best.thr.toFixed(2)}個`;
  console.log(
    ` 笘・譛驕ｩ髢ｾ蛟､: ${bestLabel}  竊・ ${best.wins}蜍・(${best.pct}%)`,
  );
  console.log(`${"━".repeat(60)}\n`);
  process.exit(0);
}

// 笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏
// 騾壼ｸｸ繝｢繝ｼ繝・
// 笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏
console.log("繧ｷ繝溘Η繝ｬ繝ｼ繧ｷ繝ｧ繝ｳ荳ｭ...");

const totals = {
  ai1Wins: 0,
  ai2Wins: 0,
  draws: 0,
  sennitte: 0,
  // 蜈域焔譎・
  ai1FirstWins: 0,
  ai1FirstGames: 0,
  ai2FirstWins: 0,
  ai2FirstGames: 0,
  // 蠕礼せ蜷郁ｨ・
  ai1ScoreSum: 0,
  ai2ScoreSum: 0,
  // 謚
  ai1Guru: 0,
  ai1Zaku: 0,
  ai1Chira: 0,
  ai2Guru: 0,
  ai2Zaku: 0,
  ai2Chira: 0,
  // 莠域ｸｬ逧・ｸｭ
  ai1PredHits: 0,
  ai2PredHits: 0,
  // 雉ｽ螢・浹蜀・ｨｳ
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
  // 蜊頑焚縺壹▽蜈域焔蠕梧焔繧剃ｺ､莉｣
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

  // 蜈域焔譎ゅ・謌千ｸｾ
  if (result.ai1First) {
    totals.ai1FirstGames++;
    totals.ai1FirstWins += result.ai1Win;
  } else {
    totals.ai2FirstGames++;
    totals.ai2FirstWins += result.ai2Win;
  }

  // 騾ｲ謐苓｡ｨ遉ｺ
  if ((i + 1) % Math.max(1, Math.floor(N / 10)) === 0) {
    process.stdout.write(`  ${i + 1}/${N} 螳御ｺ・r`);
  }
}
console.log(`  ${N}/${N} 螳御ｺ・   \n`);

// 笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏
// 邨先棡蜃ｺ蜉・
// 笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏
const pct = (n, d) => (d === 0 ? "-" : ((n / d) * 100).toFixed(1) + "%");
const avg = (n, d) => (d === 0 ? "-" : (n / d).toFixed(2));

console.log(`${"笏".repeat(60)}`);
console.log(` 笆 蜈ｨ菴灘享邇㌔`);
console.log(
  `   ${label1.padEnd(18)} : ${totals.ai1Wins} 蜍・/ ${N}  (${pct(totals.ai1Wins, N)})`,
);
console.log(
  `   ${label2.padEnd(18)} : ${totals.ai2Wins} 蜍・/ ${N}  (${pct(totals.ai2Wins, N)})`,
);
console.log(
  `   蠑輔″蛻・￠              : ${totals.draws} 螻  (${pct(totals.draws, N)})`,
);
if (totals.sennitte > 0) {
  console.log(`   蜊・律謇・              : ${totals.sennitte} 螻`);
}

console.log(`\n${"笏".repeat(60)}`);
console.log(` 笆 蜈域焔繝ｻ蠕梧焔蛻･蜍晉紫`);
console.log(
  `   ${label1.padEnd(18)} 蜈域焔譎・: ${totals.ai1FirstWins} 蜍・/ ${totals.ai1FirstGames}  (${pct(totals.ai1FirstWins, totals.ai1FirstGames)})`,
);
console.log(
  `   ${label1.padEnd(18)} 蠕梧焔譎・: ${totals.ai1Wins - totals.ai1FirstWins} 蜍・/ ${N - totals.ai1FirstGames}  (${pct(totals.ai1Wins - totals.ai1FirstWins, N - totals.ai1FirstGames)})`,
);
console.log(
  `   ${label2.padEnd(18)} 蜈域焔譎・: ${totals.ai2FirstWins} 蜍・/ ${totals.ai2FirstGames}  (${pct(totals.ai2FirstWins, totals.ai2FirstGames)})`,
);
console.log(
  `   ${label2.padEnd(18)} 蠕梧焔譎・: ${totals.ai2Wins - totals.ai2FirstWins} 蜍・/ ${N - totals.ai2FirstGames}  (${pct(totals.ai2Wins - totals.ai2FirstWins, N - totals.ai2FirstGames)})`,
);
// 蜈ｨ菴薙・蜈域焔繝ｻ蠕梧焔蜍晉紫・亥推隧ｦ蜷医↓蠢・★蜈域焔1莠ｺ繝ｻ蠕梧焔1莠ｺ縺・ｋ縺ｮ縺ｧ蛻・ｯ阪・N・・
const totalFirstWins = totals.ai1FirstWins + totals.ai2FirstWins;
const totalSecondWins =
  totals.ai1Wins - totals.ai1FirstWins + (totals.ai2Wins - totals.ai2FirstWins);
console.log(
  `\n   蜈域焔蜈ｨ菴灘享邇・          : ${totalFirstWins} 蜍・/ ${N}  (${pct(totalFirstWins, N)})`,
);
console.log(
  `   蠕梧焔蜈ｨ菴灘享邇・          : ${totalSecondWins} 蜍・/ ${N}  (${pct(totalSecondWins, N)})`,
);

console.log(`\n${"笏".repeat(60)}`);
console.log(` 笆 蟷ｳ蝮・ｾ礼せ`);
console.log(
  `   ${label1.padEnd(18)} : ${avg(totals.ai1ScoreSum, N)} 轤ｹ/隧ｦ蜷・`,
);
console.log(
  `   ${label2.padEnd(18)} : ${avg(totals.ai2ScoreSum, N)} 轤ｹ/隧ｦ蜷・`,
);

console.log(`\n${"笏".repeat(60)}`);
console.log(` 笆 謚縺ｮ蟷ｳ蝮・匱蜍募屓謨ｰ (1隧ｦ蜷医≠縺溘ｊ)`);
console.log(
  `   ${label1.padEnd(18)} : 縺舌ｋ縺舌ｋ ${avg(totals.ai1Guru, N)} / 縺悶￥縺悶￥ ${avg(totals.ai1Zaku, N)} / 縺｡繧峨■繧・${avg(totals.ai1Chira, N)}`,
);
console.log(
  `   ${label2.padEnd(18)} : 縺舌ｋ縺舌ｋ ${avg(totals.ai2Guru, N)} / 縺悶￥縺悶￥ ${avg(totals.ai2Zaku, N)} / 縺｡繧峨■繧・${avg(totals.ai2Chira, N)}`,
);

console.log(`\n${"笏".repeat(60)}`);
console.log(` 笆 蜊縺・ｺ域ｸｬ逧・ｸｭ邇㌔`);
console.log(
  `   ${label1.padEnd(18)} : ${totals.ai1PredHits} 逧・ｸｭ / ${N}  (${pct(totals.ai1PredHits, N)})`,
);
console.log(
  `   ${label2.padEnd(18)} : ${totals.ai2PredHits} 逧・ｸｭ / ${N}  (${pct(totals.ai2PredHits, N)})`,
);

console.log(`\n${"笏".repeat(60)}`);
console.log(` 笆 雉ｽ螢・・遏ｳ蜀・ｨｳ (蟷ｳ蝮・隧ｦ蜷・`);
console.log(
  `   ${"".padEnd(18)} 閾ｪ蜊(+3) 逶ｸ謇句頃(+5) 荳ｭ螟ｮ+(+1) 荳ｭ螟ｮ-(竏・) 荳ｭ遶義`,
);
console.log(
  `   ${label1.padEnd(18)} ${avg(totals.ai1Own3, N).padStart(8)} ${avg(totals.ai1Opp5, N).padStart(10)} ${avg(totals.ai1Pos1, N).padStart(9)} ${avg(totals.ai1Neg2, N).padStart(9)} ${avg(totals.ai1Neu0, N)}`,
);
console.log(
  `   ${label2.padEnd(18)} ${avg(totals.ai2Own3, N).padStart(8)} ${avg(totals.ai2Opp5, N).padStart(10)} ${avg(totals.ai2Pos1, N).padStart(9)} ${avg(totals.ai2Neg2, N).padStart(9)} ${avg(totals.ai2Neu0, N)}`,
);
const ai1NegLoss = (totals.ai1Neg2 * 2) / N;
const ai2NegLoss = (totals.ai2Neg2 * 2) / N;
console.log(
  `\n   繝槭う繝翫せ遏ｳ縺ｫ繧医ｋ螟ｱ轤ｹ: ${label1} -${ai1NegLoss.toFixed(2)}轤ｹ/隧ｦ蜷・/ ${label2} -${ai2NegLoss.toFixed(2)}轤ｹ/隧ｦ蜷・`,
);
console.log(`\n${"━".repeat(60)}\n`);
