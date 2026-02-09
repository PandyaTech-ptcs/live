const { Sequelize, DataTypes } = require('sequelize');
const bcrypt = require('bcrypt');
require('dotenv').config();

// Database Connection
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

// User Model
const User = sequelize.define('User', {
    name: { type: DataTypes.STRING, allowNull: false },
    contact: { type: DataTypes.STRING, allowNull: false, unique: true },
    phoneNumber: { type: DataTypes.STRING },
    password: { type: DataTypes.STRING, allowNull: true },
    lastLogin: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    rating: { type: DataTypes.INTEGER, defaultValue: 0 },
    role: { type: DataTypes.STRING, defaultValue: 'user' },
    wantsToWorkAsGuide: { type: DataTypes.BOOLEAN, defaultValue: false }
});

async function migratePasswords() {
    try {
        await sequelize.authenticate();
        console.log('✅ Database connection established successfully.');

        const users = await User.findAll();
        console.log(`\n📊 Found ${users.length} users in database.\n`);

        let migratedCount = 0;
        let skippedCount = 0;

        for (const user of users) {
            // Check if password exists and is not already hashed
            // Bcrypt hashes start with $2a$, $2b$, or $2y$
            if (user.password && !user.password.match(/^\$2[aby]\$/)) {
                const hashedPassword = await bcrypt.hash(user.password, 10);
                await user.update({ password: hashedPassword });
                console.log(`✅ Migrated password for: ${user.name} (${user.contact})`);
                migratedCount++;
            } else if (user.password) {
                console.log(`⏭️  Skipped (already hashed): ${user.name} (${user.contact})`);
                skippedCount++;
            } else {
                console.log(`⚠️  Skipped (no password): ${user.name} (${user.contact})`);
                skippedCount++;
            }
        }

        console.log(`\n📈 Migration Summary:`);
        console.log(`   - Total users: ${users.length}`);
        console.log(`   - Migrated: ${migratedCount}`);
        console.log(`   - Skipped: ${skippedCount}`);
        console.log(`\n✅ Password migration complete!\n`);

        await sequelize.close();
    } catch (error) {
        console.error('❌ Migration error:', error);
        process.exit(1);
    }
}

// Run migration
migratePasswords();
