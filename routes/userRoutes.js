import express from 'express';
import { sendOtp, verifyOtp, resendOtp, login, googleAuthCallback, forgotPassword,
     resetPassword, logout,addReview,editReview, getProductDetails,getProducts} from '../controllers/userController.js';
import passport from 'passport';
import '../config/passportConfig.js';
import autheMiddleware from '../middleware/autheMiddleware.js';
const { protectUser } = autheMiddleware;

const router = express.Router();

// Separate Routes (No router.route)
router.get('/login', login);
router.post('/login', login);
router.get('/signup', sendOtp);    // Signup page
router.post('/signup', sendOtp);   // Signup form submission
router.get('/otp/verify-otp', verifyOtp);
router.post('/otp/verify-otp', verifyOtp);
router.post('/otp/resend-otp', resendOtp);
router.get('/forgot-password', forgotPassword);
router.post('/forgot-password', forgotPassword);
router.get('/reset-password', resetPassword);
router.post('/reset-password', resetPassword);

router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));
router.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/users/login', session: false }), googleAuthCallback);

router.get('/logout', protectUser, logout);
router.get('/products', protectUser, getProducts);
router.get('/api/products', protectUser, getProducts);
router.get('/products/:id', protectUser, getProductDetails);
router.post('/products/:id/review', protectUser, addReview);
router.post('/products/:id/review/edit', protectUser, editReview);

export default router;