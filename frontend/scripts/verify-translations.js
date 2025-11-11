const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');

const LOCALES_DIR = path.join(__dirname, '../src/locales');
const CSV_PATH = path.join(LOCALES_DIR, 'translations.csv');
const LANGUAGES = ['ja', 'en'];

function flattenObject(obj, prefix = '') {
  return Object.keys(obj).reduce((acc, key) => {
    const value = obj[key];
    const prefixed = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(acc, flattenObject(value, prefixed));
    } else {
      acc[prefixed] = value;
    }
    return acc;
  }, {});
}

function readJsonForLanguage(lang) {
  const filePath = path.join(LOCALES_DIR, lang, 'common.json');
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

function loadCsvKeys() {
  const csvRaw = fs.readFileSync(CSV_PATH, 'utf8');
  const { data } = Papa.parse(csvRaw, {
    header: true,
    skipEmptyLines: true
  });

  const keys = [];
  data.forEach((row, index) => {
    if (!row.key) {
      throw new Error(`Missing key value on CSV row ${index + 2}`);
    }
    keys.push(row.key);
  });

  const uniqueKeys = new Set(keys);
  if (uniqueKeys.size !== keys.length) {
    throw new Error('Duplicate keys detected in translations.csv');
  }

  return uniqueKeys;
}

function compareSets(expectedKeys, csvKeys, sourceLabel) {
  const missingInCsv = [];
  const extraInCsv = [];

  expectedKeys.forEach((key) => {
    if (!csvKeys.has(key)) {
      missingInCsv.push(key);
    }
  });

  csvKeys.forEach((key) => {
    if (!expectedKeys.has(key)) {
      extraInCsv.push(key);
    }
  });

  if (missingInCsv.length || extraInCsv.length) {
    const lines = [];
    if (missingInCsv.length) {
      lines.push(`Missing keys from CSV (${sourceLabel}):\n  - ${missingInCsv.join('\n  - ')}`);
    }
    if (extraInCsv.length) {
      lines.push(`Unexpected keys in CSV (${sourceLabel}):\n  - ${extraInCsv.join('\n  - ')}`);
    }
    throw new Error(lines.join('\n'));
  }
}

function ensureLanguageParity(languageMaps) {
  const [firstLang, ...rest] = LANGUAGES;
  const referenceKeys = new Set(Object.keys(languageMaps[firstLang]));

  rest.forEach((lang) => {
    const langKeys = new Set(Object.keys(languageMaps[lang]));
    const missing = difference(referenceKeys, langKeys);
    const extra = difference(langKeys, referenceKeys);

    if (missing.length || extra.length) {
      const messages = [];
      if (missing.length) {
        messages.push(`Missing keys in ${lang}:\n  - ${missing.join('\n  - ')}`);
      }
      if (extra.length) {
        messages.push(`Additional keys in ${lang}:\n  - ${extra.join('\n  - ')}`);
      }
      throw new Error(messages.join('\n'));
    }
  });
}

function difference(a, b) {
  const diff = [];
  a.forEach((value) => {
    if (!b.has(value)) {
      diff.push(value);
    }
  });
  return diff;
}

function main() {
  const csvKeys = loadCsvKeys();

  const languageMaps = {};
  LANGUAGES.forEach((lang) => {
    const json = readJsonForLanguage(lang);
    languageMaps[lang] = flattenObject(json);
  });

  ensureLanguageParity(languageMaps);

  LANGUAGES.forEach((lang) => {
    const jsonKeys = new Set(Object.keys(languageMaps[lang]));
    compareSets(jsonKeys, csvKeys, `${lang} JSON`);
  });

  console.log(`✔ All ${csvKeys.size} translation keys are synchronized between translations.csv and JSON locales.`);
}

try {
  main();
} catch (error) {
  console.error('✖ Translation verification failed.');
  console.error(error.message);
  process.exit(1);
}
