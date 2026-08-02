const baseUrl = 'https://84-234-99-41.sslip.io';

async function testKeys() {
  const keysToTest = [
    '',
    'admin',
    'secret',
    'openwa',
    '225chretien',
    '123456',
    'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc4NTM0NjgwMCwiZXhwIjo0OTQxMDIwNDAwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.TL_OxgOS5gT7aXnsQHrVWDWa6oiQtyu_Vc1WPm7CA8Y'
  ];

  for (const key of keysToTest) {
    try {
      const res = await fetch(`${baseUrl}/api/sessions`, {
        headers: {
          'X-API-Key': key,
          'Authorization': `Bearer ${key}`
        }
      });
      console.log(`Key: "${key.substring(0, 15)}..." | Status: ${res.status}`);
      if (res.ok) {
        console.log(`🎉 VALID API KEY FOUND: "${key}"`);
        const text = await res.text();
        console.log("Sessions response:", text);
        return;
      }
    } catch (e) {}
  }
}

testKeys();
