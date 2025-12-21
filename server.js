import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import bodyParser from "body-parser";

import authRoutes from "./routes/auth.js";
import sellerRoutes from "./routes/seller.js";
import adminRoutes from "./routes/admin.js";
import db from "./db.js";

const app = express();

// Test DB connection on startup
(async () => {
  try {
    const connection = await db.getConnection();
    console.log("✅ Connected to database!");
    connection.release();
  } catch (err) {
    console.error("❌ Database connection failed:", err);
  }
})();

// ---------------- MIDDLEWARES ----------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(bodyParser.json());

// CORS configuration
const allowedOrigins = [
  "http://localhost:3000",
  process.env.CLIENT_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

// ---------------- ROUTES ----------------
app.use("/api/auth", authRoutes);
app.use("/api/seller", sellerRoutes);
app.use("/api/admin", adminRoutes);

// Test route
app.get("/", (req, res) => {
  res.send("Backend API running ✔️");
});

// ---------------- LOCAL DEVELOPMENT ----------------
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => console.log(`🚀 Server running on ${PORT}`));
}

// ---------------- EXPORT FOR VERCEL ----------------
export default app;
