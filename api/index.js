const express = require('express');
const { supabase } = require('./supabaseClient');

const app = express();

app.use(express.json());

app.get('/api', (req, res) => {
  res.send('Hello from Node.js backend!');
});

// Get all matches
app.get('/api/matches', async (req, res) => {
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
app.get('/api/matches/:id', async (req, res) => {
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
app.post('/api/matches', async (req, res) => {
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
app.put('/api/matches/:id', async (req, res) => {
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
app.delete('/api/matches/:id', async (req, res) => {
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

// Export the app for Vercel
module.exports = app;
