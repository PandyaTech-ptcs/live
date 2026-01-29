const https = require('https');

// NASA is usually live 24/7
const TEST_URL = 'https://www.youtube.com/@shridwarkadhishmandirofficial/live';

console.log('Fetching:', TEST_URL);

https.get(TEST_URL, (res) => {
    console.log('Status Code:', res.statusCode);
    if (res.statusCode === 301 || res.statusCode === 302) {
        console.log('Redirect to:', res.headers.location);
    }
    
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        const isLiveTrue = data.includes('isLive":true');
        const statusLive = data.includes('"status":"LIVE"');
        const badgeLive = data.includes('style="LIVE"');
        const labelLive = data.includes('"label":"LIVE"');
        
        console.log('isLive":true :', isLiveTrue);
        console.log('"status":"LIVE" :', statusLive);
        console.log('style="LIVE" :', badgeLive);
        console.log('"label":"LIVE" :', labelLive);
        
        const videoIdMatch = data.match(/"videoId":"([^"]+)"/);
        if (videoIdMatch) {
            console.log('Found Video ID:', videoIdMatch[1]);
        }
    });
}).on('error', (e) => console.error(e));
