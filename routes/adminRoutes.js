import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Admin from "../models/Admin.js";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

// Admin Login Route
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    // Check if the admin exists
    const admin = await Admin.findOne({ email });
    if (!admin) return res.status(400).json({ message: "Admin not found" });

    // Compare Passwords
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    // Generate JWT Token
    const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, { expiresIn: "1h" });

    res.json({ message: "Login successful", token });
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
});

export default router;
