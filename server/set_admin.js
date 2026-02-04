const { Sequelize, DataTypes } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'postgres',
    logging: false
});

const User = sequelize.define('User', {
    name: { type: DataTypes.STRING, allowNull: false },
    contact: { type: DataTypes.STRING, allowNull: false, unique: true },
    password: { type: DataTypes.STRING, allowNull: true },
    lastLogin: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    rating: { type: DataTypes.INTEGER, defaultValue: 0 },
    role: { type: DataTypes.STRING, defaultValue: 'user' }
});

async function makeAdmin() {
    try {
        await sequelize.authenticate();
        // Sync schema with alter: true to add the 'role' column if it doesn't exist
        await sequelize.sync({ alter: true });
        
        const [updatedRows] = await User.update({ role: 'admin' }, { where: { contact: 'nikunjpandya9723@gmail.com' } });
        if (updatedRows > 0) {
            console.log('User status updated to Admin successfully');
        } else {
            console.log('User not found or already admin');
        }
        process.exit(0);
    } catch (error) {
        console.error('Error updating user:', error);
        process.exit(1);
    }
}

makeAdmin();
