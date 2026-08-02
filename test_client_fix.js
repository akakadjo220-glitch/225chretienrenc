import { testOpenWAConnection } from './openwaClient.js';

async function run() {
  console.log("⚡ Test du nouveau client OpenWA...");
  const res = await testOpenWAConnection('0779604919');
  console.log("Résultat du test :", res);
}

run();
