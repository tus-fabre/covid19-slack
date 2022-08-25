'use strict';

/*
 * [FILE] covid19.js
 *
 * [DESCRIPTION]
 *  新型コロナウィルスの感染状況を提示する関数を定義するファイル
 * 
 */
require('date-utils');
const { httpGet } = require('./http_get');
const { psqlGet } = require('./psql_get');
const { commentGet } = require('./covid19_comment');

require('dotenv').config();
// disease.shにアクセスするためのベースURL
const BASE_URL=process.env.BASE_URL;
// 選択メニューの項目数
const NUM_MENUITEMS=process.env.NUM_OF_MENU_ITEMS;
let numMenuItems = NUM_MENUITEMS ? parseInt(NUM_MENUITEMS) : 20;

// ---------- Functions ----------

/*
 * [FUNCTION] getCountryInfo()
 *
 * [DESCRIPTION]
 *  指定した国の新型コロナウィルス感染状況をSlack向けブロック構造として整形する
 * 
 * [INPUTS]
 * 　country - 対象となる国名
 * 
 * [OUTPUTS]
 *  成功: {blocks:[<見出し>, <セクション>]}
 *  失敗: {type:"plain_text", text:"<エラーメッセージ>"}
 * 
 * [NOTE]
 *  アクセスするURL:
 *   https://disease.sh/v3/covid-19/countries/<country>
 *   あるいはcountryがallのときは
 * 　https://disease.sh/v3/covid-19/all
 * 
 *  toLocaleString()は数値を三桁区切りにする。
 */
exports.getCountryInfo = async (country) => {

  let retVal = null;
  // 対象URLにアクセスし、結果をJSONで取得する
  let url = BASE_URL + "countries/" + country;
  if (country == 'all') url = BASE_URL + "all";
  const result = await httpGet(url);

  let blocks = [];
  if (result != null) {
    let translated = await this.translateCountryName(country); //日本語国名へ変換
    if (translated == null) translated = country;
    let population = Number(result.population).toLocaleString(); //人口
    // 見出しの構造を生成する
    let objheader = {
      "type": "header",
      "text": {
        "type": "plain_text",
        "text": `[国名] ${translated} [人口] ${population}`,
        "emoji": true
      }
    }
    blocks.push(objheader);

    let active    = Number(result.active).toLocaleString(); //感染者数
    let critical  = Number(result.critical).toLocaleString(); //重病者数
    let recovered = Number(result.recovered).toLocaleString(); //退院・療養終了
    let cases     = Number(result.cases).toLocaleString(); //感染者累計
    let deaths    = Number(result.deaths).toLocaleString(); //死亡者累計
    let tests     = Number(result.tests).toLocaleString(); //検査数

    // 本体となるセクション構造を生成する
    let objBody = {
      "type": "section",
      "fields": [
        {
          "type": "mrkdwn",
          "text": `*感染者数:* ${active}`
        },
        {
          "type": "mrkdwn",
          "text": `*重病者数:* ${critical}`
        },
        {
          "type": "mrkdwn",
          "text": `*退院・療養終了:* ${recovered}`
        },
        {
          "type": "mrkdwn",
          "text": `*感染者累計:* ${cases}`
        },
        {
          "type": "mrkdwn",
          "text": `*死亡者累計:* ${deaths}`
        },
        {
          "type": "mrkdwn",
          "text": `*検査数:* ${tests}`
        },
      ]
    }
    blocks.push(objBody);

    // 注釈を表示する
    let comments = await commentGet(country);
    if (comments != null && comments.length > 0) {
      let objComment = {
        "type": "section",
        "fields": [
          {
            "type": "mrkdwn",
            "text": `*記入日時:* ${comments[0].datetime.toFormat("YYYY-MM-DD HH24:MI:SS")}`
          },
          {
            "type": "mrkdwn",
            "text": `*注釈:* ${comments[0].comment}`
          },
        ]
      };
      blocks.push(objComment);
    }

    // アクションを定義する
    let objActions = {
      "type": "actions",
      "elements": [
        {
          "type": "button",
          "text": {
            "type": "plain_text",
            "text": "全世界",
            "emoji": true
          },
          "style": "primary",
          "value": "all", // アクション関数action-get-info-all()に渡す引数
          "action_id": "action-get-info-all"
        },
        {
          "type": "button",
          "text": {
            "type": "plain_text",
            "text": "推移グラフ",
            "emoji": true
          },
          "style": "danger",
          "value": `${country}`, // アクション関数action-graph-history()に渡す引数
          "action_id": "action-graph-history"
        },
        {
          "type": "button",
          "text": {
            "type": "plain_text",
            "text": "レポート作成",
            "emoji": true
          },
          "style": "primary",
          "value": `${country}`, // アクション関数action-report-history()に渡す引数
          "action_id": "action-report-history"
        },
        {
          "type": "button",
          "text": {
            "type": "plain_text",
            "text": "CSV出力",
            "emoji": true
          },
          "style": "danger",
          "value": `${country}`, // アクション関数action-csv-generate()に渡す引数
          "action_id": "action-csv-generate"
        },
        {
          "type": "button",
          "text": {
            "type": "plain_text",
            "text": "コメント",
            "emoji": true
          },
          "style": "primary",
          "value": `${country}`, // アクション関数action-comment()に渡す引数
          "action_id": "action-comment"
        },
        {
          "type": "button",
          "text": {
            "type": "plain_text",
            "text": "国名選択に戻る",
            "emoji": true
          },
          "value": `${country}`, // アクション関数action-get-countries()に渡す引数
          "action_id": "action-get-countries"
        },
        {
          "type": "button",
          "text": {
            "type": "plain_text",
            "text": "再表示",
            "emoji": true
          },
          "value": `${country}`, // アクション関数action-get-info()に渡す引数
          "action_id": "action-get-info"
        }
      ]
    }
    blocks.push(objActions);

    // 区切り線
    let objDivider = {
      "type": "divider"
    };
    blocks.push(objDivider);

    retVal = {
      "blocks": blocks
    };
  } else {
    retVal = {
      "type": "plain_text",
      "text": `${country}の情報は見つかりませんでした`,
      "emoji": true
    };
  }

  return (retVal);
};

/*
 * [FUNCTION] getCountries()
 *
 * [DESCRIPTION]
 *  Webサイトから利用可能な国名を抽出し、選択項目とする選択メニュー向けブロック構造として整形する
 * 
 * [INPUTS] 指定なし
 * 
 * [OUTPUTS]
 *  成功: {blocks:[<見出し>, <セクション>]}
 *  失敗: {type:"plain_text", text:"<エラーメッセージ>"}
 * 
 * [NOTE]
 *  選択メニューは20カ国ごと（環境変数 NUM_OF_MENU_ITEMSで変更可能）に1つ作成する
 */
exports.getCountries = async () => {
  let retVal = null;
  const result = await httpGet(BASE_URL + "countries");

  let blocks = [];
  if (result != null && result.length > 0) {
    // 見出しの構造を生成する
    let objheader = {
      "type": "header",
      "text": {
        "type": "plain_text",
        "text": "国名一覧",
        "emoji": true
      }
    }
    blocks.push(objheader);

    let menu_num = Math.floor(result.length / numMenuItems) + 1;
    let n = 0;
    for (let m = 1; m <= menu_num; m++) {
      // 項目トップの国名を日本語に変換
      let translated = await this.translateCountryName(result[n].country); 
      if (translated == null) translated = result[n].country;

      // 選択メニューを形成するセクション構造を生成する
      let objBody = {
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": `[${m}] 国名: ${translated}～`
        },
        "accessory": {
          "action_id": "action-select-country",
          "type": "static_select",
          "placeholder": {
            "type": "plain_text",
            "text": "国名を選択"
          },
          "options": []
        }
      };

      let count = numMenuItems * m;
      if (m == menu_num) count = result.length; // 最後のメニュー
      for ( ; n < count; n++) {
        // 表示名を日本語へ変換
        translated = await this.translateCountryName(result[n].country); 
        if (translated == null) translated = result[n].country;

        let objOption = {
          "text": {
            "type": "plain_text",
            "text": `${translated}`
          },
          "value": `${result[n].country}`, // アクション関数action-select-country()に渡す引数
        };
        objBody.accessory.options.push(objOption);
      }

      blocks.push(objBody);
    }
      
    // 区切り線
    let objDivider = {
      "type": "divider"
    };
    blocks.push(objDivider);

    retVal = {
      "blocks": blocks
    };

  } else {
    retVal = {
      "type": "plain_text",
      "text": `国名は見つかりませんでした`,
      "emoji": true
    };
  }

  return (retVal);

};

/*
 * [FUNCTION] translateCountryName()
 *
 * [DESCRIPTION]
 *  国コードあるいは英語の国名を日本語に変換する
 * 
 * [INPUTS]
 * 　country -  国コードあるいは英語の国名
 * 
 * [OUTPUTS]
 *  成功: 翻訳された文字列
 *  失敗or見つからない: null
 * 
 * [NOTE]
 */
exports.translateCountryName = async (country) => {
  let outText = null;
  // countriesテーブルにアクセスし、入力する国名と合致する日本語名を取得する（大文字と小文字を無視する）
  const sql = "SELECT name_ja FROM countries WHERE LOWER(iso_code)=LOWER('" + country + "') OR LOWER(name_en)=LOWER('" + country + "')";
  const result = await psqlGet(sql);

  if (result != null) {
    outText = result[0].name_ja;
  } 

  return (outText);
}

/*
 * END OF FILE
 */