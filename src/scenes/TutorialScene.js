/**
 * TutorialScene - チュートリアルオーバーレイシーン
 * GameScene + UIScene の上に重ねて動作する。
 * GameScene が tutorialMode: true で起動したときに自動でlaunchされる。
 *
 * ─── カスタマイズ方法 ──────────────────────────────────────────────────────
 *
 * ① 初期盤面・占い石を変えたい
 *    → 下の TUTORIAL_CONFIG を編集する。
 *      selfPits[0-4] が自分の路（桜/幸/結/玉/竹）、oppPits[0-4] が相手の路。
 *      fortuneSelf/Opp/Center を変えると占い石が変わる。
 *
 * ② 終盤デモの盤面を変えたい
 *    → ENDGAME_BOARD を編集する。
 *
 * ③ チュートリアルのステップを追加・変更したい
 *    → STEPS 配列を編集する。
 *    各ステップのフィールド:
 *      id            : 識別子（文字列）
 *      type          : "explain" | "play" | "opp-play" | "kutakuta" | "predict"
 *      title         : パネルのタイトル
 *      text          : パネルの本文（\n で改行）
 *      panelPos      : パネル位置 "top" | "center" | "bottom"（省略時 "center"）
 *      panelColor    : パネルのアクセント色（省略時 C_PANEL_EXPLAIN）
 *      btnLabel      : OKボタンのラベル（explain/opp-play/predict 用、省略時 "次へ"）
 *      highlight     : ハイライトするピットの配列（例: [0,1,2,3,4,5]）
 *      fortuneHighlight: ハイライトする占い石（"self"|"opp"|"center0"|"center1"|"center2"）
 *      circleOnly    : 丸記号のみ表示する [[pitIndex, pos], ...]
 *                      pos: 0=上, 1=右, 2=下, 3=左（ダイヤ頂点）
 *      allowedPits   : play 時にタップ許可するピットの配列（省略時 null = 全て許可）
 *      oppPit        : opp-play 時に AI に撒かせるピットのインデックス（0–11）
 *      boardReset    : このステップ前に盤面を再設定するオブジェクト（ENDGAME_BOARD 形式）
 *
 *    タイプ別の動作:
 *      "explain"   → OKボタンを押すと次のステップへ
 *      "play"      → 路をタップして手番を完了すると次のステップへ（OKボタンなし）
 *      "opp-play"  → OKを押すと AI が指定ピットを撒く → 次のステップへ
 *      "kutakuta"  → くたくたボタンを押すと次のステップへ（UIScene 経由）
 *      "predict"   → OKを押すと予測フェーズを開始してチュートリアル終了
 *
 * ──────────────────────────────────────────────────────────────────────────
 */

import { soundManager } from "../audio/SoundManager.js";

const W = 1080;
const H = 1920;
const UI_FONT = '"Yu Gothic UI", "Hiragino Sans", sans-serif';
const DISPLAY_FONT = '"Yu Mincho", "Hiragino Mincho ProN", serif';

// ─── カラー設定（VS Code カラーピッカーで編集可）────────────────────────────
const C_PANEL_EXPLAIN_CSS = "#4a7bbf"; // 説明パネル（青）
const C_PANEL_SKIP_CSS = "#c4a44a"; // 終盤スキップパネル（金）
const C_PANEL_PREDICT_CSS = "#b09766"; // 予測パネル（タン）
const C_PANEL_BG_CSS = "#060e1a"; // パネル背景
const C_HIGHLIGHT_DEFAULT_CSS = "#ff8c00"; // ハイライト（橙）
const C_HIGHLIGHT_ACTIVE_CSS = "#00e5ff"; // ハイライト操作可能（シアン）
const C_LABEL_CIRCLE_CSS = "#c45a68"; // 路ラベル丸
const C_TEXT_TITLE_CSS = "#ffe0a8"; // タイトル文字
const C_TEXT_BODY_CSS = "#d8e8ff"; // 本文文字
const C_TEXT_BACK_CSS = "#c0c8d8"; // 戻るボタン文字
const C_TEXT_OK_CSS = "#ffffff"; // OKボタン文字
const C_BTN_BACK_BG_CSS = "#1c2438"; // 戻るボタン背景
const C_STROKE_CSS = "#000000"; // テキストストローク

// Phaser 用 0x 整数（自動変換）
const C_PANEL_EXPLAIN = parseInt(C_PANEL_EXPLAIN_CSS.slice(1), 16);
const C_PANEL_SKIP = parseInt(C_PANEL_SKIP_CSS.slice(1), 16);
const C_PANEL_PREDICT = parseInt(C_PANEL_PREDICT_CSS.slice(1), 16);
const C_PANEL_BG = parseInt(C_PANEL_BG_CSS.slice(1), 16);
const C_HIGHLIGHT_DEFAULT = parseInt(C_HIGHLIGHT_DEFAULT_CSS.slice(1), 16);
const C_HIGHLIGHT_ACTIVE = parseInt(C_HIGHLIGHT_ACTIVE_CSS.slice(1), 16);
const C_LABEL_CIRCLE_COLOR = parseInt(C_LABEL_CIRCLE_CSS.slice(1), 16);

// ピット位置（GameScene と同じ）
const PIT_POSITIONS = {
  0: { x: W / 2 - 340, y: 1320 },
  1: { x: W / 2 - 170, y: 1430 },
  2: { x: W / 2, y: 1540 },
  3: { x: W / 2 + 170, y: 1430 },
  4: { x: W / 2 + 340, y: 1320 },
  5: { x: W - 150, y: H * 0.5 },
  6: { x: W / 2 + 340, y: 600 },
  7: { x: W / 2 + 170, y: 490 },
  8: { x: W / 2, y: 380 },
  9: { x: W / 2 - 170, y: 490 },
  10: { x: W / 2 - 340, y: 600 },
  11: { x: 150, y: H * 0.5 },
};

// ─────────────────────────────────────────────────────────────────────────────
// TUTORIAL_CONFIG : 初期盤面・占い石の設定
//   標準の 3石×5路 配置。手番は自分→相手→自分→相手… と交互に進みます。
//
//   手番の流れと技発動の仕組み:
//     T1 自分 pit[3] 玉  3石 → pit[4,5,6]         基本の撒き方デモ
//     T2 相手 pit[8] 結opp 3石 → pit[9,10,11]      相手の手番デモ
//     T3 自分 pit[2] 結  3石 → pit[3,4,5]          最後が pit[5] → ぐるぐる！
//     T4 自分(追加) pit[3] 玉 1石 → pit[4]          追加ターン（pit[3] を空に）
//     T5 相手 pit[6] 竹opp 4石 → pit[7,8,9,10]     相手の手番
//     T6 自分 pit[0] 桜  3石 → pit[1,2,3]          pit[3] が空 → ざくざく！pit[9] を奪う
//     （盤面リセット → ちらちらデモ用セットアップへ）
//     T7 相手 pit[10] 桜opp → 相手の手番
//     T8 自分 pit[4] 竹  7石 → pit[11]             → ちらちら or ぽいぽい！
// ─────────────────────────────────────────────────────────────────────────────
const TUTORIAL_CONFIG = {
  fortuneSelf: "red", // 自分の占い石
  fortuneOpp: "blue", // 相手の占い石
  fortuneCenter: ["green", "yellow", "purple"], // 中央 [左, 真ん中, 右]（ボーナス: 端+1, 真ん中-4）

  // 自分の路 pit[0-4]（桜・幸・結・玉・竹）各3石
  selfPits: [
    ["blue", "green", "yellow"], // pit[0] 桜: 3石（T6 でざくざく用）
    ["purple", "blue", "green"], // pit[1] 幸: 3石
    ["yellow", "red", "blue"], // pit[2] 結: 3石（T3 でぐるぐる用）
    ["red", "green", "purple"], // pit[3] 玉: 3石（T1 で基本手番用）
    ["blue", "yellow", "red"], // pit[4] 竹: 3石
  ],

  // 相手の路 pit[6-10]（竹・玉・結・幸・桜）各3石
  oppPits: [
    ["green", "purple", "blue"], // pit[6]  竹opp（T5 で AI が使う）
    ["red", "yellow", "green"], // pit[7]  玉opp
    ["purple", "blue", "red"], // pit[8]  結opp（T2 で AI が使う）
    ["yellow", "green", "red"], // pit[9]  幸opp（T6 でざくざくに奪われる）
    ["blue", "purple", "yellow"], // pit[10] 桜opp
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// CHIRACHIRA_SETUP : ちらちら/ぽいぽいデモ用の盤面
//   自然なゲーム進行でちらちらを体験するのは難しいため、この場面を準備します。
//   pit[4] 竹に7石を置き、T8 で撒くと pit[11]（相手賽壇）に着地 → 技選択！
// ─────────────────────────────────────────────────────────────────────────────
const CHIRACHIRA_SETUP = {
  selfPits: [
    ["blue", "red"], // pit[0] 桜: 2石
    ["green", "purple", "blue"], // pit[1] 幸: 3石
    ["green", "yellow"], // pit[2] 結: 2石
    ["red", "blue", "green"], // pit[3] 玉: 3石
    ["blue", "yellow", "red", "green", "purple", "red", "blue"], // pit[4] 竹: 7石
  ],
  selfStore: ["red", "green", "blue", "purple"], // pit[5] 自賽壇: 4石
  oppPits: [
    ["green", "purple", "blue"], // pit[6]
    ["red", "yellow", "green"], // pit[7]
    ["purple", "blue", "red"], // pit[8]
    ["yellow", "green", "blue"], // pit[9]
    ["yellow", "purple", "yellow"], // pit[10] 桜opp（AI が T7 で使う）
  ],
  oppStore: ["green", "red"], // pit[11] 相手賽壇: 2石（ぽいぽいで排除できる）
};

// ─────────────────────────────────────────────────────────────────────────────
// ENDGAME_BOARD : 終盤デモ用の盤面（「終盤へ進む」ボタンで適用される）
//   自路に赤・青のみ（2色）→ くたくた条件成立
// ─────────────────────────────────────────────────────────────────────────────
const ENDGAME_BOARD = {
  selfPits: [
    ["green", "purple"], // pit[0] 桜:   1石
    ["purple"], // pit[1] 幸: 1石
    ["green"], // pit[2] 結: 0石
    [], // pit[3] 玉: 3石
    ["red", "green"], // pit[4] 竹: 7石
  ],
  selfStore: [
    "red",
    "blue",
    "purple",
    "yellow",
    "blue",
    "yellow",
    "red",
    "red",
    "green",
    "red",
  ], // pit[5] 自賽壇: 4石
  oppPits: [
    ["purple"], // pit[6]
    ["yellow"], // pit[7]
    ["purple"], // pit[8]
    ["yellow", "blue"], // pit[9]
    ["yellow", "purple", "yellow"], // pit[10] 桜opp（AI が T7 で使う）
  ],
  oppStore: ["green", "blue", "blue", "red", "green", "blue"], // pit[11] 相手賽壇: 2石（ぽいぽいで排除できる）
};

// ─────────────────────────────────────────────────────────────────────────────
// STEPS : チュートリアルの流れを定義する配列
//   ここを編集すればステップの追加・変更・順番入れ替えができます。
//   各フィールドの意味はファイル先頭のコメントを参照してください。
// ─────────────────────────────────────────────────────────────────────────────
const STEPS = [
  // ── 0: ウェルカム ──────────────────────────────────────────────────────
  {
    id: "welcome",
    type: "explain",
    title: "ManColorへようこそ！",
    text:
      "このチュートリアルでManColorの\n" +
      "遊び方を学びましょう！\n" +
      "\n" +
      "ゲームを通じて基本ルールと\n" +
      "技を体験できます！",
    btnLabel: "はじめる！",
    panelPos: "center",
  },

  // ── 1: 盤面説明 ────────────────────────────────────────────────────────
  {
    id: "board",
    type: "explain",
    title: "路（みち）と賽壇（さいだん）",
    text:
      "画面下半分があなたの陣地です。\n" +
      "5つの「路」に石が3個ずつ入っています。\n" +
      "左から順に桜・幸・結・玉・竹と名前があります。\n" +
      "\n" +
      "右のひし形が「賽壇(さいだん)」。ここに石を集めましょう！\n" +
      "\n" +
      "手番になったら路を選んで石を撒きます。",
    panelPos: "top",
    highlight: [0, 1, 2, 3, 4, 5], // 自分の路と自賽壇をハイライト
    circleOnly: [
      [0, 2],
      [1, 2],
      [2, 2],
      [3, 2],
      [4, 2],
    ], // 路の下頂点に丸
  },

  // ── 2: 占い石 ① ────────────────────────────────────────────────────────
  {
    id: "fortune1",
    type: "explain",
    title: "占い石（うらないいし）と得点①",
    text:
      "盤面中央の「占い石」が各色の石の点数を決めます。\n" +
      "最初に見えているのは手前（自分）の石だけ。\n" +
      "奥（相手）の石は相手にしか見えません。",
    panelPos: "top",
    fortuneHighlight: ["self", "opp", "center0", "center1", "center2"],
  },

  // ── 3: 占い石 ② ────────────────────────────────────────────────────────
  {
    id: "fortune2",
    type: "explain",
    title: "占い石（うらないいし）と得点②",
    text:
      "自分の占い石（手前）と同じ色 → ＋3点\n" +
      "相手の占い石（奥）と同じ色   → ＋5点\n" +
      "中央3つの占い石：端＝＋1、真ん中＝－4点\n" +
      "\n" +
      "相手の行動や特殊技「ちらちら」で情報を集めましょう！",
    panelPos: "top",
  },

  // ── 4: 基本の撒き方説明（T1 の前）────────────────────────────────────
  {
    id: "basic-rule",
    type: "explain",
    title: "基本の撒き方",
    text:
      "自由に自分の路を選んで石を取り、\n右隣の路から順に石を1つずつ撒いていきます。\n" +
      "\n" +
      "「次へ」を押して、光っている「玉」の路をタップしてみましょう！",
    panelPos: "top",
    highlight: [3], // 玉の路をハイライト
  },

  // ── 5: T1 自分の手番（基本）──────────────────────────────────────────
  //   pit[3] 玉 3石 → pit[4,5,6] に撒かれる（通常の手番、特殊技なし）
  {
    id: "play-basic",
    type: "play",
    title: "基本の手番！",
    text: "玉の路（右から2番目）をタップして\n石を撒いてみよう！\n好きな順番でタップしてOK！",
    panelPos: "top",
    allowedPits: [3],
    highlight: [3],
  },

  // ── 6: T2 相手の手番 ────────────────────────────────────────────────
  //   AI が pit[10] 竹opp（3石）から撒く → pit[9,10,11]
  {
    id: "opp-turn-1",
    type: "opp-play",
    title: "相手の番！",
    text:
      "相手が「竹」の路から石を撒きます。\n" +
      "相手の動きをよく見ておきましょう！",
    panelPos: "top",
    oppPit: 10,
    highlight: [10],
  },

  // ── 7: 相手の石の動き───────────────────────────────────
  {
    id: "opp-turn-1-move",
    type: "explain",
    title: "相手の動き",
    text:
      "相手は青い石を自分の賽壇に入れましたよ。\n" +
      "もしかしたら相手の占い石の色は青かも？",
    panelPos: "top",
    highlight: [11], // 相手の賽壇をハイライト
  },

  // ── 8: ぐるぐるルール説明（T3 の前）───────────────────────────────────
  {
    id: "guruguru-rule",
    type: "explain",
    title: "技①「ぐるぐる」",
    text:
      "あなたの番です。\n" +
      "撒いた最後の石がちょうど自分の賽壇に入ると\n" +
      "「ぐるぐる！」が発動！\n" +
      "もう1ターン連続で行動できます。\n" +
      "\n" +
      "「次へ」を押して、結の路をタップ！\n" +
      "3つの石が順に撒かれ、賽壇に最後の石が入ります。",
    panelPos: "top",
    highlight: [2], // 結の路をハイライト
  },

  // ── 9: T3 自分の手番（ぐるぐる）────────────────────────────────────
  //   pit[2] 結 3石 → pit[3,4,5] → 最後が pit[5]（賽壇）→ ぐるぐる！
  //   ぐるぐる後: _onGameTurnComplete(isExtraTurn=true) → ステップ9（説明）へ
  {
    id: "play-guruguru",
    type: "play",
    title: "ぐるぐるを発動しよう！",
    text: "結の路（左から3番目）をタップ！",
    panelPos: "top",
    allowedPits: [2],
    highlight: [2],
  },

  // ── 10: ぐるぐる追加ターンの案内（T4 の前）────────────────────────────
  //   ぐるぐるが発動して追加ターン中（playerTurn=true のまま）に表示される。
  {
    id: "guruguru-extra",
    type: "play",
    title: "ぐるぐる！追加ターン",
    text:
      "もう1ターン！\n" +
      "実はさらにもう１回ぐるぐるを発動できます！\n" +
      "どこの路を選べばいいでしょうか？",
    panelPos: "top",
    allowedPits: [1],
    highlight: [],
  },

  // ── 11: ぐるぐる追加ターンの案内（T4 の前）────────────────────────────
  //   正解の路を選べた（playerTurn=true のまま）に表示される。
  {
    id: "guruguru-extra-2",
    type: "explain",
    title: "ぐるぐる！追加ターン",
    text:
      "すごい！\n" +
      "路の右端には、ぐるぐるができる石の数が書いてあります。\n" +
      "ここを見て判断しましょう！",
    panelPos: "top",
    circleOnly: [[1, 1]], // 幸の路の右頂点に丸を表示
  },

  // ── 12: ぐるぐる追加ターンの案内（T4 の前）────────────────────────────
  //   正解の路を選べた（playerTurn=true のまま）に表示される。
  {
    id: "guruguru-extra-3",
    type: "explain",
    title: "さらにぐるぐる！追加ターン",
    text:
      "もう１ターン！\n" +
      "さらにダメ押しのぐるぐるができそうですね。\n" +
      "\n" +
      "ぐるぐるは可能なら何連続でも発動できますし、\n" +
      "あえてぐるぐるができる路を選ばないのも１つの戦略です。",
    panelPos: "top",
  },

  // ── 13: さらにぐるぐる追加ターンの案内（T4 の前）────────────────────────────
  //   さらにぐるぐる（playerTurn=true のまま）に表示される。
  {
    id: "guruguru-extra-4",
    type: "play",
    title: "さらにぐるぐる！追加ターン",
    text: "ここはぐるぐるを発動してみよう！",
    panelPos: "top",
    allowedPits: [3],
    highlight: [],
  },

  // ── 14: ざくざくルール説明（T6 の前）────────────────────────────────
  {
    id: "zakuzaku-rule",
    type: "explain",
    title: "技②「ざくざく」",
    text:
      "あなたの手番です。\n" +
      "撒いた最後の石が「'空の'自分の路」に入ると\n" +
      "「ざくざく！」が発動！\n" +
      "同じ模様の相手の路の石を全て奪えます！\n" +
      "\n" +
      "「次へ」を押して、結の路をタップ！\n" +
      "石が1つ撒かれ、空の「玉」に入ります。",
    panelPos: "center",
    highlight: [2], // 結の路をハイライト
  },

  // ── 15: 自分の手番（ざくざく）───────────────────────────────────
  {
    id: "play-zakuzaku",
    type: "play",
    title: "ざくざくを発動しよう！",
    text:
      "結の路をタップ！\n" +
      "同じ玉の路から石を奪います。\n" +
      "奪った石は自分の路に自由に撒けます。\n" +
      "今回は黄を桜に、緑を幸に、赤を玉に\n" +
      "それぞれ撒いてみましょう。\n",
    panelPos: "center",
    allowedPits: [2],
    highlight: [2],
    placementAllowedPits: [0, 1, 3], // 奪った石の配置先（桜・幸・玉のみ）
  },

  // ── 16: ちらちら/ぽいぽい ────────────────────────────────
  //   pit[7] 3石 → pit[8,9(空),10(空)] → ざくざく！→ pit[4](竹 7石)を奪取
  //   奪った7石を pit[10]に6個・pit[9]に1個配置（アニメ表示）
  {
    id: "zakuzaku-counter",
    type: "opp-play",
    title: "相手の番！",
    text:
      "大変！\n" +
      "相手が「幸」の路から石を撒くようです。\n" +
      "相手もざくざくをしてきます！",
    panelPos: "center",
    oppPit: 7,
    highlight: [7],
    tutorialOppPlacement: [10, 10, 10, 10, 10, 10, 9], // 奪った7石: 桜opp(pit[10])に6個、幸opp(pit[9])に1個
    // step15のざくざく（pit[2]→pit[3]空→pit[9]奪取）＋配置後の状態
    boardReset: {
      selfPits: [
        ["blue", "green", "yellow", "purple", "yellow"], // pit[0] 桜: 5石
        ["green"], // pit[1] 幸: 1石（ざくざく奪取後配置）
        [], // pit[2] 結: 空（使用済み）
        ["purple", "red"], // pit[3] 玉: 2石（ざくざく奪取後配置）
        ["blue", "yellow", "red", "red", "red", "green", "yellow"], // pit[4] 竹: 7石
      ],
      selfStore: ["green", "blue", "yellow", "blue"],
      oppPits: [
        ["green", "purple", "blue", "purple"], // pit[6] 竹opp: 4石
        ["red", "yellow", "green"], // pit[7] 玉opp: 3石
        ["purple", "blue", "red"], // pit[8] 結opp: 3石
        [], // pit[9] 幸opp: 0石（ざくざくで奪われた）
        [], // pit[10] 桜opp: 0石
      ],
      oppStore: ["blue"],
    },
  },

  // ── 17: ちらちら/ぽいぽいルール説明 ──────────────────────────────────
  //   相手がpit[7]（3石）→ pit[8,9,10] → 空pit[10]着地 → ざくざく → pit[4](7石)を奪取
  //   tutorialOppPlacement: [10×6, 9×1] 配置後の状態
  {
    id: "opp-zakuzaku-explain",
    type: "explain",
    title: "相手の路の配置に注意しよう！",
    text:
      "相手の空白の路と同じ模様の路に石を貯めておくと\n" +
      "とても危険です。\n" +
      "特に自分の色の石が奪われるのは避けたいですね。",
    panelPos: "center",
    // step16のopp-ざくざく（pit[7]→pit[10]空→pit[4]奪取）＋配置後の状態
    boardReset: {
      selfPits: [
        ["blue", "green", "yellow", "purple", "yellow"], // pit[0] 桜: 5石
        ["green"], // pit[1] 幸: 1石
        [], // pit[2] 結: 空
        ["purple", "red"], // pit[3] 玉: 2石
        [], // pit[4] 竹: 0石（相手ざくざくで奪われた）
      ],
      selfStore: ["green", "blue", "yellow", "blue"],
      oppPits: [
        ["green", "purple", "blue", "purple"], // pit[6] 竹opp: 4石
        [], // pit[7] 玉opp: 0石（使用済）
        ["purple", "blue", "red", "red"], // pit[8] 結opp: 4石
        ["yellow", "yellow"], // pit[9] 幸opp: 2石
        ["green", "blue", "yellow", "red", "red", "red", "green"], // pit[10] 桜opp: 7石
      ],
      oppStore: ["blue"],
    },
  },

  // ── 18: もう一度ざくざくを────────────────────────
  {
    id: "re-zakuzaku",
    type: "explain",
    title: "自分の番！",
    text:
      "どうにかして相手の石を奪い返したいですね。\n" +
      "どんな手があるでしょうか？",
    panelPos: "center",
  },

  // ── 19: 技の連鎖と連携──────────────────────────
  {
    id: "guruguru_chain_zakuzaku",
    type: "explain",
    title: "本当に最適解？",
    text:
      "相手の石を奪いたいなら\n" +
      "「幸」の路一択ですよね！\n" +
      "\n" +
      "本当にそうでしょうか？\n" +
      "実はあーしてこうしてどうにかすると、\n" +
      "相手の「竹」の路をざくざくで奪うことができます。\n",
    panelPos: "center",
    highlight: [1],
  },

  // ── 20: ぐるぐる連鎖とざくざく連携にトライ ──────────────────────────────────────────────
  {
    id: "guruguru_chain_zakuzaku_play①",
    type: "play",
    title: "ぐるぐる連鎖とざくざくの連携プレイ①",
    text: "頑張って相手の「竹」の路をざくざくで奪おう！\n",
    panelPos: "top",
    allowedPits: [3],
    highlight: [],
  },

  // ── 21: ぐるぐる連鎖とざくざく連携にトライ ──────────────────────────────────────────────
  {
    id: "guruguru_chain_zakuzaku_play②",
    type: "play",
    title: "ぐるぐる連鎖とざくざくの連携プレイ②",
    text: "頑張って相手の「竹」の路をざくざくで奪おう！\n",
    panelPos: "top",
    allowedPits: [4],
    highlight: [],
  },

  // ── 22: ぐるぐる連鎖とざくざく連携にトライ ──────────────────────────────────────────────
  {
    id: "guruguru_chain_zakuzaku_play③",
    type: "play",
    title: "ぐるぐる連鎖とざくざくの連携プレイ③",
    text: "頑張って相手の「竹」の路をざくざくで奪おう！\n",
    panelPos: "top",
    allowedPits: [0],
    highlight: [],
  },

  // ── 23: ぐるぐる連鎖とざくざく連携にトライ ──────────────────────────────────────────────
  {
    id: "guruguru_chain_zakuzaku_play④",
    type: "play",
    title: "ぐるぐる連鎖とざくざくの連携プレイ④",
    text: "頑張って相手の「竹」の路をざくざくで奪おう！\n",
    panelPos: "top",
    allowedPits: [4],
    highlight: [],
  },

  // ── 24: ぐるぐる連鎖とざくざく連携にトライ ──────────────────────────────────────────────
  {
    id: "guruguru_chain_zakuzaku_play⑤",
    type: "play",
    title: "ぐるぐる連鎖とざくざくの連携プレイ⑤",
    text:
      "素晴らしい！最高の手番でした！\n" +
      "\n" +
      "奪った石は自由に配置してみましょう。\n" +
      "好きな石をタップして、次に好きな路をタップします。",
    panelPos: "top",
    allowedPits: [3],
    highlight: [],
    placementAllowedPits: null, // 奪った石は自由配置
  },

  // ── 25: ぐるぐる連鎖とざくざく連携説明 ───────────────────────────────────────────
  {
    id: "guruguru_chain_zakuzaku_explain",
    type: "explain",
    title: "ぐるぐる連鎖とざくざくの連携プレイ⑥",
    text:
      "ぐるぐるがどれだけできるかで石の獲得量が変わります。\n" +
      "なるべく多くぐるぐるをして、相手に圧をかけましょう！",
    panelPos: "top",
  },

  // ── 26: ぐるぐる連鎖とざくざく連携説明2 ───────────────────────────────────────────
  {
    id: "guruguru_chain_zakuzaku_explain2",
    type: "explain",
    title: "ぐるぐる連鎖とざくざくの連携プレイ⑦",
    text:
      "＜注意＞\n" +
      "中央の占い石と同じ色を賽壇に入れてしまうと\n" +
      "1個につき－4点とかなり痛手です。\n" +
      "むやみやたらに石を入れると後で後悔するかも…。",
    panelPos: "top",
    fortuneHighlight: ["center1"],
  },

  // ── 27: ちらちらルール説明 ─────────────────────────────────────────────
  //   boardReset: CHIRACHIRA_SETUP で盤面を再設定
  //   pit[4] 竹 7石 → pit[5..11] → 最後が pit[11]（相手賽壇）→ 技選択
  {
    id: "chirachira-rule",
    type: "explain",
    title: "技③「ちらちら」",
    text:
      "撒いた最後の石が相手の賽壇に入ると\n" +
      "「ちらちら」か「ぽいぽい」を選べます！\n" +
      "\n" +
      "「ちらちら」→ 中央の占い石を1つずつ覗き見できます。\n" +
      "\n" +
      "「次へ」を押して、竹の路をタップ！\n" +
      "石が撒かれて相手の賽壇に入ります。",
    panelPos: "center",
    highlight: [4],
    boardReset: CHIRACHIRA_SETUP,
  },

  // ── 28: ちらちら発動（play）────────────────────────────────────────────
  {
    id: "play-chirachira",
    type: "play",
    title: "ちらちらを発動しよう！",
    text: "竹の路をタップ！\n" + "適当に撒いて「ちらちら」を選んでみよう。",
    panelPos: "top",
    allowedPits: [4],
    highlight: [4],
    tutorialForceSpecial: "chirachira", // ちらちらのみ選択可能
  },

  // ── 29: ちらちら後説明 ──────────────────────────────────────────────────
  {
    id: "chirachira-result",
    type: "explain",
    title: "ちらちら！",
    text:
      "中央の占い石の色が1つわかりました！\n" +
      "この色は相手にはまだ見えていません。\n" +
      "ちらちらをした回数だけあなたが有利になります。\n" +
      "この情報をもとに、どの色の石を賽壇に入れるか\n" +
      "戦略を立てましょう。",
    panelPos: "top",
    fortuneHighlight: ["center0"],
  },

  // ── 30: ぽいぽいルール説明 ──────────────────────────────────────────────
  //   boardReset: CHIRACHIRA_SETUP で盤面を再設定（もう一度同じ状況を作る）
  {
    id: "poipoi-rule",
    type: "explain",
    title: "技③「ぽいぽい」",
    text:
      "今度は「ぽいぽい」を発動してみよう！\n" +
      "\n" +
      "「ぽいぽい」→ 相手か自分の賽壇の石を1つ捨てられます。\n" +
      "相手にとって高得点な色、" +
      "もしくは自分のマイナスの石を捨てましょう。\n" +
      "\n" +
      "「次へ」を押して、竹の路をタップ！",
    panelPos: "top",
    highlight: [4],
    boardReset: CHIRACHIRA_SETUP,
  },

  // ── 31: ぽいぽい発動（play）─────────────────────────────────────────────
  {
    id: "play-poipoi",
    type: "play",
    title: "ぽいぽいを発動しよう！",
    text:
      "竹の路をタップ！\n" +
      "適当に撒いて「ぽいぽい」を選んでみよう。\n" +
      "\n" +
      "今回は相手の賽壇を選んでみます。\n" +
      "相手の賽壇に赤があるので、赤を捨ててみましょう。",
    panelPos: "top",
    allowedPits: [4],
    highlight: [4],
    tutorialForceSpecial: "poipoi", // ぽいぽいのみ選択可能
  },

  // ── 32: ぽいぽい後説明 ──────────────────────────────────────────────────
  {
    id: "poipoi-result",
    type: "explain",
    title: "ぽいぽい！",
    text:
      "相手の賽壇から赤い石を1つ捨てました！\n" +
      "赤を捨てたことで、赤は得点の高い石だと思われてしまいます。\n" +
      "ブラフとして使うのもありですね！",
    panelPos: "top",
  },

  // ── 33: くたくたルール説明 ──────────────────────────────────────────────
  //   boardReset: ENDGAME_BOARD → 自路が赤・青の2色のみ → くたくた条件成立
  {
    id: "kutakuta-rule",
    type: "explain",
    title: "技④「くたくた」",
    text:
      "自分の路の石の色が2色以下になったとき\n" +
      "「くたくた」が使えます！\n" +
      "\n" +
      "発動するとゲームが強制終了！\n" +
      "勝っていると感じたときに使いましょう。\n" +
      "\n" +
      "まずは「竹」の路をタップしてみましょう！",
    panelPos: "top",
    boardReset: ENDGAME_BOARD,
  },

  // ── 34: 竹を撒く ────────────────────────────────────────────────────────
  {
    id: "play-pre-kutakuta",
    type: "play",
    title: "竹の路を撒こう！",
    text: "竹の路をタップして石を撒こう！",
    panelPos: "top",
    allowedPits: [4],
    highlight: [4],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// TutorialScene クラス
// ─────────────────────────────────────────────────────────────────────────────
export class TutorialScene extends Phaser.Scene {
  constructor() {
    super({ key: "TutorialScene" });
    this.gameScene = null;
    this.stepIndex = 0;
    this.panel = null;
    this.highlightGraphics = [];
    this.highlightTweens = [];
    this._advancing = false; // ステップ遷移中の二重呼び出し防止
    this._predictPhaseStarted = false; // 予測フェーズ開始済みフラグ
  }

  init(data) {
    this.gameScene = data.gameScene;
  }

  create() {
    // GameScene のターン完了フックを設定
    if (this.gameScene) {
      this.gameScene._tutorialTurnCallback = (isExtraTurn) => {
        this._onGameTurnComplete(isExtraTurn);
      };
      this.gameScene._tutorialKutakutaReadyCallback = () =>
        this._onKutakutaReady();
      this.gameScene._tutorialKutakutaSelectedCallback = () =>
        this._onKutakutaSelected();
    }

    // 初期盤面・占い石を固定値に設定（1回だけ）
    this._applyConfig(TUTORIAL_CONFIG);

    // 少し待ってから最初のステップを表示
    // ↓ デバッグ用の先取り番号。本番は 0 に戻す
    const _START = 0;
    this.time.delayedCall(600, () => {
      this._applySimulatedState(_START);
      this._showStep(_START);
    });

    // シャットダウン時にフックをクリア
    this.events.once("shutdown", () => {
      if (this.gameScene) {
        this.gameScene._tutorialTurnCallback = null;
        this.gameScene._tutorialOppTurnCallback = null;
        this.gameScene._tutorialKutakutaReadyCallback = null;
        this.gameScene._tutorialKutakutaSelectedCallback = null;
        this.gameScene.tutorialAllowedPits = null;
        this.gameScene.tutorialForceSpecial = null;
        this.gameScene.tutorialPredictLocked = false;
      }
      this._clearHighlights();
    });
  }

  // ─── 盤面・占い石の設定を適用 ────────────────────────────────────────
  // TUTORIAL_CONFIG または ENDGAME_BOARD（boardReset）を渡す。
  // 存在するフィールドだけを上書きし、ないフィールドは変更しない。
  _applyConfig(config) {
    if (!this.gameScene) return;
    const gs = this.gameScene;
    const state = gs.gameState.getState();
    const mk = (color) => ({ color, face: "front" });

    // 自分の路
    if (config.selfPits) {
      config.selfPits.forEach((colors, i) => {
        state.pits[i].stones = colors.map(mk);
      });
    }
    // 相手の路
    if (config.oppPits) {
      config.oppPits.forEach((colors, i) => {
        state.pits[i + 6].stones = colors.map(mk);
      });
    }
    // 自賽壇（省略時: selfPits が指定されていれば空にリセット）
    if (config.selfStore !== undefined) {
      state.pits[5].stones = config.selfStore.map(mk);
    } else if (config.selfPits) {
      state.pits[5].stones = [];
    }
    // 相手賽壇（省略時: oppPits が指定されていれば空にリセット）
    if (config.oppStore !== undefined) {
      state.pits[11].stones = config.oppStore.map(mk);
    } else if (config.oppPits) {
      state.pits[11].stones = [];
    }
    // 占い石（fortuneSelf が存在する場合のみ設定）
    if (config.fortuneSelf !== undefined) {
      state.fortune.self = { color: config.fortuneSelf, seen: true };
      state.fortune.opp = { color: config.fortuneOpp, seen: false };
      state.fortune.center = config.fortuneCenter.map((color, i) => ({
        color,
        seenBy: [],
        selfPeekOrder: 0,
        oppPeekOrder: 0,
        bonus: i === 1 ? -4 : +1,
      }));
    }

    gs._renderStones();
    gs.scene.get("UIScene")?.refreshFortuneAndDiscard?.();
  }

  // ─── ゲームターン完了コールバック ────────────────────────────────────
  // GameScene が呼び出す。isExtraTurn=true はぐるぐる追加ターン。
  // play タイプのステップ中のみ有効。ぐるぐる・通常どちらも次ステップへ進む。
  _onGameTurnComplete(isExtraTurn) {
    const step = STEPS[this.stepIndex];
    if (!step || step.type !== "play") return;
    this._advanceStep();
  }

  // ─── ステップ表示（メインルーター）──────────────────────────────────
  _showStep(index) {
    this._advancing = false;
    this.stepIndex = index;
    const step = STEPS[index];
    if (!step) return;

    // ハイライト・パネルをクリア
    this._clearHighlights();
    if (this.panel) {
      this.panel.destroy();
      this.panel = null;
    }

    // 入力を全てブロック（各ハンドラで必要に応じて解除）
    if (this.gameScene) {
      this.gameScene.tutorialAllowedPits = [];
      this.gameScene.tutorialForceSpecial = null; // 特殊技制限をリセット
    }

    // boardReset が指定されていれば盤面を再設定してから進む
    if (step.boardReset) {
      this._applyConfig(step.boardReset);
    }

    // タイプ別に処理
    switch (step.type) {
      case "explain":
        this._showExplainStep(step);
        break;
      case "play":
        this._showPlayStep(step);
        break;
      case "opp-play":
        this._showOppPlayStep(step);
        break;
      case "kutakuta":
        this._showKutakutaStep(step);
        break;
      case "predict":
        this._showPredictStep(step);
        break;
      default:
        this._advanceStep();
        break;
    }
  }

  // ─── 説明ステップ ────────────────────────────────────────────────────
  // type:"explain" — テキスト表示 + OKボタン → 次ステップへ
  _showExplainStep(step) {
    this.panel = this._makePanelContainer(
      step.title,
      step.text,
      step.btnLabel || "次へ",
      step.panelColor ?? C_PANEL_EXPLAIN,
      () => this._advanceStep(),
      step.panelPos ?? "center",
    );
    // ハイライト
    if (step.highlight?.length) this._highlightPits(step.highlight);
    if (step.fortuneHighlight?.length)
      this._highlightFortune(step.fortuneHighlight);
    if (step.circleOnly?.length) this._drawCirclesOnly(step.circleOnly);
  }

  // ─── プレイステップ ───────────────────────────────────────────────────
  // type:"play" — 指定ピットのみ操作可能、ターン完了で次ステップへ（OKボタンなし）
  _showPlayStep(step) {
    // 許可ピットを設定してプレイヤーターンを有効化
    if (this.gameScene) {
      this.gameScene.tutorialAllowedPits = step.allowedPits ?? null;
      // tutorialForceSpecial: "chirachira"|"poipoi" → 特殊技選択画面で片方を無効化
      this.gameScene.tutorialForceSpecial = step.tutorialForceSpecial ?? null;
      this.gameScene.playerTurn = true;
      this.gameScene.mode = "turn";
    }
    // ハイライト（highlight が指定されている場合はそちらを優先）
    const pitsToHighlight = step.highlight ?? step.allowedPits;
    if (pitsToHighlight?.length) {
      this._highlightPits(pitsToHighlight, C_HIGHLIGHT_ACTIVE);
    }
    // パネル表示（OKボタンなし）
    this.panel = this._makePanelContainer(
      step.title,
      step.text,
      null,
      step.panelColor ?? C_PANEL_EXPLAIN,
      null,
      step.panelPos ?? "top",
    );
  }

  // ─── 相手ターンステップ ───────────────────────────────────────────────
  // type:"opp-play" — OKを押すと AI が oppPit から撒く → 即次ステップへ
  // AI のアニメーションは実際のゲームロジックを使用する。
  _showOppPlayStep(step) {
    if (step.highlight?.length) this._highlightPits(step.highlight);

    // tutorialOppPlacement を gameScene に渡す（未指定なら null でスキップ）
    if (this.gameScene) {
      this.gameScene.tutorialOppPlacement = step.tutorialOppPlacement ?? null;
    }

    this.panel = this._makePanelContainer(
      step.title,
      step.text,
      step.btnLabel || "OK",
      step.panelColor ?? C_PANEL_EXPLAIN,
      () => {
        // AI に指定ピットを撒かせる（実際のゲームアニメーション）
        if (this.gameScene) {
          this.gameScene.playerTurn = false;
          // AI が撒き終わったら次のステップへ進む
          this.gameScene._tutorialOppTurnCallback = () => this._advanceStep();
          this.gameScene._aiStartSowing?.(step.oppPit);
        }
      },
      step.panelPos ?? "top",
    );
  }

  // ─── くたくたステップ ─────────────────────────────────────────────────
  // type:"kutakuta" — UIScene がくたくたチョイスを表示する
  // 発動後は UIScene → onBeforeResult() が呼ばれ予測フェーズへ進む
  _showKutakutaStep(step) {
    if (this.gameScene) {
      this.gameScene.playerTurn = true;
      this.gameScene.mode = "kutakuta-choice";
      const ui = this.gameScene.scene.get("UIScene");
      if (typeof ui?.showKutakutaChoice === "function") {
        ui.showKutakutaChoice();
      }
    }
    this.panel = this._makePanelContainer(
      step.title,
      step.text,
      null,
      step.panelColor ?? C_PANEL_EXPLAIN,
      null,
      step.panelPos ?? "top",
    );
  }

  // ─── 予測フェーズステップ ─────────────────────────────────────────────
  // type:"predict" — OKを押すと UIScene.showResult() を呼びチュートリアル終了
  _showPredictStep(step) {
    this.panel = this._makePanelContainer(
      step.title,
      step.text,
      step.btnLabel || "次へ",
      step.panelColor ?? C_PANEL_PREDICT,
      () => {
        // チュートリアル完了フラグを記録
        try {
          localStorage.setItem("tutorialDone", "1");
        } catch (_) {}
        // パネルとハイライトを片付ける
        if (this.panel) {
          this.panel.destroy();
          this.panel = null;
        }
        this._clearHighlights();
        if (this.gameScene) {
          this.gameScene.tutorialAllowedPits = null;
          this.gameScene._tutorialTurnCallback = null;
        }
        // 予測フェーズへ（以降は通常のゲームフローに任せる）
        const ui = this.gameScene?.scene?.get("UIScene");
        if (typeof ui?.showResult === "function") ui.showResult();
        this.scene.stop();
      },
      step.panelPos ?? "center",
    );
  }

  // ─── くたくた連続フェーズのパネル更新 ──────────────────────────────────
  // phase 1: くたくた選択肢表示 / 2: 発動直後 / 3: 予測フェーズ開始 / 4: ぽいぽいボーナス説明
  _updateKutakutaPanel(phase) {
    if (this.panel) {
      this.panel.destroy();
      this.panel = null;
    }
    this._clearHighlights();
    switch (phase) {
      case 1:
        this.panel = this._makePanelContainer(
          "くたくたを発動しよう！",
          "「くたくた」ボタンをタップ！\nゲームを終了し、予測フェーズへ移行。",
          null,
          C_PANEL_EXPLAIN,
          null,
          "top",
        );
        break;
      case 2:
        this.panel = this._makePanelContainer(
          "くたくた発動！",
          "ゲームが一時終了！\n",
          null,
          C_PANEL_EXPLAIN,
          null,
          "top",
        );
        break;
      case 3:
        this.panel = this._makePanelContainer(
          "予測フェーズとは",
          "相手の占い石の色を予測します。\n相手の賽壇や行動から色を推理しましょう！\nヒント：ちらちらを３回発動できれば、相手の石の色が確定します。",
          "次へ",
          C_PANEL_PREDICT,
          () => this._updateKutakutaPanel(4),
          "top",
        );
        this._highlightFortune(["opp"]);
        break;
      case 4:
        this.panel = this._makePanelContainer(
          "予測成功のボーナス",
          "予測が的中すると最後に「ぽいぽい」が2回使えます！\n相手か自分の賽壇の石を1つずつ捨てられます。\n\n青色が怪しいですね。タップして決定してみよう！",
          null,
          C_PANEL_PREDICT,
          null,
          "top",
        );
        break;
      case 5:
        this.panel = this._makePanelContainer(
          "予測成功のボーナス",
          "相手の賽壇から2回石を捨ててもいいですし、\n自分の賽壇から2回や両方から1回ずつという選択肢もあります。\nとにかく自分が有利になるように石を捨てましょう！\n両者のぽいぽい後、得点計算が行われゲーム終了です！",
          null,
          C_PANEL_PREDICT,
          null,
          "top",
        );
        break;
    }
  }

  // ─── 竹撒き完了後にくたくた選択肢が現れた ──────────────────────────────
  // GameScene._finishTurnAfterPlayerAction が kutakuta 条件成立時に呼び出す。
  _onKutakutaReady() {
    if (STEPS[this.stepIndex]?.id !== "play-pre-kutakuta") return;
    this._updateKutakutaPanel(1);
  }

  // ─── プレイヤーがくたくたを選択した ────────────────────────────────────
  // GameScene.chooseKutakutaAction("kutakuta") が呼び出す。
  _onKutakutaSelected() {
    this._updateKutakutaPanel(2);
  }

  // ─── UIScene が予測フェーズ UI を表示し始めた ──────────────────────────
  // UIScene._startFinalPredictionPhase が呼び出す。
  _onPredictPhaseStart() {
    this._updateKutakutaPanel(3);
  }

  // ─── 最終得点画面が表示された → チュートリアル完了 ────────────────────
  // UIScene._showStaticFinalResult が呼び出す。
  _onFinalScoreShown() {
    try {
      localStorage.setItem("tutorialDone", "1");
    } catch (_) {}
    if (this.panel) {
      this.panel.destroy();
      this.panel = null;
    }
    this._clearHighlights();
    if (this.gameScene) {
      this.gameScene._tutorialKutakutaReadyCallback = null;
      this.gameScene._tutorialKutakutaSelectedCallback = null;
    }
    this.time.delayedCall(100, () => this.scene.stop());
  }

  // ─── UIScene からのフック（くたくた後・showResult 前に呼ばれる）─────────
  // UIScene が呼び出す。kutakuta ステップ完了後に予測フェーズ説明へ進む。
  onBeforeResult() {
    if (STEPS[this.stepIndex]?.type === "kutakuta") {
      this._advanceStep(); // predict ステップへ
    }
  }

  // ─── ステップ進行 ────────────────────────────────────────────────────
  _advanceStep() {
    if (this._advancing) return;

    const nextIndex = this.stepIndex + 1;
    if (nextIndex >= STEPS.length) {
      this._complete();
      return;
    }

    this._advancing = true;

    if (this.panel) {
      const old = this.panel;
      this.panel = null;
      this.tweens.add({
        targets: old,
        alpha: 0,
        duration: 180,
        ease: "Sine.In",
        onComplete: () => {
          old.destroy();
          this._showStep(nextIndex);
        },
      });
    } else {
      this._showStep(nextIndex);
    }
  }

  // ─── 前のステップへ戻る ──────────────────────────────────────────────
  // explain ステップのみ戻るボタンが表示される（_makePanelContainer 参照）
  _goBack() {
    const prevIndex = this.stepIndex - 1;
    if (prevIndex < 0) return;

    this._clearHighlights();
    if (this.gameScene) this.gameScene.tutorialAllowedPits = [];

    if (this.panel) {
      const old = this.panel;
      this.panel = null;
      this.tweens.add({
        targets: old,
        alpha: 0,
        duration: 150,
        ease: "Sine.In",
        onComplete: () => {
          old.destroy();
          this._showStep(prevIndex);
        },
      });
    } else {
      this._showStep(prevIndex);
    }
  }

  // ─── チュートリアル完了（全ステップ完了時のフォールバック）──────────────
  _complete() {
    try {
      localStorage.setItem("tutorialDone", "1");
    } catch (_) {}
    if (this.panel) {
      this.panel.destroy();
      this.panel = null;
    }
    this._clearHighlights();
    if (this.gameScene) {
      this.gameScene.tutorialAllowedPits = null;
      this.gameScene._tutorialTurnCallback = null;
      this.gameScene._returnToHome?.();
    }
    this.scene.stop();
  }

  // ─── ピットハイライト ─────────────────────────────────────────────────
  // pitIndexes: ピットのインデックス配列
  // color: Phaser 0x 整数（省略時 C_HIGHLIGHT_DEFAULT）
  _highlightPits(pitIndexes, color = C_HIGHLIGHT_DEFAULT) {
    this._clearHighlights();

    for (const i of pitIndexes) {
      const pos = PIT_POSITIONS[i];
      if (!pos) continue;

      const isStore = i === 5 || i === 11;
      const size = isStore ? 300 : 248;

      const g = this.add.graphics();
      g.lineStyle(8, color, 1.0);
      g.fillStyle(color, 0.18);

      const pts = [
        new Phaser.Geom.Point(pos.x, pos.y - size / 2),
        new Phaser.Geom.Point(pos.x + size / 2, pos.y),
        new Phaser.Geom.Point(pos.x, pos.y + size / 2),
        new Phaser.Geom.Point(pos.x - size / 2, pos.y),
      ];
      g.fillPoints(pts, true);
      g.strokePoints(pts, true);
      g.setDepth(9000);

      const tween = this.tweens.add({
        targets: g,
        alpha: 0.3,
        duration: 540,
        yoyo: true,
        repeat: -1,
        ease: "Sine.InOut",
      });
      this.highlightGraphics.push(g);
      this.highlightTweens.push(tween);

      // "board" ステップのときだけ賽壇ラベルを追加
      const _stepId = STEPS[this.stepIndex]?.id;
      if (_stepId === "board") {
        if (isStore) {
          const lbl = this.add
            .text(pos.x, pos.y, "賽壇", {
              fontSize: "54px",
              color: C_TEXT_TITLE_CSS,
              fontFamily: DISPLAY_FONT,
              stroke: C_STROKE_CSS,
              strokeThickness: 5,
              align: "center",
            })
            .setOrigin(0.5, 0.5)
            .setDepth(9500);
          this.highlightGraphics.push(lbl);
        }
        // 非賽壇ピットの丸は circleOnly フィールドで管理
      }
    }
  }

  // ─── ピット頂点に丸だけ描画 ────────────────────────────────────────
  // entries: [[pitIndex, posCode], ...]
  //   posCode: 0=上, 1=右, 2=下, 3=左（ダイヤの各頂点）
  _drawCirclesOnly(entries) {
    for (const [i, posCode] of entries) {
      const pos = PIT_POSITIONS[i];
      if (!pos) continue;
      const half = (i === 5 || i === 11 ? 300 : 248) / 2;
      let cx, cy;
      switch (posCode) {
        case 0:
          cx = pos.x;
          cy = pos.y - half + 40;
          break; // 上
        case 1:
          cx = pos.x + half - 40;
          cy = pos.y;
          break; // 右
        case 2:
          cx = pos.x;
          cy = pos.y + half - 40;
          break; // 下
        case 3:
          cx = pos.x - half + 40;
          cy = pos.y;
          break; // 左
        default:
          cx = pos.x;
          cy = pos.y;
          break;
      }
      const cg = this.add.graphics();
      cg.lineStyle(10, C_LABEL_CIRCLE_COLOR, 1.0);
      cg.strokeCircle(cx, cy, 38);
      cg.setDepth(9001);
      this.highlightGraphics.push(cg);
    }
  }

  _clearHighlights() {
    this.highlightTweens.forEach((t) => t.remove());
    this.highlightTweens = [];
    this.highlightGraphics.forEach((g) => g.destroy());
    this.highlightGraphics = [];
  }

  // ─── 先取り時のボード状態自動シミュレート ──────────────────────────────
  // startIndex > 0 で _showStep を呼ぶ場合、それ以前の play/opp-play を
  // allowedPits[0] / oppPit の順に撒きシミュレートしてボードを再現する。
  // boardReset があるステップではそこからリセットして再スタートする（ざくざく等の
  // 特殊処理を含む正確な盤面スナップショットとして利用）。
  _applySimulatedState(startIndex) {
    if (startIndex <= 0) return;
    const gs = this.gameScene;
    if (!gs) return;
    const state = gs.gameState.getState();

    this._applyConfig(TUTORIAL_CONFIG);

    for (let i = 0; i < startIndex; i++) {
      const step = STEPS[i];
      if (!step) break;

      if (step.boardReset) {
        this._applyConfig(step.boardReset);
        continue;
      }

      let src = null;
      if (step.type === "play" && step.allowedPits?.length) {
        src = step.allowedPits[0];
      } else if (step.type === "opp-play" && step.oppPit != null) {
        src = step.oppPit;
      }
      if (src !== null && state.pits[src].stones.length > 0) {
        this._simulateSow(state.pits, src);
      }
    }

    gs._renderStones();
    gs.scene.get("UIScene")?.refreshFortuneAndDiscard?.();
  }

  // 反時計回りに石を1個ずつ配布（単純撒き。ざくざく等の特殊処理なし）
  _simulateSow(pits, srcIdx) {
    const stones = [...pits[srcIdx].stones];
    pits[srcIdx].stones = [];
    let idx = srcIdx;
    for (const stone of stones) {
      idx = (idx + 1) % 12;
      pits[idx].stones.push(stone);
    }
  }

  // ─── 占い石ハイライト ─────────────────────────────────────────────────
  // targets: "self" | "opp" | "center0" | "center1" | "center2" の配列
  _highlightFortune(targets, color = C_HIGHLIGHT_DEFAULT) {
    const fortuneY = H * 0.5;
    const RADIUS = 52;
    const shift = 26;
    const posMap = {
      self: { x: W / 2, y: fortuneY + 220 + shift },
      opp: { x: W / 2, y: fortuneY - 220 - shift },
      center0: { x: W / 2 - 120, y: fortuneY },
      center1: { x: W / 2, y: fortuneY },
      center2: { x: W / 2 + 120, y: fortuneY },
    };

    for (const key of targets) {
      const pos = posMap[key];
      if (!pos) continue;

      const g = this.add.graphics();
      g.lineStyle(7, color, 1.0);
      g.fillStyle(color, 0.18);
      g.fillCircle(pos.x, pos.y, RADIUS);
      g.strokeCircle(pos.x, pos.y, RADIUS);
      g.setDepth(9000);

      const tween = this.tweens.add({
        targets: g,
        alpha: 0.3,
        duration: 540,
        yoyo: true,
        repeat: -1,
        ease: "Sine.InOut",
      });
      this.highlightGraphics.push(g);
      this.highlightTweens.push(tween);
    }
  }

  // ─── パネルUI作成 ─────────────────────────────────────────────────────
  // position: "top" | "center" | "bottom"
  // onBtn が null の場合は OKボタンを表示しない（play ステップ用）
  // 戻るボタンは explain ステップのみ表示（play/kutakuta 中は戻れない）
  _makePanelContainer(
    title,
    text,
    btnLabel,
    accentColor = C_PANEL_EXPLAIN,
    onBtn = null,
    position = "bottom",
  ) {
    const container = this.add.container(0, 0);
    container.setDepth(10000);

    const HEADER_H = 96;
    const BODY_PAD_TOP = 20;
    const BODY_PAD_BTM = 30;
    const LINE_H = 42;
    const lineCount = (text?.match(/\n/g) || []).length + 1;
    const bodyH = lineCount * LINE_H + 20;
    const panelH = HEADER_H + BODY_PAD_TOP + bodyH + BODY_PAD_BTM;
    const panelW = W - 40;

    let panelY;
    if (position === "top") panelY = H / 4 - panelH / 2 - 100;
    else if (position === "center") panelY = Math.round(H / 2 - panelH / 2);
    else panelY = 0.75 * H - panelH / 2 + 100;

    // 背景
    const bg = this.add.graphics();
    bg.fillStyle(C_PANEL_BG, 0.95);
    bg.lineStyle(3, accentColor, 0.9);
    bg.fillRoundedRect(20, panelY, panelW, panelH, 22);
    bg.strokeRoundedRect(20, panelY, panelW, panelH, 22);
    container.add(bg);

    // タイトル（ヘッダー中央）
    const headerCY = panelY + HEADER_H / 2;
    container.add(
      this.add
        .text(W / 2, headerCY, title, {
          fontSize: "40px",
          color: C_TEXT_TITLE_CSS,
          fontFamily: DISPLAY_FONT,
          stroke: C_STROKE_CSS,
          strokeThickness: 5,
          align: "center",
        })
        .setOrigin(0.5, 0.5),
    );

    // 戻るボタン（explain ステップのステップ1以降のみ表示）
    const currentStep = STEPS[this.stepIndex];
    if (this.stepIndex > 0 && currentStep?.type === "explain") {
      const backBtn = this.add
        .text(40, headerCY, " ◀ 戻る ", {
          fontSize: "28px",
          color: C_TEXT_BACK_CSS,
          backgroundColor: C_BTN_BACK_BG_CSS,
          padding: { x: 12, y: 10 },
          fontFamily: UI_FONT,
          stroke: C_STROKE_CSS,
          strokeThickness: 3,
        })
        .setOrigin(0, 0.5)
        .setInteractive();
      backBtn.on("pointerdown", () => {
        soundManager.se_button();
        this._goBack();
      });
      backBtn.on("pointerover", () => backBtn.setAlpha(0.75));
      backBtn.on("pointerout", () => backBtn.setAlpha(1));
      container.add(backBtn);
    }

    // OKボタン（onBtn がある場合のみ）
    if (typeof onBtn === "function") {
      const label = btnLabel || "次へ";
      const okBtn = this.add
        .text(20 + panelW - 20, headerCY, ` ${label} `, {
          fontSize: "28px",
          color: C_TEXT_OK_CSS,
          backgroundColor:
            "#" + accentColor.toString(16).padStart(6, "0").slice(-6),
          padding: { x: 12, y: 10 },
          fontFamily: UI_FONT,
          stroke: C_STROKE_CSS,
          strokeThickness: 3,
        })
        .setOrigin(1, 0.5)
        .setInteractive();
      okBtn.on("pointerdown", () => {
        soundManager.se_button();
        okBtn.disableInteractive();
        okBtn.setAlpha(0.35);
        onBtn();
      });
      okBtn.on("pointerover", () => okBtn.setAlpha(0.8));
      okBtn.on("pointerout", () => okBtn.setAlpha(1));
      container.add(okBtn);
    }

    // 区切り線
    const divG = this.add.graphics();
    divG.lineStyle(1, accentColor, 0.35);
    divG.lineBetween(60, panelY + HEADER_H, W - 60, panelY + HEADER_H);
    container.add(divG);

    // 本文
    if (text) {
      container.add(
        this.add
          .text(W / 2, panelY + HEADER_H + BODY_PAD_TOP, text, {
            fontSize: "30px",
            color: C_TEXT_BODY_CSS,
            fontFamily: UI_FONT,
            align: "center",
            wordWrap: { width: panelW - 80 },
            lineSpacing: 10,
          })
          .setOrigin(0.5, 0),
      );
    }

    // フェードイン
    container.setAlpha(0);
    this.tweens.add({
      targets: container,
      alpha: 1,
      duration: 220,
      ease: "Sine.Out",
    });

    return container;
  }

  update() {
    // 配置フェーズ中の制御
    const step = STEPS[this.stepIndex];
    if (step?.type === "play" && this.gameScene?.mode === "placing") {
      if (step.placementAllowedPits?.length) {
        // 指定順に1か所ずつ解放
        const pending = this.gameScene.gameState?.getPendingPlacement?.() ?? [];
        const total = step.placementAllowedPits.length;
        const placed = Math.max(0, total - pending.length);
        const currentPit = step.placementAllowedPits[placed];
        if (currentPit !== undefined) {
          this.gameScene.tutorialAllowedPits = [currentPit];
        }
      } else {
        // placementAllowedPits が null/未指定 → 全ピット自由配置
        this.gameScene.tutorialAllowedPits = null;
      }
    }
  }
}
