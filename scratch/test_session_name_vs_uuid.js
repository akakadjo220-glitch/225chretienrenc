const baseUrl = 'https://84-234-99-41.sslip.io';
const apiKey = 'owa_k1_c7f0ddf2bac4594780986cd843f90ed0baae6562399eeeb076b151325e5bef02';
const phone = '2250779604919';

async function testNameVsUuid() {
  const sessions = [
    '225chretien',
    '8d89d180-5218-4757-87ab-421afe4346cd',
    'babipass',
    '6a9179e4-7302-4681-9f5f-1d065aa0b521'
  ];

  for (const s of sessions) {
    console.log(`\nTesting send-text with session identifier: "${s}"...`);
    try {
      const res = await fetch(`${baseUrl}/api/sessions/${s}/messages/send-text`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey
        },
        body: JSON.stringify({
          chatId: `${phone}@c.us`,
          text: `Test session identifier "${s}"`
        })
      });
      console.log(`Identifier "${s}" -> Status: ${res.status}`);
      console.log(`Identifier "${s}" -> Body: ${await res.text()}`);
    } catch (e) {
      console.error(e.message);
    }
  }
}

testNameVsUuid();
