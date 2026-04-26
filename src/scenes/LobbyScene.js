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

    // タイトル装飾ライン
    {
      const dg = this.add.graphics();
      dg.lineStyle(1.5, 0xf0d39a, 0.5);
      dg.beginPath();
      dg.moveTo(W / 2 - 220, 348);
      dg.lineTo(W / 2 + 220, 348);
      dg.strokePath();
      dg.lineStyle(1, 0xf0d39a, 0.18);
      dg.beginPath();
      dg.moveTo(W / 2 - 380, 348);
      dg.lineTo(W / 2 - 220, 348);
      dg.strokePath();
      dg.beginPath();
      dg.moveTo(W / 2 + 220, 348);
      dg.lineTo(W / 2 + 380, 348);
      dg.strokePath();
      dg.fillStyle(0xf0d39a, 0.7);
      dg.fillCircle(W / 2 - 220, 348, 3.5);
      dg.fillCircle(W / 2 + 220, 348, 3.5);
      dg.fillStyle(0xf0d39a, 0.45);
      dg.fillCircle(W / 2, 348, 4.5);
      dg.fillCircle(W / 2 - 110, 348, 2.5);
      dg.fillCircle(W / 2 + 110, 348, 2.5);
    }

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
    // ベースグラデーション（より暗く深く）
    g.fillGradientStyle(0x080d18, 0x0c1022, 0x160b1a, 0x10060f, 1);
    g.fillRect(0, 0, W, H);

    // 斜めテクスチャライン（薄い）
    g.lineStyle(1, 0xffffff, 0.022);
    for (let i = -4; i < 16; i++) {
      g.beginPath();
      g.moveTo(i * 150, 0);
      g.lineTo(i * 150 + H * 0.55, H);
      g.strokePath();
    }

    // グロー球（ゴールド、右上）
    g.fillStyle(0xf0d39a, 0.07);
    g.fillCircle(W * 0.88, H * 0.1, 360);
    g.fillStyle(0xf0d39a, 0.03);
    g.fillCircle(W * 0.88, H * 0.1, 580);
    // グロー球（ブルー、左下）
    g.fillStyle(0x55aadd, 0.07);
    g.fillCircle(W * 0.12, H * 0.9, 360);
    g.fillStyle(0x55aadd, 0.03);
    g.fillCircle(W * 0.12, H * 0.9, 560);
    // グロー球（パープル、中央）
    g.fillStyle(0x7733aa, 0.04);
    g.fillCircle(W * 0.5, H * 0.5, 480);

    // ゾーン区切り水平線
    g.lineStyle(1, 0xe5d5b1, 0.07);
    [H * 0.36, H * 0.62, H * 0.8].forEach((ly) => {
      g.beginPath();
      g.moveTo(80, ly);
      g.lineTo(W - 80, ly);
      g.strokePath();
    });

    // 外枠（二重）
    g.lineStyle(1.5, 0xe5d5b1, 0.35);
    g.strokeRoundedRect(30, 30, W - 60, H - 60, 28);
    g.lineStyle(1, 0xe5d5b1, 0.1);
    g.strokeRoundedRect(44, 44, W - 88, H - 88, 22);

    // 4コーナーLブラケット装飾
    const cLen = 55;
    g.lineStyle(2.5, 0xf0d39a, 0.45);
    g.beginPath();
    g.moveTo(30, 30 + cLen);
    g.lineTo(30, 30);
    g.lineTo(30 + cLen, 30);
    g.strokePath();
    g.beginPath();
    g.moveTo(W - 30 - cLen, 30);
    g.lineTo(W - 30, 30);
    g.lineTo(W - 30, 30 + cLen);
    g.strokePath();
    g.beginPath();
    g.moveTo(30, H - 30 - cLen);
    g.lineTo(30, H - 30);
    g.lineTo(30 + cLen, H - 30);
    g.strokePath();
    g.beginPath();
    g.moveTo(W - 30 - cLen, H - 30);
    g.lineTo(W - 30, H - 30);
    g.lineTo(W - 30, H - 30 - cLen);
    g.strokePath();
  }

  _createModeButton({ x, y, title, sub, fill, onClick }) {
    const container = this.add.container(x, y);
    const bw = 720,
      bh = 180,
      r = 18;
    const hw = bw / 2,
      hh = bh / 2;

    const panel = this.add.graphics();
    // 暗いベース
    panel.fillStyle(0x07080f, 1);
    panel.fillRoundedRect(-hw, -hh, bw, bh, r);
    // カラーオーバーレイ
    panel.fillStyle(fill, 0.3);
    panel.fillRoundedRect(-hw, -hh, bw, bh, r);
    // 上部ハイライト
    panel.fillStyle(0xffffff, 0.055);
    panel.fillRoundedRect(-hw + 4, -hh + 4, bw - 8, 70, 13);
    // 左アクセントバー
    panel.fillStyle(fill, 1);
    panel.fillRoundedRect(-hw, -hh, 12, bh, { tl: r, tr: 0, bl: r, br: 0 });
    // 右下コーナー三角
    panel.fillStyle(fill, 0.3);
    panel.fillTriangle(hw, hh - 44, hw, hh, hw - 44, hh);
    // アウターグロー
    panel.lineStyle(8, fill, 0.16);
    panel.strokeRoundedRect(-hw - 4, -hh - 4, bw + 8, bh + 8, r + 3);
    // メイン枠
    panel.lineStyle(1.5, 0xe5d5b1, 0.45);
    panel.strokeRoundedRect(-hw, -hh, bw, bh, r);
    // 内側カラー細枠
    panel.lineStyle(1, fill, 0.28);
    panel.strokeRoundedRect(-hw + 5, -hh + 5, bw - 10, bh - 10, 13);
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
    panelG.fillRoundedRect(W / 2 - 360, 330, 720, 1260, 30);
    panelG.strokeRoundedRect(W / 2 - 360, 330, 720, 1260, 30);
    objs.push(panelG);

    const titleT = this.add
      .text(W / 2, 420, "AIの強さを選んでください", {
        fontSize: "36px",
        color: "#e6decf",
        fontFamily: UI_FONT,
      })
      .setOrigin(0.5);
    objs.push(titleT);

    const items = [
      {
        y: 570,
        label: "小鬼",
        sub: "初戦にぴったりな相手",
        labelColor: "#c8ffe0",
        subColor: "#88ccaa",
        diff: "kooni",
      },
      {
        y: 760,
        label: "夜叉",
        sub: "実力を見せつけよう",
        labelColor: "#c8e8ff",
        subColor: "#88aabb",
        diff: "yasha",
      },
      {
        y: 950,
        label: "羅刹",
        sub: "手加減無用！全力で！",
        labelColor: "#ffe0e0",
        labelStroke: "#3a0008",
        subColor: "#c07080",
        diff: "rasetsu",
      },
      {
        y: 1140,
        label: "鬼神",
        sub: "武の権化… 倒せる？",
        labelColor: "#f0d8f8",
        labelStroke: "#1a0030",
        subColor: "#a060cc",
        diff: "kisin",
        cx: W / 2 - 157,
        bw: 305,
      },
      {
        y: 1140,
        label: "九尾",
        sub: "知の権化… 倒せる？",
        labelColor: "#3a1a00",
        labelStroke: "#ffe090",
        subColor: "#a07820",
        diff: "kyubi",
        cx: W / 2 + 157,
        bw: 305,
      },
      {
        y: 1330,
        label: "傀儡",
        sub: "成長する操り人形",
        labelColor: "#ffffff",
        labelStroke: "#cc0000",
        subColor: "#ff6666",
        diff: "kugutsu",
      },
    ];

    const cleanup = () => objs.forEach((o) => o.destroy());

    for (const item of items) {
      const cx = item.cx ?? W / 2;
      const bw = item.bw ?? 620;
      const rx = cx - bw / 2;

      const iy = item.y - 80;
      const g = this.add.graphics();

      if (item.diff === "kooni") {
        // 小鬼: 深樹緑 + 若葉アクセント
        g.fillStyle(0x0e2a1c, 1);
        g.fillRoundedRect(rx, iy, bw, 165, 22);
        g.fillStyle(0x2a5a38, 0.5);
        g.fillRoundedRect(rx + 4, iy + 4, bw - 8, 60, 18);
        g.lineStyle(5, 0x44aa66, 0.18);
        g.strokeRoundedRect(rx - 3, iy - 3, bw + 6, 171, 25);
        g.lineStyle(2, 0x44aa66, 0.85);
        g.strokeRoundedRect(rx, iy, bw, 165, 22);
        g.lineStyle(1, 0x66cc88, 0.3);
        g.strokeRoundedRect(rx + 4, iy + 4, bw - 8, 157, 18);
      } else if (item.diff === "yasha") {
        // 夜叉: ネイビー + スカイブルーアクセント
        g.fillStyle(0x081830, 1);
        g.fillRoundedRect(rx, iy, bw, 165, 22);
        g.fillStyle(0x1a3d5e, 0.55);
        g.fillRoundedRect(rx + 4, iy + 4, bw - 8, 60, 18);
        g.lineStyle(5, 0x4499cc, 0.18);
        g.strokeRoundedRect(rx - 3, iy - 3, bw + 6, 171, 25);
        g.lineStyle(2, 0x4499cc, 0.85);
        g.strokeRoundedRect(rx, iy, bw, 165, 22);
        g.lineStyle(1, 0x66bbdd, 0.3);
        g.strokeRoundedRect(rx + 4, iy + 4, bw - 8, 157, 18);
      } else if (item.diff === "rasetsu") {
        // 羅刹: 深紅 — 夜叉と同構造（赤）
        g.fillStyle(0x300808, 1);
        g.fillRoundedRect(rx, iy, bw, 165, 22);
        g.fillStyle(0x5a1520, 0.55);
        g.fillRoundedRect(rx + 4, iy + 4, bw - 8, 60, 18);
        g.lineStyle(5, 0xcc3344, 0.18);
        g.strokeRoundedRect(rx - 3, iy - 3, bw + 6, 171, 25);
        g.lineStyle(2, 0xcc3344, 0.85);
        g.strokeRoundedRect(rx, iy, bw, 165, 22);
        g.lineStyle(1, 0xee5566, 0.3);
        g.strokeRoundedRect(rx + 4, iy + 4, bw - 8, 157, 18);
      } else if (item.diff === "kisin") {
        // 鬼神: 深紫×マゼンタ 幾何学デザイン
        // ベース
        g.fillStyle(0x0d0318, 1);
        g.fillRoundedRect(rx, iy, bw, 165, 8);
        // 左右縦バー
        g.fillStyle(0x8822cc, 0.75);
        g.fillRect(rx + 8, iy + 12, 3, 141);
        g.fillRect(rx + bw - 11, iy + 12, 3, 141);
        // 上部パネル
        g.fillStyle(0x4a1870, 0.45);
        g.fillRect(rx + 14, iy + 8, bw - 28, 57);
        // 下部パネル
        g.fillStyle(0x200838, 0.45);
        g.fillRect(rx + 14, iy + 100, bw - 28, 57);
        // ── 金棒シルエット（背景イラスト） ──
        const kbx = rx + bw / 2,
          kby = iy + 80;
        // 棒本体
        g.fillStyle(0xaa33ff, 0.09);
        g.fillRoundedRect(kbx - 13, kby - 70, 26, 125, 7);
        // 先端ヘッド（太め）
        g.fillStyle(0xcc55ff, 0.11);
        g.fillRoundedRect(kbx - 17, kby - 70, 34, 30, 7);
        // グリップ（下部細め）
        g.fillStyle(0x8822dd, 0.13);
        g.fillRoundedRect(kbx - 8, kby + 54, 16, 22, 4);
        // スパイク（左右5対）
        g.fillStyle(0xcc66ff, 0.15);
        [-52, -32, -12, 8, 28].forEach((dy) => {
          const sy = kby + dy;
          g.fillTriangle(kbx - 13, sy - 9, kbx - 13, sy + 9, kbx - 32, sy);
          g.fillTriangle(kbx + 13, sy - 9, kbx + 13, sy + 9, kbx + 32, sy);
        });
        // 断台対角線×3（右上がり）
        g.lineStyle(1, 0xcc66ff, 0.28);
        g.beginPath();
        g.moveTo(rx + 14, iy + 148);
        g.lineTo(rx + 108, iy + 12);
        g.strokePath();
        g.beginPath();
        g.moveTo(rx + 78, iy + 155);
        g.lineTo(rx + 198, iy + 12);
        g.strokePath();
        g.beginPath();
        g.moveTo(rx + 158, iy + 155);
        g.lineTo(rx + bw - 14, iy + 42);
        g.strokePath();
        // 中央水平ライン
        g.lineStyle(1, 0x8822cc, 0.55);
        g.beginPath();
        g.moveTo(rx + 14, iy + 82);
        g.lineTo(rx + bw - 14, iy + 82);
        g.strokePath();
        // コーナー三角（右上）
        g.fillStyle(0x8822cc, 0.45);
        g.fillTriangle(rx + bw, iy, rx + bw - 38, iy, rx + bw, iy + 38);
        // コーナー三角（左下）
        g.fillTriangle(rx, iy + 165, rx + 38, iy + 165, rx, iy + 127);
        // アウターグロー
        g.lineStyle(8, 0x8822cc, 0.18);
        g.strokeRoundedRect(rx - 4, iy - 4, bw + 8, 173, 10);
        // メイン枚
        g.lineStyle(2, 0x9933dd, 1);
        g.strokeRoundedRect(rx, iy, bw, 165, 8);
        // 内側細枚
        g.lineStyle(1, 0xcc66ff, 0.3);
        g.strokeRoundedRect(rx + 4, iy + 4, bw - 8, 157, 5);
      } else if (item.diff === "kyubi") {
        // 九尾: 白×黄金 幾何学デザイン
        // ベース
        g.fillStyle(0xfaf8f0, 1);
        g.fillRoundedRect(rx, iy, bw, 165, 8);
        // 上部ハイライト
        g.fillStyle(0xffffff, 0.55);
        g.fillRect(rx + 14, iy + 8, bw - 28, 56);
        // 下部クリーム影
        g.fillStyle(0xd4a800, 0.08);
        g.fillRect(rx + 14, iy + 101, bw - 28, 56);
        // ── 九尾シルエット（背景イラスト）──
        const tbx = rx + bw / 2,
          tby = iy + 134;
        // 根本（胴）
        g.fillStyle(0xd4a800, 0.13);
        g.fillCircle(tbx, tby, 12);
        // 9本の尾（扇形ポリライン）
        for (let ti = 0; ti < 9; ti++) {
          const t = ti / 8;
          const fanAngle = (t - 0.5) * 1.7;
          g.lineStyle(ti === 4 ? 5 : 4, 0xd4a800, 0.13);
          const pts = [{ x: tbx + (t - 0.5) * 18, y: tby }];
          for (let pi = 1; pi <= 14; pi++) {
            const p = pi / 14;
            pts.push({
              x: tbx + (t - 0.5) * 18 + Math.sin(fanAngle * p) * 88 * p,
              y: tby - p * 108,
            });
          }
          g.strokePoints(pts, false);
        }
        // 黄金対角線×3（右上がり）
        g.lineStyle(1, 0xd4a800, 0.38);
        g.beginPath();
        g.moveTo(rx + 14, iy + 148);
        g.lineTo(rx + 108, iy + 12);
        g.strokePath();
        g.beginPath();
        g.moveTo(rx + 78, iy + 155);
        g.lineTo(rx + 198, iy + 12);
        g.strokePath();
        g.beginPath();
        g.moveTo(rx + 158, iy + 155);
        g.lineTo(rx + bw - 14, iy + 42);
        g.strokePath();
        // コーナーブラケット（金）
        const brk = 22;
        g.lineStyle(2, 0xd4a800, 0.9);
        g.beginPath();
        g.moveTo(rx + 8, iy + 8 + brk);
        g.lineTo(rx + 8, iy + 8);
        g.lineTo(rx + 8 + brk, iy + 8);
        g.strokePath();
        g.beginPath();
        g.moveTo(rx + bw - 8 - brk, iy + 8);
        g.lineTo(rx + bw - 8, iy + 8);
        g.lineTo(rx + bw - 8, iy + 8 + brk);
        g.strokePath();
        g.beginPath();
        g.moveTo(rx + 8, iy + 157 - brk);
        g.lineTo(rx + 8, iy + 157);
        g.lineTo(rx + 8 + brk, iy + 157);
        g.strokePath();
        g.beginPath();
        g.moveTo(rx + bw - 8 - brk, iy + 157);
        g.lineTo(rx + bw - 8, iy + 157);
        g.lineTo(rx + bw - 8, iy + 157 - brk);
        g.strokePath();
        // 中央ダイヤモンド
        g.lineStyle(1, 0xd4a800, 0.55);
        const mxk = rx + bw / 2,
          myk = iy + 82;
        g.beginPath();
        g.moveTo(mxk, myk - 22);
        g.lineTo(mxk + 38, myk);
        g.lineTo(mxk, myk + 22);
        g.lineTo(mxk - 38, myk);
        g.closePath();
        g.strokePath();
        // アウターグロー
        g.lineStyle(7, 0xd4a800, 0.2);
        g.strokeRoundedRect(rx - 4, iy - 4, bw + 8, 173, 10);
        // メイン枚（黄金）
        g.lineStyle(2, 0xc49820, 1);
        g.strokeRoundedRect(rx, iy, bw, 165, 8);
        // 内側細枚
        g.lineStyle(1, 0xd4a800, 0.25);
        g.strokeRoundedRect(rx + 4, iy + 4, bw - 8, 157, 5);
      } else if (item.diff === "kugutsu") {
        // 傀儡: 黒基調 乱雑な突き抜けライン
        g.fillStyle(0x080808, 1);
        g.fillRoundedRect(rx, iy, bw, 165, 14);

        // 辺上の点をピックする: edge 0=上 1=右 2=下 3=左
        // [x0%, y0%, x1%, y1%, col, alpha, width]
        // 辺から辺を不規則に突き刺す（50本超）
        const lines = [
          // 上→下（バラバラなX）
          [0.07, 0, 0.71, 1, 0xff2200, 0.55, 1],
          [0.19, 0, 0.04, 1, 0xffffff, 0.22, 1],
          [0.33, 0, 0.88, 1, 0xff2200, 0.3, 1],
          [0.48, 0, 0.23, 1, 0xffffff, 0.4, 2],
          [0.61, 0, 0.42, 1, 0xff2200, 0.2, 1],
          [0.78, 0, 0.05, 1, 0xffffff, 0.16, 1],
          [0.91, 0, 0.57, 1, 0xff2200, 0.45, 1],
          [0.14, 0, 0.96, 1, 0xffffff, 0.12, 1],
          [0.55, 0, 0.31, 1, 0xff2200, 0.18, 1],
          [0.85, 0, 0.69, 1, 0xffffff, 0.28, 1],
          // 左→右（バラバラなY）
          [0, 0.08, 1, 0.63, 0xff2200, 0.5, 1],
          [0, 0.21, 1, 0.1, 0xffffff, 0.2, 1],
          [0, 0.37, 1, 0.82, 0xff2200, 0.35, 2],
          [0, 0.52, 1, 0.41, 0xffffff, 0.45, 1],
          [0, 0.68, 1, 0.17, 0xff2200, 0.22, 1],
          [0, 0.79, 1, 0.94, 0xffffff, 0.18, 1],
          [0, 0.91, 1, 0.55, 0xff2200, 0.28, 1],
          [0, 0.14, 1, 0.73, 0xffffff, 0.13, 1],
          [0, 0.46, 1, 0.03, 0xff2200, 0.17, 1],
          // 上→右
          [0.22, 0, 1, 0.14, 0xffffff, 0.25, 1],
          [0.67, 0, 1, 0.49, 0xff2200, 0.38, 1],
          [0.04, 0, 1, 0.77, 0xffffff, 0.15, 1],
          [0.89, 0, 1, 0.33, 0xff2200, 0.22, 1],
          [0.44, 0, 1, 0.91, 0xffffff, 0.1, 1],
          // 上→左
          [0.31, 0, 0, 0.28, 0xff2200, 0.32, 1],
          [0.73, 0, 0, 0.61, 0xffffff, 0.18, 1],
          [0.57, 0, 0, 0.87, 0xff2200, 0.24, 1],
          [0.16, 0, 0, 0.44, 0xffffff, 0.13, 1],
          // 下→右
          [0.11, 1, 1, 0.23, 0xff2200, 0.28, 1],
          [0.39, 1, 1, 0.68, 0xffffff, 0.2, 1],
          [0.64, 1, 1, 0.07, 0xff2200, 0.35, 1],
          [0.83, 1, 1, 0.55, 0xffffff, 0.16, 1],
          // 下→左
          [0.27, 1, 0, 0.19, 0xffffff, 0.22, 1],
          [0.52, 1, 0, 0.73, 0xff2200, 0.4, 1],
          [0.76, 1, 0, 0.38, 0xffffff, 0.14, 1],
          [0.93, 1, 0, 0.58, 0xff2200, 0.18, 1],
          // 右→左（急角度）
          [1, 0.06, 0, 0.88, 0xff2200, 0.3, 1],
          [1, 0.34, 0, 0.12, 0xffffff, 0.22, 1],
          [1, 0.58, 0, 0.47, 0xff2200, 0.18, 1],
          [1, 0.82, 0, 0.25, 0xffffff, 0.25, 1],
          // 極端な斜め（鋭角）
          [0.02, 0, 0.98, 0.08, 0xff2200, 0.6, 2],
          [0.02, 1, 0.98, 0.92, 0xff2200, 0.5, 1],
          [0, 0.02, 0.08, 0, 0xffffff, 0.35, 1],
          [1, 0.02, 0.92, 0, 0xffffff, 0.35, 1],
          [0, 0.98, 0.08, 1, 0xffffff, 0.35, 1],
          [1, 0.98, 0.92, 1, 0xffffff, 0.35, 1],
        ];
        lines.forEach(([x0, y0, x1, y1, col, a, w]) => {
          g.lineStyle(w, col, a);
          g.beginPath();
          g.moveTo(rx + x0 * bw, iy + y0 * 165);
          g.lineTo(rx + x1 * bw, iy + y1 * 165);
          g.strokePath();
        });

        // 結び目ドット（ランダム散布）
        const knots = [
          [0.07, 0.38, 0xff2200, 0.7, 2.5],
          [0.19, 0.74, 0xffffff, 0.5, 2],
          [0.33, 0.17, 0xff2200, 0.6, 2],
          [0.48, 0.52, 0xffffff, 0.7, 3],
          [0.61, 0.88, 0xff2200, 0.5, 2],
          [0.78, 0.31, 0xffffff, 0.4, 2],
          [0.91, 0.62, 0xff2200, 0.6, 2.5],
          [0.25, 0.45, 0xffffff, 0.5, 2],
          [0.55, 0.21, 0xff2200, 0.7, 2],
          [0.82, 0.79, 0xffffff, 0.4, 2],
          [0.13, 0.91, 0xff2200, 0.5, 2.5],
          [0.69, 0.06, 0xffffff, 0.6, 2],
          [0.4, 0.67, 0xff2200, 0.4, 2],
        ];
        knots.forEach(([kx, ky, col, a, r]) => {
          g.fillStyle(col, a);
          g.fillCircle(rx + kx * bw, iy + ky * 165, r);
        });

        // アウターグロー（赤）
        g.lineStyle(7, 0xcc0000, 0.22);
        g.strokeRoundedRect(rx - 4, iy - 4, bw + 8, 173, 16);
        // メイン枠（深赤）
        g.lineStyle(2, 0xaa0000, 0.95);
        g.strokeRoundedRect(rx, iy, bw, 165, 14);
        // 内側白細枠
        g.lineStyle(1, 0xffffff, 0.13);
        g.strokeRoundedRect(rx + 4, iy + 4, bw - 8, 157, 11);
      } else {
        g.fillStyle(item.fill ?? 0x1a1a2e, 0.9);
        g.lineStyle(2, item.borderColor ?? 0xf2dfbe, 0.65);
        g.fillRoundedRect(rx, iy, bw, 165, 22);
        g.strokeRoundedRect(rx, iy, bw, 165, 22);
      }
      objs.push(g);

      // 調整中バッジ
      if (item.locked) {
        const badge = this.add
          .text(cx, item.y - 16, "🔧 調整中", {
            fontSize: "28px",
            color: "#ffcc44",
            fontFamily: UI_FONT,
          })
          .setOrigin(0.5);
        objs.push(badge);
      }

      const labelFontSize = bw < 400 ? "52px" : "60px";
      const labelStyle = {
        fontSize: labelFontSize,
        color: item.labelColor ?? "#fff8e6",
        fontFamily: DISPLAY_FONT,
      };
      if (item.labelStroke) {
        labelStyle.stroke = item.labelStroke;
        labelStyle.strokeThickness = 4;
      }
      const t1 = this.add
        .text(
          cx,
          item.locked ? item.y - 52 : item.y - 16,
          item.label,
          labelStyle,
        )
        .setOrigin(0.5);
      objs.push(t1);

      if (!item.locked) {
        const t2 = this.add
          .text(cx, item.y + 44, item.sub, {
            fontSize: "28px",
            color: item.subColor ?? "#d7e2f1",
            fontFamily: UI_FONT,
          })
          .setOrigin(0.5);
        objs.push(t2);
      }

      const zone = this.add.zone(cx, item.y + 2, bw, 165).setInteractive();
      zone.on("pointerdown", () => {
        // 調整中は選択不可
        if (item.locked) {
          const msg = this.add
            .text(
              W / 2,
              960,
              `🔧 ${item.label}は調整中です\nしばらくお待ちください`,
              {
                fontSize: "42px",
                color: "#ffcc44",
                fontFamily: DISPLAY_FONT,
                align: "center",
                stroke: "#000000",
                strokeThickness: 6,
              },
            )
            .setOrigin(0.5)
            .setAlpha(0);
          this.tweens.add({ targets: msg, alpha: 1, duration: 300 });
          this.time.delayedCall(2200, () => {
            this.tweens.add({
              targets: msg,
              alpha: 0,
              duration: 300,
              onComplete: () => msg.destroy(),
            });
          });
          return;
        }
        // 先後手選択サブパネルを表示
        const subObjs = [];

        const subBg = this.add.graphics();
        subBg.fillStyle(0x0d1825, 0.97);
        subBg.lineStyle(2, 0xe5d5b1, 0.55);
        subBg.fillRoundedRect(W / 2 - 360, 330, 720, 1260, 30);
        subBg.strokeRoundedRect(W / 2 - 360, 330, 720, 1260, 30);
        subObjs.push(subBg);

        // クリックをメインパネルへ透過させないブロッカー
        const subBlocker = this.add
          .rectangle(W / 2, 960, 720, 1260, 0x000000, 0)
          .setInteractive();
        subObjs.push(subBlocker);

        const subTitle = this.add
          .text(W / 2, 480, `「${item.label}」で対戦`, {
            fontSize: "48px",
            color: "#fff8e6",
            fontFamily: DISPLAY_FONT,
          })
          .setOrigin(0.5);
        subObjs.push(subTitle);

        const subGuide = this.add
          .text(W / 2, 560, "先手・後手を選んでください", {
            fontSize: "30px",
            color: "#d7e2f1",
            fontFamily: UI_FONT,
          })
          .setOrigin(0.5);
        subObjs.push(subGuide);

        // 先手ボタン
        const senteG = this.add.graphics();
        senteG.fillStyle(0x1e4a7a, 0.9);
        senteG.lineStyle(2, 0xf2dfbe, 0.65);
        senteG.fillRoundedRect(W / 2 - 300, 650, 600, 170, 22);
        senteG.strokeRoundedRect(W / 2 - 300, 650, 600, 170, 22);
        subObjs.push(senteG);

        const senteT1 = this.add
          .text(W / 2, 720, "先手で戦う", {
            fontSize: "52px",
            color: "#fff8e6",
            fontFamily: DISPLAY_FONT,
          })
          .setOrigin(0.5);
        subObjs.push(senteT1);

        const senteT2 = this.add
          .text(W / 2, 783, "あなたが先に撒きます", {
            fontSize: "26px",
            color: "#d7e2f1",
            fontFamily: UI_FONT,
          })
          .setOrigin(0.5);
        subObjs.push(senteT2);

        // 後手ボタン
        const goteG = this.add.graphics();
        goteG.fillStyle(0x4a1e1e, 0.9);
        goteG.lineStyle(2, 0xf2dfbe, 0.65);
        goteG.fillRoundedRect(W / 2 - 300, 880, 600, 170, 22);
        goteG.strokeRoundedRect(W / 2 - 300, 880, 600, 170, 22);
        subObjs.push(goteG);

        const goteT1 = this.add
          .text(W / 2, 950, "後手で戦う", {
            fontSize: "52px",
            color: "#fff8e6",
            fontFamily: DISPLAY_FONT,
          })
          .setOrigin(0.5);
        subObjs.push(goteT1);

        const goteT2 = this.add
          .text(W / 2, 1013, "AIが先に撒きます", {
            fontSize: "26px",
            color: "#d7e2f1",
            fontFamily: UI_FONT,
          })
          .setOrigin(0.5);
        subObjs.push(goteT2);

        const subCleanup = () => subObjs.forEach((o) => o.destroy());

        const senteZone = this.add.zone(W / 2, 735, 600, 170).setInteractive();
        senteZone.on("pointerdown", () => {
          subCleanup();
          cleanup();
          this.scene.start("GameScene", {
            mode: "solo",
            aiDifficulty: item.diff,
            playerFirst: true,
          });
        });
        subObjs.push(senteZone);

        const goteZone = this.add.zone(W / 2, 965, 600, 170).setInteractive();
        goteZone.on("pointerdown", () => {
          subCleanup();
          cleanup();
          this.scene.start("GameScene", {
            mode: "solo",
            aiDifficulty: item.diff,
            playerFirst: false,
          });
        });
        subObjs.push(goteZone);

        const backT = this.add
          .text(W / 2, 1160, "← 戻る", {
            fontSize: "30px",
            color: "#8899bb",
            fontFamily: UI_FONT,
          })
          .setOrigin(0.5)
          .setInteractive();
        backT.on("pointerdown", subCleanup);
        subObjs.push(backT);
      });
      objs.push(zone);
    }

    const cancelT = this.add
      .text(W / 2, 1510, "キャンセル", {
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
    const px = W / 2 - 460;
    const pw = 920;

    const g = this.add.graphics();
    // 暗いベース
    g.fillStyle(0x06090f, 1);
    g.fillRoundedRect(px, panelY, pw, panelH, 18);
    // 上部カラーライン
    g.fillStyle(0x4488cc, 0.7);
    g.fillRect(px + 18, panelY + 2, pw - 36, 3);
    // 下部微光
    g.fillStyle(0x4488cc, 0.04);
    g.fillRect(px + 8, panelY + panelH - 50, pw - 16, 42);
    // アウターグロー
    g.lineStyle(6, 0x2e4f7a, 0.22);
    g.strokeRoundedRect(px - 3, panelY - 3, pw + 6, panelH + 6, 20);
    // メイン枠
    g.lineStyle(1.5, 0xe5d5b1, 0.3);
    g.strokeRoundedRect(px, panelY, pw, panelH, 18);
    // 仕切り縦線（アバター右）
    g.lineStyle(1, 0xe5d5b1, 0.15);
    g.beginPath();
    g.moveTo(px + 158, panelY + 22);
    g.lineTo(px + 158, panelY + panelH - 22);
    g.strokePath();

    // アバター円
    g.fillStyle(0x0e2640, 1);
    g.fillCircle(W / 2 - 360, panelY + panelH / 2, 54);
    g.lineStyle(2, 0x4488cc, 0.65);
    g.strokeCircle(W / 2 - 360, panelY + panelH / 2, 54);
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
