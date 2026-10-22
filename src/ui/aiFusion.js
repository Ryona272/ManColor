const FONT = '"Yu Mincho", "Hiragino Mincho ProN", serif';

export function playAiFusion(scene, onComplete) {
  const layer = scene.add.container(0, 0).setDepth(2000).setName("ai-fusion");
  const backdrop = scene.add.rectangle(540, 960, 1080, 1920, 0x05030c, 0.94)
    .setInteractive();
  const field = scene.add.graphics();
  const left = scene.add.image(-260, 810, "mancolor-ui-ai", "kisin")
    .setDisplaySize(500, 260).setAngle(-7);
  const right = scene.add.image(1340, 1060, "mancolor-ui-ai", "kyubi")
    .setDisplaySize(500, 260).setAngle(7);
  const ashura = scene.add.image(540, 930, "mancolor-ui-ai", "ashura")
    .setDisplaySize(900, 260).setAlpha(0);
  const heading = scene.add.text(540, 550, "武と知、相克", {
    fontFamily: FONT, fontSize: "54px", color: "#f4deb1",
    stroke: "#100814", strokeThickness: 4,
  }).setOrigin(0.5);
  const title = scene.add.text(540, 1170, "阿修羅", {
    fontFamily: FONT, fontSize: "116px", color: "#fff0dc",
    stroke: "#570a15", strokeThickness: 6,
  }).setOrigin(0.5).setAlpha(0);
  const subtitle = scene.add.text(540, 1320, "融合 ― 覚醒", {
    fontFamily: FONT, fontSize: "38px", color: "#ffbd8c",
  }).setOrigin(0.5).setAlpha(0);
  const skip = scene.add.text(970, 1770, "スキップ", {
    fontSize: "28px", color: "#aeb8c9",
  }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true });
  layer.add([backdrop, field, left, right, ashura, heading, title, subtitle, skip]);

  const progress = { value: 0 };
  const clamp = (v) => Math.max(0, Math.min(1, v));
  const ease = (v) => 1 - (1 - clamp(v)) ** 3;
  let tween;
  let stopped = false;
  const stop = () => {
    if (stopped) return;
    stopped = true;
    tween?.stop();
    scene.events.off("shutdown", stop);
    layer.destroy();
  };
  const finish = () => {
    if (stopped) return;
    stop();
    onComplete();
  };
  scene.events.once("shutdown", stop);
  skip.on("pointerdown", finish);

  const render = () => {
    const t = progress.value;
    const entrance = ease(t / 0.2);
    const merge = ease((t - 0.34) / 0.2);
    const reveal = ease((t - 0.54) / 0.18);
    left.setPosition(-260 + 570 * entrance + 230 * merge, 810 + 120 * merge);
    right.setPosition(1340 - 570 * entrance - 230 * merge, 1060 - 130 * merge);
    left.setAlpha(1 - merge).setAngle(-7 + 7 * merge);
    right.setAlpha(1 - merge).setAngle(7 - 7 * merge);
    ashura.setAlpha(reveal).setDisplaySize(900 - 60 * reveal, 260 - 18 * reveal);
    title.setAlpha(reveal).setScale(0.8 + 0.2 * reveal);
    subtitle.setAlpha(clamp((t - 0.72) / 0.12));
    heading.setAlpha(1 - reveal);
    field.clear();

    // Two counter-rotating streams collapse into the same core.
    for (let stream = 0; stream < 2; stream++) {
      const color = reveal > 0 ? 0xff5533 : stream === 0 ? 0xa453ff : 0xffd269;
      for (let n = 0; n < 28; n++) {
        const angle = n / 28 * Math.PI * 2 + t * 12 * (stream ? -1 : 1);
        const radius = (140 + n * 9) * (1 - merge * 0.9) + reveal * 250;
        const x = 540 + Math.cos(angle) * radius;
        const y = 930 + Math.sin(angle) * radius * 0.8;
        field.lineStyle(2, color, (1 - reveal * 0.7) * entrance * 0.6);
        field.lineBetween(x, y, x - Math.cos(angle - 0.3) * 35, y - Math.sin(angle - 0.3) * 24);
        field.fillStyle(color, entrance * (1 - reveal * 0.6));
        field.fillCircle(x, y, 1.5 + n % 3);
      }
    }
    for (let ring = 0; ring < 3; ring++) {
      const radius = 100 + ring * 80 + reveal * 320;
      field.lineStyle(2, reveal ? 0xff8050 : 0xa86bdf, entrance * (1 - reveal) * 0.5);
      field.strokeCircle(540, 930, radius);
    }
    if (t > 0.48 && t < 0.72) {
      field.lineStyle(3, 0xffd3a4, (1 - reveal) * 0.8);
      field.strokeCircle(540, 930, 40 + reveal * 580);
    }
  };
  render();
  tween = scene.tweens.add({
    targets: progress, value: 1, duration: 5800,
    onUpdate: render, onComplete: finish,
  });
  return stop;
}
