const baseUrl = 'https://84-234-99-41.sslip.io';
const apiKey = 'owa_k1_c7f0ddf2bac4594780986cd843f90ed0baae6562399eeeb076b151325e5bef02';
const session = '8d89d180-5218-4757-87ab-421afe4346cd';
const phone = '2250779604919';

async function testOtherEndpoints() {
  console.log("--- 1. Testing send-bulk ---");
  try {
    const res = await fetch(`${baseUrl}/api/sessions/${session}/messages/send-bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey
      },
      body: JSON.stringify({
        recipients: [`${phone}@c.us`],
        content: { text: "Test via send-bulk" }
      })
    });
    console.log("send-bulk status:", res.status);
    console.log("send-bulk body:", await res.text());
  } catch (e) { console.error(e.message); }

  console.log("\n--- 2. Testing status/send-text ---");
  try {
    const res = await fetch(`${baseUrl}/api/sessions/${session}/status/send-text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey
      },
      body: JSON.stringify({
        text: "Test status text"
      })
    });
    console.log("status/send-text status:", res.status);
    console.log("status/send-text body:", await res.text());
  } catch (e) { console.error(e.message); }
}

testOtherEndpoints();
