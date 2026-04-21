import { roomClient } from "../net/roomClient.js";
import { getPlayerName } from "../net/firebaseAuth.js";

const UI_FONT = '"Yu Gothic UI", "Hiragino Sans", sans-serif';
const DISPLAY_FONT = '"Yu Mincho", "Hiragino Mincho ProN", serif';

export class RandomLobbyScene extends Phaser.Scene {
  constructor() {
    super({ key: "RandomLobbyScene" });
    this.unsubscribe = null;
    this.statusText = null;
    this.dotTimer = null;
    this.dotCount = 0;
    this.connectionState = "connecting";
    this.matchmaking = false;
    this.spinAngle = 0;
    this.spinGraphics = null;
    this.spinTween = null;
    this.spinColor = 0xff3333;
  }

  create() {
    const W = 1080;
    const H = 1920;

    this._drawBackground(W, H);

    this.add
      .text(W / 2, 210, "ランダム対戦", {
        fontSize: "96px",
        color: "#f4deb1",
        fontFamily: DISPLAY_FONT,
        stroke: "#1a130c",
        strokeThickness: 7,
      })
      .setOrigin(0.5);

    this.add
      .text(W / 2, 300, "対戦相手をさがしています", {
        fontSize: "32px",
        color: "#ced9ea",
        fontFamily: UI_FONT,
      })
      .setOrigin(0.5);

    this._setConnectionState("connecting");

    // Spinning wait animation
    this._drawSpinner(W, H);

    // Status text (マッチング中... / 接続中... etc.)
    this.statusText = this.add
      .text(W / 2, H / 2 + 220, "接続中...", {
        fontSize: "40px",
        color: "#c8d7f1",
        fontFamily: UI_FONT,
      })
      .setOrigin(0.5);

    // Waiting player count hint
    this.hintText = this.add
      .text(W / 2, H / 2 + 310, "", {
        fontSize: "28px",
        color: "#8da7c7",
        fontFamily: UI_FONT,
      })
      .setOrigin(0.5);

    // Cancel button
    this._createCancelButton(W, H);

    // Subscribe and connect
    this.unsubscribe = roomClient.subscribe((msg) => this._handleMessage(msg));
    roomClient.connect();

    // roomClient がすでに接続済みの場合は client_open が発火しないため直接マッチングリクエストを送る
    if (roomClient.connected) {
      this._setConnectionState("connected");
      roomClient.send({
        type: "join_matchmaking",
        playerName: getPlayerName(),
      });
      this._refreshStatusText();
    }

    this.events.once("shutdown", () => {
      this._cleanup();
    });
    this.events.once("destroy", () => {
      this._cleanup();
    });

    // Dot animation
    this.dotTimer = this.time.addEvent({
      delay: 400,
      loop: true,
      callback: () => {
        this.dotCount = (this.dotCount + 1) % 4;
        this._refreshStatusText();
      },
    });
  }

  _drawBackground(W, H) {
    const g = this.add.graphics();
    g.fillGradientStyle(0x14121e, 0x14121e, 0x1e1428, 0x1e1428, 1);
    g.fillRect(0, 0, W, H);
    g.fillStyle(0xd09af0, 0.07);
    g.fillCircle(W * 0.75, H * 0.18, 240);
    g.fillStyle(0x8a6fe0, 0.07);
    g.fillCircle(W * 0.22, H * 0.82, 270);
    g.lineStyle(2, 0xd9ccff, 0.18);
    g.strokeRoundedRect(34, 34, W - 68, H - 68, 26);
  }

  _drawSpinner(W, H) {
    const cx = W / 2;
    const cy = H / 2 - 30;
    const r = 120;

    // Track circle (faded)
    const track = this.add.graphics();
    track.lineStyle(10, 0x3a3050, 1);
    track.strokeCircle(cx, cy, r);

    // Spinner arc (rotating)
    this.spinGraphics = this.add.graphics();
    this._drawSpinnerArc(0);

    this.spinTween = this.tweens.addCounter({
      from: 0,
      to: 360,
      duration: 1200,
      repeat: -1,
      ease: "Linear",
      onUpdate: (tween) => {
        this.spinAngle = tween.getValue();
        this._drawSpinnerArc(this.spinAngle);
      },
    });
  }

  _drawSpinnerArc(angleDeg) {
    const g = this.spinGraphics;
    if (!g) return;
    const W = 1080;
    const H = 1920;
    const cx = W / 2;
    const cy = H / 2 - 30;
    const r = 120;
    g.clear();
    g.lineStyle(10, this.spinColor, 1);
    const startRad = Phaser.Math.DegToRad(angleDeg - 90);
    const endRad = Phaser.Math.DegToRad(angleDeg + 220);
    g.beginPath();
    g.arc(cx, cy, r, startRad, endRad, false);
    g.strokePath();
  }

  _setConnectionState(state) {
    this.connectionState = state;
    // 接続中・再接続中・エラーは赤、接続済みはマッチング色（紫）
    if (
      state === "connecting" ||
      state === "reconnecting" ||
      state === "error"
    ) {
      this.spinColor = 0xff3333;
    } else {
      this.spinColor = 0xb07fff;
    }
    // 現在の角度で再描画して色を即時反映
    this._drawSpinnerArc(this.spinAngle);
  }

  _refreshStatusText() {
    if (!this.statusText) return;
    const dots = ".".repeat(this.dotCount);
    if (!this.matchmaking) {
      if (
        this.connectionState === "connecting" ||
        this.connectionState === "reconnecting"
      ) {
        this.statusText.setText(`接続中${dots}`);
      } else if (this.connectionState === "error") {
        this.statusText.setText("接続できませんでした");
      } else {
        this.statusText.setText(`マッチング準備中${dots}`);
      }
    } else {
      this.statusText.setText(`対戦相手をさがしています${dots}`);
    }
  }

  _createCancelButton(W, H) {
    const btn = this.add
      .text(W / 2, H - 260, "キャンセル", {
        fontSize: "40px",
        color: "#f8fbff",
        backgroundColor: "#4a3060",
        padding: { x: 40, y: 16 },
        fontFamily: UI_FONT,
      })
      .setOrigin(0.5)
      .setInteractive();

    btn.on("pointerdown", () => this._cancel());
    btn.on("pointerover", () => {
      this.tweens.add({
        targets: btn,
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 110,
        ease: "Sine.Out",
      });
    });
    btn.on("pointerout", () => {
      this.tweens.add({
        targets: btn,
        scaleX: 1,
        scaleY: 1,
        duration: 110,
        ease: "Sine.Out",
      });
    });
  }

  _handleMessage(msg) {
    if (!msg || typeof msg.type !== "string") return;

    if (msg.type === "client_connecting") {
      this._setConnectionState("connecting");
      this.matchmaking = false;
      this._refreshStatusText();
      return;
    }

    if (msg.type === "client_open") {
      this._setConnectionState("connected");
      // Send matchmaking request now that we are connected
      roomClient.send({
        type: "join_matchmaking",
        playerName: getPlayerName(),
      });
      this._refreshStatusText();
      return;
    }

    if (msg.type === "client_close") {
      this._setConnectionState("reconnecting");
      this.matchmaking = false;
      this._refreshStatusText();
      return;
    }

    if (msg.type === "client_error") {
      this._setConnectionState("error");
      this.matchmaking = false;
      this._refreshStatusText();
      return;
    }

    if (msg.type === "matchmaking_waiting") {
      this.matchmaking = true;
      this._refreshStatusText();
      return;
    }

    if (msg.type === "matchmaking_left") {
      this.matchmaking = false;
      return;
    }

    if (msg.type === "match_start") {
      this._cleanup();
      this._showMatchFoundOverlay(msg);
      return;
    }

    if (msg.type === "error") {
      if (this.statusText) {
        this.statusText.setText(msg.message || "エラーが発生しました");
      }
    }
  }

  _cancel() {
    roomClient.send({ type: "leave_matchmaking" });
    this._cleanup();
    this.scene.start("LobbyScene");
  }

  _cleanup() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    if (this.dotTimer) {
      this.dotTimer.remove();
      this.dotTimer = null;
    }
    if (this.spinTween) {
      this.spinTween.stop();
      this.spinTween = null;
    }
  }

  _showMatchFoundOverlay(data) {
    const W = 1080;
    const H = 1920;
    const selfName = data.playerName || "あなた";
    const oppName = data.oppPlayerName || "相手";

    const container = this.add.container(0, 0).setDepth(9999);

    // 暗転背景
    const dim = this.add.graphics();
    dim.fillStyle(0x000000, 0.87);
    dim.fillRect(0, 0, W, H);
    container.add(dim);

    // カード
    const cardBg = this.add.graphics();
    cardBg.fillStyle(0x0e1829, 0.97);
    cardBg.lineStyle(4, 0xf0c36a, 0.92);
    cardBg.fillRoundedRect(W / 2 - 450, H / 2 - 300, 900, 560, 28);
    cardBg.strokeRoundedRect(W / 2 - 450, H / 2 - 300, 900, 560, 28);
    container.add(cardBg);

    // タイトル
    const title = this.add
      .text(W / 2, H / 2 - 210, "マッチ成立！", {
        fontSize: "88px",
        color: "#f0c36a",
        fontFamily: DISPLAY_FONT,
        stroke: "#2a1a00",
        strokeThickness: 10,
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setScale(0.6);
    container.add(title);

    // 区切り線
    const divider = this.add.graphics();
    divider.lineStyle(2, 0xf0c36a, 0.4);
    divider.lineBetween(W / 2 - 380, H / 2 - 100, W / 2 + 380, H / 2 - 100);
    divider.setAlpha(0);
    container.add(divider);

    // 自分ラベル
    const selfLabel = this.add
      .text(W / 2 - 220, H / 2 - 50, "あなた", {
        fontSize: "24px",
        color: "#9fd6ff",
        fontFamily: UI_FONT,
      })
      .setOrigin(0.5, 1)
      .setAlpha(0);
    container.add(selfLabel);

    // 自分の名前
    const selfText = this.add
      .text(W / 2 - 220, H / 2 - 46, selfName, {
        fontSize: "46px",
        color: "#c8e8ff",
        fontFamily: UI_FONT,
        stroke: "#000000",
        strokeThickness: 5,
      })
      .setOrigin(0.5, 0)
      .setAlpha(0);
    selfText.setX(W / 2 - 380);
    container.add(selfText);

    // VS
    const vsText = this.add
      .text(W / 2, H / 2 + 40, "VS", {
        fontSize: "80px",
        color: "#ffffff",
        fontFamily: DISPLAY_FONT,
        stroke: "#333333",
        strokeThickness: 8,
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setScale(0.5);
    container.add(vsText);

    // 相手ラベル
    const oppLabel = this.add
      .text(W / 2 + 220, H / 2 - 50, "相手", {
        fontSize: "24px",
        color: "#ffa0a0",
        fontFamily: UI_FONT,
      })
      .setOrigin(0.5, 1)
      .setAlpha(0);
    container.add(oppLabel);

    // 相手の名前
    const oppText = this.add
      .text(W / 2 + 220, H / 2 - 46, oppName, {
        fontSize: "46px",
        color: "#ffc8c8",
        fontFamily: UI_FONT,
        stroke: "#000000",
        strokeThickness: 5,
      })
      .setOrigin(0.5, 0)
      .setAlpha(0);
    oppText.setX(W / 2 + 380);
    container.add(oppText);

    // ヒント
    const hint = this.add
      .text(W / 2, H / 2 + 190, "ゲームを開始します...", {
        fontSize: "30px",
        color: "#8aabbf",
        fontFamily: UI_FONT,
      })
      .setOrigin(0.5)
      .setAlpha(0);
    container.add(hint);

    // アニメーション: タイトル pop in
    this.tweens.add({
      targets: title,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      duration: 380,
      ease: "Back.Out",
    });

    // 区切り線フェードイン
    this.tweens.add({
      targets: divider,
      alpha: 1,
      duration: 300,
      delay: 250,
      ease: "Sine.Out",
    });

    // VS pop in
    this.tweens.add({
      targets: vsText,
      alpha: 1,
      scaleX: 1.1,
      scaleY: 1.1,
      duration: 380,
      delay: 300,
      ease: "Back.Out",
      onComplete: () => {
        this.tweens.add({
          targets: vsText,
          scaleX: 1,
          scaleY: 1,
          duration: 200,
          ease: "Sine.Out",
        });
      },
    });

    // 自分名: 左からスライドイン
    this.tweens.add({
      targets: [selfLabel, selfText],
      alpha: 1,
      duration: 360,
      delay: 380,
      ease: "Sine.Out",
    });
    this.tweens.add({
      targets: selfText,
      x: W / 2 - 220,
      duration: 380,
      delay: 380,
      ease: "Sine.Out",
    });

    // 相手名: 右からスライドイン
    this.tweens.add({
      targets: [oppLabel, oppText],
      alpha: 1,
      duration: 360,
      delay: 380,
      ease: "Sine.Out",
    });
    this.tweens.add({
      targets: oppText,
      x: W / 2 + 220,
      duration: 380,
      delay: 380,
      ease: "Sine.Out",
    });

    // ヒント: 遅延フェードイン
    this.tweens.add({
      targets: hint,
      alpha: 0.85,
      duration: 400,
      delay: 1500,
      ease: "Sine.Out",
    });

    // 一定時間後: フェードアウト → GameScene
    this.time.delayedCall(2600, () => {
      this.tweens.add({
        targets: container,
        alpha: 0,
        duration: 300,
        ease: "Sine.In",
        onComplete: () => {
          this.scene.start("GameScene", {
            mode: "online-room",
            roomCode: data.roomCode,
            side: data.role,
            playerName: data.playerName,
            oppPlayerName: data.oppPlayerName,
          });
        },
      });
    });
  }
}
