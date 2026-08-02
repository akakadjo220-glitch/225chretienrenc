const baseUrl = 'https://84-234-99-41.sslip.io';
const apiKey = 'owa_k1_c7f0ddf2bac4594780986cd843f90ed0baae6562399eeeb076b151325e5bef02';
const sessionId = 'c5c44701-42ee-4f7c-b3cb-45ea230e2575';
const testPhone = '2250779604919';

async function testSendNewSession() {
  console.log(`Sending message using ready session ${sessionId}...`);
  try {
    const res = await fetch(`${baseUrl}/api/sessions/${sessionId}/messages/send-text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey
      },
      body: JSON.stringify({
        chatId: `${testPhone}@c.us`,
        text: `🔔 Test WhatsApp 225 Chrétien - Nouvelle session active (${new Date().toLocaleTimeString()})`
      })
    });
    console.log("Status:", res.status);
    console.log("Response:", await res.text());
  } catch (e) {
    console.error("Error:", e.message);
  }
}

testSendNewSession();
