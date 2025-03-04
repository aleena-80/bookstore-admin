import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Admin from "../models/Admin.js";
import dotenv from "dotenv";
import protect from "../middleware/autheMiddleware.js";
dotenv.config();

const router = express.Router();

// Admin Dashboard (Protected Route)
router.get("/dashboard", protect, (req, res) => {
  console.log("Inside /admin/dashboard route!"); // ✅ Check if this logs
  res.render("admin/dashboard");
});


// Admin Login Route
router.post("/login", async (req, res) => {
  console.log("Login attempt received!"); 
  console.log("Request Body:", req.body);
  const { email, password } = req.body;

  // Validate email and password
  if (!email || !password) {
      console.log("❌ Missing email or password");
      return res.status(400).json({ message: "Email and password are required" });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { // Check valid email format
      return res.status(400).json({ message: "Invalid email format" });
  }

  if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters long" });
  }

  try {
      const admin = await Admin.findOne({ email });

      if (!admin) {
          console.log("Admin not found");
          return res.status(400).json({ message: "Admin not found" });
      } 

      const isMatch = await bcrypt.compare(password, admin.password);
      if (!isMatch) {
          console.log("❌ Invalid credentials");
          return res.status(400).json({ message: "Invalid credentials" });
      }

      // Generate Token
      const token = jwt.sign({ id: admin._id, role: "admin" }, process.env.JWT_SECRET, { expiresIn: "1h" });

      res.cookie("token", token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" });

      return res.json({ success: true, token, redirectUrl: "/admin/dashboard" });

  } catch (error) {
      console.error("❌ Server Error:", error);
      res.status(500).json({ message: "Server Error" });
  }
});


// Admin Logout Route
router.post("/logout", (req, res) => {
  res.clearCookie("token"); // Clear token cookie
  res.redirect("/admin/login"); // ✅ Redirect to login page
  res.json({ message: "Logged out successfully" });
});


export default router;
