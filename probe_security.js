async function checkAuth() {
  const res = await fetch('https://84-234-99-41.sslip.io/api/docs-json');
  const json = await res.json();
  console.log("Security schemes:", JSON.stringify(json.components?.securitySchemes, null, 2));
  console.log("Global security:", JSON.stringify(json.security, null, 2));
}

checkAuth();
