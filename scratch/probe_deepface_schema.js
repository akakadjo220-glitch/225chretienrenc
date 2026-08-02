const deepfaceUrl = 'https://r8dqp05xpng1xidux3r4bu77.193.29.187.66.sslip.io';

async function probeApiDocs() {
  console.log("Probing OpenAPI schema on DeepFace API...");
  try {
    const res = await fetch(`${deepfaceUrl}/openapi.json`);
    console.log("OpenAPI status:", res.status);
    if (res.status === 200) {
      const data = await res.json();
      console.log("API Title:", data.info?.title);
      console.log("Available Paths:", Object.keys(data.paths || {}));
    }
  } catch (e) {
    console.error("OpenAPI fetch error:", e.message);
  }
}

probeApiDocs();
