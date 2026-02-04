/* eslint-disable no-console */
require('dotenv').config();
const { sequelize } = require('./src/configuraciones/initModels');

const run = async () => {
    try {
        await sequelize.authenticate();
        await sequelize.query("IF COL_LENGTH('tasks', 'completed') IS NULL ALTER TABLE tasks ADD completed BIT NOT NULL DEFAULT 0;");
        console.log('Migración completada: completed en tasks');
        process.exit(0);
    } catch (error) {
        console.error('Error en migración de tasks:', error);
        process.exit(1);
    }
};

run();
