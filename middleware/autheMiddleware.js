import jwt from "jsonwebtoken";
import User from '../models/User.js'

const protectAdmin = (req, res, next) => {
  let token = req.cookies.adminToken || req.headers.authorization;
  console.log("Incoming cookies:", req.cookies);
  if (!token) {
    return res.redirect('/admin/login');
  }

  if (token.startsWith("Bearer ")) token = token.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded.role || decoded.role !== 'admin') {
      return res.status(403).json({ message: "Not authorized as admin" });
    }

    req.admin = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.redirect('/admin/login');
    }
     return res.status(401).json({ message: 'Invalid token' });
  }
};
//------------------------------------------------------------------------------------------------
const protectUser = async (req, res, next) => {
  let token = req.cookies.token|| req.headers.authorization;
  if (!token) {
    return req.method === 'POST' 
      ? res.status(401).json({ message: "Unauthorized: Please log in" })
      : res.redirect('/users/login');
  }
  if (token.startsWith("Bearer ")) token = token.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (!user) throw new Error('User not found');
    req.user = user; // Full user object
    if (req.path === '/login' || req.path === '/users/login') {
      return res.redirect('/users/home');
    }
    next();
  } catch (error) {
    console.error('Auth Error:', error);
    return req.method === 'POST' 
      ? res.status(401).json({ message: "Invalid or expired token" })
      : res.redirect('/users/login');
  }
};
export default {protectUser,protectAdmin};