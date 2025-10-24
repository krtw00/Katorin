
require('dotenv').config();
const express = require('express');
const { supabase } = require('./supabaseClient');

const app = express();
const port = process.env.PORT || 3001;

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Hello from Node.js backend!');
});

// Example route to get data from Supabase
app.get('/data', async (req, res) => {
  const { data, error } = await supabase
    .from('your_table_name') // Replace with your table name
    .select('*');

  if (error) {
    return res.status(500).json({ error: error.message });
  }
  res.json(data);
});

app.listen(port, () => {
  console.log(`Backend server is running on http://localhost:${port}`);
});
