import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import User from '../../models/User.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

dotenv.config();
const otpStore = {};

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  pool: true,
});
//----------------------------------------------------------------------
export const login = async (req, res) => {
  if (req.method === 'GET') {
    return res.render('user/login', { error: null, email: null });
  }
  try {
    const { email, password } = req.body;
    console.log("Login Attempt:", { email, password: password ? "[Provided]" : "[Missing]" });
    if (!email || !password) {
      console.log("Missing Field:", !email ? "Email" : "Password");
      return res.status(400).json({ error: !email ? 'Email is required.' : 'Password is required.' });
    }
    const user = await User.findOne({ email: email.toLowerCase() });
    console.log("User Found:", user ? { email: user.email, passwordHash: user.password } : "None");
    if (!user) {
      return res.status(400).json({ error: 'Invalid email—user not found.' });
    }
    console.log("Password to Compare:", password);
    const passwordMatch = await bcrypt.compare(password, user.password); // No hashing, just compare
    console.log("Password Match:", passwordMatch);
    if (!passwordMatch) {
      return res.status(400).json({ error: 'Invalid password—does not match.' });
    }
    if (user.isBlocked) {
      return res.status(403).json({ error: 'Your account is blocked. Please contact support.' });
    }
    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role || 'user' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    console.log("Token:", token);
    res.cookie('token', token, { 
      httpOnly: true, 
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });
    res.status(200).json({ success: true, token, redirect: '/home' });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ error: 'Something went wrong. Please try again later.' });
  }
};
//---------------------------------------------------------------------------------------------
export const sendOtp = async (req, res) => {
  if (req.method === 'GET') {
    return res.render('user/signup', { error: null });
  }
  const { name, email, password, phone } = req.body;
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "An account with this email already exists. Please log in instead." });
    }
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 60 * 1000;
    otpStore[email] = { otp, expiresAt, name, password };
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: email,
      subject: "OTP Code for Oceanbooks",
      html:`
    <html>
      <body style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 20px; text-align: center;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);">
          <h2 style="color: #4CAF50;">Account Verification</h2>
          <p style="font-size: 16px; color: #333;">Hello,</p>
          <p style="font-size: 16px; color: #333;">Your OTP code is:</p>
          <h3 style="font-size: 28px; color: #4CAF50; font-weight: bold;">${otp}</h3>
          <p style="font-size: 16px; color: #333;">It is valid for the next 1 minutes.</p>
          <p style="font-size: 14px; color: #777;">If you did not request this, please ignore this email.</p>
          <footer style="margin-top: 30px; font-size: 12px; color: #999;">
            <p>Thank you for using our service!</p>
          </footer>
        </div>
      </body>
    </html>
  `
    });
    res.status(200).json({ 
      success: true, 
      message: "OTP sent successfully", 
      redirect: `/users/otp/verify-otp?email=${encodeURIComponent(email)}`
    });
  } catch (error) {
    console.error('Send OTP Error:', error);
    res.status(500).json({ success: false, message: "Failed to send OTP. Please try again later." });
  }
};
//----------------------------------------------------------------------------------------------
export const verifyOtp = async (req, res) => {
  if (req.method === 'GET') {
    const { email } = req.query;
    if (!email || !otpStore[email]) {
      return res.redirect('/users/otp/send-otp'); 
    }
    return res.render('user/otp-verification', { error: null, success: null, email });
  }
  const { otp } = req.body;
  const email = req.query.email;
  try {
    const otpData = otpStore[email];
    if (!otpData) {
      return res.status(400).json({ success: false, message: "OTP not found or expired" });
    }
    const { otp: storedOtp, expiresAt, name, password } = otpData;
    if (!email) return res.status(400).json({ success: false, message: "Email is required" });
    if (!otp) return res.status(400).json({ success: false, message: "OTP is required" });
    if (Date.now() > expiresAt) {
      delete otpStore[email];
      return res.status(400).json({ success: false, message: "OTP expired" });
    }
    if (otp.trim() !== storedOtp) {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      delete otpStore[email];
      return res.status(400).json({ success: false, message: "This email is already registered. Please log in." });
    }
    const newUser = new User({ name, email, password });
    await newUser.save();
    delete otpStore[email];
    const token = jwt.sign({ id: newUser._id, email: newUser.email, role: newUser.role || 'user' }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.cookie('token', token, { 
      httpOnly: true, 
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });
    return res.status(200).json({ success: true, message: "OTP verified successfully", redirect: "/home" });
  } catch (error) {
    console.error('Verify OTP Error:', error);
    if (error.code === 11000) {
      delete otpStore[email];
      return res.status(400).json({ success: false, message: "This email is already registered. Please log in." });
    }
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};
//------------------------------------------------------------------------------------------------------------------
export const resendOtp = async (req, res) => {
  const { email } = req.body;
  try {
    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "This email is already registered. Please log in." });
    }
    const existingData = otpStore[email];
    if (!existingData) {
      return res.status(400).json({ success: false, message: "No OTP session found. Please start over." });
    }
    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 60 * 1000;
    otpStore[email] = { ...existingData, otp: newOtp, expiresAt };
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: email,
      subject: "Your New OTP Code",
      html:`
      <html>
        <body style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 20px; text-align: center;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);">
            <h2 style="color: #4CAF50;">Account Verification</h2>
            <p style="font-size: 16px; color: #333;">Hello,</p>
            <p style="font-size: 16px; color: #333;">Your OTP code is:</p>
            <h3 style="font-size: 28px; color: #4CAF50; font-weight: bold;">${newOtp}</h3>  <!-- Changed otp to newOtp -->
            <p style="font-size: 16px; color: #333;">It is valid for the next 1 minutes.</p>
            <p style="font-size: 14px; color: #777;">If you did not request this, please ignore this email.</p>
          </div>
        </body>
      </html>
      `
    });
    res.json({ success: true, message: "New OTP sent successfully" });
  } catch (error) {
    console.error('Resend OTP Error:', error);
    res.status(500).json({ success: false, message: "Failed to resend OTP. Please try again later." });
  }
};
//---------------------------------------------------------------------------------------------------------
export const googleAuthCallback = async (req, res) => {
  try {
    if (!req.user || !req.user.token) {
      return res.redirect('/users/login?message=Google authentication failed');
    }
    res.cookie('token', req.user.token, { 
      httpOnly: true, 
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });
    res.redirect('/home');
  } catch (error) {
    console.error('Google Auth Callback Error:', error);
    res.redirect('/users/login?message=Server error');
  }
};
//------------------------------------------------------------------------------------------------
export const forgotPassword = async (req, res) => {
  if (req.method === 'GET') {
    return res.render('user/forgot-password', { error: null, success: null });
  }
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      if (req.headers['content-type'] === 'application/json') {
        return res.status(400).json({ success: false, message: "No account found with this email." });
      }
      return res.render('user/forgot-password', { error: "No account found with this email.", success: null });
    }
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = Date.now() + 3600000;
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpiry = resetTokenExpiry;
    await user.save();
    const resetUrl = `http://localhost:5000/users/reset-password?token=${resetToken}`;
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: email,
      subject: 'Ocean Books - Password Reset Request',
      text: `You requested a password reset. Click this link to reset your password: ${resetUrl}\n\nIf you didn’t request this, ignore this email.`,
    });
    // Handle fetch (JSON) or form (render)
    if (req.headers['content-type'] === 'application/json') {
      return res.status(200).json({ success: true, message: "Password reset link sent to your email!" });
    }
    res.render('user/forgot-password', { error: null, success: "Password reset link sent to your email!" });
  } catch (error) {
    console.error('Forgot Password Error:', error);
    if (req.headers['content-type'] === 'application/json') {
      return res.status(500).json({ success: false, message: "Failed to send reset link. Try again later." });
    }
    res.render('user/forgot-password', { error: "Failed to send reset link. Try again later.", success: null });
  }
};
//------------------------------------------------------------------------------------------------------
export const resetPassword = async (req, res) => {
  if (req.method === 'GET') {
    const { token } = req.query;
    return res.render('user/reset-password', { token, error: null, success: null });
  }
  try {
    const { token, password } = req.body;
    
    if (!password) {
      if (req.headers['content-type'] === 'application/json') {
        return res.status(400).json({ success: false, message: "Password is required." });
      }
      return res.render('user/reset-password', { token, error: "Password is required.", success: null });
    }
    const strongPasswordRegex = /^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])(?=.{8,})/;
    if (!strongPasswordRegex.test(password)) {
      if (req.headers['content-type'] === 'application/json') {
        return res.status(400).json({ success: false, message: "Password must be at least 8 characters long, with 1 uppercase, 1 number, and 1 special character." });
      }
      return res.render('user/reset-password', { token, error: "Password must be at least 8 characters long, with 1 uppercase, 1 number, and 1 special character.", success: null });
    }

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpiry: { $gt: Date.now() },
    });
    if (!user) {
      if (req.headers['content-type'] === 'application/json') {
        return res.status(400).json({ success: false, message: "Invalid or expired reset token." });
      }
      return res.render('user/reset-password', { token, error: "Invalid or expired reset token.", success: null });
    }

    user.password = password.trim();
    user.resetPasswordToken = undefined;
    user.resetPasswordExpiry = undefined;
    await user.save();

    if (req.headers['content-type'] === 'application/json') {
      return res.status(200).json({ success: true, message: "Password reset successful! Please log in." });
    }
    res.render('user/reset-password', { token: null, error: null, success: "Password reset successful! Please log in." });
  } catch (error) {
    console.error('Reset Password Error:', error);
    if (req.headers['content-type'] === 'application/json') {
      return res.status(500).json({ success: false, message: "Failed to reset password. Try again." });
    }
    res.render('user/reset-password', { token: req.body.token, error: "Failed to reset password. Try again.", success: null });
  }
};
//---------------------------------------------------------------------------------
export const logout = (req, res) => {
  res.clearCookie('token');
  res.redirect('/users/login');
};
