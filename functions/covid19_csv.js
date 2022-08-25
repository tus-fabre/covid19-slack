'use strict';

/*
 * [FILE] covid19_csv.js
 *
 * [DESCRIPTION]
 *  新型コロナウィルスの感染状況をCSVファイルに保存する関数を定義するファイル
 * 
 * [NOTE]
 *  生成するCSVファイルは環境変数LOCAL_FOLDERに設定されたフォルダーに保存される。
 */

const util = require("util");
const stream = require("stream");
const fs = require("fs");
const { currentTimeStamp } = require('./current_time');
const { getHistoricalData } = require('./covid19_history');
require('dotenv').config();
// ファイルを保存するフォルダー名
const LOCAL_FOLDER = process.env.LOCAL_FOLDER;
// ファイル保存時の同期処理に用いる
const finished = util.promisify(stream.finished); 

/*
 * [FUNCTION] csvGenerateFile()
 *
 * [DESCRIPTION]
 *  日々の新型コロナウィルス新規感染者数と死亡者数をCSVファイルに保存する
 * 
 * [INPUTS]
 *  country - 対象となる国名
 * 
 * [OUTPUTS]
 *  成功: 作成されたCSVファイル名
 *  失敗: null
 * 
 * [NOTE]
 *  アクセスするURL:
 *     https://disease.sh/v3/covid-19/historical/<Country>?lastdays=all
 */

exports.csvGenerateFile = async (country) => {
  let output_file = null; // Output variable

  if (!country) {
    return output_file;
  }

  // 関数getHistoricalData()に与える変数を初期化する
  let dateL  = new Array(); // 日付のリスト
  let caseL  = new Array(); // 新規感染者数のリスト
  let deathL = new Array(); // 死亡者数のリスト
  let status = await getHistoricalData(country, 'all', dateL, caseL, deathL);
  if (status) {
    // ファイルを上書きしないようにタイムスタンプを名前に付与する
    let timestamp = currentTimeStamp();
    output_file = LOCAL_FOLDER + "/" + country + "-all-" + timestamp + ".csv";
    try {
      const ws = fs.createWriteStream(output_file); // 書き込み用ストリームを作成する
      let record = "Date,Cases,Deaths\n"; // ファイルヘッダー
      ws.write(record);
      // レコードごとにファイルに書き込む
      for (let i = 0; i < dateL.length; i++) {
        record = dateL[i] + "," + caseL[i] + "," + deathL[i];
        ws.write(record + '\n');
      }
      ws.end(); // ストリームを閉じる
      await finished(ws); // ファイル保存を待つ
      console.log("[INFO] ", output_file, 'は保存されました');
    } catch (ex) {
      console.error(ex.name + ": " + ex.message);
      output_file = null;
    }
  } 

  return output_file;
}

/*
 * END OF FILE
 */