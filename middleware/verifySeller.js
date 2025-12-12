import jwt from "jsonwebtoken";

export const authenticateSeller = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Access denied. No token provided." });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET); // ✅ Use same secret as login
    req.user = decoded; // e.g. { id: 3, role: 'seller' }
    next();
  } catch (err) {
    console.error("❌ Invalid token:", err);
    return res.status(401).json({ message: "Invalid or expired token." });
  }
};
