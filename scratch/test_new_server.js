const newBaseUrl = 'https://193-29-187-66.sslip.io';
const oldBaseUrl = 'https://84-234-99-41.sslip.io';
const apiKey = 'owa_k1_c7f0ddf2bac4594780986cd843f90ed0baae6562399eeeb076b151325e5bef02';

async function testNewServer() {
  console.log("=== 1. Testing NEW server https://193-29-187-66.sslip.io ===");
  try {
    const res = await fetch(`${newBaseUrl}/api/health`);
    console.log("New server health:", res.status, await res.text());
  } catch (e) {
    console.error("New server health error:", e.message);
  }

  try {
    const res = await fetch(`${newBaseUrl}/api/sessions`, {
      headers: { 'X-API-Key': apiKey }
    });
    console.log("New server sessions status:", res.status);
    console.log("New server sessions body:", await res.text());
  } catch (e) {
    console.error("New server sessions error:", e.message);
  }

  console.log("\n=== 2. Testing session 0ee5c162-cda6-4b59-a867-62c01be1240f on NEW server ===");
  const targetSession = '0ee5c162-cda6-4b59-a867-62c01be1240f';
  try {
    const res = await fetch(`${newBaseUrl}/api/sessions/${targetSession}`, {
      headers: { 'X-API-Key': apiKey }
    });
    console.log(`Session ${targetSession} info status:`, res.status);
    console.log(`Session ${targetSession} info body:`, await res.text());
  } catch (e) {
    console.error("Session info error:", e.message);
  }
}

testNewServer();
