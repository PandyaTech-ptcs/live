const { Sequelize, DataTypes } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'postgres',
    logging: false
});

const User = sequelize.define('User', {
    name: { type: DataTypes.STRING },
    contact: { type: DataTypes.STRING },
    password: { type: DataTypes.STRING }
});

async function listUsers() {
    try {
        await sequelize.authenticate();
        const users = await User.findAll();
        console.log('--- Current Users ---');
        users.forEach(u => console.log(`- ${u.name} | ${u.contact} | ${u.password}`));
        await sequelize.close();
    } catch (err) {
        console.error('Error:', err.message);
    }
}

listUsers();
