// Middleware to validate required receipt fields before creation
export const validateReceipt = (req, res, next) => {
  const { name, quantity } = req.body;
  // Check if required fields are present
  if (!name || !quantity) {
    return res.status(400).json({ message: "Missing required fields" });
  }
  next();// Proceed if validation passes
};