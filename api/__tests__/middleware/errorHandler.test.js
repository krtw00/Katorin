const { ApiError, errorHandler } = require('../../middleware/errorHandler');

describe('ApiError', () => {
  it('should create an error with status code and message', () => {
    const error = new ApiError(404, 'Not found');
    expect(error.statusCode).toBe(404);
    expect(error.message).toBe('Not found');
    expect(error.details).toBeNull();
  });

  it('should create error with details', () => {
    const details = { field: 'email', reason: 'invalid' };
    const error = new ApiError(400, 'Validation failed', details);
    expect(error.statusCode).toBe(400);
    expect(error.details).toEqual(details);
  });

  describe('Factory methods', () => {
    it('should create badRequest error', () => {
      const error = ApiError.badRequest('Invalid input');
      expect(error.statusCode).toBe(400);
      expect(error.message).toBe('Invalid input');
    });

    it('should create unauthorized error', () => {
      const error = ApiError.unauthorized();
      expect(error.statusCode).toBe(401);
      expect(error.message).toBe('認証が必要です。');
    });

    it('should create forbidden error', () => {
      const error = ApiError.forbidden();
      expect(error.statusCode).toBe(403);
    });

    it('should create notFound error', () => {
      const error = ApiError.notFound();
      expect(error.statusCode).toBe(404);
    });

    it('should create conflict error', () => {
      const error = ApiError.conflict();
      expect(error.statusCode).toBe(409);
    });

    it('should create internal error', () => {
      const error = ApiError.internal();
      expect(error.statusCode).toBe(500);
    });
  });
});

describe('errorHandler', () => {
  let req, res, next;

  beforeEach(() => {
    req = {};
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
    process.env.NODE_ENV = 'production';
  });

  it('should handle ApiError', () => {
    const error = new ApiError(404, 'Resource not found');
    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: {
        message: 'Resource not found',
      },
    });
  });

  it('should include stack trace in development mode', () => {
    process.env.NODE_ENV = 'development';
    const error = new ApiError(500, 'Server error');
    errorHandler(error, req, res, next);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          message: 'Server error',
          stack: expect.any(String),
        }),
      })
    );
  });

  it('should handle generic errors', () => {
    const error = new Error('Something went wrong');
    console.error = jest.fn(); // Suppress console.error in tests

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: {
        message: 'サーバー内部エラーが発生しました。',
      },
    });
  });
});
