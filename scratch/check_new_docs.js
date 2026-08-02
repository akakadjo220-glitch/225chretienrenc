const baseUrl = 'https://193-29-187-66.sslip.io';

async function checkSwagger() {
  try {
    const res = await fetch(`${baseUrl}/api/docs-json`);
    console.log("Docs status:", res.status);
    if (res.ok) {
      const json = await res.json();
      console.log("Security schemes:", JSON.stringify(json.components?.securitySchemes, null, 2));
    }
  } catch (e) {
    console.error(e.message);
  }
}

checkSwagger();
