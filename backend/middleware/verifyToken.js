import jwt from "jsonwebtoken";

export const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader)
    return res.status(401).json({ message: "Access denied. No token provided." });

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "skr-admin-secret");

    // decoded should include email and isAdmin
    req.user = decoded;
    // console.log("Decoded token:", decoded); // Uncomment for debugging later

    next();
  } catch (err) {
    res.status(401).json({ message: "Invalid token." });
  }
};
