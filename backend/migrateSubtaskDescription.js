/* eslint-disable no-console */
require('dotenv').config();
const { sequelize } = require('./src/configuraciones/initModels');

const run = async () => {
    try {
        await sequelize.authenticate();
        await sequelize.query("IF COL_LENGTH('subtasks', 'description') IS NULL ALTER TABLE subtasks ADD description NVARCHAR(MAX) NULL;");
        console.log('Migración completada: description en subtasks');
        process.exit(0);
    } catch (error) {
        console.error('Error en migración de subtasks:', error);
        process.exit(1);
    }
};

run();
