const baseUrl = 'https://84-234-99-41.sslip.io';
const apiKey = 'owa_k1_c7f0ddf2bac4594780986cd843f90ed0baae6562399eeeb076b151325e5bef02';

async function diagnose() {
  console.log("--- 1. Testing /api/health ---");
  try {
    const res = await fetch(`${baseUrl}/api/health`);
    console.log("Health status:", res.status, await res.text());
  } catch (e) { console.error("Health error:", e.message); }

  console.log("\n--- 2. Testing /api/infra/status ---");
  try {
    const res = await fetch(`${baseUrl}/api/infra/status`);
    console.log("Infra status:", res.status, await res.text());
  } catch (e) { console.error("Infra error:", e.message); }

  console.log("\n--- 3. Testing /api/sessions without key ---");
  try {
    const res = await fetch(`${baseUrl}/api/sessions`);
    console.log("Sessions (no key) status:", res.status, await res.text());
  } catch (e) { console.error("Sessions error:", e.message); }

  console.log("\n--- 4. Testing /api/sessions with X-API-Key ---");
  try {
    const res = await fetch(`${baseUrl}/api/sessions`, {
      headers: { 'X-API-Key': apiKey }
    });
    console.log("Sessions (with key) status:", res.status, await res.text());
  } catch (e) { console.error("Sessions key error:", e.message); }

  console.log("\n--- 5. Testing /api/auth/validate ---");
  try {
    const res = await fetch(`${baseUrl}/api/auth/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey }
    });
    console.log("Auth validate status:", res.status, await res.text());
  } catch (e) { console.error("Auth validate error:", e.message); }
}

diagnose();
