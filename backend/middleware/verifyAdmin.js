// middleware/verifyAdmin.js
import jwt from "jsonwebtoken";
const SECRET = "skr-admin-secret";

export const verifyAdmin = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized: No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, SECRET);
    if (!decoded.isAdmin) {
      return res.status(403).json({ message: "Forbidden: Not an admin" });
    }

    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Unauthorized: Invalid token" });
  }
};
