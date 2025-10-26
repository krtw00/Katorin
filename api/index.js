const express = require('express');
const { supabase } = require('./supabaseClient');
const { requireAuth, requireAdmin } = require('./authMiddleware');

const createSlugFrom = (value) =>
  value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const app = express();

app.use(express.json());

app.get('/api', (req, res) => {
  res.send('Hello from Node.js backend!');
});

// Get all matches
app.get('/api/matches', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .order('date', { ascending: false });
  if (error) {
    console.error('[GET /api/matches] Supabase error:', error);
    return res.status(500).json({ error: error.message });
  }
  res.json(data ?? []);
});

// Get match by id
app.get('/api/matches/:id', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .eq('id', req.params.id)
    .single();
  if (error) {
    console.error('[GET /api/matches/:id] Supabase error:', error);
    return res.status(404).json({ error: error.message });
  }
  res.json(data);
});

// Create a new match
app.post('/api/matches', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('matches')
    .insert(req.body)
    .select()
    .single();
  if (error) {
    console.error('[POST /api/matches] Supabase error:', error);
    return res.status(500).json({ error: error.message });
  }
  res.status(201).json(data);
});

// Update a match
app.put('/api/matches/:id', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('matches')
    .update(req.body)
    .eq('id', req.params.id)
    .select()
    .single();
  if (error) {
    console.error('[PUT /api/matches/:id] Supabase error:', error);
    return res.status(500).json({ error: error.message });
  }
  res.json(data);
});

// Delete a match
app.delete('/api/matches/:id', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('matches')
    .delete()
    .eq('id', req.params.id)
    .select()
    .single();
  if (error) {
    console.error('[DELETE /api/matches/:id] Supabase error:', error);
    return res.status(500).json({ error: error.message });
  }
  res.json(data);
});

// List tournaments (public)
app.get('/api/tournaments', async (_req, res) => {
  const { data, error } = await supabase
    .from('tournaments')
    .select('id, name, slug, description, created_at')
    .order('created_at', { ascending: false });
  if (error) {
    console.error('[GET /api/tournaments] Supabase error:', error);
    return res.status(500).json({ error: error.message });
  }
  res.json(data ?? []);
});

// Create a new tournament (admin only)
app.post('/api/tournaments', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name, slug, description } = req.body ?? {};
    const normalizedName = (name ?? '').toString().trim();
    if (!normalizedName) {
      return res.status(400).json({ error: '大会名を入力してください。' });
    }

    const baseSlug = slug ? slug.toString() : normalizedName;
    const normalizedSlug = createSlugFrom(baseSlug);
    if (!normalizedSlug) {
      return res
        .status(400)
        .json({ error: 'スラッグは半角英数字とハイフンのみ使用できます。' });
    }

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalizedSlug)) {
      return res
        .status(400)
        .json({ error: 'スラッグは半角英数字とハイフンのみ使用できます。' });
    }

    const { data, error } = await supabase
      .from('tournaments')
      .insert({
        name: normalizedName,
        slug: normalizedSlug,
        description: description ? description.toString().trim() || null : null,
        created_by: req.user.id,
      })
      .select('id, name, slug, description, created_at')
      .single();
    if (error) {
      console.error('[POST /api/tournaments] Supabase error:', error);
      return res.status(500).json({ error: error.message });
    }
    res.status(201).json(data);
  } catch (err) {
    console.error('[POST /api/tournaments] Unexpected error:', err);
    res.status(500).json({ error: '大会の作成に失敗しました。' });
  }
});

// Export the app for Vercel
module.exports = app;
