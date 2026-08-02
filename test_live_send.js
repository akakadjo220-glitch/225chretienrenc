const apiUrl = 'https://84-234-99-41.sslip.io';
const session = '6a9179e4-7302-4681-9f5f-1d065aa0b521';
const apiKey = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc4NTM0NjgwMCwiZXhwIjo0OTQxMDIwNDAwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.TL_OxgOS5gT7aXnsQHrVWDWa6oiQtyu_Vc1WPm7CA8Y';
const testPhone = '2250779604919';

async function testSend() {
  const url = `${apiUrl}/api/sessions/${session}/messages/send-text`;
  console.log(`🚀 Test envoi WhatsApp vers ${url}...`);

  const payload = {
    chatId: `${testPhone}@c.us`,
    to: `${testPhone}@c.us`,
    text: "🔔 Test de connexion OpenWA (225 Chrétien)\nStatut : Opérationnel ✅",
    content: "🔔 Test de connexion OpenWA (225 Chrétien)\nStatut : Opérationnel ✅",
    message: "🔔 Test de connexion OpenWA (225 Chrétien)\nStatut : Opérationnel ✅"
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'x-api-key': apiKey,
        'apikey': apiKey
      },
      body: JSON.stringify(payload)
    });

    const status = res.status;
    const text = await res.text();
    console.log(`HTTP Status: ${status}`);
    console.log(`Response Body: ${text}`);
  } catch (e) {
    console.error("Error:", e);
  }
}

testSend();
