const request = require('supertest');
const express = require('express');
const tournamentsRouter = require('../../routes/tournaments');

// Mock dependencies
jest.mock('../../authMiddleware', () => ({
  requireAuth: (req, res, next) => {
    req.user = { id: 'test-user-id' };
    req.supabase = {
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() => ({ data: [], error: null })),
            single: jest.fn(() => ({ data: null, error: null })),
          })),
        })),
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(() => ({ data: { id: '1', name: 'Test' }, error: null })),
          })),
        })),
      })),
    };
    next();
  },
  requireAdmin: (req, res, next) => next(),
}));

jest.mock('../../config/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}));

describe('Tournaments Router', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/tournaments', tournamentsRouter);
  });

  describe('GET /api/tournaments', () => {
    it('should return tournaments list', async () => {
      const response = await request(app).get('/api/tournaments');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('POST /api/tournaments', () => {
    it('should create a tournament with valid data', async () => {
      const tournamentData = {
        name: 'Test Tournament',
        slug: 'test-tournament',
        description: 'Test description',
      };

      const response = await request(app)
        .post('/api/tournaments')
        .send(tournamentData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
    });

    it('should return 400 if name is missing', async () => {
      const response = await request(app)
        .post('/api/tournaments')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });
});
