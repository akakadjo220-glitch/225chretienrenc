const baseUrl = 'https://84-234-99-41.sslip.io';
const apiKey = 'owa_k1_c7f0ddf2bac4594780986cd843f90ed0baae6562399eeeb076b151325e5bef02';

async function createSession() {
  console.log("Creating session '225chretien' on OpenWA server...");
  try {
    const res = await fetch(`${baseUrl}/api/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey
      },
      body: JSON.stringify({
        name: '225chretien'
      })
    });
    console.log("Create status:", res.status);
    const data = await res.text();
    console.log("Create response:", data);
  } catch (e) {
    console.error("Error:", e.message);
  }
}

createSession();
