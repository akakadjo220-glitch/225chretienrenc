const deepfaceUrl = 'https://r8dqp05xpng1xidux3r4bu77.193.29.187.66.sslip.io';

async function probeCompareSchema() {
  const res = await fetch(`${deepfaceUrl}/openapi.json`);
  const data = await res.json();
  console.log("POST /compare Details:");
  console.log(JSON.stringify(data.paths['/compare'], null, 2));
}

probeCompareSchema();
