# デプロイ手順

## URL 早見表

| 用途                           | URL                                        |
| ------------------------------ | ------------------------------------------ |
| **フロントエンド（遊ぶ場所）** | https://mancolor-static-site.onrender.com/ |
| **サーバー（疎通確認）**       | https://mancolor.onrender.com              |
| **GitHub リポジトリ**          | https://github.com/Ryona272/ManColor       |

---

## アップデート手順（毎回これだけ）

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

## 初回のみ（PCを変えたとき・.gitフォルダが消えたとき）

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

## Render 設定の固定チェック

| 項目                          | 値                        |
| ----------------------------- | ------------------------- |
| Web Service Start Command     | `npm run room:server`     |
| Static Site Build Command     | `npm ci && npm run build` |
| Static Site Publish Directory | `dist`                    |
| `VITE_ROOM_SERVER_HOST`       | `mancolor.onrender.com`   |
| `VITE_ROOM_SERVER_PORT`       | `443`                     |

---

## 障害時の切り分け

1. `https://mancolor.onrender.com` を開いて `ok` が返るか確認
2. Static Site の環境変数に `https://` を入れていないか確認
3. Web Service ログに起動エラーが出ていないか確認
4. 解消しない場合は `Clear build cache & deploy` を実行
