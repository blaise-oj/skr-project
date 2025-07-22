import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET;
// Middleware to verify if the request is from an authenticated admin
export const verifyAdmin = (req, res, next) => {
  const authHeader = req.headers.authorization;

  // Check if token is present and properly formatted
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized: No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    // Verify the token using the secret key
    const decoded = jwt.verify(token, SECRET);
    // Check if the decoded token belongs to an admin
    if (!decoded.isAdmin) {
      return res.status(403).json({ message: "Forbidden: Not an admin" });
    }

    // Attach decoded user info to the request for use in next middleware/controller
    req.user = decoded; // contains id, isAdmin, email, etc.
    next();// Proceed to the protected route
  } catch (err) {
    return res.status(401).json({ message: "Unauthorized: Invalid token" });
  }
};
