const deepfaceUrl = 'https://r8dqp05xpng1xidux3r4bu77.193.29.187.66.sslip.io';

async function testDeepfaceServer() {
  console.log("Testing DeepFace API endpoint:", deepfaceUrl);
  try {
    const res = await fetch(`${deepfaceUrl}/`, { method: 'GET' });
    console.log("Root endpoint status:", res.status);
    console.log("Root endpoint body:", await res.text());
  } catch (e) {
    console.log("Root fetch error:", e.message);
  }

  try {
    const healthRes = await fetch(`${deepfaceUrl}/health`, { method: 'GET' });
    console.log("Health status:", healthRes.status);
    console.log("Health body:", await healthRes.text());
  } catch (e) {
    console.log("Health fetch error:", e.message);
  }
}

testDeepfaceServer();
