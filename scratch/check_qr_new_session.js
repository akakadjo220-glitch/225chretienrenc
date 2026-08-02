const baseUrl = 'https://84-234-99-41.sslip.io';
const apiKey = 'owa_k1_c7f0ddf2bac4594780986cd843f90ed0baae6562399eeeb076b151325e5bef02';
const sessionId = 'c5c44701-42ee-4f7c-b3cb-45ea230e2575';

async function checkNewSession() {
  for (let i = 1; i <= 10; i++) {
    await new Promise(r => setTimeout(r, 2000));
    try {
      const res = await fetch(`${baseUrl}/api/sessions/${sessionId}`, {
        headers: { 'X-API-Key': apiKey }
      });
      const data = await res.json();
      console.log(`[Attempt ${i}] Status: ${data.status} | Phone: ${data.phone}`);

      if (data.status === 'scan_qr' || data.status === 'qr' || data.status === 'initializing') {
        const qrRes = await fetch(`${baseUrl}/api/sessions/${sessionId}/qr`, {
          headers: { 'X-API-Key': apiKey }
        });
        if (qrRes.ok) {
          const qrData = await qrRes.json();
          console.log("📷 QR Code ready! QR Data:", JSON.stringify(qrData).substring(0, 100));
        }
      } else if (data.status === 'ready') {
        console.log("🎉 Session is READY!");
        return;
      }
    } catch (e) {
      console.error(e.message);
    }
  }
}

checkNewSession();
