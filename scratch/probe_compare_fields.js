const deepfaceUrl = 'https://r8dqp05xpng1xidux3r4bu77.193.29.187.66.sslip.io';

async function probeFields() {
  const res = await fetch(`${deepfaceUrl}/openapi.json`);
  const data = await res.json();
  console.log("Body_compare_faces_compare_post schema:");
  console.log(JSON.stringify(data.components.schemas['Body_compare_faces_compare_post'], null, 2));
}

probeFields();
