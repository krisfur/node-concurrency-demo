const express = require('express');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(express.static(path.join(__dirname, 'public')));

const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

const DB_FILE = './data.db';

function initDatabase() {
  // Delete existing DB to start clean every time
  if (fs.existsSync(DB_FILE)) {
    fs.unlinkSync(DB_FILE);
    console.log('Old database removed.');
  }

  const db = new sqlite3.Database(DB_FILE);
  console.log('Database created.')
  db.serialize(() => {
    db.run(`
      CREATE TABLE items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL
      )
    `);
    db.run(`INSERT INTO items (name) VALUES ('Crab'), ('Octopus'), ('Lobster')`);
  });
  db.close();
  console.log('Database preseeded.')
}

initDatabase(); // call it once on startup


function databaseCall() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_FILE);
    db.all("SELECT * FROM items", [], (err, rows) => {
      db.close();
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

async function callDummyAPI() {
  const response = await fetch('https://jsonplaceholder.typicode.com/todos/1');
  const data = await response.json();
  return data;
}

app.get('/internal', (req, res) => {
  setTimeout(() => {
    res.json({ message: 'Internal response' });
  }, 50);
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
      const result = await fetch(`http://localhost:${PORT}/internal`).then(r => r.json());
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