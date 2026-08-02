const baseUrl = 'https://84-234-99-41.sslip.io';
const apiKey = 'owa_k1_c7f0ddf2bac4594780986cd843f90ed0baae6562399eeeb076b151325e5bef02';

async function listSessions() {
  console.log("Listing all sessions on OpenWA server...");
  try {
    const res = await fetch(`${baseUrl}/api/sessions`, {
      headers: { 'X-API-Key': apiKey }
    });
    console.log("Status:", res.status);
    console.log("Sessions:", await res.text());
  } catch (e) {
    console.error("Error:", e.message);
  }
}

listSessions();
