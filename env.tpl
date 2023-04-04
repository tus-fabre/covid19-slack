#
# Slackアプリに用いる環境変数
#
# Botユーザートークン　（環境に合わせて変更する）
SLACK_BOT_TOKEN=xoxb-***
# アプリトークン　（環境に合わせて変更する）
SLACK_APP_TOKEN=xapp-***
# ベースURL　（変更不可）
BASE_URL=https://disease.sh/v3/covid-19/
# 選択メニューの項目数
NUM_OF_MENU_ITEMS=20
# データベースURL　（環境に合わせて変更する）
DB_URL=postgres://postgres:Abcd123@localhost:5432/covid19
# 一時ファイルの保存フォルダー
LOCAL_FOLDER=_temp
# 環境設定 production: 本番環境 development: 開発環境
NODE_ENV=development