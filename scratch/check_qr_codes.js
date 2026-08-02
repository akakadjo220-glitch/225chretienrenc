const baseUrl = 'https://84-234-99-41.sslip.io';
const apiKey = 'owa_k1_c7f0ddf2bac4594780986cd843f90ed0baae6562399eeeb076b151325e5bef02';

async function checkQr() {
  for (const s of ['8d89d180-5218-4757-87ab-421afe4346cd', '6a9179e4-7302-4681-9f5f-1d065aa0b521']) {
    console.log(`\nChecking QR for session ${s}...`);
    try {
      const res = await fetch(`${baseUrl}/api/sessions/${s}/qr`, {
        headers: { 'X-API-Key': apiKey }
      });
      console.log("QR response status:", res.status);
      console.log("QR response body:", await res.text());
    } catch (e) {
      console.error(e.message);
    }
  }
}

checkQr();
