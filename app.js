const express = require('express');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(express.static(path.join(__dirname, 'public')));

const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

const DB_FILE = './data.db';

// set up knex
const knex = require('knex')({
  client: 'sqlite3',
  connection: {
    filename: './data.db'
  },
  useNullAsDefault: true
});

// init the DB with knex for sqlite
async function initDatabase() {
  const exists = await knex.schema.hasTable('items');
  if (exists) {
    await knex.schema.dropTable('items');
  }

  await knex.schema.createTable('items', (table) => {
    table.increments('id').primary();
    table.string('name');
  });

  await knex('items').insert([
    { name: 'Crab' },
    { name: 'Octopus' },
    { name: 'Lobster' }
  ]);
}

initDatabase(); // call it once on startup


async function databaseCall() {
  const rows = await knex('items').select('*');
  return rows;
}

async function callDummyAPI() {
  const response = await fetch('https://jsonplaceholder.typicode.com/todos/1');
  const data = await response.json();
  return data;
}

app.get('/internal', (req, res) => {
  const input = req.query.text || 'default text';

  // Simulate some processing
  setTimeout(() => {
    const reversed = input.split('').reverse().join('').toUpperCase();

    res.json({
      original: input,
      transformed: reversed,
      length: input.length
    });
  }, 50); // Still keep a small delay to simulate latency
});

app.get('/concurrent', async (req, res) => {
  try {
    const benchmark = {};

    const dbPromise = (async () => {
      const start = performance.now();
      const result = await databaseCall();
      benchmark.db = (performance.now() - start).toFixed(2);
      return result;
    })();

    const apiPromise = (async () => {
      const start = performance.now();
      const result = await callDummyAPI();
      benchmark.api = (performance.now() - start).toFixed(2);
      return result;
    })();

    const internalPromise = (async () => {
      const start = performance.now();
      const internalInput = 'knex rocks'; // or dynamically pick something
      const result = await fetch(`http://localhost:${PORT}/internal?text=${encodeURIComponent(internalInput)}`).then(r => r.json());
      benchmark.internal = (performance.now() - start).toFixed(2);
      return result;
    })();

    const [dbResult, apiResult, internalResult] = await Promise.all([
      dbPromise, apiPromise, internalPromise
    ]);

    res.json({
      benchmark, // durations in ms
      dbResult,
      apiResult,
      internalResult
    });

  } catch (error) {
    res.status(500).json({ error: 'Something went wrong', details: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});