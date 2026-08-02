const baseUrl = 'https://84-234-99-41.sslip.io';
const apiKey = 'owa_k1_c7f0ddf2bac4594780986cd843f90ed0baae6562399eeeb076b151325e5bef02';
const session = '8d89d180-5218-4757-87ab-421afe4346cd';
const phone = '2250779604919';

async function testVariations() {
  const variations = [
    { name: "chatId @c.us", body: { chatId: `${phone}@c.us`, text: "Test payload 1" } },
    { name: "chatId raw number", body: { chatId: phone, text: "Test payload 2" } },
    { name: "to field", body: { to: `${phone}@c.us`, text: "Test payload 3" } },
    { name: "number + message", body: { number: phone, message: "Test payload 4" } },
    { name: "recipient + text", body: { recipient: `${phone}@c.us`, text: "Test payload 5" } }
  ];

  for (const v of variations) {
    console.log(`\nTesting variation: ${v.name}...`);
    try {
      const res = await fetch(`${baseUrl}/api/sessions/${session}/messages/send-text`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey
        },
        body: JSON.stringify(v.body)
      });
      console.log(`[${v.name}] Status: ${res.status}`);
      console.log(`[${v.name}] Body: ${await res.text()}`);
    } catch (e) {
      console.error(e.message);
    }
  }
}

testVariations();
