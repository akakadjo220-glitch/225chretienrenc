const apiKey = 'owa_k1_3c9a06ce512ba8e1d878921454986d388d24f88f334012c1434e1bb479583566';
const baseUrl = 'https://193-29-187-66.sslip.io';

async function checkSessions() {
  console.log("Checking active sessions on OpenWA server...");
  try {
    const listRes = await fetch(`${baseUrl}/api/sessions`, {
      headers: { 'X-API-Key': apiKey }
    });
    console.log("Sessions list status:", listRes.status);
    console.log("Sessions list body:", await listRes.text());
  } catch (e) {
    console.error("List sessions error:", e.message);
  }

  console.log("\nTrying to start session 0ee5c162-cda6-4b59-a867-62c01be1240f...");
  try {
    const startRes = await fetch(`${baseUrl}/api/sessions/0ee5c162-cda6-4b59-a867-62c01be1240f/start`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey }
    });
    console.log("Start session status:", startRes.status);
    console.log("Start session response:", await startRes.text());
  } catch (e) {
    console.error("Start session error:", e.message);
  }
}

checkSessions();
