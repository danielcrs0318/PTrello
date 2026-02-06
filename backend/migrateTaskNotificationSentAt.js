const sequelize = require('./src/configuraciones/sequelize');

async function migrate() {
    try {
        await sequelize.query(`
            IF COL_LENGTH('tasks', 'notification_sent_at') IS NULL
            BEGIN
                ALTER TABLE tasks
                ADD notification_sent_at DATETIME2 NULL;
            END
        `);
        console.log('Migración notification_sent_at en tasks completada.');
    } catch (error) {
        console.error('Error en migración notification_sent_at:', error);
    } finally {
        await sequelize.close();
    }
}

migrate();
