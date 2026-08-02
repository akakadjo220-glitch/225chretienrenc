const baseUrl = 'https://84-234-99-41.sslip.io';
const apiKey = 'owa_k1_c7f0ddf2bac4594780986cd843f90ed0baae6562399eeeb076b151325e5bef02';
const session1 = '8d89d180-5218-4757-87ab-421afe4346cd'; // 225chretien
const session2 = '6a9179e4-7302-4681-9f5f-1d065aa0b521'; // babipass

async function tryRestart() {
  for (const s of [session1, session2]) {
    console.log(`\nAttempting to restart session ${s}...`);
    try {
      const res = await fetch(`${baseUrl}/api/sessions/${s}/start`, {
        method: 'POST',
        headers: { 'X-API-Key': apiKey }
      });
      console.log("Start response:", res.status, await res.text());
    } catch (e) {
      console.error(e.message);
    }
  }
}

tryRestart();
