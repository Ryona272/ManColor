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
    this.cameras.main.setBackgroundColor("#0f1824");

    this.load.image("title-logo", "/img/logo.png");

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

    const barWidth = 420;
    const barLeftX = width / 2 - barWidth / 2;
    const barY = height * 0.55;
    const bar = this.add
      .rectangle(barLeftX, barY, 0, 20, 0xe0c97f)
      .setOrigin(0, 0.5);
    const bg = this.add.rectangle(width / 2, barY, barWidth, 20, 0x2a344a);
    bg.setDepth(0);
    bar.setDepth(1);

    const loadingText = this.add
      .text(width / 2, height * 0.6, "Loading... 0%", {
        fontSize: "24px",
        color: "#9fb0ca",
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
