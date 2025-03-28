import  User from '../../models/User.js';
import  Address from '../../models/Address.js';
import Order from '../../models/Order.js';
import Wishlist from'../../models/Wishlist.js';
import Cart from'../../models/Carts.js';
import bcrypt from'bcrypt';
import nodemailer from'nodemailer';

const  transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: 'aleenamechery2005@gmail.com', pass: 'Justbenice@bro106' }
});

export const getProfile = async (req, res) => {
  try {
    if (!req.user) return res.redirect('/users/login');
    console.log('User ID from req.user:', req.user.id);
    const user = await User.findById(req.user.id);
    if (!user) throw new Error('User not found in DB');
    const addresses = await Address.find({ userId: req.user.id });
    const orders = await Order.find({ userId: req.user.id });
    const wishlistCount = await Wishlist.countDocuments({ userId: req.user.id });
    const cartCount = await Cart.countDocuments({ userId: req.user.id });
    res.render('user/profile', { user, addresses, orders, wishlistCount, cartCount, error: null });
  } catch (error) {
    console.error('Get Profile Error:', error);
    res.render('user/profile', { user: null, addresses: [], orders: [], wishlistCount: 0, cartCount: 0, error: error.message || 'Failed to load profile' });
  }
};

export const getEditProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.render('user/edit-profile', { user });
  } catch (error) {
    console.error('Get Edit Profile Error:', error);
    res.status(500).send('Server Error');
  }
};

export const postEditProfile = async (req, res) => {
  try {
    const { name, email } = req.body;
    const user = await User.findById(req.user.id);
    if (email !== user.email) {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      user.tempEmail = email;
      user.otp = otp;
      user.otpExpires = Date.now() + 10 * 60 * 1000; // 10 min
      await user.save();

      await transporter.sendMail({
        to: email,
        subject: 'Verify Your New Email - Ocean Books',
        text: `Your OTP is ${otp}. It expires in 10 minutes.`
      });
      return res.render('user/verify-otp', { email });
    }
    user.name = name;
    await user.save();
    res.redirect('/users/profile');
  } catch (error) {
    console.error('Edit Profile Error:', error);
    res.status(500).send('Server Error');
  }
};

export const postVerifyOtp = async (req, res) => {
  try {
    const { otp } = req.body;
    const user = await User.findById(req.user.id);
    if (user.otp === otp && user.otpExpires > Date.now()) {
      user.email = user.tempEmail;
      user.tempEmail = null;
      user.otp = null;
      user.otpExpires = null;
      await user.save();
      res.redirect('/users/profile');
    } else {
      res.render('user/verify-otp', { email: user.tempEmail, error: 'Invalid or expired OTP' });
    }
  } catch (error) {
    console.error('Verify OTP Error:', error);
    res.status(500).send('Server Error');
  }
};

export const getChangePassword = async (req, res) => {
  res.render('user/change-password');
};

export const postChangePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id);
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.render('user/change-password', { error: 'Current password incorrect' });
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.redirect('/users/profile');
  } catch (error) {
    console.error('Change Password Error:', error);
    res.status(500).send('Server Error');
  }
};

export const getAddAddress = async (req, res) => {
  res.render('user/add-address');
};

export const postAddAddress = async (req, res) => {
  try {
    const { name, addressLine1, city, state, pincode, isDefault } = req.body;
    const address = new Address({ userId: req.user.id, name, addressLine1, city, state, pincode, isDefault });
    await address.save();
    if (isDefault) await Address.updateMany({ userId: req.user.id, _id: { $ne: address._id } }, { isDefault: false });
    res.redirect('/users/profile');
  } catch (error) {
    console.error('Add Address Error:', error);
    res.status(500).send('Server Error');
  }
};

export const getEditAddress = async (req, res) => {
  try {
    const address = await Address.findOne({ _id: req.params.id, userId: req.user.id });
    res.render('user/edit-address', { address });
  } catch (error) {
    console.error('Get Edit Address Error:', error);
    res.status(500).send('Server Error');
  }
};

export const postEditAddress = async (req, res) => {
  try {
    const { name, addressLine1, city, state, pincode, isDefault } = req.body;
    await Address.updateOne({ _id: req.params.id, userId: req.user.id }, { name, addressLine1, city, state, pincode, isDefault });
    if (isDefault) await Address.updateMany({ userId: req.user.id, _id: { $ne: req.params.id } }, { isDefault: false });
    res.redirect('/users/profile');
  } catch (error) {
    console.error('Edit Address Error:', error);
    res.status(500).send('Server Error');
  }
};

export const deleteAddress = async (req, res) => {
  try {
    await Address.deleteOne({ _id: req.params.id, userId: req.user.id });
    res.redirect('/users/profile');
  } catch (error) {
    console.error('Delete Address Error:', error);
    res.status(500).send('Server Error');
  }
};