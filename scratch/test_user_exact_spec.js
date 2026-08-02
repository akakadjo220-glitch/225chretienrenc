const url = 'https://193-29-187-66.sslip.io/api/sessions/0ee5c162-cda6-4b59-a867-62c01be1240f/messages/send-text';
const apiKey = 'owa_k1_3c9a06ce512ba8e1d878921454986d388d24f88f334012c1434e1bb479583566';

async function sendMessage() {
  console.log("Testing exact user spec with ONLY X-API-Key...");
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey
      },
      body: JSON.stringify({
        chatId: '2250779604919',
        text: 'Bonjour ! Ceci est un test de validation direct.'
      })
    });

    console.log("HTTP Status:", response.status);
    console.log("HTTP Response:", await response.text());
  } catch (e) {
    console.error("Fetch Error:", e.message);
  }
}

sendMessage();
