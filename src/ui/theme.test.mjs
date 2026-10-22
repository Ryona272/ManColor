import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerUiFrames } from "./theme.js";

test("lock icon is a standalone PNG with an alpha channel", () => {
  const png = readFileSync(new URL("../../public/img/icon_lock.png", import.meta.url));
  assert.equal(png.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
  assert.equal(png[25], 6);
});

test("AI card frames fit the PNG sheets and preserve every difficulty", () => {
  const sizeOf = (file) => {
    const png = readFileSync(new URL(`../../public/img/${file}`, import.meta.url));
    assert.equal(png.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
    return [png.readUInt32BE(16), png.readUInt32BE(20)];
  };
  const [width, height] = sizeOf("mancolor_ui_ai_all_sheet.png");
  assert.deepEqual([width, height], [880, 1260]);
  assert.deepEqual(sizeOf("mancolor_ui_ai_locked_sheet.png"), [880, 1260]);

  const frames = new Map();
  const lockedFrames = new Map();
  const textures = new Map([
    ["mancolor-ui-ai", { width, height }],
    ["mancolor-ui-ai-locked", { width, height }],
    ["mancolor-ui-secondary", { width: 982, height: 2000 }],
    ["mancolor-ui-equipped", { width: 2000, height: 1852 }],
  ].map(([key, size]) => [key, {
    getSourceImage: () => size,
    add(name, source, x, y, w, h) {
      assert.equal(source, 0);
      assert.ok(x >= 0 && y >= 0 && x + w <= size.width && y + h <= size.height);
      if (key === "mancolor-ui-ai") frames.set(name, [x, y, w, h]);
      if (key === "mancolor-ui-ai-locked") lockedFrames.set(name, [x, y, w, h]);
    },
  }]));
  registerUiFrames({ textures: { get: (key) => textures.get(key) } });
  assert.deepEqual([...frames.keys()], ["kooni", "yasha", "rasetsu", "kisin", "kyubi", "ashura", "kugutsu"]);
  assert.deepEqual(frames.get("kisin"), [40, 640, 392, 174]);
  assert.deepEqual(frames.get("kyubi"), [448, 640, 392, 174]);
  assert.deepEqual(frames.get("ashura"), [40, 840, 800, 174]);
  assert.deepEqual([...lockedFrames], [...frames]);
});
