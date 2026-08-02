const baseUrl = 'https://84-234-99-41.sslip.io';
const apiKey = 'owa_k1_c7f0ddf2bac4594780986cd843f90ed0baae6562399eeeb076b151325e5bef02';
const session1 = '8d89d180-5218-4757-87ab-421afe4346cd';
const session2 = '6a9179e4-7302-4681-9f5f-1d065aa0b521';
const phone = '2250779604919';

async function testContactCheck() {
  for (const s of [session1, session2]) {
    console.log(`\nTesting contact check on session ${s}...`);
    try {
      const res = await fetch(`${baseUrl}/api/sessions/${s}/contacts/check/${phone}`, {
        headers: { 'X-API-Key': apiKey }
      });
      console.log("Contact check status:", res.status);
      console.log("Contact check body:", await res.text());
    } catch (e) {
      console.error(e.message);
    }
  }
}

testContactCheck();
