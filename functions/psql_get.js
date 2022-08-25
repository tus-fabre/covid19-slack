'use strict';

/*
 * [FILE] psql_get.js
 *
 * [DESCRIPTION]
 *  PostgreSQLにアクセスして値を取得する関数を定義するファイル
 * 
 */
require('dotenv').config();
const db_url  = process.env.DB_URL;
const ssl_available = process.env.DB_WITH_SSL;

const { Pool } = require('pg');
const dbSource = {
  connectionString: db_url
}
//db_urlがローカルDBでSSL接続が必要がない場合、次のsslオプションは設定しない
if (ssl_available == 'yes') 
  dbSource.ssl = { rejectUnauthorized: false }

// データベースプールを準備
const pool = new Pool(dbSource);

/*
 * [FUNCTION] psqlGet()
 *
 * [DESCRIPTION]
 *  指定したSQL文を実行して、その結果をJSON構造で取得する
 * 
 * [INPUTS]
 *  query - 実行するSQL文
 * 
 * [OUTPUTS] 
 *  対象となるSQL文に応じたJSON構造（リスト）が返る。
 *  失敗したら、nullを返す。
 * 
 * [NOTE]
 */
async function psqlGet(query) {
  let list = null;
  try {
    // コネクションプールから接続を取得し SQLを実行
    const client = await pool.connect();
    const result = await client.query(query);

    // 返値があった場合に内容を取得
    if (result['rowCount'] > 0) {
      list = [];
      for (let i=0; i < result.rows.length; i++) {
        let json = {};
        for(let key in result.rows[i]) {
          json[key] = result.rows[i][key];
        }
        list.push(json);
      }
    }
    client.release(); // コネクションを切断する
  } catch (err) {
    console.error(err.name + ": " + err.message);
  }

  return list;
}

/*
 * 関数の開示
 */
exports.psqlGet = psqlGet;

/*
 * END OF FILE
 */