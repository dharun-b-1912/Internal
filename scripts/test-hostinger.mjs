const token = '7DnnHGNPELpar7zZyQicj1YbSyXrhYJqkZAdCLdDbd4ce26c';
const username = 'u917023645';
const domain = 'internalpayroll.joypeoplehr.com';

async function test() {
  const urls = [
    `https://developers.hostinger.com/api/hosting/v1/accounts/${username}/websites/${domain}`,
    `https://developers.hostinger.com/api/hosting/v1/accounts/${username}/ftp`,
    `https://developers.hostinger.com/api/hosting/v1/accounts/${username}/ssh`,
    `https://developers.hostinger.com/api/hosting/v1/accounts/${username}/git`,
    `https://developers.hostinger.com/api/hosting/v1/accounts/${username}/websites/${domain}/git`
  ];
  for (const u of urls) {
    try {
      const res = await fetch(u, {
        headers: { 'Authorization': 'Bearer ' + token, 'Accept': 'application/json' }
      });
      console.log(u, res.status);
      const text = await res.text();
      console.log(text.slice(0, 300));
    } catch (e) {
      console.error(u, e.message);
    }
  }
}
test();
