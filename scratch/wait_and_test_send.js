const baseUrl = 'https://84-234-99-41.sslip.io';
const apiKey = 'owa_k1_c7f0ddf2bac4594780986cd843f90ed0baae6562399eeeb076b151325e5bef02';
const session = '8d89d180-5218-4757-87ab-421afe4346cd';
const testPhone = '2250779604919';

async function monitorAndTest() {
  console.log("Checking session status every 3 seconds...");
  for (let i = 1; i <= 10; i++) {
    await new Promise(r => setTimeout(r, 3000));
    try {
      const res = await fetch(`${baseUrl}/api/sessions/${session}`, {
        headers: { 'X-API-Key': apiKey }
      });
      const data = await res.json();
      console.log(`[Attempt ${i}] Status: ${data.status} | Phone: ${data.phone}`);

      if (data.status === 'ready') {
        console.log("🎉 Session is READY! Attempting send-text...");
        const sendRes = await fetch(`${baseUrl}/api/sessions/${session}/messages/send-text`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': apiKey
          },
          body: JSON.stringify({
            chatId: `${testPhone}@c.us`,
            text: '🔔 Test direct depuis Antigravity (Session réinitialisée)'
          })
        });
        console.log("Send status:", sendRes.status);
        console.log("Send response:", await sendRes.text());
        return;
      } else if (data.status === 'scan_qr' || data.status === 'qr') {
        console.log("⚠️ SESSION REQUIRES QR CODE RE-SCAN!");
        return;
      }
    } catch (e) {
      console.error(e.message);
    }
  }
}

monitorAndTest();
