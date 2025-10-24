const express = require('express');
const { supabase } = require('./supabaseClient');

const app = express();

app.use(express.json());

app.get('/api', (req, res) => {
  res.send('Hello from Node.js backend!');
});

// Example route to get data from Supabase
app.get('/api/data', async (req, res) => {
  const { data, error } = await supabase
    .from('your_table_name') // Replace with your table name
    .select('*');

  if (error) {
    return res.status(500).json({ error: error.message });
  }
  res.json(data);
});

// Export the app for Vercel
module.exports = app;
