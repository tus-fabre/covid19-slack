'use strict';

/*
 * [FILE] covid19_history.js
 *
 * [DESCRIPTION]
 *  日々の新型コロナウィルスの感染状況にかかわる関数を定義するファイル
 * 
 * [NOTE]
 */

const { httpGet } = require('./http_get');
require('dotenv').config();
// disease.shにアクセスするためのベースURL
const BASE_URL=process.env.BASE_URL;

/*
 * [FUNCTION] getHistoricalData()
 *
 * [DESCRIPTION]
 *  指定した日数分の新型コロナウィルスの新規感染者数と死亡者数を取得する
 * 
 * [INPUTS]
 *  country  - 対象となる国名
 *  lastdays - 今日から何日前までの情報を取得するか日数を指定する。'all'のときはすべてのデータを対象とする。
 * 
 * [OUTPUTS]
 *  次の出力用引数には初期設定として空リストを関数に与えておく
 *  dateL  - 日付のリスト
 *  caseL  - 新規感染者数のリスト
 *  deathL - 死亡者数のリスト
 *  
 *  関数が成功すればtrue、失敗したらfalseを返す
 * 
 * [NOTE]
 *  This method accesses:
 *     https://disease.sh/v3/covid-19/historical/<Country>?lastdays=<日数 or all>
 *
 *  countryがallの場合,　結果の直下にcasesとdeathsのキーが存在する。
 *  それ以外の場合、結果の下にtimelineが現れ、その下にcasesとdeathsのキーが存在する。
 */

exports.getHistoricalData = async (country, lastdays, dateL, caseL, deathL) => {
  let status = false;

  if (!country) {
    return status;
  }

  const result = await httpGet(BASE_URL + "historical/" + country + "?lastdays=" + lastdays);
  if (result != null) {
    // 新たな感染者数を前日との差分として集める
    const cases = country == 'all' ? result.cases : result.timeline.cases;
    let previous_value = -1;
    for (let key in cases) {
      let num_cases = Number(cases[key]);
      if (previous_value >= 0) {
        dateL.push(key); // キーである日付をリストに追加する
        caseL.push(num_cases-previous_value);
      }
      previous_value = num_cases;
    }

    // 新たな死亡者数を前日との差分として集める
    const deaths = country == 'all' ? result.deaths : result.timeline.deaths;
    previous_value = -1;
    for (let key in deaths) {
      let num_deaths = Number(deaths[key]);
      if (previous_value >= 0) deathL.push(num_deaths-previous_value);
      previous_value = num_deaths;
    }

    status = true;
  } 

  return status;
}

/*
 * END OF FILE
 */