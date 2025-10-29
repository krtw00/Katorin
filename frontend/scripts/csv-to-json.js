const fs = require('fs');
const path = require('path');

/**
 * CSVファイルからJSONファイルに変換するスクリプト
 *
 * 使い方:
 * node scripts/csv-to-json.js
 */

const CSV_PATH = path.join(__dirname, '../src/locales/translations.csv');
const OUTPUT_DIR = path.join(__dirname, '../src/locales');

function parseCSV(csvContent) {
  const lines = csvContent.split('\n').filter(line => line.trim());
  const headers = lines[0].split(',').map(h => h.trim());

  // ヘッダーから言語コードを取得（最初の列はkeyなので除外）
  const languages = headers.slice(1).map(lang => lang.replace(/\r/g, ''));

  // 各言語用のオブジェクトを初期化
  const translations = {};
  languages.forEach(lang => {
    translations[lang] = {};
  });

  // 各行を処理
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length < 2) continue;

    const key = values[0];

    // キーをネストされたオブジェクトに変換 (例: "auth.login.title" -> { auth: { login: { title: "..." } } })
    languages.forEach((lang, index) => {
      const value = values[index + 1];
      if (value) {
        setNestedValue(translations[lang], key, value);
      }
    });
  }

  return { languages, translations };
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

function setNestedValue(obj, path, value) {
  const keys = path.split('.');
  let current = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!current[key]) {
      current[key] = {};
    }
    current = current[key];
  }

  current[keys[keys.length - 1]] = value;
}

function main() {
  try {
    console.log('CSVファイルを読み込んでいます...');
    const csvContent = fs.readFileSync(CSV_PATH, 'utf-8');

    console.log('CSVをパースしています...');
    const { languages, translations } = parseCSV(csvContent);

    console.log(`検出された言語: ${languages.join(', ')}`);

    // 各言語用のJSONファイルを生成
    languages.forEach(lang => {
      try {
        const langDir = path.join(OUTPUT_DIR, lang);

        // ディレクトリが存在しない場合は作成
        if (!fs.existsSync(langDir)) {
          fs.mkdirSync(langDir, { recursive: true });
        }

        const outputPath = path.join(langDir, 'common.json');
        fs.writeFileSync(
          outputPath,
          JSON.stringify(translations[lang], null, 2),
          'utf-8'
        );

        console.log(`✓ ${outputPath} を生成しました`);
      } catch (error) {
        console.error(`エラーが発生しました (${lang}):`, error.message);
        // 他の言語の処理は続行
      }
    });

    console.log('\n変換が完了しました！');
  } catch (error) {
    console.error('エラーが発生しました:', error.message);
    process.exit(1);
  }
}

main();
