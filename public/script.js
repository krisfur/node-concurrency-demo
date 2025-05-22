let chart; // Global chart reference

document.getElementById('run-btn').addEventListener('click', async () => {
  const output = document.getElementById('output');
  const status = document.getElementById('status');

  output.textContent = '';
  status.textContent = '⏳ Running concurrent calls...';

  const start = performance.now();

  try {
    const res = await fetch('/concurrent');
    const data = await res.json();
    const end = performance.now();

    const duration = (end - start).toFixed(2);
    status.textContent = `✅ Completed in ${duration} ms`;

    const { benchmark } = data;

    // Text summary
    output.textContent = 
`Benchmarks (ms):
- DB: ${benchmark.db}
- API: ${benchmark.api}
- Internal: ${benchmark.internal}

Results:
${JSON.stringify({
      dbResult: data.dbResult,
      apiResult: data.apiResult,
      internalResult: data.internalResult
    }, null, 2)}`;

    // Chart update
    const ctx = document.getElementById('benchmarkChart').getContext('2d');
    const labels = ['Database', 'API', 'Internal'];
    const times = [benchmark.db, benchmark.api, benchmark.internal].map(Number);

    if (chart) {
      chart.data.datasets[0].data = times;
      chart.update();
    } else {
      chart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [{
            label: 'Call Duration (ms)',
            data: times,
            backgroundColor: ['#f5e0dc', '#cba6f7', '#94e2d5'],
            borderWidth: 1
          }]
        },
        options: {
          scales: {
            y: {
              beginAtZero: true
            }
          },
          plugins: {
            legend: { display: false }
          }
        }
      });
    }

  } catch (err) {
    status.textContent = `❌ Error: ${err.message}`;
    output.textContent = '';
  }
});
