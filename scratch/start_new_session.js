const baseUrl = 'https://84-234-99-41.sslip.io';
const apiKey = 'owa_k1_c7f0ddf2bac4594780986cd843f90ed0baae6562399eeeb076b151325e5bef02';
const sessionId = 'c5c44701-42ee-4f7c-b3cb-45ea230e2575';

async function startSession() {
  console.log(`Starting session ${sessionId}...`);
  try {
    const res = await fetch(`${baseUrl}/api/sessions/${sessionId}/start`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey }
    });
    console.log("Start status:", res.status);
    console.log("Start response:", await res.text());
  } catch (e) {
    console.error(e.message);
  }
}

startSession();
