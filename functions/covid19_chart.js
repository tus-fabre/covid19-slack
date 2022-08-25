'use strict';

/*
 * [FILE] covid19_charts.js
 *
 * [DESCRIPTION]
 *  新型コロナウィルスの感染状況をグラフとして描画する関数を定義するファイル
 * 
 */

const util = require("util");
const stream = require("stream");
const fs = require("fs");
const { currentTimeStamp } = require('./current_time');
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
const { getHistoricalData } = require('./covid19_history');
const {  translateCountryName } = require('./covid19');

require('dotenv').config();
const LOCAL_FOLDER = process.env.LOCAL_FOLDER;
// ファイル保存時の同期処理に用いる
const finished = util.promisify(stream.finished);
// 日本語フォントの設定
const FONT_PATH = './fonts/ipaexg.ttf';
const FONT_NAME = "IPAEXG";
const FONT_COLOR = "rgb(0,0,0)";
const SCALE_TITLE_COLOR = "#333333aa";

/*
 * [FUNCTION] chartMonthlyConfiguration()
 *
 * [DESCRIPTION]
 *  指定した国の30日間の新型コロナウィルス新規感染者数を棒グラフ、
 *  新たな死亡者数を折れ線グラフとして表示するため、ChartJSに与えるJSON構造を構築する
 * 
 * [INPUTS]
 *  country - 対象となる国名
 * 
 * [OUTPUTS]
 *  成功: ChartJSグラフを描画するJSON構造 {type:'line', data:{...}}
 *  失敗: null
 * 
 * [NOTE]
 *  アクセスするURL:
 *     https://disease.sh/v3/covid-19/historical/<Country>?lastdays=31
 */

exports.chartMonthlyConfiguration = async (country) => {

  if (!country) {
    return null;
  }

  let configuration = null;
  // 関数getHistoricalData()に与える変数を初期化する
  let dateL  = new Array();
  let caseL  = new Array();
  let deathL = new Array();
  let status = await getHistoricalData(country, '31', dateL, caseL, deathL);
  if (status) {
    let translated = await translateCountryName(country); //日本語国名へ変換
    if (translated == null) translated = country;

    configuration = {
      type: 'bar',
      data: {
        labels: dateL,
        datasets: [
          {
            label: '死亡者数',
            type: 'line',
            fill: false,
            borderColor: 'magenta',
            backgroundColor: 'magenta',
            yAxisID: 'y1',
            tension: 0.3,
            borderWidth: 7,
            pointBorderColor: 'red',
            pointBackgroundColor: 'red',
            radius: 5,
            data: deathL
          },
          {
            label: '感染者数',
            type: 'bar',
            borderColor: 'teal',
            backgroundColor: 'teal',
            yAxisID: 'y2',
            data: caseL
          }
        ]
      },
      options: {
        scales: {
          /* 日付 */
          x: {
            display: true,
            ticks: {
              font: {size: 32}
            }
          },
          /* 死亡者数 */
          y1: {
            type: 'linear',
            display: true,
            position: 'left',
            ticks: {
              color: 'magenta', 
              font: {size: 24}
            },
            title: {
              display: true, 
              text: '（人）',
              color: SCALE_TITLE_COLOR,
              font: {size: 24}
            }
            //,grid: {drawOnChartArea: false}
          },
          /* 感染者数 */
          y2: {
            type: 'linear',
            display: true,
            position: 'right',
            ticks: {
              color: 'teal', 
              font: {size: 24}
            },
            title: {
              display: true, 
              text: '（人）',
              color: SCALE_TITLE_COLOR,
              font: {size: 24}
            }
            //,grid: {drawOnChartArea: false}
          },
        },
        plugins: {
          title: {
            display: true, 
            text: `${translated} 新規感染者数・死者数の推移`,
            font: {size: 60}
          },
          legend: {
            display: true,
            labels: {
              font: {size: 36}
            }
          }
        }
      }
    }
  }

  return configuration;
}

/*
 * [FUNCTION] chartWeeklyConfiguration()
 *
 * [DESCRIPTION]
 *  日本での新型コロナウィルス新規感染者数を一週間分を折れ線グラフとして表示するため、ChartJSに与えるJSON構造を構築する
 * 
 * [INPUTS] なし
 * 
 * [OUTPUTS]
 *  成功: ChartJSグラフを描画するJSON構造 {type:'line', data:{...}}
 *  失敗: null
 * 
 * [NOTE]
 *  アクセスするURL:
 *     https://disease.sh/v3/covid-19/historical/Japan?lastdays=8
 */

exports.chartWeeklyConfiguration = async () => {

  let configuration = null;
  // 関数getHistoricalData()に与える変数を初期化する
  let dateL  = new Array();
  let caseL  = new Array();
  let deathL = new Array(); // 使わない
  let status = await getHistoricalData('Japan', '8', dateL, caseL, deathL);
  if (status) {
    configuration = {
      type: 'line',
      data: {
        labels: dateL,
        datasets: [
        {
          label: '感染者数',
          fill: true,
          borderColor: 'blue',
          backgroundColor: 'blue',
          yAxisID: 'y-axis',
          tension: 0.3,
          borderWidth: 7,
          data: caseL
        },
        ]
      },
      options: {
        scales: {
          /* 日付 */
          x: {
            display: true,
            ticks: {
              font: {size: 32}
            }
          },
          /* 感染者数 */
          'y-axis': {
            type: 'linear',
            display: true,
            position: 'left',
            ticks: {
              font: {size: 24}
            }
          }
        },
        plugins: {
          title: {
            display: true, 
            text: "今週の新規感染者数",
            font: {size: 60}
          },
          legend: {
            display: true,
            labels: {
              font: {size: 36}
            }
          }
        }
      }
    }
  }

  return configuration;
}

/*
 * [FUNCTION] chartConfig2Stream()
 *
 * [DESCRIPTION]
 *  指定したChartJSのJSON構造をストリームに変換する
 * 
 * [INPUTS]
 *  config - 対象となるChartJS構造 (JSON)
 * 
 * [OUTPUTS]
 *  成功: chartjs-node-canvasモジュールのrenderToStream関数の返り値
 *  失敗: null
 */

exports.chartConfig2Stream = async (config) => {

  if (config == null) {
    return null;
  }

  // 画像のサイズを設定する
  const width  = 1800;
  const height = 1200;

  const cnc = new ChartJSNodeCanvas({
    type: 'png',
    width,
    height,
    backgroundColour: '#FFF',
    chartCallback: (ChartJS) => {
      ChartJS.defaults.color = FONT_COLOR;
      ChartJS.defaults.font.family = FONT_NAME;
    }
  });
  // フォントを設定する
  cnc.registerFont(FONT_PATH, { family: FONT_NAME });

  if (cnc != null) {
    return cnc.renderToStream(config);
  }
  
  return null;
}

/*
 * [FUNCTION] chartStream2File()
 *
 * [DESCRIPTION]
 *  ストリームをPDFファイルとして保存する関数
 * 
 * [INPUTS]
 *  stream - chartConfig2Stream()の返り値
 * 
 * [OUTPUTS]
 *  成功: 作成されたPDFファイル名
 *  失敗: null
 */

exports.chartStream2File = async (stream) => {
  let output_file = null;
  if (stream == null) {
    return output_file;
  }
  // ファイルを上書きしないようにタイムスタンプを名前に付与する
  let timestamp = currentTimeStamp();
  output_file = LOCAL_FOLDER + "/chart-" + timestamp + ".png";
  try {
      const ws = fs.createWriteStream(output_file);
      stream.pipe(ws);
      await finished(ws);
      console.log("[INFO] ", output_file, 'has been saved.');
  } catch (ex) {
    console.error(ex.name + ": " + ex.message);
    output_file = null;
  }
  
  return output_file;
}

/*
 * END OF FILE
 */