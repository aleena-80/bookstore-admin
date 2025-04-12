import User from '../../models/User.js';
import Address from '../../models/Address.js';
import Order from '../../models/Order.js';
import Wishlist from '../../models/Wishlist.js';
import Carts from '../../models/Carts.js';
import Wallet from '../../models/Wallet.js';
import Coupon from '../../models/Coupon.js';
import nodemailer from 'nodemailer';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const upload = multer({ dest: 'public/uploads/' });

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
});


export const getEditProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    const wishlistCount = await Wishlist.countDocuments({ userId: req.user._id });
    const cartCount = await Cart.countDocuments({ userId: req.user._id });
    res.render('user/edit-profile', { user, wishlistCount, cartCount });
  } catch (error) {
    console.error('Edit Profile Error:', error);
    res.render('user/edit-profile', { user: req.user, wishlistCount: 0, cartCount: 0, error: 'Failed to load edit profile' });
  }
};
export const verifyEmailOtp = async (req, res) => {
  try {
    const { otp } = req.body;
    const user = await User.findById(req.user._id);
    if (user.emailOtp === otp) {
      user.email = user.tempEmail;
      user.tempEmail = null;
      user.emailOtp = null;
      await user.save();
      res.json({ success: true, message: 'Email verified' });
    } else {
      res.json({ success: false, message: 'Invalid OTP' });
    }
  } catch (error) {
    console.error('Verify OTP Error:', error);
    res.status(500).json({ success: false, message: 'Failed to verify OTP' });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);
    if (!await user.matchPassword(currentPassword)) {
      return res.json({ success: false, message: 'Current password is incorrect' });
    }
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change Password Error:', error);
    res.status(500).json({ success: false, message: 'Failed to change password' });
  }
};

export const getAddresses = async (req, res) => {
  try {
    const addresses = await Address.find({ userId: req.user._id });
    const user = await User.findById(req.user._id).select('name email phone wallet');
    if (!user) return res.status(404).send('User not found');
    const wishlistCount = user ? await Wishlist.countDocuments({ userId: user.id }) : 0;
    const cartCount = user ? await Carts.countDocuments({ userId: user.id }) : 0;
    res.render('user/addresses', { addresses ,wishlistCount, cartCount});
  } catch (error) {
    console.error('Addresses Error:', error);
    res.render('user/addresses', { addresses: [], error: 'Failed to load addresses' });
  }
};

export const profileaddAddress = async (req, res) => {
  try {
    const userId = req.user._id;
    const { name, street, city, state, postalCode, country, isDefault } = req.body;
    if (isDefault) await Address.updateMany({ userId, isDefault: true }, { isDefault: false });
    const address = new Address({ userId, name, street, city, state, postalCode, country, isDefault: isDefault || false, quartile: 0 });
    await address.save();
    res.json({ success: true, message: 'Address added' });
  } catch (error) {
    console.error('Add Address Error:', error);
    res.status(500).json({ success: false, message: 'Failed to add address' });
  }
};

export const profileeditAddress = async (req, res) => {
  try {
    const userId = req.user._id;
    const addressId = req.params.addressId;
    const { name, street, city, state, postalCode, country, isDefault } = req.body;
    const address = await Address.findOne({ _id: addressId, userId });
    if (!address) return res.status(404).json({ success: false, message: 'Address not found' });
    if (isDefault) await Address.updateMany({ userId, isDefault: true }, { isDefault: false });
    Object.assign(address, { name, street, city, state, postalCode, country, isDefault: isDefault || false });
    await address.save();
    res.json({ success: true, message: 'Address updated' });
  } catch (error) {
    console.error('Edit Address Error:', error);
    res.status(500).json({ success: false, message: 'Failed to edit address' });
  }
};
export const getWallet = async (req, res) => {
  try {
    const userId = req.user._id;
    const wallet = await Wallet.findOne({ userId });
    const user = await User.findById(req.user._id).select('name email phone wallet');
    if (!user) return res.status(404).send('User not found');

    const wishlistCount = user ? await Wishlist.countDocuments({ userId: user.id }) : 0;
    const cartCount = user ? await Carts.countDocuments({ userId: user.id }) : 0;

    res.render('user/wallet', {
      wallet: { balance: user.wallet || 0 }, 
      wishlistCount,
      cartCount
    });
  } catch (error) {
    console.error('Wallet Error:', error);
    res.render('user/wallet', { 
      wallet: null, 
      wishlistCount: 0, 
      cartCount: 0, 
      error: 'Failed to load wallet' 
    });
  }
};
export const addFundsToWallet = async (req, res) => {
  try {
    const userId = req.user._id;
    const { amount } = req.body;
    const user = await User.findById(userId);
    user.wallet = (user.wallet || 0) + parseFloat(amount);
    await user.save();
    res.json({ success: true, message: 'Funds added' });
  } catch (error) {
    console.error('Add Funds Error:', error);
    res.status(500).json({ success: false, message: 'Failed to add funds' });
  }
};
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('name email phone wallet');
    if (!user) return res.status(404).send('User not found');

    const wishlistCount = user ? await Wishlist.countDocuments({ userId: user.id }) : 0;
    const cartCount = user ? await Carts.countDocuments({ userId: user.id }) : 0;
    res.render('user/profile', { 
      user: { 
        name: user.name, 
        email: user.email, 
        phone: user.phone, 
        wallet: user.wallet || { balance: 0 },
      },
      wishlistCount, 
      cartCount
    });
  } catch (error) {
    console.error('Get Profile Error:', error);
    res.status(500).send('Server Error');
  }
};

export const editProfile =  async (req, res) => {
  try {
    const userId = req.user._id;
    const { name, phone } = req.body;
    const user = await User.findById(userId);
    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (req.file) user.profileImage = `/uploads/${req.file.filename}`;
    await user.save();
    res.json({ success: true, message: 'Profile updated' });
  } catch (error) {
    console.error('Edit Profile Error:', error);
    res.status(500).json({ success: false, message: 'Failed to update profile' });
  }
};

export const changeEmail = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findById(req.user._id);
    if (email === user.email) return res.json({ success: false, message: 'New email must be different' });
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.tempEmail = email;
    user.emailOtp = otp;
    await user.save();
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Email Verification OTP',
      text: `Your OTP is: ${otp}`
    });
    res.json({ success: true, message: 'OTP sent' });
  } catch (error) {
    console.error('Change Email Error:', error);
    res.status(500).json({ success: false, message: 'Failed to send OTP' });
  }
};