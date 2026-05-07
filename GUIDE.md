# ManColor 統合ガイド

> AI能力一覧・やることリスト・デプロイ手順・動作確認手順をまとめたシート

---

# 目次

1. [AI能力一覧](#1-ai能力一覧)
2. [やることリスト](#2-やることリスト)
3. [デプロイ手順](#3-デプロイ手順)
4. [PC+スマホ動作確認](#4-pcスマホ動作確認)

---

---

# 1. AI能力一覧

最終更新: 2026-05-06

---

## 1-1. AIロジック関数一覧

#### 路選択

- `KugutsuV1` — 5手DFS・攻守バランス型 → **kugutsu（傀儡）**
- `KisinV1` / `KisinV2` / `KisinV3` — ぐるぐる連鎖特化DFS → **kisin（鬼神）**（**V3が現行ゲーム用**）
- `pickPitTechDfsV1` — 技特化3手DFS → **rasetsu（羅刹）**
- `KyubiV1` — KugutsuV1 完コピ（ベースライン）
- `KyubiV2` / `KyubiV3` — 知力特化DFS（ちらちら・ざくざく・妨害）→ **kyubi（九尾）**（**V3が現行ゲーム用**）
- `AshuraV1` / `AshuraV2` — バランス型DFS（ぐるぐる連鎖+ちらちら+neg送出）→ **ashura（阿修羅）**（**V2が現行ゲーム用**）
- `AshuraKiller` — **シミュ用**（AshuraV2対策テストAI）

#### ざくざく配置・撒き順

- `decidePlacementsFortuneKisinV3` — negデコイ配置（neg石を対面ざくざく路へ誘導）→ **kisin専用（現行）**
- `decidePlacementsFortuneKisinV1` — `decidePlacementsFortuneV1` のラッパー（旧版）
- `optimizeSowOrderFortuneKisinV1` — 確定情報のみ・撒き前石並び替え → **kisin専用**
- `decidePlacementsFortuneKyubiV3` — color classスコア（neg→相手賽壇、pos/own→AI賽壇）→ **kyubi・ashura専用（現行）**
- `decidePlacementsFortuneKyubiV1` — pit10/pit9 集中配置（旧版）
- `decidePlacementsFortuneV1` — 占い情報活用の最適配置 → **rasetsu・kugutsu共通**（ざくざく後も使用）
- `optimizeSowOrderFortuneV1` — 撒き前の石並び替え → **rasetsu・kisin・kyubi・ashura共通**

#### SimAI専用

- `decidePlacementsBasicV1` — 簡易配置 → **シミュ用**
- `decideSpecialActionV1` — ちらちら vs ぽいぽい → **kisin・kugutsu（SimAI）**
- `createMemoV1` / `updateMemoV1` — 占い色推測メモ → **全難易度**

> シミュレーション路選択: `KisinV1`（GameAI.js）+ `DEFAULT_KISIN_PARAMS`

---

## 1-2. 路選択フローチャート

```mermaid
flowchart TD
    S[_aiPickPit 呼び出し] --> D{難易度}
    D -->|kooni| R["🎲 完全ランダム"]
    D -->|yasha| Y["技路を優先\n→ なければ pit11 近い順\n  pit10→9→8→7→6"]
    D -->|rasetsu| C{ちらちら消費 < 3?}
    C -->|Yes| P5["pit5 着地を最優先"]
    C -->|No| T["pickPitTechDfsV1\n3手DFS・ぐるぐる連鎖最大化"]
    D -->|kisin| K["KisinV3\nぐるぐる連鎖特化DFS"]
    D -->|kyubi| Q["KyubiV3\n知力特化DFS（ちらちら・ざくざく）"]
    D -->|ashura| A2["AshuraV2\nバランスDFS（ぐるぐる+ちらちら+neg送出）"]
    D -->|kugutsu| G["KugutsuV1\n5手DFS・攻守バランス評価"]
```

---

## 1-3. DFS 統合評価スコア（kisin・kugutsu共通）

全路にスコア計算 → 最高点の路を選択

**KugutsuV1（傀儡）用スコア内訳**

```
┌─ 攻撃 ──────────────────────────────────────────────────────┐
│ ぐるぐる      pit11着地 → 連鎖数²×乗数 + 2色以下で加点       │
│ ざくざく      自路空き着地 + 対面石数比例 + 知識色ボーナス    │
│ ちらちら準備  pit5着地の価値（1〜3回目・序盤/中盤で閾値変化） │
│ 2手先読み    撒き後プレイヤー最善応手後のAI有利ボーナス       │
└─────────────────────────────────────────────────────────────┘
┌─ 防御 ──────────────────────────────────────────────────────┐
│ 脅威成長      相手の攻撃機会増加に減点                        │
│ ざくざく防御  自路・対面に石が多いと非線形ペナルティ          │
│ 被ざくざく防止 撒き後に自路が多く相手対面が空だと大ペナルティ │
│ ちらちら被弾防止 相手pit11着地穴が増えたらペナルティ          │
│ くたくた妨害  相手がくたくた発動可能なら石送りペナルティ      │
└─────────────────────────────────────────────────────────────┘
┌─ 色評価 ────────────────────────────────────────────────────┐
│ pit11着地色  推測相手占い色 > 自占い色 > 確認プラス石         │
│ 路品質評価   路全体の高価値色が多いと加点 / マイナス確定で減点 │
│ 自路着地価値  自路に落ちる石の色価値で加減点                  │
│ 相手賽壇防止  高価値石が pit5 に流れる手を大減点              │
└─────────────────────────────────────────────────────────────┘
┌─ 調整 ──────────────────────────────────────────────────────┐
│ 防御TB        攻撃スコア差が閾値以内の手のみ防御スコアも加味  │
└─────────────────────────────────────────────────────────────┘
```

**KisinV1（鬼神）用スコア内訳（5路5深）**

```
┌─ 評価 ──────────────────────────────────────────────────────┐
│ ぐるぐる      pit11着地 → +50（常に最優先）                   │
│ ちらちら      直前AIターンがぐるぐるの場合のみ +20            │
│               （pit5着地 かつ 上限2回まで）                   │
│ ざくざく      直前AIターンがぐるぐるの場合のみ +8             │
│               （自路空き着地 かつ 対面に石あり）              │
│ その他技       スコアなし（評価対象外）                        │
└─────────────────────────────────────────────────────────────┘
評価は「ぐるぐる連鎖を最大化し、連鎖後にたまたまちらちら/ざくざくが
発生する手を優先」。気分・メモ推測は一切なし。
```

## 1-5. 各システムの難易度別フロー

### 撒き順最適化

```
✗ なし  →  kooni / yasha / kugutsu
○ あり（メモ推測込み）
        →  rasetsu / kisin / kyubi / ashura  optimizeSowOrderFortuneV1
            └ 高価値石 → pit11（AI賽壇）
            └ 低価値石 → pit5（相手賽壇）
            └ 優先順: 推測相手占い色 > 自占い色 > 確認プラス色 > 確定マイナス（絶対入れない）
```

### ざくざく後の石配置

```
ランダム         kooni
占い色優先        yasha    → 自占い色ならぐるぐるセットアップ路へ / それ以外は非空路ランダム
リスク回避        rasetsu  → ぐるぐるセットアップ路優先 + 被ざくざくリスクの低い路をさらに優先
Kisin専用        kisin    decidePlacementsFortuneKisinV3（現行）
              → neg石を対面ざくざく路へ優先配置（デコイ）
              → pos/own/inferred石はpit11方向へ / 確定情報＋メモ推測込み
Kyubi/Ashura専用 kyubi / ashura  decidePlacementsFortuneKyubiV3（現行）
              → color class scoring: neg→相手賽壇(+100) / own/pos→AI賽壇(+50)
              → 未確認石は相手賽壇へやや誘導(-300は自AI賽壇)
スコア最適       kugutsu  decidePlacementsFortuneV1
              → 知識色込みスコアで全路評価し最適配置
```

### ちらちら / ぽいぽい判断

```mermaid
flowchart TD
    A[特殊行動判断] --> B{難易度}
    B -->|kooni / yasha / rasetsu| C{ちらちら残回数 > 0?}
    C -->|Yes| D[ちらちら実行]
    C -->|No| E[ぽいぽい実行]
    B -->|kisin / kugutsu| F{自陣3石以上\nかつ peeksDone < 2?}
    F -->|Yes| D
    F -->|No| G{ぽいぽいの価値\nが閾値以上?}
    G -->|Yes| E
    G -->|No| D
    B -->|kyubi| H[ちらちら3回を最優先実施]
    H --> I{ちらちら完了?}
    I -->|No| D
    I -->|Yes| E
```

> **ぽいぽい閾値（kisin）：** ちらちら残≥2 → 25 / 残1 → 6 / 推測色が相手賽壇に有 → +22 / 石2個以上 → +4

### ぽいぽい石の選択優先順（全難易度共通）

```
1位  AI自身の占い色（相手にとって +5点 の石）
2位  推測プレイヤー占い色（+3点を奪う）
3位  AIが確認済みの中央プラス石（+1を奪う）
4位  プレイヤーが確認済みの中央プラス石
✗   確定マイナス石は絶対に除去しない（取ると相手のマイナスが消える）
⚠   自賽壇に確定マイナス石がある場合は状況次第で自賽壇を捨てる
```

### くたくた発動条件

```
標準（AI賽壇 ≥ 相手賽壇）       →  kooni / yasha / rasetsu / kugutsu / kyubi
条件なし（発動可能なら常に発動）  →  kisin / ashura
```

### 予測フェーズ（ゲーム終了後の占い色当て）

```
ランダム5色  →  kooni
推測色使用   →  yasha / rasetsu / kisin / kyubi / kugutsu
              └ _aiMemo.inferredPlayerColor を優先
              └ なければプレイヤー賽壇の最多色
```

---

## 1-6. memoシステム（プレイヤー占い色の推測）

全難易度共通でターン開始時に更新。

```
観察ソース:
  ・プレイヤー路（pit0〜4）の石   ×1 ウェイト
  ・プレイヤー賽壇（pit5）の石    ×3 ウェイト
  ・AIが確認済みの中央石は除外（個人占い色ではないため）

出力:
  inferredPlayerColor  累積頻度 最多 → 推測プレイヤー占い色
  playerAvoidedColor   累積頻度 最少（3色以上データあり）→ 推定マイナス色
```

---

## 1-7. 難易度プロファイル

```
┌─────────────────────────────────────────────────────────────┐
│ 🟢 kooni（小鬼）                                             │
│  路選択: ランダム                                             │
│  撒き順: ✗   配置: ランダム   ちらちら: 消費優先             │
│  くたくた: 標準   予測: ランダム5色                           │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│ 🔵 yasha（夜叉）                                             │
│  路選択: 技路優先 → pit11近い順                               │
│  撒き順: ✗   配置: 占い色優先   ちらちら: 消費優先            │
│  くたくた: 標準   予測: 推測色                                │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│ 🔴 rasetsu（羅刹）                                           │
│  路選択: ちらちら前 → pit5最優先 / 後 → 3手DFS               │
│  撒き順: ○   配置: ぐるぐる優先 + 被ざくざくリスク回避        │
│  ちらちら: 消費優先   くたくた: 標準   予測: 推測色           │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│ 🟣 kisin（鬼神）                               ぐるぐる連鎖特化型 │
│  路選択: KisinV3（ぐるぐる連鎖特化DFS・neg比率追跡）          │
│    ぐるぐる最優先 / neg色をデコイとしてざくざく路へ誘導        │
│  撒き順: ○（optimizeSowOrderFortuneV1・メモ推測込み）         │
│  配置: decidePlacementsFortuneKisinV3（negデコイ配置）        │
│  ちらちら: 価値比較   くたくた: 発動可能なら常に発動           │
│  予測: 推測色                                                 │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│ 🟡 kyubi（九尾）                               知力・ちらちら特化型│
│  路選択: KyubiV3（ちらちら×3・color class DFS・妨害）         │
│  配置: decidePlacementsFortuneKyubiV3（neg→相手賽壇誘導）     │
│  撒き順: ○   ちらちら: 全3回最優先                            │
│  くたくた: 標準   予測: 推測色                                │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│ 🔴 ashura（阿修羅）                            全方位バランス型  │
│  路選択: AshuraV2（depth=5 DFS・ぐるぐる+ちらちら+neg送出）   │
│  配置: decidePlacementsFortuneKyubiV3（kyubiと共通）          │
│  撒き順: ○（optimizeSowOrderFortuneV1・メモ推測込み）         │
│  ちらちら: 全3回最優先（kyubiと同じ）                         │
│  くたくた: 発動可能なら常に発動（kisinと同じ）                 │
│  予測: 推測色                                                 │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│ ⚫ kugutsu（傀儡）                             攻守バランス型  │
│  路選択: KugutsuV1（5手DFS・攻守バランス）                     │
│  撒き順: ✗（石順ランダム）                                    │
│  配置: スコア最適（decidePlacementsFortuneV1）                 │
│  ちらちら: 価値比較   くたくた: 標準   予測: 推測色            │
└─────────────────────────────────────────────────────────────┘
```

---

---

# 2. やることリスト

---

## 2-1. ゲーム性に関するメモ（検討中）

## 2-2. 黄金石システム（将来機能）

- [ ] **黄金石**をゲーム内通貨として導入する
- [ ] 獲得方法：
  - ソロ（AI対戦）に勝つと黄金石を獲得
  - ランダム対戦でBETして勝つと相手の黄金石を総取り
- [ ] ランダム対戦：黄金石をBETして参加（負けたら相手に全額渡す）
- [ ] 友達と遊ぶ：黄金石BETなし（フリー対戦）
- [ ] **ショップ機能**：黄金石でコスメ系アイテムと交換
  - 背景・アイコンなどゲームプレイに影響しないコンテンツのみ
- [ ] 強いプレイヤーほど黄金石が増える仕組み（実力反映型）
- [ ] 音楽や画像などセキュリティを強化

---

---

# 3. デプロイ手順

---

## 3-1. URL 早見表

| 用途                           | URL                                        |
| ------------------------------ | ------------------------------------------ |
| **フロントエンド（遊ぶ場所）** | https://mancolor-static-site.onrender.com/ |
| **サーバー（疎通確認）**       | https://mancolor.onrender.com              |
| **GitHub リポジトリ**          | https://github.com/Ryona272/ManColor       |

---

## 3-2. アップデート手順（毎回これだけ）

```
npm.cmd run build
git add .
git commit -m "update: 変更内容の説明"
git push origin main
```

その後 [Render ダッシュボード](https://dashboard.render.com/) を開く：

- **Static Site** → Manual Deploy → **Deploy latest commit**
- **Web Service** → Manual Deploy → **Deploy latest commit**（サーバー側を変更した場合のみ）

---

## 3-3. 初回のみ（PCを変えたとき・.gitフォルダが消えたとき）

```
git init
git remote add origin https://github.com/Ryona272/ManColor.git
git branch -M main
```

その後アップデート手順の `git push` を初回だけ以下に変える：

```
git push origin main --force
```

---

## 3-4. Render 設定の固定チェック

| 項目                          | 値                        |
| ----------------------------- | ------------------------- |
| Web Service Start Command     | `npm run room:server`     |
| Static Site Build Command     | `npm ci && npm run build` |
| Static Site Publish Directory | `dist`                    |
| `VITE_ROOM_SERVER_HOST`       | `mancolor.onrender.com`   |
| `VITE_ROOM_SERVER_PORT`       | `443`                     |

---

## 3-5. 障害時の切り分け

1. `https://mancolor.onrender.com` を開いて `ok` が返るか確認
2. Static Site の環境変数に `https://` を入れていないか確認
3. Web Service ログに起動エラーが出ていないか確認
4. 解消しない場合は `Clear build cache & deploy` を実行

---

## 3-6. git 一発コマンド（PowerShell）

```
cmd /c "cd /d C:\Users\User\OneDrive\Desktop\ManColor && npm run build && git add -A && git commit -m "update" && git push"
```

## node simulate.mjs <ai1> <ai2> [試合数]

---

# 4. PC+スマホ動作確認

---

## 4-1. ターミナルコマンド（View → Terminal）

```sh
# ディレクトリの移動
cd "C:\Users\User\OneDrive\Desktop\ManColor"

# 依存インストール
npm.cmd install

# サーバー起動（LAN: 同じWiFi下でデバッグ可）
npm.cmd run room:server:lan

# サーバー自動再起動（開発）
npm.cmd run romm:server:dev

# フロント起動
npm.cmd run dev

# フロントとサーバー同時起動
npm.cmd run dev:all

# Docker ビルドと実行
npm.cmd run docker:build
npm.cmd run docker:run

# Google Play Console用
npm.cmd run release:bundle
```
