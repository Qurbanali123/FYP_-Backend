import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

function firstEnv(keys, fallback = undefined) {
  for (const k of keys) {
    if (process.env[k] && process.env[k].trim() !== "") return process.env[k].trim();
  }
  return fallback;
}

const host = firstEnv(["MYSQLHOST", "DB_HOST"], "127.0.0.1");
const user = firstEnv(["MYSQLUSER", "DB_USER"], "root");
const password = firstEnv(["MYSQLPASSWORD", "DB_PASSWORD"], "");
const database = firstEnv(["MYSQLDATABASE", "DB_NAME"], "");
const port = parseInt(firstEnv(["MYSQLPORT", "DB_PORT"], "3306"), 10) || 3306;

const db = mysql.createPool({
  host,
  user,
  password,
  database,
  port,

  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

export default db;
