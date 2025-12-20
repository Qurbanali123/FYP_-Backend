import mysql from "mysql2/promise";

// Create pool using DATABASE_URL (recommended).
// Guard against missing DATABASE_URL to avoid throwing at import time
// (which causes serverless function invocation failures).
let pool;
if (process.env.DATABASE_URL && process.env.DATABASE_URL.trim() !== "") {
  pool = mysql.createPool({
    uri: process.env.DATABASE_URL,
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0,
    connectTimeout: 10000,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
  });
} else {
  // Fallback stub that surface clear runtime errors when DB is accessed.
  pool = {
    query: async () => {
      throw new Error("DATABASE_URL is not set in environment");
    },
    getConnection: async () => {
      throw new Error("DATABASE_URL is not set in environment");
    },
  };
}

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
