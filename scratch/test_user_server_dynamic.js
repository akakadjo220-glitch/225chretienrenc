const targetServer = 'https://193-29-187-66.sslip.io';
const sessionId = '0ee5c162-cda6-4b59-a867-62c01be1240f';
const phone = '2250779604919';

async function testUserServer() {
  console.log(`Checking user OpenWA server ${targetServer}...`);
  try {
    const health = await fetch(`${targetServer}/api/health`);
    console.log("Health status:", health.status, await health.text());
  } catch (e) {
    console.error("Health err:", e.message);
  }
}

testUserServer();
