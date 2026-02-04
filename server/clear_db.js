const { Sequelize, DataTypes } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
    process.env.DB_NAME || 'temple_db',
    process.env.DB_USER || 'postgres',
    process.env.DB_PASSWORD || 'your_password_here',
    {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        dialect: 'postgres',
        logging: false
    }
);

const Temple = sequelize.define('Temple', {
    name: { type: DataTypes.STRING, allowNull: false, unique: true },
    state: { type: DataTypes.STRING, allowNull: false }
}, { tableName: 'Temples' });

async function clearAndCheck() {
    try {
        await sequelize.authenticate();
        console.log('Connected.');
        
        const countBefore = await Temple.count();
        console.log('Count before delete:', countBefore);
        
        await Temple.destroy({ where: {}, truncate: true, cascade: true });
        console.log('Table truncated.');
        
        const countAfter = await Temple.count();
        console.log('Count after delete:', countAfter);
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

clearAndCheck();
