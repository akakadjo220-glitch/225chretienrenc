const baseUrl = 'https://84-234-99-41.sslip.io';
const apiKey = 'owa_k1_c7f0ddf2bac4594780986cd843f90ed0baae6562399eeeb076b151325e5bef02';
const session = '8d89d180-5218-4757-87ab-421afe4346cd';

async function reconnect() {
  console.log(`Stopping session ${session}...`);
  try {
    const stopRes = await fetch(`${baseUrl}/api/sessions/${session}/stop`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey }
    });
    console.log("Stop response:", stopRes.status, await stopRes.text());
  } catch (e) { console.error("Stop err:", e.message); }

  console.log("Waiting 3 seconds...");
  await new Promise(r => setTimeout(r, 3000));

  console.log(`Starting session ${session}...`);
  try {
    const startRes = await fetch(`${baseUrl}/api/sessions/${session}/start`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey }
    });
    console.log("Start response:", startRes.status, await startRes.text());
  } catch (e) { console.error("Start err:", e.message); }
}

reconnect();
