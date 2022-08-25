set client_encoding to 'UTF8';

/*
 * [TABLE] countries
 *
 * [DESCRIPTION]
 *  国名変換テーブルを定義する
 * 
 * [NOTE]
 *  国コード（ISOコード）、英語表記の国名を日本語表記にするために用いる。
 *  実際のデータはcountries.csvをロードする。
 */
CREATE TABLE countries (
    id integer NOT NULL,
    iso_code varchar(3),
    name_en varchar(32) NOT NULL,
    name_ja varchar(32),
    PRIMARY KEY (id)
);

/*
 * [TABLE] annotation
 *
 * [DESCRIPTION]
 *  国ごとに注釈を記録する
 * 
 * [NOTE]
 */
CREATE TABLE annotation (
    id serial,
    country_id integer NOT NULL,
    datetime timestamp NOT NULL,
	user_name varchar(64),
    comment varchar(256),
    PRIMARY KEY (id)
);

 /*
  * END OF FILE
  */