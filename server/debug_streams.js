const https = require('https');

const URL = 'https://www.youtube.com/@SomnathTempleOfficialChannel/streams';

console.log('Fetching:', URL);

https.get(URL, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
}, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        // We want to find video objects that are marked as LIVE
        // The structure usually involves "videoId":"X", "title":..., and "text":"LIVE" in overlays
        
        // Let's dump the first 2-3 occurrences of "videoId" and their surroundings
        const regex = /"videoId":"([^"]+)"/g;
        let match;
        let count = 0;
        
        while ((match = regex.exec(data)) !== null && count < 5) {
            const index = match.index;
            // Grab a chunk of text starting from videoID to see if "LIVE" or title is nearby
            const snippet = data.substring(index, index + 1000); 
            console.log(`\n--- Match ${count+1} (ID: ${match[1]}) ---`);
            console.log(snippet);
            count++;
        }
    });
});
