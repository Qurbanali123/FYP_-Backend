import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import bodyParser from "body-parser";

import authRoutes from "./routes/auth.js";
import sellerRoutes from "./routes/seller.js";
import adminRoutes from "./routes/admin.js";
import db from "./db.js";

dotenv.config();

const app = express();
let isconnected = false;
db.getConnection(function(err, connection) {
  if (err) throw err;
  isconnected = true;
  console.log("Connected to database!");
  connection.release();
});
// MIDDLEWARES
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
  // Website you wish to allow to connect
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
}
);  

app.use(cookieParser());
app.use(
  cors({
    origin: "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
  })
);
app.use(bodyParser.json());

// ROUTES
app.use("/api/auth", authRoutes);
app.use("/api/seller", sellerRoutes);
app.use("/api/admin", adminRoutes);

// Test route
app.get("/", (req, res) => {
  res.send("Backend API running ✔️");
});

if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => console.log(`🚀 Server running on ${PORT}`));
}

export default app;
