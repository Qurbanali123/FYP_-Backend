import mysql from "mysql2";

// Create pool using DATABASE_URL (recommended)
const pool = mysql.createPool({
  uri: process.env.DATABASE_URL,
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0,
  connectTimeout: 10000,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});

// Safe connection test (NO crash)
pool.getConnection((err, connection) => {
  if (err) {
    console.error("❌ Database connection failed:", err.message);
  } else {
    console.log("✅ Connected to database!");
    if (connection) connection.release();
  }
});

export default pool;




// import mysql from "mysql2/promise";
// import dotenv from "dotenv";

// dotenv.config();

// function firstEnv(keys, fallback = undefined) {
//   for (const k of keys) {
//     if (process.env[k] && process.env[k].trim() !== "") return process.env[k].trim();
//   }
//   return fallback;
// }

// const host = firstEnv(["MYSQLHOST", "DB_HOST"], "127.0.0.1");
// const user = firstEnv(["MYSQLUSER", "DB_USER"], "root");
// const password = firstEnv(["MYSQLPASSWORD", "DB_PASSWORD"], "");
// const database = firstEnv(["MYSQLDATABASE", "DB_NAME"], "");
// const port = parseInt(firstEnv(["MYSQLPORT", "DB_PORT"], "3306"), 10) || 3306;

// const db = mysql.createPool({
//   host,
//   user,
//   password,
//   database,
//   port,

//   waitForConnections: true,
//   connectionLimit: 10,
//   queueLimit: 0,
//   enableKeepAlive: true,
//   keepAliveInitialDelay: 0,
//   connectTimeout: 10000,
// });

// // const pool = mysql.createPool({
// //   host: process.env.DB_HOST,
// //   port: Number(process.env.DB_PORT),
// //   user: process.env.DB_USER,
// //   password: process.env.DB_PASSWORD,
// //   database: process.env.DB_NAME,
// //   waitForConnections: true,
// //   connectionLimit: 5,
// //   connectTimeout: 10000,
// // });


// export default db;
