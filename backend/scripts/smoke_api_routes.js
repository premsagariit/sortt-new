async function check(url, init) {
  try {
    const res = await fetch(url, init);
    const body = await res.text();
    return { ok: true, status: res.status, body };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

async function run() {
  const base = 'http://localhost:8080';
  const health = await check(`${base}/health`);
  const addresses = await check(`${base}/api/sellers/addresses`);
  const order = await check(`${base}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      material_codes: ['metal'],
      estimated_weights: { metal: 1 },
      pickup_preference: 'morning',
    }),
  });

  console.log(JSON.stringify({ health, addresses, order }, null, 2));
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
