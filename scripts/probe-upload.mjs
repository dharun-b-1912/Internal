const token = '7DnnHGNPELpar7zZyQicj1YbSyXrhYJqkZAdCLdDbd4ce26c';
const username = 'u917023645';
const domain = 'internalpayroll.joypeoplehr.com';

async function probe() {
  const candidates = [
    `https://developers.hostinger.com/api/hosting/v1/accounts/${username}/websites/${domain}/files/upload`,
    `https://developers.hostinger.com/api/hosting/v1/websites/${domain}/files/upload`,
    `https://developers.hostinger.com/api/hosting/v1/websites/${domain}/upload-url`,
    `https://developers.hostinger.com/api/hosting/v1/accounts/${username}/websites/${domain}/upload-url`,
    `https://developers.hostinger.com/api/hosting/v1/accounts/${username}/files/upload-url`,
    `https://developers.hostinger.com/api/hosting/v1/accounts/${username}/domains/${domain}/upload-url`,
    `https://developers.hostinger.com/api/hosting/v1/accounts/${username}/domains/${domain}/files`,
    `https://developers.hostinger.com/api/hosting/v1/accounts/${username}/websites/${domain}/files`,
    `https://developers.hostinger.com/api/hosting/v1/websites/${domain}/files`
  ];
  for (const c of candidates) {
    try {
      const res = await fetch(c, {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + token, 'Accept': 'application/json' }
      });
      console.log('POST', c, res.status);
      const text = await res.text();
      console.log(text.slice(0, 200));
    } catch (e) {
      console.error(c, e.message);
    }
  }
}
probe();
