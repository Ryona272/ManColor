# デプロイ手順

## 前提：初回のみ（Git リポジトリをまだ設定していない場合）

```bash
cd "C:\Users\User\OneDrive\Desktop\ManColor"
git init
git remote add origin https://github.com/<ユーザー名>/<リポジトリ名>.git
git branch -M main
```

---

## コードをアップデートする手順（毎回）

### 1. ビルドを作成する

```bash
cd "C:\Users\User\OneDrive\Desktop\ManColor"
npm.cmd run build
```

> `dist/` フォルダが更新される。Render の Static Site はここを参照する。

### 2. 変更をステージングしてコミットする

```bash
git add .
git commit -m "update: 変更内容の説明"
```

> コミットメッセージは日本語でもOK。変更内容がわかるように書くと後で便利。
> 例: `git commit -m "fix: 強いAIのぐるぐる連鎖読みを追加"`

### 3. GitHub にプッシュする

```bash
git push origin main
```

> 初回プッシュで認証を求められた場合は、GitHub のユーザー名とパスワード（または Personal Access Token）を入力する。

### 4. Render にデプロイする

1. [Render ダッシュボード](https://dashboard.render.com/) を開く
2. **Web Service**（サーバー）を選択 → **Manual Deploy** → **Deploy latest commit**
3. **Static Site**（フロントエンド）を選択 → **Manual Deploy** → **Deploy latest commit**

> Render を「Auto Deploy」に設定している場合は、プッシュすると自動でデプロイが始まるので手順4は不要。

---

## コミット履歴を確認する

```bash
git log --oneline
```

## 直前のコミットを修正する（まだプッシュ前）

```bash
git commit --amend -m "修正後のメッセージ"
```

## 間違えてコミットしたファイルをなかったことにする（まだプッシュ前）

```bash
git reset HEAD~1
```

## URL 早見表

| 用途                           | URL                                                                                |
| ------------------------------ | ---------------------------------------------------------------------------------- |
| **フロントエンド（遊ぶ場所）** | Render ダッシュボード → Static Site → 上部に表示される `https://xxxx.onrender.com` |
| **サーバー（疎通確認）**       | `https://mancolor.onrender.com`                                                    |

> Static Site の URL は Render ダッシュボードを開いて、左メニューから **Static Sites** → ManColor のサービスをクリック → 画面上部の青いリンクで確認できる。

---

## Render 設定の固定チェック

| 項目                          | 値                        |
| ----------------------------- | ------------------------- |
| Web Service Start Command     | `npm run room:server`     |
| Static Site Build Command     | `npm ci && npm run build` |
| Static Site Publish Directory | `dist`                    |
| `VITE_ROOM_SERVER_HOST`       | `mancolor.onrender.com`   |
| `VITE_ROOM_SERVER_PORT`       | `443`                     |

## 障害時の切り分け

1. `https://mancolor.onrender.com` を開いて `ok` が返るか確認
2. Static Site の環境変数に `https://` を入れていないか確認
3. Web Service ログに起動エラーが出ていないか確認
4. 解消しない場合は `Clear build cache & deploy` を実行
