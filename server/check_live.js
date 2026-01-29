
const https = require('https');

const url = 'https://www.youtube.com/c/RanchhodraijiLiveDarshanDakor/live';

https.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        // Check for live stream patterns
        const isLive = data.includes('isLive":true');
        const videoIdMatch = data.match(/"videoId":"([^"]+)"/);
        
        console.log("Is Live:", isLive);
        if (videoIdMatch) {
            console.log("Video ID found:", videoIdMatch[1]);
        } else {
            console.log("No Video ID found");
        }
        
        // Also look for canonical URL which might contain the video ID if redirected
        const canonicalMatch = data.match(/<link rel="canonical" href="([^"]+)"/);
        if (canonicalMatch) {
            console.log("Canonical URL:", canonicalMatch[1]);
        }
    });
}).on('error', (err) => {
    console.error("Error:", err.message);
});
