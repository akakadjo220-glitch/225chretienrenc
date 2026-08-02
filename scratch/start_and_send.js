const baseUrl = 'https://84-234-99-41.sslip.io';
const apiKey = 'owa_k1_c7f0ddf2bac4594780986cd843f90ed0baae6562399eeeb076b151325e5bef02';
const session = '8d89d180-5218-4757-87ab-421afe4346cd';
const phone = '2250779604919';

async function startAndSend() {
  console.log(`1. Starting session ${session}...`);
  try {
    const startRes = await fetch(`${baseUrl}/api/sessions/${session}/start`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey }
    });
    console.log("Start response:", startRes.status, await startRes.text());
  } catch (e) {
    console.error("Start error:", e.message);
  }

  console.log("2. Waiting for session to become ready...");
  for (let i = 1; i <= 15; i++) {
    await new Promise(r => setTimeout(r, 2000));
    try {
      const res = await fetch(`${baseUrl}/api/sessions/${session}`, {
        headers: { 'X-API-Key': apiKey }
      });
      const data = await res.json();
      console.log(`[Check ${i}] Status: ${data.status}`);
      if (data.status === 'ready') {
        console.log("🎉 Session is READY! Sending message now...");
        const sendRes = await fetch(`${baseUrl}/api/sessions/${session}/messages/send-text`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': apiKey
          },
          body: JSON.stringify({
            chatId: `${phone}@c.us`,
            text: `✅ Test WhatsApp 225 Chrétien réactivé avec succès ! (${new Date().toLocaleTimeString()})`
          })
        });
        console.log("Send status:", sendRes.status);
        console.log("Send body:", await sendRes.text());
        return;
      }
    } catch (e) {
      console.error(e.message);
    }
  }
}

startAndSend();
