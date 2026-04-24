# PC + Smartphone Verification Guide

# ターミナル(View→terminal)での動作

# ディレクトリの移動

cd "C:\Users\User\OneDrive\Desktop\ManColor"

# 依存インストール

npm.cmd install

# サーバー起動

# package.jsonでromm:serverとして記述

# lanは同じWiFi下でデバッグ作業できる

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

# git用

cmd /c "cd /d C:\Users\User\OneDrive\Desktop\ManColor && npm run build && git add -A && git commit -m "update" && git push"
