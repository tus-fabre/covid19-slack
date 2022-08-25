'use strict';

/*
 * [FILE] covid19_pdf.js
 *
 * [DESCRIPTION]
 *  新型コロナウィルスの感染状況をPDFファイルとして出力する関数を定義するファイル
 * 
 */
require('date-utils');
const PdfPrinter = require('pdfmake');
const util = require("util");
const stream = require("stream");
const fs = require("fs");
const { currentTimeStamp } = require('./current_time');
const { httpGet } = require('./http_get');
const {  translateCountryName } = require('./covid19');
const { commentGet } = require('./covid19_comment');
require('dotenv').config();
const BASE_URL=process.env.BASE_URL;
const LOCAL_FOLDER = process.env.LOCAL_FOLDER;
// ファイル保存時の同期処理に用いる
const finished = util.promisify(stream.finished);

// PDFファイルに用いるフォントの設定
const fonts = {
  IPAexGothic: {
      normal: './fonts/ipaexg.ttf',
      bold: './fonts/ipaexg.ttf'
  }
};

/*
 * [FUNCTION] pdfGenerateFile()
 *
 * [DESCRIPTION]
 *  新型コロナウィルスの感染状況の内容をPDFドキュメントファイルとして作成する
 * 
 * [INPUTS]
 *  datetime - 日時
 *  country - 対象となる国名
 *  image_file - PDFファイルに追加する画像ファイル
 * 
 * [OUTPUTS]
 *  成功: 作成されたPDFファイル名
 *  失敗: null
 * 
 * [NOTE]
 *  アクセスするURL:
 *   https://disease.sh/v3/covid-19/countries/<Country>
 *   countryが'all'の場合
 *   https://disease.sh/v3/covid-19/all
 */

exports.pdfGenerateFile = async (datetime, country, image_file) => {
  let output_file = null;
  if (image_file == "") return output_file;

  let info_table = '';
  let status_table = '';
  let url = BASE_URL + "countries/" + country;
  if (country == 'all') url = BASE_URL + "all";

  const result = await httpGet(url);
  if (result != null) {
    // 対象国の情報を表として定義する
    let translated = await translateCountryName(country); //日本語国名へ変換
    if (translated == null) translated = country;
    let population = Number(result.population).toLocaleString();
    info_table = {
      style: 'tableBody',
      table: {
        heights: 20,
        body: [
          [ {text: '国名', style: 'tableHeader'}, {text: '人口', style: 'tableHeader'}],
          [ translated, population ],
        ]
      }
    };

    let active    = Number(result.active).toLocaleString();
    let critical  = Number(result.critical).toLocaleString();
    let recovered = Number(result.recovered).toLocaleString();
    let cases     = Number(result.cases).toLocaleString();
    let deaths    = Number(result.deaths).toLocaleString();
    let tests     = Number(result.tests).toLocaleString();
    status_table = {
      style: 'tableBody',
      table: {
        heights: 20,
        body: [
          [ {text: '感染者数', style: 'tableHeader'}, active],
          [ {text: '重病者数', style: 'tableHeader'}, critical],
          [ {text: '退院・療養終了', style: 'tableHeader'}, recovered],
          [ {text: '感染者累計', style: 'tableHeader'}, cases],
          [ {text: '死亡者累計', style: 'tableHeader'}, deaths],
          [ {text: '検査数', style: 'tableHeader'},  tests],
        ]
      }
    };
  }

  let timestamp = currentTimeStamp();
  output_file = LOCAL_FOLDER + "/Report-" + country + "-" + timestamp + ".pdf";

  const docDefinition = {
    // PDFドキュメントの内容
    content: [
      // 見出し
      { text: 'COVID-19 レポート', style: 'title' },
      // 時刻の表示
      { text: '作成時刻: ' + datetime, style: 'datetime' },
      // 表：国の情報
      info_table,
      // 副見出し
      { text: '感染状況：', style: 'sub_title' },
      // 表：感染状況
      status_table,
      // 副見出し
      { text: '感染履歴グラフ：', style: 'sub_title' },
      // グラフ画像
      { image: image_file, width: 450, height: 300 },
    ],
    // 改行のルールを定義する
    pageBreakBefore: function(currentNode) {
      // コメントの見出しを見つけ、改行する
      if (currentNode.id === 'comment') {
        return true;
      }
      return false;
    },
    // スタイルを定義する
    styles: {
      title: { // 見出し
        font: 'IPAexGothic',
        fontSize: 24,
        alignment: 'center',
        margin: [0, 0, 0, 20]
      }, // 副見出し
      sub_title: {
        font: 'IPAexGothic',
        fontSize: 20,
        margin: [0, 10, 0, 10]
      }, // 時刻
      datetime: {
        font: 'IPAexGothic',
        fontSize: 16,
        alignment: 'right',
        margin: [0, 5, 0, 5]
      }, // 表
      tableBody: {
        margin: [10, 5, 0, 15]
      }, // 表の見出し
      tableHeader: {
        fillColor:'#eeeeff'
      }
    }, // 初期スタイル
    defaultStyle: {
      font: 'IPAexGothic',
      fontSize: 14,
    }
  };

  // 注釈があれば表示する
  let comments = await commentGet(country);
  if (comments != null && comments.length > 0) {
    let comment_table = {
      style: 'tableBody',
      table: {
        heights: 20,
        body: [
          [ {text: '日時', style: 'tableHeader'}, {text: 'コメント', style: 'tableHeader'}]
        ]
      }
    };

    for (let i = 0 ; i < comments.length ; i++) {
      let dt = comments[i].datetime.toFormat("YYYY-MM-DD HH24:MI");
      let comment = comments[i].comment;
      comment_table.table.body.push([ dt, comment ]);
    }

    // 副見出しを追加：id=commentの部分をみて改行させる
    docDefinition.content.push({ text: 'コメント：', style: 'sub_title', id: 'comment' });
    // コメントテーブルを追加
    docDefinition.content.push(comment_table);
  }

  // ドキュメントの内容をPDFファイルとして出力する
  try {
    const printer = new PdfPrinter(fonts);
    const pdfDoc = printer.createPdfKitDocument(docDefinition);
    const ws = fs.createWriteStream(output_file);
    pdfDoc.pipe(ws);
    pdfDoc.end();
    await finished(ws);
    console.log("[INFO] ", output_file, 'has been saved.');
  } catch (ex) {
    console.error(ex.name + ": " + ex.message);
    output = null;
  }

  return output_file;
}

/*
 * END OF FILE
 */