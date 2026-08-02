const baseUrl = 'https://84-234-99-41.sslip.io';
const apiKey = 'owa_k1_c7f0ddf2bac4594780986cd843f90ed0baae6562399eeeb076b151325e5bef02';

async function checkDetails() {
  const sessions = ['8d89d180-5218-4757-87ab-421afe4346cd', '6a9179e4-7302-4681-9f5f-1d065aa0b521'];
  for (const s of sessions) {
    console.log(`\n--- Inspecting session ${s} ---`);
    try {
      const res = await fetch(`${baseUrl}/api/sessions/${s}`, {
        headers: { 'X-API-Key': apiKey }
      });
      console.log("Details:", res.status, await res.text());
    } catch (e) { console.error(e.message); }

    try {
      const res = await fetch(`${baseUrl}/api/sessions/${s}/status`, {
        headers: { 'X-API-Key': apiKey }
      });
      console.log("WA Status:", res.status, await res.text());
    } catch (e) { console.error(e.message); }
  }
}

checkDetails();
