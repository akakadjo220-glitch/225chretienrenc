async function inspectCreateSession() {
  const res = await fetch('https://84-234-99-41.sslip.io/api/docs-json');
  const json = await res.json();
  console.log("CreateSessionDto:", JSON.stringify(json.components.schemas.CreateSessionDto, null, 2));
}

inspectCreateSession();
