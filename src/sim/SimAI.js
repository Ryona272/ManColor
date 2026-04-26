/**
 * SimAI.js
 * Phaser 髱樔ｾ晏ｭ倥・邏皮ｲ矩未謨ｰ AI・・ameState 繧堤峩謗･謫堺ｽ懶ｼ・
 * GameScene 縺ｮ _aiPickPitKisinV2 / _aiPlaceNextStone / _aiHandleSpecialChoice
 * 繧偵ヱ繝ｩ繝｡繝ｼ繧ｿ蛹悶＠縺ｦ螳悟・遘ｻ讀・
 */

import { DEFAULT_PARAMS } from "./SimParams.js";

// 笏笏笏 繝ｦ繝ｼ繝・ぅ繝ｪ繝・ぅ 笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏

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
    // 谺｡繧ｿ繝ｼ繝ｳ縺ｫ縺｡繧峨■繧・縺ｽ縺・⊃縺・〒縺阪ｋ霍ｯ縺後≠繧・
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
    // 谺｡繧ｿ繝ｼ繝ｳ縺ｫ縺｡繧峨■繧・縺ｽ縺・⊃縺・〒縺阪ｋ霍ｯ縺後≠繧具ｼ・I縺ｸ縺ｮ閼・ｨ√→縺励※險井ｸ奇ｼ・
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

// 笏笏笏 繝｡繝｢邂｡逅・笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏

/**
 * 繝励Ξ繧､繝､繝ｼ縺ｮ譛蝟・ｿ懈焔繧剃ｺ域ｸｬ縺励※謦偵″蠕檎乢髱｢繧定ｿ斐☆
 * 縺舌ｋ縺舌ｋ騾｣骼・> 縺｡繧峨■繧・> 縺悶￥縺悶￥ 縺ｮ蜆ｪ蜈亥ｺｦ縺ｧ繧ｷ繝溘Η繝ｬ繝ｼ繝・
 * role="opp" 隕也せ縺ｪ縺ｮ縺ｧ self・・it0-4・峨′逶ｸ謇具ｼ医・繝ｬ繧､繝､繝ｼ・・
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
    // 縺舌ｋ縺舌ｋ: 騾｣骼匁ｷｱ蠎ｦﾂｲ縺ｧ隧穂ｾ｡
    if (last === 5) {
      const depth = countGuruguruChain(p2, 5, 1);
      s += 50 + (1 + depth) * (1 + depth) * 18;
      s += evalFollowupSelf(p2) * 1.2;
    }
    // 縺｡繧峨■繧画ｺ門ｙ (pit11 逹蝨ｰ)
    if (last === 11) s += 36;
    // 縺悶￥縺悶￥
    if (last >= 0 && last <= 4 && pits[last].stones.length === 0) {
      const mirror = pits[last + 6]?.stones.length ?? 0;
      s += 15 + mirror * 4;
    }
    // 謦偵″蠕後・谺｡謇玖у螽・
    s += evalFollowupSelf(p2) * 0.4;
    if (s > bestScore) {
      bestScore = s;
      bestPit = q;
    }
  }
  if (bestPit === -1) return pits;
  return simulateSow(pits, bestPit).pits;
}

// ゲーム AI は src/logic/GameAI.js に分離
export {
  createMemoV1,
  updateMemoV1,
  pickPitKisinV1,
  pickPitKugutsuV1,
  pickPitRasetsuV1,
  pickPitTestKyubiV1,
  decidePlacementsKisinV1,
  optimizeSowOrderKisinV1,
} from "../logic/GameAI.js";

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

// 笏笏笏 繝斐ャ繝磯∈謚橸ｼ・niV2逶ｸ蠖難ｼ・笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏

/**
 * role: "self"・・it0-4 竊・pit5・峨∪縺溘・ "opp"・・it6-10 竊・pit11・峨〒蜍輔°縺・AI
 * 縺薙・螳溯｣・・蠖ｹ蜑ｲ騾・ｻ｢繧ょ庄閭ｽ縺ｫ縺吶ｋ縺溘ａ role 繝代Λ繝｡繝ｼ繧ｿ繧貞女縺大叙繧・
 */
export function pickPitBasicV1(
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

  // role 縺ｫ蜷医ｏ縺帙◆ follow-up 隧穂ｾ｡髢｢謨ｰ繧帝∈謚・
  // evalFollowupOpp = pit6-10隕也せ縲‘valFollowupSelf = pit0-4隕也せ
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

  // 縺｡繧峨■繧芽｢ｫ蠑ｾ謨ｰ・域鋳縺丞燕・・ 逶ｸ謇玖ｷｯ縺ｮ縺・■閾ｪ雉ｽ螢・↓逹蝨ｰ縺ｧ縺阪ｋ遨ｴ縺ｮ謨ｰ
  const chirachiraNow = Array.from(
    { length: oppLaneMax - oppLaneMin + 1 },
    (_, i) => oppLaneMin + i,
  ).filter((q) => {
    const cnt = state.pits[q].stones.length;
    return cnt > 0 && (q + cnt) % 12 === storeIndex;
  }).length;

  // 閾ｪ蛻・・縺｡繧峨■繧画ｺ門ｙ謨ｰ・域鋳縺丞燕・・ 閾ｪ霍ｯ縺ｮ縺・■pit5・育嶌謇玖ｳｽ螢・ｼ峨↓逹蝨ｰ縺ｧ縺阪ｋ遨ｴ縺ｮ謨ｰ
  const ownChirachiraNow = Array.from(
    { length: laneMax - laneMin + 1 },
    (_, i) => laneMin + i,
  ).filter((q) => {
    const cnt = state.pits[q].stones.length;
    return cnt > 0 && (q + cnt) % 12 === oppStoreIndex;
  }).length;

  // 縺上◆縺上◆逋ｺ蜍募愛螳・ 逶ｸ謇玖ｷｯ縺ｮ濶ｲ繧・濶ｲ莉･荳九↓謨ｴ逅・＠縺ｦ縺・ｋ + 雉ｽ螢・ｷｮ譚｡莉ｶ繧呈ｺ縺溘☆蝣ｴ蜷医↓逋ｺ蜍輔Μ繧ｹ繧ｯ縺ゅｊ
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

  // 荳｡雉ｽ螢・粋險育浹謨ｰ繝√ぉ繝・け: 7蛟倶ｻ･荳翫↑繧峨■繧峨■繧峨ｒ隲ｦ繧√※縺舌ｋ縺舌ｋ蟆ょｿｵ
  const totalSaidanStones = aiStoreNow + playerStoreNow;
  const chirachiraAbandoned =
    totalSaidanStones >= (params.saidanAbandonThreshold ?? 7);

  // 蠎冗乢繝輔Λ繧ｰ
  const isEarlyGame =
    peeksDone < params.earlyGamePeekThreshold &&
    !inferred &&
    knownPos.length === 0;

  // 笏笏笏 豌怜・・医ち繝ｼ繝ｳ縺斐→縺ｮ繝ｩ繝ｳ繝繝驥阪∩: 蠢・炊謌ｦ逕ｨ・俄楳笏笏
  // 蜊縺・牡驥崎ｦ門ｺｦ繧呈ｯ弱ち繝ｼ繝ｳ繧・ｉ縺後○繧・竊・陦悟虚繝代ち繝ｼ繝ｳ縺瑚ｪｭ縺ｾ繧後↓縺上＞
  const moodRoll = Math.random();
  // fortune諢剰ｭ伜ｺｦ: 0.3・井ｻ雁屓縺ｯ謨｢縺育┌隕・= 繝悶Λ繝輔・霄ｺ蠅暦ｼ会ｽ・1.7・亥ｼｷ縺城㍾隕・= 螳牙・霍ｯ蟇・送・・
  const moodFortuneMult = 0.3 + moodRoll * 1.4;
  // 雉ｽ螢・捩蝨ｰ縺ｮ閾ｪ蜊縺・牡繝懊・繝翫せ逕ｨ: 荳矩剞0.85・医ヶ繝ｩ繝墓凾縺ｧ繧ょ渕譛ｬ逧・↓閾ｪ蜊縺・牡縺ｯ雉ｽ螢・↓蜈･繧後ｋ・・
  const moodFortuneStoreMult = Math.max(0.85, moodFortuneMult);
  // 蜊縺・㍾隕門ｺｦ縺碁ｫ倥＞縺ｨ縺阪・蠎冗乢繧ｰ繝ｫ繧ｰ繝ｫ繝吶・繧ｹ繧貞ｾｮ邵ｮ縺励※fortune霍ｯ縺悟ｱ上↓蜈･繧翫ｄ縺吶￥縺吶ｋ
  // ・・oodFortuneMult=1.7竊堤ｴ・21%縲・1.0竊貞､牙喧縺ｪ縺励・1.0竊貞､牙喧縺ｪ縺暦ｼ・
  const moodGuruguruMult = isEarlyGame
    ? 1.0 - Math.max(0, moodFortuneMult - 1.0) * 0.3
    : 1.0;

  let best = validPits[0];
  let bestScore = -Infinity;
  const pitScores = [];

  // 蜈ｨ謇句・騾・ 謦偵￥蜑阪・繝励Ξ繧､繝､繝ｼ閼・ｨ∝ｺｦ繝吶・繧ｹ繝ｩ繧､繝ｳ
  const basePlayerThreat = evalOppThreat(state.pits);

  for (const p of validPits) {
    const count = state.pits[p].stones.length;
    const lastPit = (p + count) % 12;
    let score = 0;
    let defPenalty = 0;

    const { pits: pitsAfter } = simulateSow(state.pits, p);

    // 笏笏笏 2謇句・隱ｭ縺ｿ: 繝励Ξ繧､繝､繝ｼ縺ｮ譛蝟・ｿ懈焔蠕後・逶､髱｢繧定ｩ穂ｾ｡ 笏笏笏
    const pitsAfterResponse = predictPlayerResponse(pitsAfter);
    // 蠢懈焔蠕後↓AI縺悟叙繧後ｋ陦悟虚縺ｮ雉ｪ
    const lookaheadOwnThreat = evalOwnFollowup(pitsAfterResponse);
    // 蠢懈焔蠕後↓繝励Ξ繧､繝､繝ｼ縺悟叙繧後ｋ陦悟虚縺ｮ雉ｪ・・謇句・縺ｮ閼・ｨ・ｼ・
    const lookaheadPlayerThreat = evalOppThreat(pitsAfterResponse);
    score += lookaheadOwnThreat * (params.lookaheadOwnMult ?? 0.35);
    score -= lookaheadPlayerThreat * (params.lookaheadPlayerMult ?? 0.55);

    // 笏笏笏 蜈ｨ謇句・騾・ 謦偵＞縺溷ｾ後・繝励Ξ繧､繝､繝ｼ閼・ｨ∝｢怜刈繧堤｡ｬ繝壹リ繝ｫ繝・ぅ縺ｨ縺励※驕ｩ逕ｨ笏笏笏
    // 騾壼ｸｸ謇九〒逶ｸ謇玖ｷｯ縺ｫ遏ｳ縺梧ｵ√ｌ霎ｼ繧薙〒繧ｰ繝ｫ繧ｰ繝ｫ騾｣骼悶′蠅励∴繧句ｴ蜷医ｂ騾√ｓ縺ｪ縺・
    const playerThreatAfter = evalOppThreat(pitsAfter);
    {
      const threatGrowth = playerThreatAfter - basePlayerThreat;
      if (threatGrowth > 0)
        score -= threatGrowth * (params.playerThreatGrowthMult ?? 1.0);
    }
    // 笏笏笏 繝励Ξ繧､繝､繝ｼ縺舌ｋ縺舌ｋ螟牙喧・育ｴ螢翫・繝ｼ繝翫せ・俄楳笏笏
    // 閾ｪ蛻・′縺舌ｋ縺舌ｋ縺吶ｋ謇具ｼ・astPit===storeIndex・峨〒縺ｯ逕滓・繝壹リ繝ｫ繝・ぅ繧堤┌蜉ｹ蛹厄ｼ・
    // 縺舌ｋ縺舌ｋ > 螯ｨ螳ｳ 縺ｮ蜆ｪ蜈磯・ｽ阪ｒ邯ｭ謖√☆繧・
    {
      let playerGuruguruAfter = 0;
      for (let q = oppLaneMin; q <= oppLaneMax; q++) {
        const cnt = pitsAfter[q].stones.length;
        if (cnt > 0 && (q + cnt) % 12 === oppStoreIndex) playerGuruguruAfter++;
      }
      const disrupted = playerGuruguruNow - playerGuruguruAfter;
      if (disrupted > 0) score += disrupted * params.guruguruDisrupt;
      // 譁ｰ隕上＄繧九＄繧句峨・蠅怜刈縺ｯ playerThreatGrowth 縺ｧ閨匁ｵ∬ｲ諡・ｸ医∩
    }

    // 笏笏笏 縺｡繧峨■繧芽｢ｫ蠑ｾ髦ｲ豁｢・域鋳縺・◆蠕後↓蠅励∴縺溯｢ｫ蠑ｾ蜿ｯ閭ｽ遨ｴ繧偵・繝翫Ν繝・ぅ・俄楳笏笏
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

    // 笏笏笏 閾ｪ蛻・・縺｡繧峨■繧画ｺ門ｙ遐ｴ螢企亟豁｢・域鋳縺・◆邨先棡縺｡繧峨■繧臥漁縺・ｷｯ縺悟ｴｩ繧後◆繧峨・繝翫Ν繝・ぅ・俄楳笏笏
    // lastPit === oppStoreIndex 縺ｮ謇九・諢丞峙逧・↑菴ｿ逕ｨ縺ｪ縺ｮ縺ｧ蜈埼勁
    // chirachiraAbandoned 縺九▽ peeks貂医∩2蝗樔ｻ･荳・竊・縺｡繧峨■繧芽ｫｦ繧∵ｸ医∩縺ｪ縺ｮ縺ｧ繝壹リ繝ｫ繝・ぅ荳崎ｦ・
    if (lastPit !== oppStoreIndex && !(chirachiraAbandoned && peeksDone >= 2)) {
      let ownChirachiraAfter = 0;
      for (let q = laneMin; q <= laneMax; q++) {
        const cnt = pitsAfter[q].stones.length;
        if (cnt > 0 && (q + cnt) % 12 === oppStoreIndex) ownChirachiraAfter++;
      }
      const lost = ownChirachiraNow - ownChirachiraAfter;
      if (lost > 0) defPenalty -= lost * (params.ownChirachiraLost ?? 20);
    }

    // 笏笏笏 縺上◆縺上◆螯ｨ螳ｳ・育嶌謇九′縺上◆縺上◆逋ｺ蜍募庄閭ｽ縺ｪ繧臥嶌謇玖ｷｯ縺ｸ縺ｮ逹蝨ｰ繧帝∩縺代ｋ・俄楳笏笏
    if (playerCanKutakuta) {
      for (let i = 0; i < count; i++) {
        const landingPit = (p + 1 + i) % 12;
        if (landingPit >= oppLaneMin && landingPit <= oppLaneMax) {
          defPenalty -= params.kutakutaLanePenalty ?? 6;
        }
      }
    }

    // 笏笏笏 縺舌ｋ縺舌ｋ 笏笏笏
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

    // 笏笏笏 pit5逹蝨ｰ・医■繧峨■繧・縺ｽ縺・⊃縺・ｼ俄楳笏笏
    if (lastPit === oppStoreIndex) {
      // 荳｡雉ｽ螢・粋險・蛟倶ｻ･荳翫°縺､2蝗樊ｸ医∩ 竊・縺｡繧峨■繧牙ｮ悟・謾ｾ譽・・縺ｽ縺・⊃縺・・縺ｿ
      // 窶ｻ peeksDone < 2 縺ｮ蝣ｴ蜷医・縲後◆縺ｾ縺溘∪逹蝨ｰ縲阪〒繧ゅ■繧峨■繧峨ｒ螳溯｡後☆繧具ｼ井ｸ企剞2蝗橸ｼ・
      if (chirachiraAbandoned && peeksDone >= 2) {
        const playerStoreHasFortune =
          inferred &&
          state.pits[oppStoreIndex].stones.some((s) => s.color === inferred);
        score += playerStoreHasFortune
          ? params.poipoiWithFortune
          : state.pits[oppStoreIndex].stones.length > 0
            ? params.poipoiGeneral
            : params.poipoiEmpty;
      } else if (isEarlyGame) {
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

    // 笏笏笏 縺悶￥縺悶￥ 笏笏笏
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
        // 逶ｸ謇九・謗ｨ螳壼頃縺・牡・・3遏ｳ・峨ｒ螂ｪ縺・
        if (inferred && s.color === inferred) score += params.zakuzakuInferred;
        if (knownPos.includes(s.color)) score += params.zakuzakuKnownPos;
        // 逶ｸ謇玖ｳｽ螢・↓譌｢縺ｫ縺ゅｋ濶ｲ縺ｮ遏ｳ繧貞･ｪ縺・ｼ育嶌謇九・謌ｦ逡･蜷ｦ螳夲ｼ・
        if (oppStoreColorSet.has(s.color))
          score += params.zakuzakuOppStoreColor ?? 5;
      }
      score += evalOwnFollowup(pitsAfter) * 0.8;
      const playerThreatMult = 0.5 + playerGuruguruNow * 0.3;
      score -= evalOppThreat(pitsAfter) * playerThreatMult;
    }

    // 笏笏笏 縺悶￥縺悶￥髦ｲ蠕｡・域鋳縺榊・縺ｮ髀｡遨ｴ縺ｫ遏ｳ縺後≠繧後・髱樒ｷ壼ｽ｢繝壹リ繝ｫ繝・ぅ・俄楳笏笏
    if (lastPit !== oppStoreIndex) {
      const playerMirrorOfP = isOpp ? p - 6 : p + 6;
      if (state.pits[playerMirrorOfP].stones.length > 0) {
        const c = state.pits[playerMirrorOfP].stones.length;
        // 髱樒ｷ壼ｽ｢: 1竊・13, 2竊・20, 3竊・31, 4竊・46, 5竊・65
        score -= 10 + c * c * 2 + c;
        if (inferred) {
          const inferredHere = state.pits[playerMirrorOfP].stones.filter(
            (s) => s.color === inferred,
          ).length;
          score -= inferredHere * 9;
        }
      }
    }

    // 笏笏笏 遏ｳ縺ｮ逹蝨ｰ蜈医′逶ｸ謇狗ｩｺ縺崎ｷｯ縺ｮ繝溘Λ繝ｼ 竊・陲ｫ縺悶￥縺悶￥繝ｪ繧ｹ繧ｯ・育浹謨ｰ閠・・・俄楳笏笏
    for (let i = 0; i < count; i++) {
      const landingPit = (p + 1 + i) % 12;
      if (landingPit >= laneMin && landingPit <= laneMax) {
        const landedMirrorPlayer = isOpp ? landingPit - 6 : landingPit + 6;
        if (emptyPlayerPits.has(landedMirrorPlayer)) {
          const stonesInPit = pitsAfter[landingPit].stones.length;
          // 3遏ｳ莉･荳翫〒諤･蠅・ 1竊・10, 2竊・12, 3竊・25, 4竊・44, 5竊・69
          score -=
            stonesInPit >= 3
              ? stonesInPit * stonesInPit * 3 - 2
              : 10 + stonesInPit;
        }
      }
    }

    // 笏笏笏 陲ｫ縺悶￥縺悶￥髴ｲ蜃ｺ・域鋳縺榊ｾ後↓蜊ｳ蜿悶ｉ繧悟庄閭ｽ縺ｪ鬮倡浹遨ｴ・俄楳笏笏
    // 閾ｪ髯｣縺ｫ遏ｳ縺悟､壹￥縺ｦ逶ｸ謇九・蟇ｾ蠢懃ｩｴ縺檎ｩｺ 竊・逶ｸ謇九・谺｡縺ｮ謇狗分縺ｧ蜊ｳ蠎ｧ縺ｫ縺悶￥縺悶￥蜿ｯ閭ｽ
    for (let q = laneMin; q <= laneMax; q++) {
      const exposed = pitsAfter[q].stones.length;
      if (exposed < 3) continue; // 3遏ｳ譛ｪ貅縺ｯ螳牙・蝨・
      const playerMirror = isOpp ? q - 6 : q + 6;
      if (pitsAfter[playerMirror].stones.length === 0) {
        // 遏ｳ謨ｰ^2 荵玲焚: 3竊・39, 4竊・60, 5竊・87, 6竊・120
        defPenalty -=
          (params.zakuzakuExposedBase ?? 12) +
          exposed * exposed * (params.zakuzakuExposedMult ?? 3);
      }
    }

    // 笏笏笏 霍ｯ縺ｮ濶ｲ蜩∬ｳｪ隧穂ｾ｡・育衍隴倥・繝ｼ繧ｹ: 蜊縺・謗ｨ貂ｬ/遒ｺ螳壽ュ蝣ｱ繧呈ｴｻ逕ｨ・俄楳笏笏
    for (const s of state.pits[p].stones) {
      if (ownFortune && s.color === ownFortune)
        score += (params.pitColorOwnFortune ?? 2) * moodFortuneMult;
      if (inferred && s.color === inferred)
        score += params.pitColorInferred ?? 2.5;
      if (knownPos.includes(s.color)) score += params.pitColorKnownPos ?? 1.5;
      if (knownNeg && s.color === knownNeg)
        score -= params.pitColorKnownNeg ?? 6;
      // ownFortune / knownPos 縺檎｢ｺ螳壹＠縺ｦ縺・ｋ濶ｲ縺ｯ playerAvoidedColor 縺ｧ荳頑嶌縺阪＠縺ｪ縺・
      if (
        playerAvoidedColor &&
        s.color === playerAvoidedColor &&
        !(ownFortune && s.color === ownFortune) &&
        !knownPos.includes(s.color)
      )
        score -= params.pitColorAvoided ?? 3;
    }

    // 笏笏笏 遏ｳ縺ｮ濶ｲ隧穂ｾ｡ 笏笏笏
    for (let i = 0; i < count; i++) {
      const landingPit = (p + 1 + i) % 12;
      const stoneColor = state.pits[p].stones[i]?.color;
      if (!stoneColor) continue;

      if (landingPit === storeIndex) {
        if (isEarlyGame) {
          if (ownFortune && stoneColor === ownFortune) {
            score += params.earlyOwnFortune * moodFortuneStoreMult;
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
          // ownFortune / knownPos 縺檎｢ｺ螳壹＠縺ｦ縺・ｋ濶ｲ縺ｯ playerAvoidedColor 縺ｧ荳頑嶌縺阪＠縺ｪ縺・
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

      // 逶ｸ謇玖ｳｽ螢・↓謗ｨ貂ｬ蜊縺・牡繝ｻ縺｡繧峨■繧峨・繝ｩ繧ｹ濶ｲ縺梧ｵ√ｌ霎ｼ縺ｾ縺ｪ縺・ｈ縺・↓縺吶ｋ
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

      // 閾ｪ霍ｯ縺ｫ逹蝨ｰ縺吶ｋ遏ｳ縺ｮ濶ｲ隧穂ｾ｡・亥ｰ・擂縺ｮ雉ｽ螢・・繧雁刀雉ｪ・・
      if (landingPit >= laneMin && landingPit <= laneMax) {
        if (ownFortune && stoneColor === ownFortune)
          score += params.laneOwnFortune ?? 3;
        else if (inferred && stoneColor === inferred)
          score += params.laneInferred ?? 4;
        else if (knownPos.includes(stoneColor))
          score += params.laneKnownPos ?? 2;
        // 遒ｺ螳壹・繧､繝翫せ遏ｳ縺瑚・霍ｯ縺ｫ谿九ｋ縺ｨ蟆・擂-3轤ｹ遒ｺ螳・
        if (knownNeg && stoneColor === knownNeg)
          score -= params.laneKnownNegPenalty ?? 8;
        // 逶ｸ謇九′驕ｿ縺代※縺・ｋ濶ｲ・域耳螳壹・繧､繝翫せ・峨ｒ閾ｪ霍ｯ縺ｫ雋ｯ繧√↑縺・
        // 縺溘□縺・ownFortune / knownPos 縺ｧ遒ｺ螳壽ｸ医∩縺ｪ繧我ｸ頑嶌縺阪＠縺ｪ縺・
        if (
          playerAvoidedColor &&
          stoneColor === playerAvoidedColor &&
          !(ownFortune && stoneColor === ownFortune) &&
          !knownPos.includes(stoneColor)
        )
          score -= params.laneAvoidedPenalty ?? 5;
      }

      // 遒ｺ螳壹・繧､繝翫せ遏ｳ繧堤嶌謇玖ｷｯ繝ｻ逶ｸ謇玖ｳｽ螢・↓騾√ｊ霎ｼ繧√◆繧峨・繝ｼ繝翫せ
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

  // 髦ｲ蠕｡繝壹リ繝ｫ繝・ぅ縺ｯ繧ｿ繧､繝悶Ξ繝ｼ繧ｫ繝ｼ縺ｨ縺励※縺ｮ縺ｿ驕ｩ逕ｨ:
  // 譛濶ｯ謾ｻ謦・せ繧ｳ繧｢縺九ｉ window 莉･蜀・・謇九↓縺ｮ縺ｿ defPenalty 繧貞刈邂励＠縺ｦ譛邨る∈謚・
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
 * 縺悶￥縺悶￥蠕後・遏ｳ驟咲ｽｮ・医・繝・ラ繝ｬ繧ｹ迚茨ｼ・
 * 謇区戟縺｡ stones 繧・oppLanes・・-10・峨↓譛驕ｩ驟咲ｽｮ縺励※霑斐☆
 * 謌ｻ繧雁､: { pitIndex, stone }[] 縺ｮ驟咲ｽｮ繝ｪ繧ｹ繝・
 */
export function decidePlacementsBasicV1(
  stones,
  state,
  memo,
  fortune,
  params = DEFAULT_PARAMS,
  role = "opp",
) {
  const isOpp = role === "opp";
  const laneOffset = isOpp ? 6 : 0; // 閾ｪ蛻・・霍ｯ縺ｮ蜈磯ｭ繧､繝ｳ繝・ャ繧ｯ繧ｹ
  const storeIndex = isOpp ? 11 : 5; // 閾ｪ蛻・・雉ｽ螢・
  const oppStoreIndex = isOpp ? 5 : 11; // 逶ｸ謇九・雉ｽ螢・ｼ・layerStore繧ｫ繧ｦ繝ｳ繝育畑・・

  const result = [];
  const ownFortune = isOpp ? fortune.opp.color : fortune.self.color;
  const inferred = memo.inferredPlayerColor;
  const knownNeg = knownNegativeColor(fortune, role);
  const knownPos = knownPositiveColors(fortune, role);
  const playerStoreColorCount = {};
  for (const s of state.pits[oppStoreIndex].stones) {
    playerStoreColorCount[s.color] = (playerStoreColorCount[s.color] ?? 0) + 1;
  }

  // 莉ｮ縺ｮ霍ｯ迥ｶ諷具ｼ磯・鄂ｮ縺励↑縺後ｉ譖ｴ譁ｰ・・
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
        // 縺舌ｋ縺舌ｋ繧ｻ繝・ヨ繧｢繝・・
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
 * 縺｡繧峨■繧・縺ｽ縺・⊃縺・∈謚橸ｼ医・繝・ラ繝ｬ繧ｹ迚茨ｼ・
 * 謌ｻ繧雁､: "chirachira" | "poipoi" | "none"
 * 縺ｽ縺・⊃縺・凾縺ｯ removePitIndex 繧りｿ斐☆
 */
export function decideSpecialActionV1(
  state,
  memo,
  fortune,
  peeksDone,
  isOni = true,
  role = "opp",
  params = null,
) {
  const p = params || {};
  const oppStoreIndex = role === "opp" ? 5 : 11; // 縺ｽ縺・⊃縺・〒迢吶≧逶ｸ謇九・雉ｽ螢・

  if (peeksDone >= 3) {
    // 縺｡繧峨■繧牙屓謨ｰ縺ｪ縺・竊・縺ｽ縺・⊃縺・・縺ｿ
    return _resolvePoipoi(state, memo, fortune, role, p);
  }

  // 閾ｪ髯｣縺ｮ遏ｳ縺悟ｰ代↑縺・ｴ蜷医・蠑ｷ蛻ｶ縺｡繧峨■繧峨ｒ隗｣髯､・育せ謨ｰ遞ｼ縺主━蜈茨ｼ・
  const ownLaneMin = role === "opp" ? 6 : 0;
  const ownLaneMax = role === "opp" ? 10 : 4;
  const selfLaneStones = state.pits
    .slice(ownLaneMin, ownLaneMax + 1)
    .reduce((sum, pit) => sum + pit.stones.length, 0);
  const laneRich = selfLaneStones >= (p.forceChirachiraMinLane ?? 3);
  if (isOni && laneRich && peeksDone < (p.forceChirachiraThreshold ?? 2)) {
    // 鬯ｼ: 閾ｪ髯｣縺ｫ遏ｳ縺後≠繧矩俣縺縺大ｼｷ蛻ｶ縺｡繧峨■繧・
    return { action: "chirachira" };
  }

  // 縺ｽ縺・⊃縺・・萓｡蛟､繧定ｨ育ｮ励＠縺ｦ縺｡繧峨■繧峨→豈碑ｼ・
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
  const ownStoreIndex = role === "opp" ? 11 : 5;
  const inferred = memo.inferredPlayerColor;
  const ownFortune = role === "opp" ? fortune.opp.color : fortune.self.color;
  const knownNeg = knownNegativeColor(fortune, role);
  const knownPos = knownPositiveColors(fortune, role);
  const vOwnFortune = params.poipoiStoneOwnFortune ?? 30;
  const vInferred = params.poipoiStoneInferred ?? 22;
  const vKnownPos = params.poipoiStoneKnownPos ?? 4;

  // 逶ｸ謇玖ｳｽ螢・°繧牙叙繧狗浹縺ｮ譛濶ｯ蛟､・磯ｫ倥＞縺ｻ縺ｩ蜿悶ｋ萓｡蛟､縺ゅｊ・・
  let bestOppIdx = -1;
  let bestOppVal = 0;
  state.pits[oppStoreIndex].stones.forEach((stone, index) => {
    let val = 1;
    if (ownFortune && stone.color === ownFortune) val = vOwnFortune;
    else if (inferred && stone.color === inferred) val = vInferred;
    else if (knownPos.includes(stone.color)) val = vKnownPos;
    if (knownNeg && stone.color === knownNeg) val = -99;
    if (val > bestOppVal) {
      bestOppVal = val;
      bestOppIdx = index;
    }
  });

  // 閾ｪ蛻・・雉ｽ螢・°繧画昏縺ｦ繧狗浹縺ｮ譛濶ｯ蛟､・磯ｫ倥＞縺ｻ縺ｩ謐ｨ縺ｦ繧倶ｾ｡蛟､縺ゅｊ・・
  // knownNeg(-4遒ｺ螳・縺ｪ繧画昏縺ｦ縺滓婿縺悟ｾ・竊・逶ｸ謇九°繧牙叙繧・3繧医ｊ萓｡蛟､縺碁ｫ倥＞蝣ｴ蜷医′縺ゅｋ
  let bestOwnIdx = -1;
  let bestOwnVal = 0;
  state.pits[ownStoreIndex].stones.forEach((stone, index) => {
    let val = 0;
    if (knownNeg && stone.color === knownNeg) val = 40; // -4遒ｺ螳夂浹繧呈昏縺ｦ繧倶ｾ｡蛟､縺ｯ鬮倥＞
    // 閾ｪ蜊縺・牡 / knownPos 縺ｯ謐ｨ縺ｦ縺溘￥縺ｪ縺・ｼ郁ｲ縺ｮ萓｡蛟､・・
    if (ownFortune && stone.color === ownFortune) val = -99;
    if (knownPos.includes(stone.color)) val = -99;
    if (val > bestOwnVal) {
      bestOwnVal = val;
      bestOwnIdx = index;
    }
  });

  // 閾ｪ蛻・・雉ｽ螢・°繧画昏縺ｦ繧区婿縺御ｾ｡蛟､縺碁ｫ倥＞蝣ｴ蜷医・縺昴■繧峨ｒ驕ｸ謚・
  if (bestOwnIdx >= 0 && bestOwnVal > bestOppVal) {
    return {
      action: "poipoi",
      removePitIndex: ownStoreIndex,
      removeStoneIndex: bestOwnIdx,
    };
  }

  if (bestOppIdx < 0) return { action: "none" };
  return {
    action: "poipoi",
    removePitIndex: oppStoreIndex,
    removeStoneIndex: bestOppIdx,
  };
}

// 笏笏笏 OniV3: 5謇狗分蜈郁ｪｭ縺ｿ 笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏

/**
 * OniV3 繝斐ャ繝磯∈謚・- 5謇狗分蜈郁ｪｭ縺ｿ
 *
 * 謇狗分鬆・ AI 竊・Player 竊・AI 竊・Player 竊・AI (險・謇狗分)
 * 蜷・焔逡ｪ縺ｧ隧穂ｾ｡縺ｮ鬮倥＞荳贋ｽ・謇九ｒ蛟呵｣懊→縺励・^5 = 243 繝代せ繧貞・蛻玲嫌縲・
 * AI邏ｯ險医せ繧ｳ繧｢縺ｨPlayer邏ｯ險医せ繧ｳ繧｢縺ｮ蟾ｮ縺梧怙螟ｧ縺ｫ縺ｪ繧九ヱ繧ｹ縺ｮ譛蛻昴・霍ｯ繧定ｿ斐☆縲・
 *
 * 笘・ｩ穂ｾ｡蝓ｺ貅厄ｼ・I繝ｻ繝励Ξ繧､繝､繝ｼ蜈ｱ騾夲ｼ・
 *   縺舌ｋ縺舌ｋ逋ｺ蜍・     : +5
 *   縺｡繧峨■繧臥匱蜍・     : +9  (荳企剞2蝗・
 *   2蝗樒岼縺ｧ繝槭う繝翫せ遒ｺ螳・ +8  (fortune蜿ら・)
 *   縺悶￥縺悶￥逋ｺ蜍・     : +7
 *   縺上◆縺上◆蜿ｯ閭ｽ縺ｫ螟牙喧 : +2  (譁ｰ縺溘↓逋ｺ蜍募庄閭ｽ迥ｶ諷九↓縺ｪ縺｣縺滓凾縺ｮ縺ｿ)
 *
 * @param {number[]} validPits - AI縺碁∈縺ｹ繧玖ｷｯ繧､繝ｳ繝・ャ繧ｯ繧ｹ・・urn0縺ｮ縺ｿ蛻ｶ髯撰ｼ・
 * @param {object}   state     - GameState 縺ｮ繧ｹ繝翫ャ繝励す繝ｧ繝・ヨ
 * @param {number}   peeksDoneAI     - AI縺ｮ縺｡繧峨■繧牙ｮ御ｺ・屓謨ｰ
 * @param {number}   peeksDonePlayer - 繝励Ξ繧､繝､繝ｼ縺ｮ縺｡繧峨■繧牙ｮ御ｺ・屓謨ｰ
 * @param {object}   fortune   - { center: [{bonus, seenBy},...] }
 */
