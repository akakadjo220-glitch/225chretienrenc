const baseUrl = 'https://84-234-99-41.sslip.io';
const apiKey = 'owa_k1_c7f0ddf2bac4594780986cd843f90ed0baae6562399eeeb076b151325e5bef02';
const session1 = '8d89d180-5218-4757-87ab-421afe4346cd'; // 225chretien
const session2 = '6a9179e4-7302-4681-9f5f-1d065aa0b521'; // babipass
const testPhone = '2250779604919';

async function testOnlyXApiKey() {
  const sessions = [session1, session2, '225chretien', 'babipass'];

  for (const s of sessions) {
    try {
      console.log(`🚀 Testing send-text (ONLY X-API-Key) with session "${s}"...`);
      const res = await fetch(`${baseUrl}/api/sessions/${s}/messages/send-text`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey
        },
        body: JSON.stringify({
          chatId: `${testPhone}@c.us`,
          text: '🔔 Test de connexion OpenWA (225 Chrétien)\nStatut : Opérationnel ✅'
        })
      });

      const text = await res.text();
      console.log(`Session "${s}" -> Status: ${res.status} | Body: ${text}`);
      if (res.ok) {
        console.log(`🎉🎉🎉 SUCCESS!!! MESSAGE SENT WITH SESSION "${s}"!`);
        return;
      }
    } catch (e) {
      console.error(e);
    }
  }
}

testOnlyXApiKey();
