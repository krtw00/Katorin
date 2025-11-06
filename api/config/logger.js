const winston = require('winston');
const path = require('path');

// ログレベルの設定（環境変数または'info'がデフォルト）
const logLevel = process.env.LOG_LEVEL || 'info';

// カスタムログフォーマット
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf((info) => {
    const { timestamp, level, message, ...meta } = info;

    // メタデータがある場合は整形して追加
    const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';

    return `${timestamp} [${level.toUpperCase()}]: ${message}${metaStr}`;
  })
);

// JSON形式のログフォーマット（本番環境用）
const jsonFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// 開発環境か本番環境かで形式を切り替え
const logFormat = process.env.NODE_ENV === 'production' ? jsonFormat : customFormat;

// Winstonロガーの作成
const logger = winston.createLogger({
  level: logLevel,
  format: logFormat,
  transports: [
    // コンソール出力
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        logFormat
      ),
    }),
  ],
  // 未処理の例外・Promiseリジェクションをキャッチ
  exceptionHandlers: [
    new winston.transports.Console(),
  ],
  rejectionHandlers: [
    new winston.transports.Console(),
  ],
});

// 本番環境ではファイルにもログを出力
if (process.env.NODE_ENV === 'production') {
  // エラーログファイル
  logger.add(new winston.transports.File({
    filename: path.join(__dirname, '../../logs/error.log'),
    level: 'error',
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }));

  // 全てのログファイル
  logger.add(new winston.transports.File({
    filename: path.join(__dirname, '../../logs/combined.log'),
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }));
}

// HTTPリクエストログ用のミドルウェア
const requestLogger = (req, res, next) => {
  const start = Date.now();

  // レスポンス終了時にログ出力
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip || req.connection.remoteAddress,
    };

    if (res.statusCode >= 400) {
      logger.warn('HTTP Request', logData);
    } else {
      logger.info('HTTP Request', logData);
    }
  });

  next();
};

module.exports = {
  logger,
  requestLogger,
};
