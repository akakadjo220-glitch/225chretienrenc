import { formatPhoneNumber, sendWhatsAppOtp } from './openwaClient.js';

async function testOtpSending() {
  const input = "0779604919";
  const formatted = formatPhoneNumber(input);
  console.log("Input:", input);
  console.log("Formatted Phone (No +):", formatted);

  console.log("Sending OTP via OpenWA API...");
  const res = await sendWhatsAppOtp(formatted, "998877");
  console.log("Result:", res);
}

testOtpSending();
