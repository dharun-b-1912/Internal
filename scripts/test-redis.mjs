const url = "https://cunning-kiwi-203450.upstash.io";
const token = "gQAAAAAAAxq6AAIgcDE0ODdkZjI3ZTliZGI0MzgwODRjYmRlZWNiNDY4OGU5Zg";

async function main() {
  console.log("Connecting to Upstash Redis...");
  const res = await fetch(`${url}/set/joy_payroll_ping/pong`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();
  console.log("SET response:", data);

  const getRes = await fetch(`${url}/get/joy_payroll_ping`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const getData = await getRes.json();
  console.log("GET response:", getData);
}

main().catch(console.error);
