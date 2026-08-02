const targetUrl = 'https://84-234-99-41.sslip.io/api/sessions/6a9179e4-7302-4681-9f5f-1d065aa0b521/messages/send-text';
const corsUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;
const apiKey = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc4NTM0NjgwMCwiZXhwIjo0OTQxMDIwNDAwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.TL_OxgOS5gT7aXnsQHrVWDWa6oiQtyu_Vc1WPm7CA8Y';

async function test() {
  console.log("Testing via CORS proxy:", corsUrl);
  try {
    const res = await fetch(corsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey
      },
      body: JSON.stringify({
        chatId: '2250779604919@c.us',
        text: 'Test via CORS proxy'
      })
    });
    console.log("Status:", res.status);
    console.log("Response:", await res.text());
  } catch (e) {
    console.error("Error:", e);
  }
}

test();
