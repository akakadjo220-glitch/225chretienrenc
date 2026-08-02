const baseUrl = 'https://84-234-99-41.sslip.io';
const apiKey = 'owa_k1_c7f0ddf2bac4594780986cd843f90ed0baae6562399eeeb076b151325e5bef02';
const session = '8d89d180-5218-4757-87ab-421afe4346cd';
const phone = '2250779604919';

async function testWorkingServer() {
  console.log(`Sending WhatsApp message to +${phone} via ${baseUrl}...`);
  try {
    const res = await fetch(`${baseUrl}/api/sessions/${session}/messages/send-text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey
      },
      body: JSON.stringify({
        chatId: `${phone}@c.us`,
        text: `✅ Test de validation final - Serveur OpenWA 225 Chrétien operational! (${new Date().toLocaleTimeString()})`
      })
    });
    console.log("Status:", res.status);
    console.log("Body:", await res.text());
  } catch (e) {
    console.error("Error:", e.message);
  }
}

testWorkingServer();
