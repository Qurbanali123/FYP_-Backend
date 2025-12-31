import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import authRoutes from "./routes/auth.js";
import sellerRoutes from "./routes/seller.js";
import adminRoutes from "./routes/admin.js";
import db from "./db.js";

const app = express();

/* ===============================
   TEST DB CONNECTION
================================ */
(async () => {
  try {
    const connection = await db.getConnection();
    console.log("✅ Connected to database!");
    connection.release();
  } catch (err) {
    console.error("❌ Database connection failed:", err);
  }
})();

/* ===============================
   MIDDLEWARES
================================ */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

/* ===============================
   ✅ FIXED CORS CONFIG
   (NO HTML ERRORS, NO 401)
================================ */
app.use(
  cors({
    origin: true, // allow all origins (best for API)
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

/* ===============================
   ROUTES
================================ */
app.use("/api/auth", authRoutes);
app.use("/api/seller", sellerRoutes);
app.use("/api/admin", adminRoutes);

/* ===============================
   TEST ROUTE
================================ */
app.get("/", (req, res) => {
  res.json({ message: "Backend API running ✔️" });
});

/* ===============================
   LOCAL DEV SERVER
================================ */
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
}

/* ===============================
   EXPORT FOR VERCEL
================================ */
export default app;
