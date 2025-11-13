const tournamentsRouter = require('../../routes/tournaments');
const { listTournaments, createTournament } = tournamentsRouter.handlers;

// Mock dependencies
jest.mock('../../middleware/authMiddleware', () => ({
  requireAuth: jest.fn((req, res, next) => next()),
  requireAdmin: jest.fn((req, res, next) => next()),
}));

jest.mock('../../config/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}));

const createMockResponse = () => {
  const res = {
    statusCode: 200,
    body: null,
  };
  res.status = jest.fn((code) => {
    res.statusCode = code;
    return res;
  });
  res.json = jest.fn((payload) => {
    res.body = payload;
    return res;
  });
  return res;
};

describe('tournaments handlers', () => {
  describe('listTournaments', () => {
    it('should return tournaments list for the authenticated user', async () => {
      const result = { data: [{ id: '1', name: 'Sample' }], error: null };
      const order = jest.fn(() => result);
      const eq = jest.fn(() => ({ order }));
      const select = jest.fn(() => ({ eq }));
      const from = jest.fn(() => ({ select }));

      const req = {
        user: { id: 'test-user-id' },
        supabase: { from },
      };
      const res = createMockResponse();

      await listTournaments(req, res);

      expect(from).toHaveBeenCalledWith('tournaments');
      expect(select).toHaveBeenCalledWith('id, name, slug, description, created_at');
      expect(eq).toHaveBeenCalledWith('created_by', 'test-user-id');
      expect(order).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(result.data);
    });
  });

  describe('createTournament', () => {
    it('should create a tournament with valid data', async () => {
      const insertResult = {
        data: { id: '1', name: 'Test Tournament', slug: 'test-tournament', description: 'Test description' },
        error: null,
      };
      const single = jest.fn(() => insertResult);
      const select = jest.fn(() => ({ single }));
      const insert = jest.fn(() => ({ select }));
      const from = jest.fn(() => ({ insert }));

      const req = {
        user: { id: 'test-user-id' },
        supabase: { from },
        body: {
          name: 'Test Tournament ',
          slug: 'Test Tournament',
          description: ' Test description ',
        },
      };
      const res = createMockResponse();

      await createTournament(req, res);

      expect(insert).toHaveBeenCalledWith({
        name: 'Test Tournament',
        slug: 'test-tournament',
        description: 'Test description',
        created_by: 'test-user-id',
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(insertResult.data);
    });

    it('should return 400 if name is missing', async () => {
      const req = {
        user: { id: 'test-user-id' },
        supabase: {},
        body: {},
      };
      const res = createMockResponse();

      await createTournament(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: '大会名を入力してください。' });
    });
  });
});
