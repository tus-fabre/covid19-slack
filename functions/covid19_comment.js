'use strict';

/*
 * [FILE] covid19_comment.js
 *
 * [DESCRIPTION]
 *  モーダルビューを用いたコメント機能に関わる関数を定義するファイル
 * 
 * [NOTE]
 */

const { psqlGet } = require('./psql_get'); 
require('dotenv').config();
const nodeEnv=process.env.NODE_ENV;

/*
 * [FUNCTION] commentModalView
 *
 * [DESCRIPTION]
 *  コメントを登録するためモーダルビューを表示するためのJSON構造を生成する
 * 
 * [INPUTS]
 *  trigger_id - モーダルビューのトリガーID
 *  title - モーダル画面の見出し
 *  text  - モーダル画面のテキスト
 *  json  - {country:<国名>, channel:<チャネルID>, user:<ユーザー名>}
 * 
 * [OUTPUTS]
 *  JSON構造：{trigger_id:<ID>, {type:modal, title:<...>}}
 */
exports.commentModalView = (trigger_id, title, text, json) => {

  let json_text = JSON.stringify(json); // JSONを文字列に変換する

  let objView = {
    "type": "modal",
    "callback_id": "callback-put-comment", // 起動するコールバック関数
    "title": {
      "type": "plain_text",
      "text": `${title}`
    },
    "submit": {
      "type": "plain_text",
      "text": "登録"
    },
    "close": {
      "type": "plain_text",
      "text": "閉じる"
    },
    "private_metadata": `${json_text}`, // 国名、チャネル名、ユーザー名を保持する
    "blocks": [
		  {
			  "type": "input",
        "block_id": "comment_block",
			  "element": {
				  "type": "plain_text_input",
				  "action_id": "comment"
			  },
			  "label": {
				  "type": "plain_text",
				  "text": `${text}`
			  }
		  }
    ]
  }
  
  let objModal = {
    trigger_id: trigger_id,
    view: objView
  };
  
  return objModal;
}

/*
 * [FUNCTION] commentInsert()
 *
 * [DESCRIPTION]
 *  注釈をannotationレコードとして登録する
 * 
 * [INPUTS]
 *  country  - 国名
 *  datetime - 登録日時
 *  user - ユーザー名
 *  comment - 注釈
 *
 * [OUTPUTS]
 *  成功: true
 *  失敗: false
 * 
 * [NOTE]
 */
exports.commentInsert = async (country, datetime, user, comment) => {
    let retVal = false;

    // 引数の存在チェック
    if (country == null || datetime == null || user == null || comment == null) {
      return retVal;
    }

    // 国名からID番号を取得する（小文字としてチェックする）
    let country_id = null;
    let query = `SELECT id FROM countries WHERE LOWER(name_en)=LOWER('${country}')`;
    const result = await psqlGet(query);
    if (result != null) {
      country_id = result[0].id;
    } else {
      return retVal;
    }

    // 注釈を登録する
    query = `INSERT INTO annotation (country_id,datetime,user_name,comment) VALUES (${country_id},'${datetime}','${user}','${comment}')`;
    if (nodeEnv == 'development') console.log(query);
    const result2 = await psqlGet(query);
    if (result2 != null) retVal = true;
    
    return (retVal);
}

/*
 * [FUNCTION] commentGet()
 *
 * [DESCRIPTION]
 *  指定した国の注釈を最新の順序で取得する
 * 
 * [INPUTS]
 *  country - 国名
 *
 * [OUTPUTS]
 *  {datetime:<日時>, comment:<注釈>}の配列
 * 
 * [NOTE]
 */
exports.commentGet = async (country) => {

  if (country == null) {
    return null;
  }

  // countriesとannotationテーブルを結合して注釈を取得する
  let query = `SELECT datetime, comment FROM annotation as a inner join countries as c ON LOWER(c.name_en)=LOWER('${country}') AND a.country_id = c.id ORDER BY datetime DESC`;
  const result = await psqlGet(query);
  
  return result;
}

/*
 * END OF FILE
 */