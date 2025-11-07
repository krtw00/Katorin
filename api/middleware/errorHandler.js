/**
 * カスタムAPIエラークラス
 * ステータスコード、メッセージ、詳細情報を持つ
 */
class ApiError extends Error {
  constructor(statusCode, message, details = null) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }

  // ファクトリメソッド: 便利なエラー生成関数
  static badRequest(message = 'リクエストが不正です。', details = null) {
    return new ApiError(400, message, details);
  }

  static unauthorized(message = '認証が必要です。', details = null) {
    return new ApiError(401, message, details);
  }

  static forbidden(message = 'この操作を行う権限がありません。', details = null) {
    return new ApiError(403, message, details);
  }

  static notFound(message = 'リソースが見つかりません。', details = null) {
    return new ApiError(404, message, details);
  }

  static conflict(message = '競合が発生しました。', details = null) {
    return new ApiError(409, message, details);
  }

  static internal(message = 'サーバー内部エラーが発生しました。', details = null) {
    return new ApiError(500, message, details);
  }
}

/**
 * エラーハンドリングミドルウェア
 * すべてのエラーを統一フォーマットでレスポンス
 */
const errorHandler = (err, req, res, next) => {
  // ApiErrorの場合
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      error: {
        message: err.message,
        ...(err.details && { details: err.details }),
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
      },
    });
  }

  // Supabaseエラーの場合
  if (err.code && err.message) {
    const statusCode = getStatusCodeFromSupabaseError(err);
    return res.status(statusCode).json({
      error: {
        message: err.message,
        code: err.code,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
      },
    });
  }

  // その他の予期しないエラー
  console.error('[Error Handler] Unexpected error:', err);
  return res.status(500).json({
    error: {
      message: 'サーバー内部エラーが発生しました。',
      ...(process.env.NODE_ENV === 'development' && {
        originalMessage: err.message,
        stack: err.stack,
      }),
    },
  });
};

/**
 * Supabaseエラーコードからステータスコードを推測
 */
function getStatusCodeFromSupabaseError(err) {
  const errorCodeMap = {
    '23505': 409, // unique_violation (重複)
    '23503': 409, // foreign_key_violation
    '22P02': 400, // invalid_text_representation (不正な値)
    'PGRST116': 404, // not found
    '42501': 403, // insufficient_privilege
  };

  return errorCodeMap[err.code] || 500;
}

/**
 * 非同期ルートハンドラーをラップする関数
 * エラーを自動的にnext()に渡す
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
  ApiError,
  errorHandler,
  asyncHandler,
};
