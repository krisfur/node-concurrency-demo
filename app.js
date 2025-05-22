const express = require('express');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(express.static(path.join(__dirname, 'public')));

function fakeDatabaseCall() {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve('Database result');
    }, 300); //change to however long you want to simulate it taking
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
  }, 500);
});

app.get('/concurrent', async (req, res) => {
  try {
    const benchmark = {};

    const dbPromise = (async () => {
      const start = performance.now();
      const result = await fakeDatabaseCall();
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