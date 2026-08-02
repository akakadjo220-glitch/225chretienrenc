function generateSecureOtp() {
  if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.getRandomValues) {
    const array = new Uint32Array(1);
    globalThis.crypto.getRandomValues(array);
    const code = 100000 + (array[0] % 900000);
    return code.toString();
  }
  return Math.floor(100000 + Math.random() * 900000).toString();
}

console.log("Testing 10 Secure OTP generations:");
for (let i = 0; i < 10; i++) {
  const otp = generateSecureOtp();
  console.log(`OTP #${i+1}: ${otp} (Length: ${otp.length}, Range: 100000-999999)`);
}
