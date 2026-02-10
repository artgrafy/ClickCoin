const fetch = require('node-fetch');

const KV_URL = "https://immune-stag-16351.upstash.io";
const KV_TOKEN = "AT_fAAIncDFmM2U1YzZmZjE2Y2I0ZDViOTU2NzJkZTlkYTg3OTVjZXAxMTYzNTE";

async function checkSubscribers() {
    const response = await fetch(`${KV_URL}/smembers/coin_newsletter_subscribers`, {
        headers: {
            Authorization: `Bearer ${KV_TOKEN}`
        }
    });
    const data = await response.json();
    console.log("--- ClickCoin Subscribers ---");
    console.log(data.result);
}

checkSubscribers();
