const express = require('express');
const { cors, helmetConfig, generalLimiter } = require('./config/security');
const { errorHandler } = require('./middleware/errorHandler');
const { requestLogger } = require('./config/logger');

// Import routers
const authRouter = require('./routes/auth');
const teamsRouter = require('./routes/teams');
const tournamentsRouter = require('./routes/tournaments');
const matchesRouter = require('./routes/matches');
const participantsRouter = require('./routes/participants');

const app = express();

// セキュリティミドルウェアの適用
app.use(helmetConfig);
app.use(cors);
app.use(express.json());

// リクエストロギング
app.use(requestLogger);

// 一般的なAPIエンドポイントにレート制限を適用
app.use('/api', generalLimiter);

// Health check endpoint
app.get('/api', (req, res) => {
  res.send('Hello from Node.js backend!');
});

// Mount routers
app.use('/api', authRouter);
app.use('/api/teams', teamsRouter);
app.use('/api/tournaments', tournamentsRouter);
app.use('/api/matches', matchesRouter);
app.use('/api', matchesRouter); // For /api/team/matches endpoints
app.use('/api', participantsRouter); // For /api/team/participants and /api/admin endpoints

// エラーハンドリングミドルウェア（全てのルートの後に配置）
app.use(errorHandler);

// Export the app for Vercel
module.exports = app;
