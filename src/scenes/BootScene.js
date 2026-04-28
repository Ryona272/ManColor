/**
 * BootScene - アセット読み込みと初期設定
 */
import { restoreSession } from "../net/firebaseAuth.js";

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: "BootScene" });
    this._bootStarted = false;
  }

  _startGameOnce() {
    if (this._bootStarted) return;
    this._bootStarted = true;
    this.scene.start("LobbyScene");
  }

  preload() {
    // 読み込み進捗バー
    const { width, height } = this.cameras.main;

    this.load.image("title-logo", "/img/logo.png");

    // 背景アトモスフィア
    const bgG = this.add.graphics();
    bgG.fillGradientStyle(0x080d18, 0x0c1022, 0x160b1a, 0x10060f, 1);
    bgG.fillRect(0, 0, width, height);
    // 斜めテクスチャライン
    bgG.lineStyle(1, 0xffffff, 0.022);
    for (let i = -4; i < 16; i++) {
      bgG.beginPath();
      bgG.moveTo(i * 150, 0);
      bgG.lineTo(i * 150 + height * 0.55, height);
      bgG.strokePath();
    }
    // グロー球（ゴールド、右上）
    bgG.fillStyle(0xf0d39a, 0.07);
    bgG.fillCircle(width * 0.88, height * 0.1, 360);
    bgG.fillStyle(0xf0d39a, 0.03);
    bgG.fillCircle(width * 0.88, height * 0.1, 580);
    // グロー球（ブルー、左下）
    bgG.fillStyle(0x55aadd, 0.07);
    bgG.fillCircle(width * 0.12, height * 0.9, 360);
    bgG.fillStyle(0x55aadd, 0.03);
    bgG.fillCircle(width * 0.12, height * 0.9, 560);
    // グロー球（パープル、中央）
    bgG.fillStyle(0x7733aa, 0.04);
    bgG.fillCircle(width * 0.5, height * 0.5, 480);
    // 外枠（二重）
    bgG.lineStyle(1.5, 0xe5d5b1, 0.35);
    bgG.strokeRoundedRect(30, 30, width - 60, height - 60, 28);
    bgG.lineStyle(1, 0xe5d5b1, 0.1);
    bgG.strokeRoundedRect(44, 44, width - 88, height - 88, 22);
    // コーナーLブラケット
    const cLen = 55;
    bgG.lineStyle(2.5, 0xf0d39a, 0.45);
    bgG.beginPath();
    bgG.moveTo(30, 30 + cLen);
    bgG.lineTo(30, 30);
    bgG.lineTo(30 + cLen, 30);
    bgG.strokePath();
    bgG.beginPath();
    bgG.moveTo(width - 30 - cLen, 30);
    bgG.lineTo(width - 30, 30);
    bgG.lineTo(width - 30, 30 + cLen);
    bgG.strokePath();
    bgG.beginPath();
    bgG.moveTo(30, height - 30 - cLen);
    bgG.lineTo(30, height - 30);
    bgG.lineTo(30 + cLen, height - 30);
    bgG.strokePath();
    bgG.beginPath();
    bgG.moveTo(width - 30 - cLen, height - 30);
    bgG.lineTo(width - 30, height - 30);
    bgG.lineTo(width - 30, height - 30 - cLen);
    bgG.strokePath();

    const titleText = this.add
      .text(width / 2, height * 0.34, "ManColor", {
        fontSize: "112px",
        color: "#f3dfb1",
        fontFamily: '"Yu Mincho", "Hiragino Mincho ProN", serif',
        stroke: "#20180e",
        strokeThickness: 8,
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height * 0.44, "読みと知略の石戦", {
        fontSize: "34px",
        color: "#d7c9aa",
        fontFamily: '"Yu Gothic UI", "Hiragino Sans", sans-serif',
      })
      .setOrigin(0.5);

    // サブタイトル装飾ライン
    {
      const dg = this.add.graphics();
      const ly = height * 0.44 + 30;
      dg.lineStyle(1.5, 0xf0d39a, 0.5);
      dg.beginPath();
      dg.moveTo(width / 2 - 180, ly);
      dg.lineTo(width / 2 + 180, ly);
      dg.strokePath();
      dg.lineStyle(1, 0xf0d39a, 0.18);
      dg.beginPath();
      dg.moveTo(width / 2 - 320, ly);
      dg.lineTo(width / 2 - 180, ly);
      dg.strokePath();
      dg.beginPath();
      dg.moveTo(width / 2 + 180, ly);
      dg.lineTo(width / 2 + 320, ly);
      dg.strokePath();
      dg.fillStyle(0xf0d39a, 0.7);
      dg.fillCircle(width / 2 - 180, ly, 3.5);
      dg.fillCircle(width / 2 + 180, ly, 3.5);
      dg.fillStyle(0xf0d39a, 0.45);
      dg.fillCircle(width / 2, ly, 4.5);
      dg.fillCircle(width / 2 - 90, ly, 2.5);
      dg.fillCircle(width / 2 + 90, ly, 2.5);
    }

    const barWidth = 500;
    const barHeight = 16;
    const barLeftX = width / 2 - barWidth / 2;
    const barY = height * 0.55;

    const bg = this.add
      .rectangle(width / 2, barY, barWidth, barHeight, 0x1a2535)
      .setOrigin(0.5, 0.5);
    const bar = this.add
      .rectangle(barLeftX, barY, 0, barHeight, 0xe0c97f)
      .setOrigin(0, 0.5);
    // プログレスバーフレーム（バーの上に描画）
    const barFrameG = this.add.graphics();
    barFrameG.lineStyle(7, 0xe0c97f, 0.14);
    barFrameG.strokeRoundedRect(
      barLeftX - 7,
      barY - barHeight / 2 - 7,
      barWidth + 14,
      barHeight + 14,
      9,
    );
    barFrameG.lineStyle(1.5, 0xe5d5b1, 0.5);
    barFrameG.strokeRoundedRect(
      barLeftX - 3,
      barY - barHeight / 2 - 3,
      barWidth + 6,
      barHeight + 6,
      5,
    );

    const loadingText = this.add
      .text(width / 2, height * 0.6, "Loading... 0%", {
        fontSize: "28px",
        color: "#d7c9aa",
        fontFamily: '"Yu Gothic UI", "Hiragino Sans", sans-serif',
      })
      .setOrigin(0.5);

    this.load.on("progress", (v) => {
      bar.width = barWidth * v;
      loadingText.setText(`Loading... ${Math.round(v * 100)}%`);
    });

    this.load.once("complete", () => {
      if (this.textures.exists("title-logo")) {
        titleText.setVisible(false);
        const logo = this.add.image(width / 2, height * 0.34, "title-logo");
        logo.setScale(0.085);
      }
      loadingText.setText("Loading... 100%");
      // Firebase セッションを復元してからロビーへ遷移
      restoreSession().finally(() => {
        this.time.delayedCall(1800, () => this._startGameOnce());
      });
    });

    // Fallback: if loading stalls for any reason, continue anyway.
    this.time.delayedCall(4000, () => this._startGameOnce());

    // 将来のアセット読み込みはここに追加
    // this.load.image('stone_red', 'assets/images/stone_red.png')
    // this.load.audio('bgm', 'assets/audio/bgm.mp3')
    this.load.image("pattern-self-sakura", "/img/opp_sakura.png");
    this.load.image("pattern-self-yotsuba", "/img/opp_yotsuba.png");
    this.load.image("pattern-self-musubi", "/img/opp_musubi.png");
    this.load.image("pattern-self-magatama", "/img/opp_magatama.png");
    this.load.image("pattern-self-take", "/img/opp_take.png");

    this.load.image("pattern-opp-sakura", "/img/self_sakura.png");
    this.load.image("pattern-opp-yotsuba", "/img/self_yotsuba.png");
    this.load.image("pattern-opp-musubi", "/img/self_musubi.png");
    this.load.image("pattern-opp-magatama", "/img/self_magatama.png");
    this.load.image("pattern-opp-take", "/img/self_take.png");
  }

  create() {
    // 遷移はpreload完了後の演出待ちで行う。
  }
}
