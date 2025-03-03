import express from "express";
import User from "../models/User.js";

const router = express.Router();

// ✅ Get all users with search, pagination, and sorting
router.get("/", async (req, res) => {
  try {
    const { search, page = 1, limit = 10 } = req.query;
    
    const query = search
      ? { name: { $regex: search, $options: "i" } } // Case-insensitive search
      : {};
    
    const users = await User.find(query)
      .sort({ createdAt: -1 }) // Latest users first
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.json({ users, total, page, limit });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ Block/Unblock a user
router.patch("/block/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.isBlocked = !user.isBlocked;
    await user.save();
    
    res.json({ message: `User ${user.isBlocked ? "blocked" : "unblocked"} successfully` });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
