const fs = require('fs');
const path = require('path');

/**
 * JSONファイルからCSVファイルに変換するスクリプト
 *
 * 使い方:
 * node scripts/json-to-csv.js
 */

const LOCALES_DIR = path.join(__dirname, '../src/locales');
const OUTPUT_CSV_PATH = path.join(LOCALES_DIR, 'translations.csv');

// ネストされたオブジェクトをフラットなキーに変換する (例: { auth: { login: "..." } } -> { "auth.login": "..." })
function flattenObject(obj, prefix = '') {
  return Object.keys(obj).reduce((acc, k) => {
    const pre = prefix.length ? prefix + '.' : '';
    if (typeof obj[k] === 'object' && obj[k] !== null && Object.keys(obj[k]).length > 0) {
      Object.assign(acc, flattenObject(obj[k], pre + k));
    } else {
      acc[pre + k] = obj[k];
    }
    return acc;
  }, {});
}

// CSVのセルとして安全な形式にエスケープする
function escapeCsvValue(value) {
  if (value === null || value === undefined) {
    return '';
  }
  const stringValue = String(value);
  // 値にカンマ、ダブルクォート、改行が含まれている場合はダブルクォートで囲む
  if (/[",\n]/.test(stringValue)) {
    // ダブルクォート自体は2つにエスケープする
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}