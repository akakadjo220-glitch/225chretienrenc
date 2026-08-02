async function checkSchema() {
  const res = await fetch('https://84-234-99-41.sslip.io/api/docs-json');
  const json = await res.json();
  const sendTextSpec = json.paths['/api/sessions/{sessionId}/messages/send-text'];
  console.log("Send text spec:", JSON.stringify(sendTextSpec, null, 2));

  // Print referenced schemas if any
  if (json.components && json.components.schemas) {
    console.log("Components schemas keys:", Object.keys(json.components.schemas));
    for (const key of Object.keys(json.components.schemas)) {
      if (key.toLowerCase().includes('send') || key.toLowerCase().includes('text')) {
        console.log(`Schema [${key}]:`, JSON.stringify(json.components.schemas[key], null, 2));
      }
    }
  }
}

checkSchema();
