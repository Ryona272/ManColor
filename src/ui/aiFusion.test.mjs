import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { playAiFusion } from "./aiFusion.js";

function createScene() {
  const objects = [];
  const make = (kind, x = 0, y = 0, text) => {
    const o = new EventEmitter();
    Object.assign(o, { kind, x, y, text, alpha: 1, active: true });
    for (const method of ["setDepth", "setInteractive", "setOrigin", "setScale",
      "clear", "lineStyle", "lineBetween", "fillStyle", "fillCircle", "strokeCircle"]) {
      o[method] = () => o;
    }
    o.setName = (name) => { o.name = name; return o; };
    o.setAlpha = (alpha) => { o.alpha = alpha; return o; };
    o.setAngle = (angle) => { o.angle = angle; return o; };
    o.setPosition = (px, py) => { o.x = px; o.y = py; return o; };
    o.setDisplaySize = (w, h) => { o.width = w; o.height = h; return o; };
    o.add = (children) => { o.list = children; return o; };
    o.destroy = () => {
      o.active = false;
      o.list?.forEach((child) => child.destroy());
    };
    objects.push(o);
    return o;
  };
  let config;
  let stopped = false;
  const scene = {
    events: new EventEmitter(),
    add: {
      container: (...args) => make("container", ...args),
      rectangle: (...args) => make("rectangle", ...args),
      graphics: () => make("graphics"),
      image: (...args) => make("image", ...args),
      text: (...args) => make("text", ...args),
    },
    tweens: { add: (options) => {
      config = options;
      return { stop: () => { stopped = true; } };
    } },
  };
  return { scene, objects, get config() { return config; }, get stopped() { return stopped; } };
}

test("fusion reaches its reveal and completes only once", () => {
  const f = createScene();
  let completions = 0;
  const stop = playAiFusion(f.scene, () => completions++);
  const pictures = f.objects.filter((o) => o.kind === "image");
  for (const progress of [0.2, 0.4, 0.49, 0.6, 0.7, 0.85, 1]) {
    f.config.targets.value = progress;
    f.config.onUpdate();
    assert.ok(pictures.every((o) => Number.isFinite(o.x) && Number.isFinite(o.y)));
  }
  assert.equal(pictures[0].alpha, 0);
  assert.equal(pictures[1].alpha, 0);
  assert.equal(pictures[2].alpha, 1);
  f.config.onComplete();
  stop();
  f.config.onComplete();
  assert.equal(completions, 1);
  assert.equal(f.stopped, true);
  assert.equal(f.scene.events.listenerCount("shutdown"), 0);
  assert.ok(f.objects.every((o) => !o.active));
});

test("fusion skip completes once, while disposal and shutdown do not complete", () => {
  for (const action of ["skip", "dispose", "shutdown"]) {
    const f = createScene();
    let completions = 0;
    const stop = playAiFusion(f.scene, () => completions++);
    const skip = f.objects.find((o) => o.text === "スキップ");
    if (action === "skip") skip.emit("pointerdown");
    if (action === "dispose") stop();
    if (action === "shutdown") f.scene.events.emit("shutdown");
    skip.emit("pointerdown");
    f.config.onComplete();
    assert.equal(completions, action === "skip" ? 1 : 0);
    assert.equal(f.stopped, true);
    assert.ok(f.objects.every((o) => !o.active));
    assert.equal(f.scene.events.listenerCount("shutdown"), 0);
  }
});
