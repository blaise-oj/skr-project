export const validateReceipt = (req, res, next) => {
  const { name, quantity } = req.body;
  if (!name || !quantity) {
    return res.status(400).json({ message: "Missing required fields" });
  }
  next();
};