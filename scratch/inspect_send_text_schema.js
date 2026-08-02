async function inspectSchema() {
  const res = await fetch('https://84-234-99-41.sslip.io/api/docs-json');
  const json = await res.json();
  const path = json.paths['/api/sessions/{sessionId}/messages/send-text'];
  console.log("Send-text path spec:", JSON.stringify(path, null, 2));

  if (json.components?.schemas) {
    console.log("Schemas keys:", Object.keys(json.components.schemas));
  }
}

inspectSchema();
