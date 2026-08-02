const proxyUrl = 'http://localhost:3001/openwa-proxy/api/sessions/0ee5c162-cda6-4b59-a867-62c01be1240f/messages/send-text';
const targetServer = 'https://193-29-187-66.sslip.io';
const apiKey = 'owa_k1_3c9a06ce512ba8e1d878921454986d388d24f88f334012c1434e1bb479583566';

async function sendViaProxy() {
  console.log("Testing exact user spec VIA VITE PROXY...");
  try {
    const response = await fetch(proxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
        'x-target-url': targetServer
      },
      body: JSON.stringify({
        chatId: '2250779604919',
        text: 'Bonjour ! Ceci est un test via le proxy Vite 225 Chrétien.'
      })
    });

    console.log("Proxy Status:", response.status);
    console.log("Proxy Response:", await response.text());
  } catch (e) {
    console.error("Proxy Error:", e.message);
  }
}

sendViaProxy();
