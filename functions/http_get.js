'use strict';

/*
 * [FILE] http_get.js
 *
 * [DESCRIPTION]
 *  HTTP URLにアクセスして値を取得する関数を定義するファイル
 * 
 * [NOTE]
 *  fetchやrequestというHTTPにアクセスするパッケージが存在するが、2022年時点ではaxiosが推奨されるパッケージである。
 */
const axios = require('axios');

/*
 * [FUNCTION] httpGet()
 *
 * [DESCRIPTION]
 *  Access an HTTP URL to get a JSON value
 * 
 * [INPUTS]
 *  url - 対象となるURL
 * 
 * [OUTPUTS]
 *  対象となるURLに応じたJSON構造が返る。
 *  失敗したら、nullを返す。
 * 
 * [NOTE]
 * 
 */
async function httpGet(url) {
    let data = null;

    try {
        const res = await axios(url);
        //console.log(res.data);
        data = res.data;
    } catch (err) {
        console.error(err.name + ": " + err.message);
        console.error("[URL] " + url);
    }

    return data;
}

/*
 * 関数の開示
 */
exports.httpGet = httpGet;

/*
 * END OF FILE
 */