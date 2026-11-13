const url = "https://cunning-kiwi-203450.upstash.io";
const token = "gQAAAAAAAxq6AAIgcDE0ODdkZjI3ZTliZGI0MzgwODRjYmRlZWNiNDY4OGU5Zg";

async function flush() {
  console.log("Flushing all keys in Upstash Redis...");
  const res = await fetch(`${url}/flushdb`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log("Flush result:", await res.json());
}

flush().catch(console.error);
