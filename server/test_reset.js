const fetch = require('node-fetch');

async function testReset() {
    const url = 'http://localhost:3000/api/reset-password';
    const body = {
        contact: 'nikunjpandya9723@gmail.com',
        newPassword: 'testpassword123'
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const data = await response.json();
        console.log('Response:', data);
    } catch (err) {
        console.error('Error:', err.message);
    }
}

testReset();
