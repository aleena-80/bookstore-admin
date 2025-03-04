import jwt from "jsonwebtoken";

const protectAdmin = (req, res, next) => {
  let token = req.cookies.token || req.headers.authorization;

  if (!token) {
    return res.status(401).json({ message: "Not authorized, no token" });
  }

  try {
    // Handle "Bearer <token>" format
    if (token.startsWith("Bearer ")) {
      token = token.split(" ")[1]; // Extract the actual token
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Ensure decoded contains role info
    if (!decoded.role || decoded.role !== "admin") {
      return res.status(403).json({ message: "Not authorized as admin" });
    }

    req.admin = decoded; // Attach admin data to request
    next(); // Proceed to next middleware
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

export default protectAdmin;
