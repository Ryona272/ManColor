/**
 * battleLogger.js
 * 対戦記録の送信・取得・分析ユーティリティ
 *
 * - POST /battle-record → サーバーに戦績を1件送信（fire-and-forget）
 * - GET  /battle-stats  → 集計済み統計を取得
 * - localStorage にも同時保存（サーバー再起動時のフォールバック）
 */

const LOCAL_STATS_KEY = "mancolor_battle_stats";
const MAX_LOCAL_RECORDS = 300;

/** roomServer と同じ URL 解決ロジック */
function _resolveBase() {
  try {
    const params = new URLSearchParams(window.location.search);
    const host =
      (params.get("roomHost") || "").trim() ||
      (import.meta.env.VITE_ROOM_SERVER_HOST || "").trim() ||
      (
        window.localStorage.getItem("mancolor-room-host-override") || ""
      ).trim() ||
      window.location.hostname ||
      "localhost";

    if (
      host.includes(".onrender.com") ||
      (host.includes(".") &&
        !host.startsWith("localhost") &&
        !host.startsWith("127."))
    ) {
      return `https://${host}`;
    }
    const port = Number(import.meta.env.VITE_ROOM_SERVER_PORT) || 8787;
    return `http://${host}:${port}`;
  } catch (_e) {
    return null;
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * 対戦結果をサーバーと localStorage に記録する（fire-and-forget）
 *
 * @param {object} record
 * @param {"solo"|"online"} record.mode
 * @param {string}  record.difficulty  - solo: "kooni"/"yasha"/... online: "online"
 * @param {"win"|"lose"|"draw"} record.result  - プレイヤー視点
 * @param {number}  record.playerScore
 * @param {number}  record.aiScore
 * @param {number}  record.turns       - ゲーム内ターン数
 * @param {object}  record.techCounts  - { self: {guru,zaku,chira}, opp: {guru,zaku,chira} }
 * @param {string|null} record.lossReason - 負けた主な要因（勝ち/引き分けは null）
 */
export function logBattleResult(record) {
  const safe = {
    ts: Date.now(),
    mode: record.mode ?? "solo",
    difficulty: record.difficulty ?? "unknown",
    result: record.result ?? "draw",
    playerScore: Number(record.playerScore) || 0,
    aiScore: Number(record.aiScore) || 0,
    turns: Number(record.turns) || 0,
    techCounts: record.techCounts ?? { self: {}, opp: {} },
    lossReason: record.lossReason ?? null,
  };

  _saveLocal(safe);

  const base = _resolveBase();
  if (!base) return;
  try {
    fetch(`${base}/battle-record`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(safe),
      keepalive: true,
    }).catch(() => {});
  } catch (_e) {}
}

/**
 * サーバーから集計統計を取得する。
 * サーバーが応答しない場合は localStorage の集計を返す。
 * serverOnly=true の場合はサーバーのみ参照し、取得失敗時は null を返す。
 *
 * @param {boolean} [serverOnly=false]
 * @returns {Promise<BattleStats|null>}
 */
export async function fetchBattleStats(serverOnly = false) {
  const base = _resolveBase();
  if (base) {
    try {
      const res = await fetch(`${base}/battle-stats`, {
        signal: AbortSignal.timeout(4000),
      });
      if (res.ok) return await res.json();
    } catch (_e) {}
  }
  if (serverOnly) return null;
  return _calcLocalStats();
}

/**
 * 傀儡（kugutsu）の成長レベルを取得する（1〜5）。
 *
 * プレイヤーが傀儡に勝つほどレベルが上がり、傀儡が強くなる。
 *  - Level 1: maxDepth=3（初期）
 *  - Level 2: maxDepth=4
 *  - Level 3〜5: maxDepth=5
 * 低勝率ならレベルを抑えて「強すぎる」状態を避ける。
 *
 * @returns {Promise<number>} 1〜5
 */
export async function fetchKugutsuLevel() {
  const stats = await fetchBattleStats();
  const ks = stats.byDifficulty?.kugutsu;
  if (!ks || ks.total < 3) return 1;

  const winRate = ks.total > 0 ? ks.wins / ks.total : 0;
  // 基本: 10戦ごとに1段階（最大5）
  const base = Math.min(5, Math.floor(ks.total / 10) + 1);
  // 勝率が低い（0.25未満）ならレベルを1段抑制
  if (winRate < 0.25 && base > 1) return base - 1;
  return base;
}

/**
 * 負け要因を分析してキーを返す（勝ち・引き分けは null）
 *
 * @param {object} gameScene  GameScene インスタンス
 * @param {number} playerScore
 * @param {number} aiScore
 * @returns {string|null}
 */
export function analyzeLossReason(gameScene, playerScore, aiScore) {
  if (playerScore >= aiScore) return null;

  const tech = gameScene._battleTechCounts ?? {
    self: { guru: 0, zaku: 0, chira: 0 },
    opp: { guru: 0, zaku: 0, chira: 0 },
  };

  const guruGap = (tech.opp?.guru ?? 0) - (tech.self?.guru ?? 0);
  const zakuGap = (tech.opp?.zaku ?? 0) - (tech.self?.zaku ?? 0);
  const chiraGap = (tech.opp?.chira ?? 0) - (tech.self?.chira ?? 0);
  const scoreDiff = aiScore - playerScore;

  if (guruGap >= 3) return "guru_dominance"; // AI のぐるぐるが圧倒的に多い
  if (zakuGap >= 2) return "zaku_dominance"; // AI のざくざくが多い
  if (chiraGap >= 2) return "chirachira_miss"; // ちらちら活用不足
  if (scoreDiff >= 10) return "score_gap"; // 点差が大きい
  return "close_loss"; // 接戦の末の負け
}

// ─── Private helpers ──────────────────────────────────────────────────────────

function _saveLocal(record) {
  try {
    const raw = localStorage.getItem(LOCAL_STATS_KEY);
    const data = raw ? JSON.parse(raw) : { records: [] };
    data.records.push(record);
    if (data.records.length > MAX_LOCAL_RECORDS) {
      data.records = data.records.slice(-MAX_LOCAL_RECORDS);
    }
    localStorage.setItem(LOCAL_STATS_KEY, JSON.stringify(data));
  } catch (_e) {}
}

function _calcLocalStats() {
  try {
    const raw = localStorage.getItem(LOCAL_STATS_KEY);
    if (!raw) return _emptyStats();
    const parsed = JSON.parse(raw);
    return _aggregateRecords(parsed.records ?? []);
  } catch (_e) {
    return _emptyStats();
  }
}

function _emptyStats() {
  return { total: 0, byDifficulty: {}, byMode: {}, source: "local" };
}

function _aggregateRecords(records) {
  const stats = _emptyStats();
  stats.total = records.length;

  for (const r of records) {
    const diff = r.difficulty ?? "unknown";
    if (!stats.byDifficulty[diff]) {
      stats.byDifficulty[diff] = {
        total: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        lossReasons: {},
      };
    }
    const d = stats.byDifficulty[diff];
    d.total++;
    if (r.result === "win") {
      d.wins++;
    } else if (r.result === "lose") {
      d.losses++;
      if (r.lossReason) {
        d.lossReasons[r.lossReason] = (d.lossReasons[r.lossReason] ?? 0) + 1;
      }
    } else {
      d.draws++;
    }

    const mode = r.mode ?? "unknown";
    if (!stats.byMode[mode]) {
      stats.byMode[mode] = { total: 0, wins: 0, losses: 0, draws: 0 };
    }
    const m = stats.byMode[mode];
    m.total++;
    if (r.result === "win") m.wins++;
    else if (r.result === "lose") m.losses++;
    else m.draws++;
  }
  return stats;
}
