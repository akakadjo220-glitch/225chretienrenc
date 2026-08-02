async function testViteProxy() {
  console.log("Testing Vite proxy http://localhost:3001/openwa-proxy/api/health...");
  try {
    const res = await fetch('http://localhost:3001/openwa-proxy/api/health', {
      headers: {
        'x-target-url': 'https://193-29-187-66.sslip.io'
      }
    });
    console.log("Proxy status:", res.status);
    console.log("Proxy body:", await res.text());
  } catch (e) {
    console.error("Proxy error:", e.message);
  }
}

testViteProxy();
