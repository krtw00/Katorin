const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

/**
 * CORS設定
 * 本番環境では環境変数で許可するオリジンを指定することを推奨
 */
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:3000', 'http://localhost:5000'],
  credentials: true,
  optionsSuccessStatus: 200,
};

/**
 * レート制限設定
 * 一般的なAPIエンドポイント用
 */
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: 100, // 15分あたり最大100リクエスト
  message: { error: 'リクエストが多すぎます。しばらくしてから再試行してください。' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * レート制限設定（厳格）
 * ログインなどの認証エンドポイント用
 */
const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: 5, // 15分あたり最大5リクエスト
  message: { error: 'ログイン試行回数が多すぎます。しばらくしてから再試行してください。' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Helmet設定
 * セキュリティヘッダーを追加
 */
const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  crossOriginEmbedderPolicy: false, // Supabase連携のため無効化
});

module.exports = {
  corsOptions,
  generalLimiter,
  strictLimiter,
  helmetConfig,
  cors: cors(corsOptions),
};
