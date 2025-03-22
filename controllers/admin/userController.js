import User from '../../models/User.js'
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";


export const renderDashboard = (req, res) => {
  try {
    if (res.headersSent) {
      return;
    }
    res.render("admin/dashboard"); 
  } catch (error) {
    if (!res.headersSent) {
      res.status(500).send("Internal Server Error"); 
    }
  }
};
export const renderUsers = async (req, res) => {
    const { search = '', page = 1, limit = 2 } = req.query;
    let query = {};
    if (search) query.email = { $regex: search, $options: 'i' };
  
    const totalUsers = await User.countDocuments(query);
    const users = await User.find(query)
      .sort({ createdAt: -1 }) 
      .skip((page - 1) * limit)
      .limit(Number(limit));
  
    res.render('admin/users', {
      users,
      totalPages: Math.ceil(totalUsers / limit),
      currentPage: Number(page),
      search
    });
};
  
export const blockUser = async (req, res) => {
    try {
      const user = await User.findByIdAndUpdate(req.params.id, { isBlocked: true }, { new: true });
      if (!user) return res.status(404).json({ message: "User not found" });
      res.redirect('/admin/users');
    } catch (error) {
      console.error('Block User Error:', error);
      res.status(500).json({ message: "Failed to block user" });
    }
};
  
export const unblockUser = async (req, res) => {
    await User.findByIdAndUpdate(req.params.id, { isBlocked: false });
    res.redirect('/admin/users');
};
  