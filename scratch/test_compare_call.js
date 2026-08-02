const deepfaceUrl = 'https://r8dqp05xpng1xidux3r4bu77.193.29.187.66.sslip.io';

async function testCompareCall() {
  console.log("Testing POST /compare on DeepFace server...");
  // Sample tiny 1x1 white pixel base64 image
  const dummyBase64 = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=";

  const params = new URLSearchParams();
  params.append('image1', dummyBase64);
  params.append('image2', dummyBase64);
  params.append('detector_backend', 'retinaface');
  params.append('model_name', 'ArcFace');

  try {
    const res = await fetch(`${deepfaceUrl}/compare`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params
    });

    console.log("Compare response status:", res.status);
    console.log("Compare response body:", await res.text());
  } catch (e) {
    console.error("Compare error:", e.message);
  }
}

testCompareCall();
