import dotenv from "dotenv";
dotenv.config();

import app from "../server.js";

export default function handler(req, res) {
  return app(req, res).catch(err => {
    console.error("🔴 Full error:", err);
    throw err;
  });
}
