'use strict';

/*
 * [FILE] app.js
 *
 * [DESCRIPTION]
 *  Lesson Final - Slack APIプログラミング 最終版
 * 
 * [NOTE]
 */
const { getCountryInfo, getCountries, translateCountryName } = require('./functions/covid19');
const { commentModalView, commentInsert } = require('./functions/covid19_comment');
const { csvGenerateFile } = require('./functions/covid19_csv'); 
const { chartMonthlyConfiguration, chartWeeklyConfiguration, chartConfig2Stream, chartStream2File } = require('./functions/covid19_chart');
const { pdfGenerateFile } = require('./functions/covid19_pdf');
const { currentTime, currentHour } = require('./functions/current_time');
const fs = require("fs");

const env = require('dotenv').config();
const nodeEnv=process.env.NODE_ENV;
if (nodeEnv == 'development') {
  console.log("開発モードで起動します");
  console.log(env.parsed);
}

console.log("アプリを起動します");
let datetime = currentTime();
console.log("現在の時刻", datetime);

const { App } = require('@slack/bolt');
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN
});

/*
 * ---------- Message Listeners ----------
 */

/*
 * [MESSAGE LISTENER] hello
 *
 * [DESCRIPTION]
 *  メッセージ'hello'を受け取ったときに起動する関数
 * 
 * [INPUTS]
 *  command - 利用しない
 * 
 * [OUTPUTS]
 *  respond - 'こんにちは <ユーザー名>!'
 *
 * [NOTES]
 *  イベントがトリガーされたチャンネルに say() でメッセージを送信する
 */
app.message('hello', async ({ message, say }) => {
  // messageの内容を確認する
  if (nodeEnv == 'development') console.log(message);
  // メッセージを返信する
  await say(`こんにちは <@${message.user}>!`);
});

/*
 * ---------- Slash Commands ----------
 */

/*
 * [SLASH COMMAND] /hello
 *
 * [DESCRIPTION]
 *  /helloで起動する関数。
 *  現在時間（hour）に応じて、あいさつが異なる。
 * 
 * [INPUTS]
 *  command - 利用しない
 * 
 * [OUTPUTS]
 *  respond
 *    現在時間が4以上10未満のとき、'おはよう <ユーザー名>!'
 *    現在時間が10以上18未満のとき、'こんにちは <ユーザー名>!'
 *    それ以外（現在時間が18以上23未満、0以上4未満）、'こんばんは <ユーザー名>!'
 *    その後に今週の感染状況を折れ線グラフで表示する
 * 
 */
app.command('/hello', async({ack, respond, command})=>{
  // 予め返信しておく
  await ack();
  // commandの内容を確認する
  if (nodeEnv == 'development') console.log(command);
  // 現在時間を取得する
  let hour = currentHour();
  // あいさつの初期値
  let message = "こんばんは";
  if (4 <= hour && hour < 10) 
    message = "おはよう";
  else if (10 <= hour && hour < 18)
    message = "こんにちは";
  message += ` <@${command.user_id}>!\n`;
  message += '今週の感染状況です';
  // コマンドに返答する
  await respond(message);

  // 現在のSlackチャネルIDを取得する
  let channel = command.channel_id;
  // 画像ファイルを生成し、アップロードする
  try {
    const config = await chartWeeklyConfiguration();
    const stream = await chartConfig2Stream(config);
    if (stream != null) {
      const result = await app.client.files.uploadV2({
        channel_id: channel,
        filename: 'simple_chart.png',
        file: stream
      });
      if (nodeEnv == 'development') console.log(result);
    } else {
      await respond('画像ファイルは作成できませんでした。');
    }
  } catch(err) {
    console.error(err.name + ": " + err.message);
    await respond('エラーが発生しました。');
  }
});

/*
 * [SLASH COMMAND] /covid19
 *
 * [DESCRIPTION]
 *  指定した国名の新型コロナウィルス感染状況をSlack画面上に表示するコマンド
 * 
 * [INPUTS]
 *  command.text - 対象となる国名
 * 　指定していなければ日本に設定する。
 * 
 * [OUTPUTS]
 *  respond - JSON構造: {blocks:[<見出し>,<セクション>]}
 * 
 */
app.command('/covid19', async({ack, respond, command}) => {
  // 予め返信しておく
  await ack();
  // commandの内容を確認する
  if (nodeEnv == 'development') console.log(command);
  // 対象とする国名を引数から取得する
  let country = command.text;

  let result = null;
  // 引数が指定されていなければ、選択メニューから国名を選択する
  if (country == '')
    result = await getCountries();
  else // 指定した国の感染状況を取得する
    result = await getCountryInfo(country);

  // 開発モードのとき、出力の内容を表示する
  if (nodeEnv == 'development') console.log(result);
  // コマンドに返答する
  await respond(result);
});

/*
 * [SLASH COMMAND] /translate
 *
 * [DESCRIPTION]
 *  指定した国コードあるいは英語の国名を日本語に変換する
 * 
 * [INPUTS]
 *  command.text - 対象となる国名
 * 
 * [OUTPUTS]
 *  respond - JSON構造: {blocks:[<見出し>,<セクション>]}
 * 
 */
app.command('/translate', async({ack, respond, command}) => {
  // 予め返信しておく
  await ack();
  // commandの内容を確認する
  if (nodeEnv == 'development') console.log(command);
  // 対象とする国名を引数から取得する
  let country = command.text;
  // 出力構造の初期設定
  let result = {
    "type": "plain_text",
    "text": `${country}は見つかりませんでした`,
    "emoji": true
  };
  // 国名を翻訳する
  let translated = await translateCountryName(country);
  if (translated != null) {
    result.text = `[入力した国名] ${country} [日本語の国名] ${translated}`;
  } 
  // 開発モードのとき、出力の内容を表示する
  if (nodeEnv == 'development') console.log(result);
  // コマンドに返答する
  await respond(result);
});

/*
 * ---------- Actions ----------
 */

/*
 * [ACTION METHOD] action-comment
 *
 * [DESCRIPTION]
 *  注釈（コメント）をデータベースに登録するモーダルビューを表示するアクション
 * 
 * [INPUTS]
 *  body.actions[0].value - 選択した国名
 * 
 * [OUTPUTS]
 *  respond - JSON構造: {blocks:[<見出し>,<セクション>]}
 *
 */
app.action('action-comment', async ({ body, ack, client }) => {
  // 予め返信しておく
  await ack();

  // 対象とする国名、現在のチャネルID、ユーザー名をJSONとして保持する
  let json = {};
  json.country = body.actions[0].value;
  json.channel = body.channel.id;
  json.user = body.user.username;
  let message = json.country + "にコメントを追加します";

  // モーダルビュー向けJSON構造を生成する
  let objModal = commentModalView(body.trigger_id, "コメント登録", message, json);
  try {
    await client.views.open(objModal); // モーダルビューを開く
  } catch (error) {
    console.error(error.name + ": " + error.message);
  }
});

/*
 * [ACTION METHOD] action-csv-generate
 *
 * [DESCRIPTION]
 *  対象とする国の感染状況をCSVファイルに保存した後、ファイルをSlackにアップロードする
 * 
 * [INPUTS]
 *  body.actions[0].value - ファイル生成対象とする国名
 *  body.channel.id - 現在のSlackチャネルID
 * 
 * [OUTPUTS]
 *  respond - ファイルアップロードに成功したか失敗したかのメッセージ
 * 
 */
app.action('action-csv-generate', async ({ body, ack, respond }) => {
  // 予め返信しておく
  await ack();
  // 対象とする国名
  let country = body.actions[0].value;
  // SlackチャネルIDを取得する
  let channel = body.channel.id;
  await respond('ファイルを作成中です...');

  // 国名を選択するメニューを構成する
  const result = await getCountryInfo(country);
  if (nodeEnv == 'development') console.log(result);
  await respond(result);

  // CSVファイルを生成する
  const csv_file = await csvGenerateFile(country);
  let message = '';
  if (csv_file != null) {
    try {
      const result = await app.client.files.uploadV2({
        channel_id: channel,
        filename: csv_file,
        file: fs.createReadStream(csv_file)
      });
      if (nodeEnv == 'development') console.log(result);
    } catch(err) {
      console.error(err.name + ": " + err.message);
      message = 'ファイルをアップロードできません。';
    }

    // CSVファイルを削除する
    fs.unlink(csv_file, (err => {
      if (err) console.error(err.name + ": " + err.message);
    }));
  } else {
    message = 'ファイルは作成できません。';
  }
  // エラーメッセージがあれば返答する
  if (message != '') await respond(message);
});

/*
 * [ACTION METHOD] action-get-countries
 *
 * [DESCRIPTION]
 *  国名を選択するメニューを表示するアクション
 * 
 * [INPUTS]
 *  body.actions[0].value - 選択した国名、しかし利用しない
 * 
 * [OUTPUTS]
 *  respond - JSON構造: {blocks:[<見出し>,<セクション>]}
 */
app.action('action-get-countries', async ({ body, ack, respond }) => {
  // 予め返信しておく
  await ack();
  // 選択した国名
  let country = body.actions[0].value;
  // 国名を選択するメニューを構成する
  const result = await getCountries();
  // 開発モードのとき、出力の内容を表示する
  if (nodeEnv == 'development') console.log(result);
  // アクションに返答する
  await respond(result);
});

/*
 * [ACTION METHOD] action-get-info
 *
 * [DESCRIPTION]
 *  新型コロナウィルス感染状況をSlack画面上で再表示するアクション
 *  「再表示」ボタンから起動される
 * 
 * [INPUTS]
 *  body.actions[0].value - 選択した国名
 * 
 * [OUTPUTS]
 *  respond - JSON構造: {blocks:[<見出し>,<セクション>]}
 */
app.action('action-get-info', async ({ body, ack, respond }) => {
  // 予め返信しておく
  await ack();
  // 選択した国名
  let country = body.actions[0].value;
  // 国名を選択するメニューを構成する
  const result = await getCountryInfo(country);
  // 開発モードのとき、出力の内容を表示する
  if (nodeEnv == 'development') console.log(result);
  // アクションに返答する
  await respond(result);
});

/*
 * [ACTION METHOD] action-get-info-all
 *
 * [DESCRIPTION]
 *  全世界の新型コロナウィルス感染状況をSlack画面上で表示するアクション
 *  「全世界」ボタンから起動される
 * 
 * [INPUTS]
 *  body.actions[0].value - all
 * 
 * [OUTPUTS]
 *  respond - JSON構造: {blocks:[<見出し>,<セクション>]}
 */
app.action('action-get-info-all', async ({ body, ack, respond }) => {
  // 予め返信しておく
  await ack();
  // 選択した国名
  let country = body.actions[0].value;
  // 選択した国の感染状況を取得する
  const result = await getCountryInfo(country);
  // 開発モードのとき、出力の内容を表示する
  if (nodeEnv == 'development') console.log(result);
  // アクションに返答する
  await respond(result);
});

/*
 * [ACTION METHOD] action-graph-history
 *
 * [DESCRIPTION]
 *  30日間の新型コロナウィルス新規感染者数を棒グラフ、死亡者数を折れ線グラフで表示する画像を作成する
 * 
 * [INPUTS]
 *  body.actions[0].value - 選択した国名
 *  body.channel.id - 現在のSlackチャネルID
 * 
 * [OUTPUTS]
 *  respond - getCountryInfo()からのJSON構造（国名選択に戻る）
 * 
 */
app.action('action-graph-history', async ({ body, ack, respond }) => {
  // 予め返信しておく
  await ack();
  // 選択した国名
  let country = body.actions[0].value;
  // 現在のSlackチャネルIDを取得する
  let channel = body.channel.id;
  await respond('グラフを作成中です...');

  // 国名を選択するメニューを構成する
  const result = await getCountryInfo(country);
  if (nodeEnv == 'development') console.log(result);
  await respond(result);

  // 画像ファイルを生成し、アップロードする
  try {
    const config = await chartMonthlyConfiguration(country);
    const stream = await chartConfig2Stream(config);
    if (stream != null) {
      const result = await app.client.files.uploadV2({
        channel_id: channel,
        filename: `${country}.png`,
        file: stream
      });
      if (nodeEnv == 'development') console.log(result);
    } else {
      await respond('画像ファイルは作成できませんでした。');
    }
  } catch(err) {
    console.error(err.name + ": " + err.message);
    await respond('エラーが発生しました。');
  }

});

/*
 * [ACTION METHOD] action-report-history
 *
 * [DESCRIPTION]
 *  新型コロナウィルスの感染状況をPDFファイルで表示する
 * 
 * [INPUTS]
 *  body.actions[0].value - 選択した国名
 *  body.channel.id - 現在のSlackチャネルID
 * 
 * [OUTPUTS]
 *  respond - getCountryInfo()からのJSON構造（国名選択に戻る）
 * 
 */
app.action('action-report-history', async ({ body, ack, respond }) => {
  // 予め返信しておく
  await ack();
  // 選択した国名
  let country = body.actions[0].value;
  // 現在のSlackチャネルIDを取得する
  let channel = body.channel.id;
  await respond('レポートを作成中です...');

  // 国名を選択するメニューを構成する
  const result = await getCountryInfo(country);
  if (nodeEnv == 'development') console.log(result);
  await respond(result);

  // PDFファイルを生成し、アップロードする
  try {
    const config = await chartMonthlyConfiguration(country);
    const stream = await chartConfig2Stream(config);
    const png_file = await chartStream2File(stream);
    if (png_file != null) {
      let now = currentTime();
      const pdf_file = await pdfGenerateFile(now, country, png_file);
      if (pdf_file != null) {
        const result2 = await app.client.files.uploadV2({
          channel_id: channel,
          filename: pdf_file,
          file: fs.readFileSync(pdf_file) // Open as a buffer
        });
        if (nodeEnv == 'development') console.log(result2);

        // PDFファイルを削除する
        fs.unlink(pdf_file, (err => {
          if (err) console.error(err.name + ": " + err.message);
        }));
      } else {
        await respond('PDFファイルは作成できませんでした。');
      }

      // 画像ファイルを削除する
      fs.unlink(png_file, (err => {
        if (err) console.error(err.name + ": " + err.message);
      }));
    } else {
      await respond('画像ファイルは作成できませんでした。');
    }
  } catch(err) {
    console.error(err.name + ": " + err.message);
    await respond('エラーが発生しました。');
  }

});

/*
 * [ACTION METHOD] action-select-country
 *
 * [DESCRIPTION]
 *  選択メニューから選択した国名から新型コロナウィルス感染状況をSlack画面上に表示するアクション
 * 
 * [INPUTS]
 *  body.actions[0].selected_option.value - 選択した国名
 * 
 * [OUTPUTS]
 *  respond - JSON構造: {blocks:[<見出し>,<セクション>]}
 *
 */
app.action('action-select-country', async ({ body, ack, respond }) => {
  // 予め返信しておく
  await ack();
  // 対象とする国名を選択項目から取得する
  let country = body.actions[0].selected_option.value;
  // 選択した国の感染状況を取得する
  const result = await getCountryInfo(country);
  // 開発モードのとき、出力の内容を表示する
  if (nodeEnv == 'development') console.log(result);
  // アクションに返答する
  await respond(result);
});

/*
 * ---------- Callback Functions for Views ----------
 */

/*
 * [ACTION METHOD] callback-put-comment
 *
 * [DESCRIPTION]
 *  注釈レコードを登録するコールバック関数
 * 
 * [INPUTS]
 *  view.state.values.comment_block.comment.value - コメント
 *  view.private_metadata - {country:<国名>, channel:<チャネルID>, user:<ユーザー名>}
 * 
 * [OUTPUTS] なし
 *
 */
app.view('callback-put-comment', async ({ ack, view, client }) => {
  // 予め返信しておく
  await ack();
  // private_metadataからJSON文字列を取得する
  let json_text = view.private_metadata;
  // 文字列をJSONに変換する
  let json = JSON.parse(json_text);
  // コメントを取得する
  let comment = view.state.values.comment_block.comment.value;

  let now = currentTime(); // 現在の時刻
  // 注釈をデータベースに登録する
  let status = await commentInsert(json.country, now, json.user, comment);

  let msg = json.country + "へコメントが登録";
  if (status) {
    msg += "されました";
  } else {
    msg += "できませんでした";
  }

  //const user = body.user.id; // Slackアプリのチャネル
  try {
    await client.chat.postMessage({
      channel: json.channel, // Slachコマンドを起動したチャネルID
      text: msg
    });
  } catch (error) {
    console.error(error.name + ": " + error.message);
  }
});

/*
 * サーバーを起動する
 *
 */
(async () => {
  // Start your app
  await app.start(process.env.PORT || 3000);

  console.log('⚡️ Boltアプリが起動しました');
})();

/*
 * END OF FILE
 */