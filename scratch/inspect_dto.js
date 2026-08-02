async function inspectDto() {
  const res = await fetch('https://84-234-99-41.sslip.io/api/docs-json');
  const json = await res.json();
  console.log("SendTextMessageDto:", JSON.stringify(json.components.schemas.SendTextMessageDto, null, 2));
}

inspectDto();
