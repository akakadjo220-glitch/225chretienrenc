const baseUrl = 'https://84-234-99-41.sslip.io';
const apiKey = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc4NTM0NjgwMCwiZXhwIjo0OTQxMDIwNDAwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.TL_OxgOS5gT7aXnsQHrVWDWa6oiQtyu_Vc1WPm7CA8Y';
const sessionName = '6a9179e4-7302-4681-9f5f-1d065aa0b521';
const testPhone = '2250779604919';

async function testAll() {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
    'X-API-Key': apiKey,
    'x-api-key': apiKey,
    'apikey': apiKey
  };

  const endpoints = [
    {
      url: `${baseUrl}/api/sessions/${sessionName}/messages/send-text`,
      body: { chatId: `${testPhone}@c.us`, text: "Test 225 Chrétien" }
    },
    {
      url: `${baseUrl}/api/send-message`,
      body: { session: sessionName, to: `${testPhone}@c.us`, chatId: `${testPhone}@c.us`, content: "Test 225 Chrétien", message: "Test 225 Chrétien" }
    },
    {
      url: `${baseUrl}/send-message`,
      body: { session: sessionName, to: `${testPhone}@c.us`, chatId: `${testPhone}@c.us`, text: "Test 225 Chrétien" }
    }
  ];

  for (const ep of endpoints) {
    try {
      console.log(`Trying ${ep.url}...`);
      const res = await fetch(ep.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(ep.body)
      });
      const status = res.status;
      const text = await res.text();
      console.log(`Status: ${status} | Body: ${text}`);
      if (res.ok) {
        console.log(`🎉 SUCCESS ON ${ep.url}`);
        return;
      }
    } catch (e) {
      console.error(e.message);
    }
  }
}

testAll();
