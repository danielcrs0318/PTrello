/**
 * Configuración de Sequelize ORM
 * Establece la conexión con la base de datos SQL Server
 * @module configuraciones/sequelize
 */

const { Sequelize } = require('sequelize');
require('dotenv').config();

const {
  DB_NAME,
  DB_USER,
  DB_PASSWORD,
  DB_HOST = 'localhost',
  DB_PORT = '1433',
  DB_ENCRYPT = 'true',
  DB_TRUST_CERT = 'true',
  NODE_ENV = 'development',
} = process.env;

/**
 * Instancia de Sequelize configurada para SQL Server
 * - Habilita logging en desarrollo
 * - Configura encriptación y certificados según variables de entorno
 * - Usa snake_case para nombres de columnas (underscored)
 * - No pluraliza nombres de tablas (freezeTableName)
 */
const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
  host: DB_HOST,
  port: Number(DB_PORT),
  dialect: 'mssql',
  logging: NODE_ENV === 'development' ? console.log : false,
  dialectOptions: {
    options: {
      encrypt: DB_ENCRYPT === 'true',
      trustServerCertificate: DB_TRUST_CERT === 'true',
    },
  },
  define: {
    underscored: true,
    freezeTableName: true,
  },
});

module.exports = sequelize;
