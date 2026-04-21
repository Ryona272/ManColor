import {
  getPlayerName,
  setPlayerName,
  getStoredUser,
  signInWithGoogle,
  signOut,
} from "../net/firebaseAuth.js";

const UI_FONT = '"Yu Gothic UI", "Hiragino Sans", sans-serif';
const DISPLAY_FONT = '"Yu Mincho", "Hiragino Mincho ProN", serif';

export class LobbyScene extends Phaser.Scene {
  constructor() {
    super({ key: "LobbyScene" });
    this.noticeText = null;
    this._playerNameText = null;
    this._authButtonText = null;
  }

  create() {
    const W = 1080;
    const H = 1920;

    this._drawBackground(W, H);

    this.add
      .text(W / 2, 210, "ManColor", {
        fontSize: "104px",
        color: "#f4deb1",
        fontFamily: DISPLAY_FONT,
        stroke: "#1a130c",
        strokeThickness: 7,
      })
      .setOrigin(0.5);

    this.add
      .text(W / 2, 300, "対戦モードを選んでください", {
        fontSize: "34px",
        color: "#e6decf",
        fontFamily: UI_FONT,
      })
      .setOrigin(0.5);

    this._createModeButton({
      x: W / 2,
      y: 640,
      title: "ソロで遊ぶ",
      sub: "AIと対戦",
      fill: 0x2f6652,
      onClick: () => {
        this._showDifficultyPanel();
      },
    });

    this._createModeButton({
      x: W / 2,
      y: 900,
      title: "友達と遊ぶ",
      sub: "ルームコードで合流",
      fill: 0x2e4f7a,
      onClick: () => this.scene.start("FriendLobbyScene"),
    });

    this._createModeButton({
      x: W / 2,
      y: 1160,
      title: "ランダム対戦",
      sub: "オンラインで自動マッチ",
      fill: 0x7a3f45,
      onClick: () => this.scene.start("RandomLobbyScene"),
    });

    this.noticeText = this.add
      .text(W / 2, 1490, "まずはソロで遊べます", {
        fontSize: "30px",
        color: "#b8c8de",
        fontFamily: UI_FONT,
      })
      .setOrigin(0.5)
      .setAlpha(0.95);

    this._createPlayerPanel(W, H);
  }

  _drawBackground(W, H) {
    const g = this.add.graphics();
    g.fillGradientStyle(0x131e2d, 0x131e2d, 0x251b23, 0x251b23, 1);
    g.fillRect(0, 0, W, H);

    g.fillStyle(0xf0d39a, 0.08);
    g.fillCircle(W * 0.8, H * 0.18, 250);
    g.fillStyle(0x7cb0d9, 0.08);
    g.fillCircle(W * 0.2, H * 0.82, 280);

    g.lineStyle(2, 0xe5d5b1, 0.2);
    g.strokeRoundedRect(34, 34, W - 68, H - 68, 26);
  }

  _createModeButton({ x, y, title, sub, fill, onClick }) {
    const container = this.add.container(x, y);

    const panel = this.add.graphics();
    panel.fillStyle(fill, 0.9);
    panel.lineStyle(3, 0xf2dfbe, 0.7);
    panel.fillRoundedRect(-360, -90, 720, 180, 24);
    panel.strokeRoundedRect(-360, -90, 720, 180, 24);
    container.add(panel);

    const titleText = this.add
      .text(0, -18, title, {
        fontSize: "58px",
        color: "#fff8e6",
        fontFamily: DISPLAY_FONT,
      })
      .setOrigin(0.5);
    container.add(titleText);

    const subText = this.add
      .text(0, 42, sub, {
        fontSize: "28px",
        color: "#d7e2f1",
        fontFamily: UI_FONT,
      })
      .setOrigin(0.5);
    container.add(subText);

    const hitArea = this.add.zone(x, y, 720, 180).setInteractive();
    hitArea.on("pointerover", () => {
      this.tweens.add({
        targets: container,
        scaleX: 1.02,
        scaleY: 1.02,
        duration: 120,
        ease: "Sine.Out",
      });
    });
    hitArea.on("pointerout", () => {
      this.tweens.add({
        targets: container,
        scaleX: 1,
        scaleY: 1,
        duration: 120,
        ease: "Sine.Out",
      });
    });
    hitArea.on("pointerdown", onClick);
  }

  _showDifficultyPanel() {
    const W = 1080;
    const H = 1920;
    const objs = [];

    const overlay = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.72);
    overlay.setInteractive();
    objs.push(overlay);

    const panelG = this.add.graphics();
    panelG.fillStyle(0x1a2535, 0.97);
    panelG.lineStyle(2, 0xe5d5b1, 0.55);
    panelG.fillRoundedRect(W / 2 - 360, 520, 720, 1260, 30);
    panelG.strokeRoundedRect(W / 2 - 360, 520, 720, 1260, 30);
    objs.push(panelG);

    const titleT = this.add
      .text(W / 2, 610, "AIの強さを選んでください", {
        fontSize: "36px",
        color: "#e6decf",
        fontFamily: UI_FONT,
      })
      .setOrigin(0.5);
    objs.push(titleT);

    const items = [
      {
        y: 760,
        label: "弱い",
        sub: "のんびり楽しめます",
        fill: 0x3a6e4a,
        diff: "easy",
      },
      {
        y: 950,
        label: "普通",
        sub: "バランスのよい相手",
        fill: 0x2e4f7a,
        diff: "normal",
      },
      {
        y: 1140,
        label: "強い",
        sub: "手強い相手に挑戦！",
        fill: 0x7a3f45,
        diff: "hard",
      },
      {
        y: 1330,
        label: "鬼 - 先手",
        sub: "鬼に先手で挑む",
        fill: 0x2a1a2e,
        diff: "oni-sente",
      },
      {
        y: 1520,
        label: "鬼 - 後手",
        sub: "鬼に後手で挑む",
        fill: 0x2a1a2e,
        diff: "oni-gote",
      },
    ];

    const cleanup = () => objs.forEach((o) => o.destroy());

    for (const item of items) {
      const g = this.add.graphics();
      g.fillStyle(item.fill, 0.9);
      g.lineStyle(2, 0xf2dfbe, 0.65);
      g.fillRoundedRect(W / 2 - 310, item.y - 80, 620, 165, 22);
      g.strokeRoundedRect(W / 2 - 310, item.y - 80, 620, 165, 22);
      objs.push(g);

      const t1 = this.add
        .text(W / 2, item.y - 16, item.label, {
          fontSize: "60px",
          color: "#fff8e6",
          fontFamily: DISPLAY_FONT,
        })
        .setOrigin(0.5);
      objs.push(t1);

      const t2 = this.add
        .text(W / 2, item.y + 44, item.sub, {
          fontSize: "28px",
          color: "#d7e2f1",
          fontFamily: UI_FONT,
        })
        .setOrigin(0.5);
      objs.push(t2);

      const zone = this.add.zone(W / 2, item.y + 2, 620, 165).setInteractive();
      zone.on("pointerdown", () => {
        cleanup();
        this.scene.start("GameScene", {
          mode: "solo",
          aiDifficulty: item.diff,
        });
      });
      objs.push(zone);
    }

    const cancelT = this.add
      .text(W / 2, 1700, "キャンセル", {
        fontSize: "30px",
        color: "#8899bb",
        fontFamily: UI_FONT,
      })
      .setOrigin(0.5)
      .setInteractive();
    cancelT.on("pointerdown", cleanup);
    objs.push(cancelT);
  }

  _showNotice(message) {
    if (!this.noticeText) return;
    this.noticeText.setText(message);
    this.noticeText.setAlpha(1);

    this.tweens.killTweensOf(this.noticeText);
    this.tweens.add({
      targets: this.noticeText,
      alpha: 0.55,
      duration: 1400,
      ease: "Sine.Out",
    });
  }

  _createPlayerPanel(W, H) {
    const panelY = 1650;
    const panelH = 220;

    // パネル背景
    const g = this.add.graphics();
    g.fillStyle(0x1a2030, 0.85);
    g.lineStyle(2, 0xe5d5b1, 0.3);
    g.fillRoundedRect(W / 2 - 460, panelY, 920, panelH, 20);
    g.strokeRoundedRect(W / 2 - 460, panelY, 920, panelH, 20);

    // アバター円
    const avatarG = this.add.graphics();
    avatarG.fillStyle(0x2e4f7a, 1);
    avatarG.fillCircle(W / 2 - 360, panelY + panelH / 2, 52);
    this.add
      .text(W / 2 - 360, panelY + panelH / 2, "👤", {
        fontSize: "48px",
      })
      .setOrigin(0.5);

    // プレイヤー名
    this._playerNameText = this.add
      .text(W / 2 - 280, panelY + 58, getPlayerName(), {
        fontSize: "46px",
        color: "#f4deb1",
        fontFamily: DISPLAY_FONT,
      })
      .setOrigin(0, 0.5);

    // 「✎ 名前を変更」ボタン
    const editBtn = this.add
      .text(W / 2 - 280, panelY + 122, "✎ 名前を変更", {
        fontSize: "34px",
        color: "#88aacc",
        fontFamily: UI_FONT,
      })
      .setOrigin(0, 0.5)
      .setInteractive({ useHandCursor: true });
    editBtn.on("pointerover", () => editBtn.setColor("#aaccee"));
    editBtn.on("pointerout", () => editBtn.setColor("#88aacc"));
    editBtn.on("pointerdown", () => this._showNameEditDialog());

    // Google ログイン / ログアウトボタン
    const isSignedIn = !!getStoredUser();
    this._authButtonText = this.add
      .text(
        W / 2 + 370,
        panelY + panelH / 2,
        isSignedIn ? "ログアウト" : "Googleでログイン",
        {
          fontSize: "26px",
          color: isSignedIn ? "#cc8888" : "#88ccaa",
          fontFamily: UI_FONT,
        },
      )
      .setOrigin(1, 0.5)
      .setInteractive({ useHandCursor: true });

    this._authButtonText.on("pointerdown", () => this._handleAuthButton());
  }

  _refreshPlayerPanel() {
    if (this._playerNameText) {
      this._playerNameText.setText(getPlayerName());
    }
    if (this._authButtonText) {
      const isSignedIn = !!getStoredUser();
      this._authButtonText.setText(
        isSignedIn ? "ログアウト" : "Googleでログイン",
      );
      this._authButtonText.setColor(isSignedIn ? "#cc8888" : "#88ccaa");
    }
  }

  async _handleAuthButton() {
    if (getStoredUser()) {
      // ログアウト
      await signOut();
      this._showNotice("ログアウトしました");
      this._refreshPlayerPanel();
    } else {
      // Google ログイン
      try {
        this._authButtonText?.setText("ログイン中...");
        const user = await signInWithGoogle();
        this._showNotice(
          `ようこそ、${user.displayName || getPlayerName()} さん！`,
        );
        this._refreshPlayerPanel();
      } catch (e) {
        this._authButtonText?.setText("Googleでログイン");
        this._showNotice(e.message || "ログインに失敗しました");
      }
    }
  }

  _showNameEditDialog() {
    const W = 1080;
    const H = 1920;
    const objs = [];

    const overlay = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.72);
    overlay.setInteractive();
    objs.push(overlay);

    const panelG = this.add.graphics();
    panelG.fillStyle(0x1a2535, 0.98);
    panelG.lineStyle(2, 0xe5d5b1, 0.5);
    panelG.fillRoundedRect(W / 2 - 380, 740, 760, 440, 24);
    panelG.strokeRoundedRect(W / 2 - 380, 740, 760, 440, 24);
    objs.push(panelG);

    objs.push(
      this.add
        .text(W / 2, 820, "プレイヤー名を変更", {
          fontSize: "38px",
          color: "#e6decf",
          fontFamily: UI_FONT,
        })
        .setOrigin(0.5),
    );

    // 入力欄（DOM input）
    const inputEl = document.createElement("input");
    inputEl.type = "text";
    inputEl.maxLength = 20;
    inputEl.value = getPlayerName();
    inputEl.style.cssText = [
      "position:fixed",
      "left:50%",
      "top:54%",
      "transform:translate(-50%,-50%)",
      "width:460px",
      "padding:14px 18px",
      "font-size:28px",
      "font-family:Yu Gothic UI,sans-serif",
      "background:#0e1520",
      "color:#f4deb1",
      "border:2px solid #e5d5b1",
      "border-radius:10px",
      "outline:none",
      "z-index:9999",
      "text-align:center",
    ].join(";");
    document.body.appendChild(inputEl);
    inputEl.focus();
    inputEl.select();

    const cleanup = () => {
      document.body.removeChild(inputEl);
      objs.forEach((o) => o.destroy());
    };

    // 確定ボタン
    const confirmG = this.add.graphics();
    confirmG.fillStyle(0x2e6652, 0.9);
    confirmG.lineStyle(2, 0xf2dfbe, 0.7);
    confirmG.fillRoundedRect(W / 2 - 200, 1020, 400, 90, 16);
    confirmG.strokeRoundedRect(W / 2 - 200, 1020, 400, 90, 16);
    objs.push(confirmG);

    const confirmT = this.add
      .text(W / 2, 1065, "決定", {
        fontSize: "40px",
        color: "#fff8e6",
        fontFamily: DISPLAY_FONT,
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    objs.push(confirmT);

    const confirm = () => {
      const newName = inputEl.value.trim().slice(0, 20);
      if (newName) {
        setPlayerName(newName);
        this._refreshPlayerPanel();
        this._showNotice(`名前を「${newName}」に変更しました`);
      }
      cleanup();
    };

    confirmT.on("pointerdown", confirm);
    inputEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter") confirm();
      if (e.key === "Escape") cleanup();
    });

    objs.push(
      this.add
        .text(W / 2, 1150, "キャンセル", {
          fontSize: "28px",
          color: "#8899bb",
          fontFamily: UI_FONT,
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on("pointerdown", cleanup),
    );
  }
}
