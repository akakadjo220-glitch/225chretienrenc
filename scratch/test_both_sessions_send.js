const baseUrl = 'https://84-234-99-41.sslip.io';
const apiKey = 'owa_k1_c7f0ddf2bac4594780986cd843f90ed0baae6562399eeeb076b151325e5bef02';
const session1 = '8d89d180-5218-4757-87ab-421afe4346cd'; // 225chretien
const session2 = '6a9179e4-7302-4681-9f5f-1d065aa0b521'; // babipass
const testPhone = '2250779604919';

async function testBoth() {
  for (const s of [session1, session2]) {
    console.log(`\n========================================`);
    console.log(`Checking session ${s}...`);
    try {
      const infoRes = await fetch(`${baseUrl}/api/sessions/${s}`, {
        headers: { 'X-API-Key': apiKey }
      });
      const info = await infoRes.json();
      console.log(`Session info: status=${info.status}, phone=${info.phone}, name=${info.name}`);

      if (info.status === 'ready') {
        console.log(`🚀 Sending text message using session "${s}"...`);
        const sendRes = await fetch(`${baseUrl}/api/sessions/${s}/messages/send-text`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': apiKey
          },
          body: JSON.stringify({
            chatId: `${testPhone}@c.us`,
            text: `🔔 Test WhatsApp 225 Chrétien via session ${info.name} (${new Date().toLocaleTimeString()})`
          })
        });
        console.log(`HTTP Status: ${sendRes.status}`);
        const responseBody = await sendRes.text();
        console.log(`Response Body:`, responseBody);
      } else {
        console.log(`Session ${s} is NOT ready (status: ${info.status})`);
      }
    } catch (e) {
      console.error(`Error on session ${s}:`, e.message);
    }
  }
}

testBoth();
