/**
 * ソロモード用 プレイヤー操作ログ送信ユーティリティ
 * サーバーの POST /logs へ fire-and-forget で送信する。
 * 失敗は無視する（ゲームプレイに影響を与えない）。
 */

function resolveLogServerUrl() {
  try {
    // roomClient.js と同じロジックでサーバーを探す
    const params = new URLSearchParams(window.location.search);
    const fromQuery = (params.get("roomHost") || "").trim();
    if (fromQuery) return buildUrl(fromQuery);

    const fromEnv = (import.meta.env.VITE_ROOM_SERVER_HOST || "").trim();
    if (fromEnv) return buildUrl(fromEnv);

    const fromStorage = (
      window.localStorage.getItem("mancolor-room-host-override") || ""
    ).trim();
    if (fromStorage) return buildUrl(fromStorage);

    const host = window.location.hostname || "localhost";
    return buildUrl(host);
  } catch (_e) {
    return null;
  }
}

function buildUrl(host) {
  // 本番Renderドメインなら HTTPS/443、ローカルならポート指定
  if (
    host.includes(".onrender.com") ||
    (host.includes(".") &&
      !host.startsWith("localhost") &&
      !host.startsWith("127."))
  ) {
    return `https://${host}/logs`;
  }
  const port = Number(import.meta.env.VITE_ROOM_SERVER_PORT) || 8787;
  return `http://${host}:${port}/logs`;
}

/**
 * ソロモードのプレイヤー操作を1件サーバーへ送る。
 * @param {string} type - "move" | "special_choice" | "kutakuta_choice" | "poipoi_stone" | "final_prediction"
 * @param {object} detail - 追加フィールド (pit, action, color, difficulty, storeIndex, stoneIndex など)
 */
export function logSoloAction(type, detail = {}) {
  const url = resolveLogServerUrl();
  if (!url) return;

  const entry = {
    ts: Date.now(),
    mode: "solo",
    role: "self",
    type,
    ...detail,
  };

  // fire-and-forget: エラーは完全に無視
  try {
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry),
      // keepalive: ページ遷移時も送れるように
      keepalive: true,
    }).catch(() => {});
  } catch (_e) {}
}
