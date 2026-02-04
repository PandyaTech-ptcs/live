const { Client } = require('pg');

async function checkUsers() {
    const client = new Client({
        user: 'postgres',
        host: 'localhost',
        database: 'live_db',
        password: 'admin123',
        port: 5432,
    });

    try {
        await client.connect();
        const res = await client.query('SELECT * FROM "Users"');
        console.log("Total Users found:", res.rowCount);
        res.rows.forEach(user => {
            console.log(`- Name: ${user.name}, Contact: ${user.contact}`);
        });
        await client.end();
    } catch (err) {
        console.error("Error:", err.message);
    }
}

checkUsers();
