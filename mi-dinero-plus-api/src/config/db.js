const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4',
  // TiDB Cloud exige TLS; en local (XAMPP) dejar DB_SSL sin definir o false
  ssl:
    process.env.DB_SSL === 'true'
      ? { minVersion: 'TLSv1.2', rejectUnauthorized: true }
      : undefined,
});

async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log(
      `✅ Conexión a MySQL exitosa - Base de datos: ${process.env.DB_NAME || '(sin DB_NAME)'}`
    );
    connection.release();
  } catch (error) {
    console.error('❌ Error al conectar con MySQL:', error.message);
  }
}
testConnection();

module.exports = pool;
