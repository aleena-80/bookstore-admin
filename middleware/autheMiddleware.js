import jwt from "jsonwebtoken";

const protectAdmin = (req, res, next) => {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ message: "Not authorized, no token" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== "admin") {
      return res.status(403).json({ message: "Not authorized as admin" });
    }
    req.admin = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid token" });
  }
};

export default protectAdmin;
