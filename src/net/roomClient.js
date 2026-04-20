const STORAGE_KEY = "mancolor-room-client-key";
const HOST_OVERRIDE_STORAGE_KEY = "mancolor-room-host-override";
const DEFAULT_ROOM_SERVER_PORT = 8787;

function readHostOverrideFromQuery() {
  try {
    const params = new URLSearchParams(window.location.search);
    const host = (params.get("roomHost") || "").trim();
    if (!host) return null;
    window.localStorage.setItem(HOST_OVERRIDE_STORAGE_KEY, host);
    return host;
  } catch (_error) {
    return null;
  }
}

function readHostOverrideFromStorage() {
  try {
    const saved = (
      window.localStorage.getItem(HOST_OVERRIDE_STORAGE_KEY) || ""
    ).trim();
    return saved || null;
  } catch (_error) {
    return null;
  }
}

function resolveRoomServerHost() {
  const fromQuery = readHostOverrideFromQuery();
  if (fromQuery) return fromQuery;

  const fromEnv = (import.meta.env.VITE_ROOM_SERVER_HOST || "").trim();
  if (fromEnv) return fromEnv;

  const fromStorage = readHostOverrideFromStorage();
  if (fromStorage) return fromStorage;

  return window.location.hostname || "localhost";
}

function resolveRoomServerPort() {
  const rawPort = Number(import.meta.env.VITE_ROOM_SERVER_PORT);
  if (Number.isInteger(rawPort) && rawPort > 0) return rawPort;
  return DEFAULT_ROOM_SERVER_PORT;
}

function makeClientKey() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function getOrCreateClientKey() {
  const existing = window.localStorage.getItem(STORAGE_KEY);
  if (existing) return existing;
  const generated = makeClientKey();
  window.localStorage.setItem(STORAGE_KEY, generated);
  return generated;
}

class RoomClient {
  constructor() {
    this.ws = null;
    this.url = null;
    this.clientKey = getOrCreateClientKey();
    this.clientId = null;
    this.connected = false;
    this.manualClose = false;
    this.reconnectTimer = null;
    this.listeners = new Set();
    this.guaranteedQueue = [];
    this._pingTimer = null;
  }

  resolveUrl() {
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const host = resolveRoomServerHost();
    const port = resolveRoomServerPort();
    const encodedKey = encodeURIComponent(this.clientKey);
    return `${protocol}://${host}:${port}/?clientKey=${encodedKey}`;
  }

  connect() {
    if (
      this.ws &&
      (this.ws.readyState === WebSocket.OPEN ||
        this.ws.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    this.manualClose = false;
    this.url = this.resolveUrl();
    this.emit({ type: "client_connecting", url: this.url });

    try {
      this.ws = new WebSocket(this.url);
    } catch (error) {
      this.emit({ type: "client_error", message: "接続開始に失敗しました" });
      this.scheduleReconnect();
      return;
    }

    this.ws.addEventListener("open", () => {
      this.connected = true;
      this.flushGuaranteedQueue();
      this._startPing();
      this.emit({ type: "client_open" });
    });

    this.ws.addEventListener("close", () => {
      this.connected = false;
      this._stopPing();
      this.emit({ type: "client_close" });
      this.ws = null;
      if (!this.manualClose) {
        this.scheduleReconnect();
      }
    });

    this.ws.addEventListener("error", () => {
      this.emit({ type: "client_error", message: "接続エラー" });
    });

    this.ws.addEventListener("message", (event) => {
      this.handleRawMessage(event.data);
    });
  }

  disconnect() {
    this.manualClose = true;
    this._stopPing();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
  }

  _startPing() {
    this._stopPing();
    this._pingTimer = window.setInterval(() => {
      this.send({ type: "ping" });
    }, 25000);
  }

  _stopPing() {
    if (this._pingTimer) {
      clearInterval(this._pingTimer);
      this._pingTimer = null;
    }
  }

  scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 1200);
  }

  send(payload) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return false;
    }

    this.ws.send(JSON.stringify(payload));
    return true;
  }

  sendGuaranteed(payload) {
    if (this.send(payload)) {
      return true;
    }

    this.guaranteedQueue.push(payload);
    this.connect();
    return false;
  }

  flushGuaranteedQueue() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    if (this.guaranteedQueue.length === 0) return;

    const queued = [...this.guaranteedQueue];
    this.guaranteedQueue = [];
    queued.forEach((payload) => {
      this.send(payload);
    });
  }

  handleRawMessage(raw) {
    let message = null;
    try {
      message = JSON.parse(String(raw));
    } catch (_error) {
      this.emit({ type: "client_error", message: "不正なサーバーメッセージ" });
      return;
    }

    if (!message || typeof message.type !== "string") return;
    if (message.type === "welcome") {
      this.clientId = message.clientId;
    }
    this.emit(message);
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  emit(message) {
    this.listeners.forEach((listener) => {
      try {
        listener(message);
      } catch (err) {
        console.error("[RoomClient] listener error:", err);
      }
    });
  }
}

export const roomClient = new RoomClient();
