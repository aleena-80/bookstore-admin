// import User from '../../models/User.js';

// // Get user profile
// export const getProfile = async (req, res) => {
//   try {
//     const user = await User.findById(req.user.id).select('-password'); // Exclude password
//     if (!user) {
//       return res.status(404).render('user/error', { message: 'User not found' });
//     }
//     res.render('user/profile', { user });
//   } catch (error) {
//     console.error('Get Profile Error:', error);
//     res.status(500).render('user/error', { message: 'Failed to load profile' });
//   }
// };

// // Update user profile
// export const updateProfile = async (req, res) => {
//   try {
//     const { name, email } = req.body;
//     const user = await User.findById(req.user.id);
//     if (!user) {
//       return res.status(404).json({ success: false, message: 'User not found' });
//     }

//     user.name = name || user.name;
//     user.email = email || user.email;
//     await user.save();

//     res.status(200).json({ success: true, message: 'Profile updated successfully' });
//   } catch (error) {
//     console.error('Update Profile Error:', error);
//     res.status(500).json({ success: false, message: 'Failed to update profile' });
//   }
// };

// // Delete user account (soft delete or full delete based on your preference)
// export const deleteAccount = async (req, res) => {
//   try {
//     const user = await User.findById(req.user.id);
//     if (!user) {
//       return res.status(404).json({ success: false, message: 'User not found' });
//     }

//     // Soft delete (mark as deleted)
//     user.isDeleted = true;
//     await user.save();
//     res.clearCookie('token');
//     res.status(200).json({ success: true, message: 'Account deleted successfully', redirect: '/users/login' });
//   } catch (error) {
//     console.error('Delete Account Error:', error);
//     res.status(500).json({ success: false, message: 'Failed to delete account' });
//   }
// };

// // Example: Get user order history (if you have an Order model)
// export const getOrderHistory = async (req, res) => {
//   try {
//     // Assuming you have an Order model
//     const orders = await Order.find({ user: req.user.id }).sort({ createdAt: -1 });
//     res.render('user/order-history', { orders });
//   } catch (error) {
//     console.error('Get Order History Error:', error);
//     res.status(500).render('user/error', { message: 'Failed to load order history' });
//   }
// };

// export const renderUsers = async (req, res) => {
//   const { search = '', page = 1, limit = 2 } = req.query;
//   let query = {};
//   if (search) query.email = { $regex: search, $options: 'i' };

//   const totalUsers = await User.countDocuments(query);
//   const users = await User.find(query)
//     .sort({ createdAt: -1 }) 
//     .skip((page - 1) * limit)
//     .limit(Number(limit));

//   res.render('admin/users', {
//     users,
//     totalPages: Math.ceil(totalUsers / limit),
//     currentPage: Number(page),
//     search
//   });
// };

// export const blockUser = async (req, res) => {
//   try {
//     const user = await User.findByIdAndUpdate(req.params.id, { isBlocked: true }, { new: true });
//     if (!user) return res.status(404).json({ message: "User not found" });
//     res.redirect('/admin/users');
//   } catch (error) {
//     console.error('Block User Error:', error);
//     res.status(500).json({ message: "Failed to block user" });
//   }
// };

// export const unblockUser = async (req, res) => {
//   await User.findByIdAndUpdate(req.params.id, { isBlocked: false });
//   res.redirect('/admin/users');
// };