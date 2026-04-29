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

    // 阿修羅解放チェック: 条件が揃っていてまだ演出未表示なら自動でパネルを開く
    this.time.delayedCall(300, () => {
      try {
        const ashuraShownNow = localStorage.getItem("ashuraShown") === "1";
        if (!ashuraShownNow) {
          const bd = JSON.parse(localStorage.getItem("soloBeaten") ?? "{}");
          const kisinDone = !!(bd["kisin"]?.first && bd["kisin"]?.second);
          const kyubiDone = !!(bd["kyubi"]?.first && bd["kyubi"]?.second);
          if (kisinDone && kyubiDone) {
            this._showDifficultyPanel();
          }
        }
      } catch (_) {}
    });
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
    const ppx = W / 2 - 360,
      ppy = 330,
      ppw = 720,
      pph = 1260;
    panelG.fillStyle(0x080d18, 1);
    panelG.fillRoundedRect(ppx, ppy, ppw, pph, 30);
    // 斜めテクスチャライン
    panelG.lineStyle(1, 0xffffff, 0.02);
    for (let i = -1; i < 9; i++) {
      panelG.beginPath();
      panelG.moveTo(ppx + i * 130, ppy);
      panelG.lineTo(ppx + i * 130 + pph * 0.55, ppy + pph);
      panelG.strokePath();
    }
    // グロー球
    panelG.fillStyle(0xf0d39a, 0.06);
    panelG.fillCircle(ppx + ppw * 0.82, ppy + pph * 0.1, 200);
    panelG.fillStyle(0xf0d39a, 0.025);
    panelG.fillCircle(ppx + ppw * 0.82, ppy + pph * 0.1, 330);
    panelG.fillStyle(0x55aadd, 0.06);
    panelG.fillCircle(ppx + ppw * 0.18, ppy + pph * 0.9, 200);
    panelG.fillStyle(0x55aadd, 0.025);
    panelG.fillCircle(ppx + ppw * 0.18, ppy + pph * 0.9, 330);
    panelG.fillStyle(0x7733aa, 0.035);
    panelG.fillCircle(ppx + ppw / 2, ppy + pph / 2, 300);
    // 外枠（二重）
    panelG.lineStyle(1.5, 0xe5d5b1, 0.38);
    panelG.strokeRoundedRect(ppx, ppy, ppw, pph, 30);
    panelG.lineStyle(1, 0xe5d5b1, 0.1);
    panelG.strokeRoundedRect(ppx + 12, ppy + 12, ppw - 24, pph - 24, 22);
    // コーナーLブラケット
    const pcLen = 48;
    panelG.lineStyle(2.5, 0xf0d39a, 0.5);
    panelG.beginPath();
    panelG.moveTo(ppx, ppy + pcLen);
    panelG.lineTo(ppx, ppy);
    panelG.lineTo(ppx + pcLen, ppy);
    panelG.strokePath();
    panelG.beginPath();
    panelG.moveTo(ppx + ppw - pcLen, ppy);
    panelG.lineTo(ppx + ppw, ppy);
    panelG.lineTo(ppx + ppw, ppy + pcLen);
    panelG.strokePath();
    panelG.beginPath();
    panelG.moveTo(ppx, ppy + pph - pcLen);
    panelG.lineTo(ppx, ppy + pph);
    panelG.lineTo(ppx + pcLen, ppy + pph);
    panelG.strokePath();
    panelG.beginPath();
    panelG.moveTo(ppx + ppw - pcLen, ppy + pph);
    panelG.lineTo(ppx + ppw, ppy + pph);
    panelG.lineTo(ppx + ppw, ppy + pph - pcLen);
    panelG.strokePath();
    objs.push(panelG);

    const titleT = this.add
      .text(W / 2, 420, "AIの強さを選んでください", {
        fontSize: "36px",
        color: "#e6decf",
        fontFamily: UI_FONT,
      })
      .setOrigin(0.5);
    objs.push(titleT);

    // ─── 進行管理 ───────────────────────────────────────────
    // soloProgressMode: "progression" | "free"  (初期値: "progression")
    // soloUnlocked: 倒した難易度の配列
    const PROGRESSION_REQS = {
      kooni: [],
      yasha: ["kooni"],
      rasetsu: ["yasha"],
      kisin: ["rasetsu"],
      kyubi: ["rasetsu"],
      ashura: ["kisin", "kyubi"],
      kugutsu: ["ashura"],
    };
    const DIFF_LABEL_MAP = {
      kooni: "小鬼",
      yasha: "夜叉",
      rasetsu: "羅刹",
      kisin: "鬼神",
      kyubi: "九尾",
      ashura: "阿修羅",
      kugutsu: "傀儡",
    };
    let progressMode;
    let beatenData;
    try {
      progressMode = localStorage.getItem("soloProgressMode") ?? "progression";
      beatenData = JSON.parse(localStorage.getItem("soloBeaten") ?? "{}");
    } catch (_e) {
      progressMode = "progression";
      beatenData = {};
    }
    const isProgressionMode = progressMode === "progression";

    // diff を「完全クリア済み（先手・後手両方）」かどうか判定
    function isFullyBeaten(diff) {
      return !!(beatenData[diff]?.first && beatenData[diff]?.second);
    }

    function isUnlocked(diff) {
      if (!isProgressionMode) return true;
      const reqs = PROGRESSION_REQS[diff] ?? [];
      return reqs.every((r) => isFullyBeaten(r));
    }
    // 阿修羅解放判定: モードに関わらず鬼神+九尾の先後手全クリアで解放
    const ashuraUnlocked = PROGRESSION_REQS.ashura.every((r) =>
      isFullyBeaten(r),
    );
    let ashuraShown = true;
    try {
      ashuraShown = localStorage.getItem("ashuraShown") === "1";
    } catch (_e) {}
    // ─────────────────────────────────────────────────────────

    const items = [
      {
        y: 570,
        label: "小鬼",
        ruby: "こおに",
        sub: "初戦にぴったりな相手",
        labelColor: "#c8ffe0",
        subColor: "#88ccaa",
        diff: "kooni",
      },
      {
        y: 760,
        label: "夜叉",
        ruby: "やしゃ",
        sub: "実力を見せつけよう",
        labelColor: "#c8e8ff",
        subColor: "#88aabb",
        diff: "yasha",
      },
      {
        y: 950,
        label: "羅刹",
        ruby: "らせつ",
        sub: "手加減無用！全力で！",
        labelColor: "#ffe0e0",
        labelStroke: "#3a0008",
        subColor: "#c07080",
        diff: "rasetsu",
      },
      {
        y: 1140,
        label: "鬼神",
        ruby: "きしん",
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
        ruby: "きゅうび",
        sub: "知の権化… 倒せる？",
        labelColor: "#3a1a00",
        labelStroke: "#ffe090",
        subColor: "#a07820",
        diff: "kyubi",
        cx: W / 2 + 157,
        bw: 305,
      },
      ...(ashuraUnlocked
        ? [
            {
              y: 1140,
              label: "阿修羅",
              ruby: "あしゅら",
              sub: "鬼神と九尾が融合した圧倒的な存在",
              labelColor: "#fff0ee",
              labelStroke: "#550000",
              subColor: "#ffaa88",
              diff: "ashura",
            },
          ]
        : []),
      {
        y: 1330,
        label: "傀儡",
        ruby: "くぐつ",
        sub: "成長する操り人形",
        labelColor: "#c8e8ff",
        labelStroke: "#003366",
        subColor: "#6699cc",
        diff: "kugutsu",
      },
    ];

    const cleanup = () => objs.forEach((o) => o.destroy());
    this._diffPanelCleanup = cleanup;

    // アニメーション用: アイテムごとのobjs範囲追跡
    const itemObjRanges = {};

    for (const item of items) {
      const objStartIdx = objs.length;
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
        // 傀儡: 紺基調 糸の突き抜けライン（青白）
        g.fillStyle(0x061228, 1);
        g.fillRoundedRect(rx, iy, bw, 165, 14);

        // [x0%, y0%, x1%, y1%, col, alpha, width]
        const lines = [
          // 上→下
          [0.07, 0, 0.71, 1, 0x2266ff, 0.55, 1],
          [0.33, 0, 0.88, 1, 0x2266ff, 0.3, 1],
          [0.48, 0, 0.23, 1, 0xffffff, 0.4, 2],
          [0.91, 0, 0.57, 1, 0x2266ff, 0.45, 1],
          [0.85, 0, 0.69, 1, 0xffffff, 0.28, 1],
          // 左→右
          [0, 0.08, 1, 0.63, 0x2266ff, 0.5, 1],
          [0, 0.37, 1, 0.82, 0x2266ff, 0.35, 2],
          [0, 0.52, 1, 0.41, 0xffffff, 0.45, 1],
          [0, 0.91, 1, 0.55, 0x2266ff, 0.28, 1],
          // 斜め
          [0.22, 0, 1, 0.14, 0xffffff, 0.25, 1],
          [0.67, 0, 1, 0.49, 0x2266ff, 0.38, 1],
          [0.31, 0, 0, 0.28, 0x2266ff, 0.32, 1],
          [0.52, 1, 0, 0.73, 0x2266ff, 0.4, 1],
          [1, 0.06, 0, 0.88, 0x2266ff, 0.3, 1],
          [1, 0.34, 0, 0.12, 0xffffff, 0.22, 1],
          // 鋭角
          [0.02, 0, 0.98, 0.08, 0x2266ff, 0.6, 2],
          [0.02, 1, 0.98, 0.92, 0x2266ff, 0.5, 1],
          [0, 0.02, 0.08, 0, 0xffffff, 0.35, 1],
          [1, 0.98, 0.92, 1, 0xffffff, 0.35, 1],
        ];
        lines.forEach(([x0, y0, x1, y1, col, a, w]) => {
          g.lineStyle(w, col, a);
          g.beginPath();
          g.moveTo(rx + x0 * bw, iy + y0 * 165);
          g.lineTo(rx + x1 * bw, iy + y1 * 165);
          g.strokePath();
        });

        // 結び目ドット（青白散布）
        const knots = [
          [0.07, 0.38, 0x2266ff, 0.7, 2.5],
          [0.19, 0.74, 0xffffff, 0.5, 2],
          [0.33, 0.17, 0x2266ff, 0.6, 2],
          [0.48, 0.52, 0xffffff, 0.7, 3],
          [0.61, 0.88, 0x2266ff, 0.5, 2],
          [0.78, 0.31, 0xffffff, 0.4, 2],
          [0.91, 0.62, 0x2266ff, 0.6, 2.5],
          [0.25, 0.45, 0xffffff, 0.5, 2],
          [0.55, 0.21, 0x2266ff, 0.7, 2],
          [0.82, 0.79, 0xffffff, 0.4, 2],
          [0.13, 0.91, 0x2266ff, 0.5, 2.5],
          [0.69, 0.06, 0xffffff, 0.6, 2],
          [0.4, 0.67, 0x2266ff, 0.4, 2],
        ];
        knots.forEach(([kx, ky, col, a, r]) => {
          g.fillStyle(col, a);
          g.fillCircle(rx + kx * bw, iy + ky * 165, r);
        });

        // アウターグロー（青）
        g.lineStyle(7, 0x1144cc, 0.22);
        g.strokeRoundedRect(rx - 4, iy - 4, bw + 8, 173, 16);
        // メイン枠（深青）
        g.lineStyle(2, 0x2255bb, 0.95);
        g.strokeRoundedRect(rx, iy, bw, 165, 14);
        // 内側白細枠
        g.lineStyle(1, 0xffffff, 0.13);
        g.strokeRoundedRect(rx + 4, iy + 4, bw - 8, 157, 11);
      } else if (item.diff === "ashura") {
        // 阿修羅: 暗紅黒基調 + 曼荼羅放射 + 三面六臂（明王スタイル）
        const acx = rx + bw / 2,
          acy = iy + 82;
        // ベース
        g.fillStyle(0x0e0205, 1);
        g.fillRoundedRect(rx, iy, bw, 165, 14);
        // 紫グロー（左右のコーナー）
        g.fillStyle(0x5500aa, 0.18);
        g.fillEllipse(rx + bw * 0.18, acy, 180, 120);
        g.fillStyle(0x7700cc, 0.12);
        g.fillEllipse(rx + bw * 0.82, acy, 180, 120);
        // 中央グロー楕円（深紅）— 抑えめに
        g.fillStyle(0x7a0010, 0.22);
        g.fillEllipse(acx, acy, bw * 0.72, 110);
        g.fillStyle(0xaa0018, 0.1);
        g.fillEllipse(acx, acy, bw, 165);
        // 六臂: 中央から6本の光芒（太+細の2本重ね）— 抑えめに
        for (let ai = 0; ai < 6; ai++) {
          const ang = (ai / 6) * Math.PI * 2 - Math.PI / 2;
          const ex = acx + Math.cos(ang) * (bw * 0.52);
          const ey = acy + Math.sin(ang) * 80;
          g.lineStyle(6, 0xff2200, 0.1);
          g.beginPath();
          g.moveTo(acx, acy);
          g.lineTo(ex, ey);
          g.strokePath();
          g.lineStyle(2, 0xff6633, 0.38);
          g.beginPath();
          g.moveTo(acx, acy);
          g.lineTo(ex, ey);
          g.strokePath();
        }
        // 曼荼羅同心円— 抑えめに
        [28, 46, 66, 90].forEach((r, i) => {
          g.lineStyle(1, 0xff2200, [0.35, 0.22, 0.13, 0.07][i]);
          g.strokeCircle(acx, acy, r);
        });
        // 鱗紋: 上下に弧ライン
        for (let qi = 0; qi < 7; qi++) {
          const qx = rx + 30 + (qi / 6) * (bw - 60);
          g.lineStyle(1, 0xcc1100, 0.13);
          g.beginPath();
          g.arc(qx, iy + 165, 55, -Math.PI * 0.45, -Math.PI * 0.05);
          g.strokePath();
          g.beginPath();
          g.arc(qx, iy, 55, Math.PI * 0.05, Math.PI * 0.45);
          g.strokePath();
        }
        // 九面: 9つの顔円を環状に配置（重ならない半径80）— 抑えめに
        const faceRingR = 80;
        for (let fi = 0; fi < 9; fi++) {
          const fang = (fi / 9) * Math.PI * 2 - Math.PI / 2;
          const fx = acx + Math.cos(fang) * faceRingR;
          const fy = acy + Math.sin(fang) * faceRingR * 0.72;
          g.fillStyle(0x990015, 0.25);
          g.fillCircle(fx, fy, 18);
          g.fillStyle(0xff3300, 0.14);
          g.fillCircle(fx, fy, 10);
          g.lineStyle(1.5, 0xff7755, 0.55);
          g.strokeCircle(fx, fy, 18);
          g.lineStyle(1, 0xffccaa, 0.22);
          g.strokeCircle(fx, fy, 10);
        }
        // 中心核（炎の核）
        g.fillStyle(0xff6600, 0.6);
        g.fillCircle(acx, acy, 7);
        g.fillStyle(0xffffff, 0.7);
        g.fillCircle(acx, acy, 3);
        // アウターグロー（赤、強め）
        g.lineStyle(12, 0xaa0000, 0.22);
        g.strokeRoundedRect(rx - 5, iy - 5, bw + 10, 175, 17);
        g.lineStyle(3, 0xff3300, 0.55);
        g.strokeRoundedRect(rx - 1, iy - 1, bw + 2, 167, 15);
        // メイン枠（白っぽく）
        g.lineStyle(2, 0xffe8e0, 0.92);
        g.strokeRoundedRect(rx, iy, bw, 165, 14);
        // 内側細枠
        g.lineStyle(1, 0xffffff, 0.18);
        g.strokeRoundedRect(rx + 4, iy + 4, bw - 8, 157, 11);
      } else {
        g.fillStyle(item.fill ?? 0x1a1a2e, 0.9);
        g.lineStyle(2, item.borderColor ?? 0xf2dfbe, 0.65);
        g.fillRoundedRect(rx, iy, bw, 165, 22);
        g.strokeRoundedRect(rx, iy, bw, 165, 22);
      }
      objs.push(g);

      // 進行ロック: 暗いオーバーレイのみ（テキスト類は後で前面に描画）
      const progressLocked = !isUnlocked(item.diff);
      if (progressLocked) {
        const lockG = this.add.graphics();
        lockG.fillStyle(0x000000, 0.68);
        lockG.fillRoundedRect(rx, iy, bw, 165, 22);
        objs.push(lockG);
      }

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
      const displayLabel = progressLocked ? "？？？" : item.label;
      const labelStyle = {
        fontSize: labelFontSize,
        color: progressLocked ? "#556677" : (item.labelColor ?? "#fff8e6"),
        fontFamily: DISPLAY_FONT,
      };
      if (!progressLocked && item.labelStroke) {
        labelStyle.stroke = item.labelStroke;
        labelStyle.strokeThickness = 4;
      }
      const labelY = item.locked ? item.y - 52 : item.y - 16;
      const t1 = this.add
        .text(cx, labelY, displayLabel, labelStyle)
        .setOrigin(0.5);
      objs.push(t1);

      if (item.ruby && !item.locked && !progressLocked) {
        const rubyColor = item.labelStroke
          ? item.labelColor
          : (item.labelColor ?? "#fff8e6");
        const rubyT = this.add
          .text(cx, iy + 18, item.ruby, {
            fontSize: "22px",
            color: rubyColor,
            fontFamily: UI_FONT,
            alpha: 0.78,
            letterSpacing: 6,
          })
          .setOrigin(0.5);
        objs.push(rubyT);
      }

      if (!item.locked) {
        const reqs = PROGRESSION_REQS[item.diff] ?? [];
        const lockedSubText =
          reqs.length === 0
            ? "まだ姿を現していない…"
            : reqs
                .map((r) => (isUnlocked(r) ? DIFF_LABEL_MAP[r] : "？？？"))
                .join("と") + "を倒すと解放";
        const t2 = this.add
          .text(cx, item.y + 44, progressLocked ? lockedSubText : item.sub, {
            fontSize: "28px",
            color: progressLocked ? "#556677" : (item.subColor ?? "#d7e2f1"),
            fontFamily: UI_FONT,
          })
          .setOrigin(0.5);
        objs.push(t2);
      }

      // 🔒アイコン: 最前面に描画（ラベルの上に重ねる）
      if (progressLocked) {
        const lockIcon = this.add
          .text(cx, item.y - 16, "🔒", { fontSize: "52px" })
          .setOrigin(0.5);
        objs.push(lockIcon);
      }

      // 撃破バッジ (右上: 先手・後手それぞれの勝利状況)
      {
        const mrkFirst = !!beatenData[item.diff]?.first;
        const mrkSecond = !!beatenData[item.diff]?.second;
        // 2つのピル型インジケーター
        const pillW = 52,
          pillH = 28,
          pillR = 14;
        const pillY = iy + 22;
        const pill2X = rx + bw - 10 - pillW / 2;
        const pill1X = pill2X - pillW - 6;
        for (const [px, beaten, label] of [
          [pill1X, mrkFirst, "先"],
          [pill2X, mrkSecond, "後"],
        ]) {
          const pg = this.add.graphics();
          if (beaten) {
            pg.fillStyle(0x120d00, 1);
            pg.fillRoundedRect(
              px - pillW / 2 - 1,
              pillY - pillH / 2 - 1,
              pillW + 2,
              pillH + 2,
              pillR + 1,
            );
            pg.fillStyle(0xb07d08, 1);
            pg.fillRoundedRect(
              px - pillW / 2,
              pillY - pillH / 2,
              pillW,
              pillH,
              pillR,
            );
            pg.fillStyle(0xf5c518, 1);
            pg.fillRoundedRect(
              px - pillW / 2 + 2,
              pillY - pillH / 2 + 2,
              pillW - 4,
              pillH - 4,
              pillR - 1,
            );
            pg.fillStyle(0xfff0a0, 0.35);
            pg.fillRoundedRect(
              px - pillW / 2 + 3,
              pillY - pillH / 2 + 3,
              pillW - 6,
              (pillH - 6) * 0.5,
              pillR - 2,
            );
          } else {
            pg.fillStyle(0x0a0e16, 0.85);
            pg.fillRoundedRect(
              px - pillW / 2,
              pillY - pillH / 2,
              pillW,
              pillH,
              pillR,
            );
            pg.lineStyle(1, 0x334455, 0.9);
            pg.strokeRoundedRect(
              px - pillW / 2,
              pillY - pillH / 2,
              pillW,
              pillH,
              pillR,
            );
          }
          objs.push(pg);
          const pt = this.add
            .text(px, pillY, beaten ? `${label}✓` : label, {
              fontSize: "20px",
              color: beaten ? "#3a2800" : "#334455",
              fontFamily: UI_FONT,
              fontStyle: beaten ? "bold" : "normal",
            })
            .setOrigin(0.5);
          objs.push(pt);
        }
      }

      // アニメーション用 objsRange記録
      itemObjRanges[item.diff] = [objStartIdx, objs.length];

      // アニメーション中（ashura初回解放時）はkirsん/kyubi/ashuraをzoneなし
      const isAnimPhase = ashuraUnlocked && !ashuraShown;
      const skipZone =
        isAnimPhase &&
        (item.diff === "kisin" ||
          item.diff === "kyubi" ||
          item.diff === "ashura");

      const zone = this.add.zone(cx, item.y + 2, bw, 165).setInteractive();
      if (!skipZone)
        zone.on("pointerdown", () => {
          // 進行ロック中は選択不可
          if (progressLocked) {
            return;
          }
          // 調整中は選択不可
          if (item.locked) {
            return;
          }
          // 先後手選択サブパネルを表示
          const subObjs = [];

          const subBg = this.add.graphics();
          const spx = W / 2 - 360,
            spy = 330,
            spw = 720,
            sph = 1260;
          subBg.fillStyle(0x070c16, 1);
          subBg.fillRoundedRect(spx, spy, spw, sph, 30);
          // 斜めテクスチャライン
          subBg.lineStyle(1, 0xffffff, 0.02);
          for (let si = -1; si < 9; si++) {
            subBg.beginPath();
            subBg.moveTo(spx + si * 130, spy);
            subBg.lineTo(spx + si * 130 + sph * 0.55, spy + sph);
            subBg.strokePath();
          }
          // グロー球
          subBg.fillStyle(0xf0d39a, 0.06);
          subBg.fillCircle(spx + spw * 0.82, spy + sph * 0.1, 200);
          subBg.fillStyle(0xf0d39a, 0.025);
          subBg.fillCircle(spx + spw * 0.82, spy + sph * 0.1, 330);
          subBg.fillStyle(0x55aadd, 0.06);
          subBg.fillCircle(spx + spw * 0.18, spy + sph * 0.9, 200);
          subBg.fillStyle(0x55aadd, 0.025);
          subBg.fillCircle(spx + spw * 0.18, spy + sph * 0.9, 330);
          subBg.fillStyle(0x7733aa, 0.035);
          subBg.fillCircle(spx + spw / 2, spy + sph / 2, 300);
          // 外枠（二重）
          subBg.lineStyle(1.5, 0xe5d5b1, 0.38);
          subBg.strokeRoundedRect(spx, spy, spw, sph, 30);
          subBg.lineStyle(1, 0xe5d5b1, 0.1);
          subBg.strokeRoundedRect(spx + 12, spy + 12, spw - 24, sph - 24, 22);
          // コーナーLブラケット
          const scLen = 48;
          subBg.lineStyle(2.5, 0xf0d39a, 0.5);
          subBg.beginPath();
          subBg.moveTo(spx, spy + scLen);
          subBg.lineTo(spx, spy);
          subBg.lineTo(spx + scLen, spy);
          subBg.strokePath();
          subBg.beginPath();
          subBg.moveTo(spx + spw - scLen, spy);
          subBg.lineTo(spx + spw, spy);
          subBg.lineTo(spx + spw, spy + scLen);
          subBg.strokePath();
          subBg.beginPath();
          subBg.moveTo(spx, spy + sph - scLen);
          subBg.lineTo(spx, spy + sph);
          subBg.lineTo(spx + scLen, spy + sph);
          subBg.strokePath();
          subBg.beginPath();
          subBg.moveTo(spx + spw - scLen, spy + sph);
          subBg.lineTo(spx + spw, spy + sph);
          subBg.lineTo(spx + spw, spy + sph - scLen);
          subBg.strokePath();
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
          const sfill = 0x2e4f7a;
          const srx = W / 2 - 300,
            sry = 650,
            sbw = 600,
            sbh = 170,
            sbrr = 18;
          senteG.fillStyle(0x07080f, 1);
          senteG.fillRoundedRect(srx, sry, sbw, sbh, sbrr);
          senteG.fillStyle(sfill, 0.3);
          senteG.fillRoundedRect(srx, sry, sbw, sbh, sbrr);
          senteG.fillStyle(0xffffff, 0.055);
          senteG.fillRoundedRect(srx + 4, sry + 4, sbw - 8, 70, 13);
          senteG.fillStyle(sfill, 1);
          senteG.fillRoundedRect(srx, sry, 12, sbh, {
            tl: sbrr,
            tr: 0,
            bl: sbrr,
            br: 0,
          });
          senteG.fillStyle(sfill, 0.3);
          senteG.fillTriangle(
            srx + sbw,
            sry + sbh - 44,
            srx + sbw,
            sry + sbh,
            srx + sbw - 44,
            sry + sbh,
          );
          senteG.lineStyle(8, sfill, 0.16);
          senteG.strokeRoundedRect(
            srx - 4,
            sry - 4,
            sbw + 8,
            sbh + 8,
            sbrr + 3,
          );
          senteG.lineStyle(1.5, 0xe5d5b1, 0.45);
          senteG.strokeRoundedRect(srx, sry, sbw, sbh, sbrr);
          senteG.lineStyle(1, sfill, 0.28);
          senteG.strokeRoundedRect(srx + 5, sry + 5, sbw - 10, sbh - 10, 13);
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

          // 先手クリアバッジ
          if (beatenData[item.diff]?.first) {
            const bx = srx + sbw - 30,
              by = sry + 30,
              br = 28;
            const sbdg = this.add.graphics();
            sbdg.fillStyle(0xf0d060, 0.22);
            sbdg.fillCircle(bx, by, br + 8);
            sbdg.fillStyle(0x120d00, 1);
            sbdg.fillCircle(bx, by, br + 3);
            sbdg.fillStyle(0xb07d08, 1);
            sbdg.fillCircle(bx, by, br);
            sbdg.fillStyle(0xf5c518, 1);
            sbdg.fillCircle(bx, by, br - 3);
            sbdg.fillStyle(0xfff0a0, 0.45);
            sbdg.fillCircle(bx - 7, by - 7, br * 0.45);
            subObjs.push(sbdg);
            const senteClear = this.add
              .text(bx, by + 1, "✓", {
                fontSize: "30px",
                color: "#3a2800",
                fontFamily: UI_FONT,
                fontStyle: "bold",
              })
              .setOrigin(0.5);
            subObjs.push(senteClear);
          }

          // 後手ボタン
          const goteG = this.add.graphics();
          const gfill = 0x7a3f45;
          const grx = W / 2 - 300,
            gry = 880,
            gbw = 600,
            gbh = 170,
            gbrr = 18;
          goteG.fillStyle(0x07080f, 1);
          goteG.fillRoundedRect(grx, gry, gbw, gbh, gbrr);
          goteG.fillStyle(gfill, 0.3);
          goteG.fillRoundedRect(grx, gry, gbw, gbh, gbrr);
          goteG.fillStyle(0xffffff, 0.055);
          goteG.fillRoundedRect(grx + 4, gry + 4, gbw - 8, 70, 13);
          goteG.fillStyle(gfill, 1);
          goteG.fillRoundedRect(grx, gry, 12, gbh, {
            tl: gbrr,
            tr: 0,
            bl: gbrr,
            br: 0,
          });
          goteG.fillStyle(gfill, 0.3);
          goteG.fillTriangle(
            grx + gbw,
            gry + gbh - 44,
            grx + gbw,
            gry + gbh,
            grx + gbw - 44,
            gry + gbh,
          );
          goteG.lineStyle(8, gfill, 0.16);
          goteG.strokeRoundedRect(grx - 4, gry - 4, gbw + 8, gbh + 8, gbrr + 3);
          goteG.lineStyle(1.5, 0xe5d5b1, 0.45);
          goteG.strokeRoundedRect(grx, gry, gbw, gbh, gbrr);
          goteG.lineStyle(1, gfill, 0.28);
          goteG.strokeRoundedRect(grx + 5, gry + 5, gbw - 10, gbh - 10, 13);
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

          // 後手クリアバッジ
          if (beatenData[item.diff]?.second) {
            const bx = grx + gbw - 30,
              by = gry + 30,
              br = 28;
            const gbdg = this.add.graphics();
            gbdg.fillStyle(0xf0d060, 0.22);
            gbdg.fillCircle(bx, by, br + 8);
            gbdg.fillStyle(0x120d00, 1);
            gbdg.fillCircle(bx, by, br + 3);
            gbdg.fillStyle(0xb07d08, 1);
            gbdg.fillCircle(bx, by, br);
            gbdg.fillStyle(0xf5c518, 1);
            gbdg.fillCircle(bx, by, br - 3);
            gbdg.fillStyle(0xfff0a0, 0.45);
            gbdg.fillCircle(bx - 7, by - 7, br * 0.45);
            subObjs.push(gbdg);
            const goteClear = this.add
              .text(bx, by + 1, "✓", {
                fontSize: "30px",
                color: "#3a2800",
                fontFamily: UI_FONT,
                fontStyle: "bold",
              })
              .setOrigin(0.5);
            subObjs.push(goteClear);
          }

          const subCleanup = () => subObjs.forEach((o) => o.destroy());

          const senteZone = this.add
            .zone(W / 2, 735, 600, 170)
            .setInteractive();
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
      if (!skipZone) objs.push(zone);
    }

    // ─── 阿修羅解放アニメーション（初回のみ） ─────────────────────────────────────
    if (ashuraUnlocked && !ashuraShown) {
      const kisinRange = itemObjRanges["kisin"];
      const kyubiRange = itemObjRanges["kyubi"];
      const ashuraRange = itemObjRanges["ashura"];
      const kisinList = kisinRange ? objs.slice(...kisinRange) : [];
      const kyubiList = kyubiRange ? objs.slice(...kyubiRange) : [];
      const ashuraList = ashuraRange ? objs.slice(...ashuraRange) : [];

      // 阿修羅は最初不可視
      ashuraList.forEach((o) => {
        try {
          o.setAlpha(0);
        } catch (_) {}
      });

      const burstCx = W / 2;
      const burstCy = 1140 - 80 + 82; // 阿修羅カード中央Y

      // ── カードトレースヘルパー ──────────────────────────────────────────
      const drawTrace = (gfx, rx, iy, bw, bh, len, color, lw, la) => {
        gfx.clear();
        gfx.lineStyle(lw, color, la);
        const perim = 2 * (bw + bh);
        let rem = Math.min(len, perim);
        gfx.beginPath();
        gfx.moveTo(rx, iy);
        const top = Math.min(rem, bw);
        gfx.lineTo(rx + top, iy);
        rem -= top;
        if (rem <= 0) {
          gfx.strokePath();
          return;
        }
        const right = Math.min(rem, bh);
        gfx.lineTo(rx + bw, iy + right);
        rem -= right;
        if (rem <= 0) {
          gfx.strokePath();
          return;
        }
        const bottom = Math.min(rem, bw);
        gfx.lineTo(rx + bw - bottom, iy + bh);
        rem -= bottom;
        if (rem <= 0) {
          gfx.strokePath();
          return;
        }
        const left = Math.min(rem, bh);
        gfx.lineTo(rx, iy + bh - left);
        gfx.strokePath();
      };

      // カードの座標（共通）
      const _cardBh = 165;
      const _cardRad = 14;
      const _kisinBw = 305;
      const _kisinRx = W / 2 - 157 - _kisinBw / 2;
      const _kyubiBw = 305;
      const _kyubiRx = W / 2 + 157 - _kyubiBw / 2;
      const _cardIy = 1140 - 80; // 両カード共通y
      const _perim = 2 * (305 + _cardBh);

      // ── Phase A → B → C 連鎖 ────────────────────────────────────────────
      const startPhaseC = (overlays) => {
        // Step1: 鬼神(左)→中央へ、九尾(右)→中央へ スライドしながらフェードアウト
        let mergeCount = 0;
        const onMergeDone = () => {
          if (++mergeCount < 2) return;

          // Step2: 赤フラッシュ × 2
          const rflash = this.add.rectangle(
            W / 2,
            burstCy,
            W,
            260,
            0xcc0000,
            0,
          );
          objs.push(rflash);
          this.tweens.add({
            targets: rflash,
            alpha: { from: 0, to: 0.45 },
            duration: 110,
            yoyo: true,
            repeat: 1,
            onComplete: () => {
              // Step4: 爆発リング × 3（赤橙、横長楕円）
              for (let ri = 0; ri < 3; ri++) {
                this.time.delayedCall(ri * 90, () => {
                  const rg = this.add.graphics();
                  rg.setPosition(burstCx, burstCy);
                  rg.lineStyle(
                    3 - ri * 0.5,
                    ri === 0 ? 0xff8800 : 0xff2200,
                    0.85 - ri * 0.15,
                  );
                  rg.strokeCircle(0, 0, 28);
                  objs.push(rg);
                  this.tweens.add({
                    targets: rg,
                    scaleX: 14,
                    scaleY: 4.5,
                    alpha: 0,
                    duration: 650,
                    ease: "Power2",
                  });
                });
              }

              // Step5: スパーク放射（炎色と赤）
              for (let si = 0; si < 12; si++) {
                const sAngle = (si / 12) * Math.PI * 2;
                const sg = this.add.graphics();
                sg.setPosition(burstCx, burstCy);
                sg.fillStyle(
                  si % 3 === 0 ? 0xff9900 : si % 3 === 1 ? 0xff4400 : 0xff2200,
                  1,
                );
                sg.fillCircle(0, 0, 4 + (si % 3));
                objs.push(sg);
                this.tweens.add({
                  targets: sg,
                  x: burstCx + Math.cos(sAngle) * 200,
                  y: burstCy + Math.sin(sAngle) * 100,
                  alpha: 0,
                  duration: 550,
                  ease: "Power2",
                });
              }

              // Step6: 白フラッシュ（強、阿修羅降臨の瞬間）
              this.time.delayedCall(180, () => {
                const wflash = this.add.rectangle(
                  W / 2,
                  burstCy,
                  W,
                  400,
                  0xffffff,
                  0,
                );
                objs.push(wflash);
                this.tweens.add({
                  targets: wflash,
                  alpha: { from: 0, to: 0.88 },
                  duration: 140,
                  yoyo: true,
                  onComplete: () => {
                    // Step7: 阿修羅フェードイン
                    this.tweens.add({
                      targets: ashuraList,
                      alpha: 1,
                      duration: 350,
                      ease: "Power2",
                      onComplete: () => {
                        // Step8: 衝撃波リング（横長、フェードアウト）
                        const shock = this.add.graphics();
                        shock.setPosition(burstCx, burstCy);
                        shock.lineStyle(2.5, 0xff4400, 0.75);
                        shock.strokeCircle(0, 0, 40);
                        objs.push(shock);
                        this.tweens.add({
                          targets: shock,
                          scaleX: 30,
                          scaleY: 32,
                          alpha: 0,
                          duration: 1500,
                          ease: "Power2",
                        });
                        // 記録＆リフレッシュ
                        this.time.delayedCall(550, () => {
                          try {
                            localStorage.setItem("ashuraShown", "1");
                          } catch (_) {}
                          this._diffPanelCleanup?.();
                          this._diffPanelCleanup = null;
                          this._showDifficultyPanel();
                        });
                      },
                    });
                  },
                });
              });
            },
          });
        };

        // 鬼神: 左から中央へ (+157px) しながらフェード
        this.tweens.add({
          targets: kisinList,
          x: "+=157",
          alpha: 0,
          duration: 700,
          ease: "Power2",
          onComplete: onMergeDone,
        });
        // 九尾: 右から中央へ (-157px) しながらフェード
        this.tweens.add({
          targets: kyubiList,
          x: "-=157",
          alpha: 0,
          duration: 700,
          ease: "Power2",
          onComplete: onMergeDone,
        });
        // オーバーレイ（鬼神・九尾背景）もスライドと同時にフェードアウト
        if (overlays) {
          overlays.forEach((ov) => {
            const ovp = { a: ov.alpha ?? 0.8 };
            this.tweens.add({
              targets: ovp,
              a: 0,
              duration: 700,
              ease: "Power2",
              onUpdate: () => {
                try {
                  ov.setAlpha(ovp.a);
                } catch (_) {}
              },
              onComplete: () => {
                try {
                  ov.clear();
                } catch (_) {}
              },
            });
          });
        }
      }; // startPhaseC end

      const startPhaseB = (kisinOverlayRef) => {
        // ── Phase B: 九尾カード ─ 背景を阿修羅色に + 黒枠トレース ──
        const kyubiOverlay = this.add.graphics();
        objs.push(kyubiOverlay);
        const kyoa = { a: 0 };
        this.tweens.add({
          targets: kyoa,
          a: 0.8,
          duration: 650,
          ease: "Power1",
          onUpdate: () => {
            kyubiOverlay.clear();
            kyubiOverlay.fillStyle(0x0e0205, kyoa.a);
            kyubiOverlay.fillRoundedRect(
              _kyubiRx,
              _cardIy,
              _kyubiBw,
              _cardBh,
              _cardRad,
            );
          },
        });
        const kyubiBorderG = this.add.graphics();
        objs.push(kyubiBorderG);
        const kybp = { t: 0 };
        this.tweens.add({
          targets: kybp,
          t: 1,
          duration: 800,
          ease: "Linear",
          onUpdate: () =>
            drawTrace(
              kyubiBorderG,
              _kyubiRx,
              _cardIy,
              _kyubiBw,
              _cardBh,
              kybp.t * _perim,
              0x444444,
              3,
              0.95,
            ),
          onComplete: () => {
            const kybg = { t: 0 };
            this.tweens.add({
              targets: kybg,
              t: 1,
              duration: 380,
              yoyo: true,
              onUpdate: () =>
                drawTrace(
                  kyubiBorderG,
                  _kyubiRx,
                  _cardIy,
                  _kyubiBw,
                  _cardBh,
                  _perim,
                  0x888888,
                  3 + kybg.t * 5,
                  0.65 + kybg.t * 0.3,
                ),
              onComplete: () => {
                kyubiBorderG.clear();
                startPhaseC([kisinOverlayRef, kyubiOverlay]);
              },
            });
          },
        });
      };

      // ── Phase A: 鬼神カード (T+400ms) ─ 背景を阿修羅色に + 赤枠トレース ──
      this.time.delayedCall(400, () => {
        const kisinOverlay = this.add.graphics();
        objs.push(kisinOverlay);
        const koa = { a: 0 };
        this.tweens.add({
          targets: koa,
          a: 0.8,
          duration: 650,
          ease: "Power1",
          onUpdate: () => {
            kisinOverlay.clear();
            kisinOverlay.fillStyle(0x0e0205, koa.a);
            kisinOverlay.fillRoundedRect(
              _kisinRx,
              _cardIy,
              _kisinBw,
              _cardBh,
              _cardRad,
            );
          },
        });
        const kisinBorderG = this.add.graphics();
        objs.push(kisinBorderG);
        const kbp = { t: 0 };
        this.tweens.add({
          targets: kbp,
          t: 1,
          duration: 800,
          ease: "Linear",
          onUpdate: () =>
            drawTrace(
              kisinBorderG,
              _kisinRx,
              _cardIy,
              _kisinBw,
              _cardBh,
              kbp.t * _perim,
              0xff2200,
              3,
              0.95,
            ),
          onComplete: () => {
            const kbg = { t: 0 };
            this.tweens.add({
              targets: kbg,
              t: 1,
              duration: 380,
              yoyo: true,
              onUpdate: () =>
                drawTrace(
                  kisinBorderG,
                  _kisinRx,
                  _cardIy,
                  _kisinBw,
                  _cardBh,
                  _perim,
                  0xff4400,
                  3 + kbg.t * 5,
                  0.72 + kbg.t * 0.22,
                ),
              onComplete: () => {
                kisinBorderG.clear();
                startPhaseB(kisinOverlay);
              },
            });
          },
        });
      });
    } // if (ashuraUnlocked && !ashuraShown) end

    const resetT = this.add
      .text(W / 2 - 200, 1510, "リセット", {
        fontSize: "30px",
        color: "#cc7744",
        fontFamily: UI_FONT,
      })
      .setOrigin(0.5)
      .setInteractive();
    resetT.on("pointerdown", () => {
      try {
        const testData = {};
        localStorage.setItem("soloBeaten", JSON.stringify(testData));
        localStorage.removeItem("ashuraShown");
      } catch (_e) {}
      cleanup();
      this._showDifficultyPanel();
    });
    objs.push(resetT);

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

    // 切替ボタン
    const toggleLabel = isProgressionMode ? "自由モード切替" : "段位モード切替";
    const toggleColor = isProgressionMode ? "#44bb88" : "#aa88cc";
    const toggleT = this.add
      .text(W / 2 + 200, 1510, toggleLabel, {
        fontSize: "30px",
        color: toggleColor,
        fontFamily: UI_FONT,
      })
      .setOrigin(0.5)
      .setInteractive();
    toggleT.on("pointerdown", () => {
      try {
        const next = isProgressionMode ? "free" : "progression";
        localStorage.setItem("soloProgressMode", next);
      } catch (_e) {}
      cleanup();
      this._showDifficultyPanel();
    });
    objs.push(toggleT);
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
