import express from 'express';
import { sendOtp, verifyOtp, resendOtp, login, googleAuthCallback, forgotPassword,
    resetPassword, logout,addReview,editReview, getProductDetails,getProducts,getHome,subscribeNewsletter,
    searchBooks,getWishlist,addToWishlist,removeFromWishlist,removeFromCart,addToCart,getCart,updateCartQuantity,
    getCheckout,addAddress,editAddress,getOrderDetail,getOrders,
    searchOrders,cancelOrder,downloadInvoice,
    initiateOrder,getPaymentPage,confirmPayment,
    getOrderView,requestReturn,getOrderSuccess,
    getProfile, editProfile, verifyEmailOtp, changePassword, getAddresses,
    profileaddAddress, profileeditAddress, getWallet, addFundsToWallet,changeEmail,createRazorpayOrder,verifyPayment,
    getOrderfailure,getUserCoupons,applyCoupon,removeCoupon,retryPayment,handlePaymentCallback,error,getPaymentPageReturn,
    getWalletBalance
} from '../controllers/userController.js';
import passport from 'passport';
import '../config/passportConfig.js';
import autheMiddleware from '../middleware/autheMiddleware.js';
const { protectUser } = autheMiddleware;

const router = express.Router();

// Separate Routes (No router.route)
router.get('/login', login);
router.post('/login', login);
router.get('/signup', sendOtp);    
router.post('/signup', sendOtp);   
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
router.get('/home',protectUser,getHome);
router.get('/search', protectUser,searchBooks);
router.post('/subscribe', protectUser, subscribeNewsletter);
router.get('/products', protectUser, getProducts);
router.get('/api/products', protectUser, getProducts);
router.get('/products/:id', protectUser, getProductDetails);
router.get('/wishlist',protectUser, getWishlist);
router.post('/wishlist/add/:productId', protectUser, addToWishlist);
router.post('/wishlist/remove/:productId',protectUser, removeFromWishlist);
router.post('/products/:id/review', protectUser, addReview);
router.post('/products/:id/review/edit', protectUser, editReview);

router.post('/cart/add/:productId', protectUser,addToCart);
router.get('/cart', protectUser,getCart);
router.post('/cart/update/:productId', protectUser,updateCartQuantity);
router.post('/cart/remove/:cartId', protectUser, removeFromCart);

router.get('/checkout', protectUser,getCheckout);
router.post('/checkout/add-address', protectUser,addAddress);
router.post('/checkout/edit-address/:addressId', protectUser,editAddress);
router.get('/order-success', protectUser, getOrderSuccess);
router.get('/order-failure', protectUser, getOrderfailure);

router.get('/orders', protectUser,getOrders);
router.get('/orders/search',protectUser,searchOrders);
router.get('/order-detail/:orderId', protectUser,getOrderDetail);
router.post('/orders/cancel/:orderId',protectUser, cancelOrder);
router.post('/orders/return/:orderId', protectUser, requestReturn);
router.get('/orders/invoice/:id', protectUser, downloadInvoice);
router.post('/checkout/confirm-payment', protectUser, confirmPayment);
router.get('/orders/view/:orderId', protectUser, getOrderView);
router.post('/orders/retry-payment/:orderId',protectUser, retryPayment);
router.post('/payment/callback', protectUser,handlePaymentCallback);

router.get('/profile', protectUser, getProfile);
router.post('/profile/edit', protectUser, editProfile);
router.post('/verify-email-otp', protectUser, verifyEmailOtp);
router.post('/profile/change-password', protectUser, changePassword);
router.get('/addresses', protectUser, getAddresses);
router.post('/addresses/add', protectUser, profileaddAddress);
router.post('/addresses/edit/:addressId', protectUser, profileeditAddress);

router.get('/wallet/balance', protectUser,getWalletBalance)
router.get('/wallet', protectUser, getWallet);
router.post('/wallet/add', protectUser, addFundsToWallet);
router.post('/profile/change-email', protectUser, changeEmail);

router.get('/error',protectUser,error)


router.post('/checkout/initiate-order', protectUser, initiateOrder);
router.get('/checkout/payment', protectUser, getPaymentPage);
router.get('/orders/payment/:orderId', protectUser,getPaymentPageReturn);
router.post('/checkout/create-razorpay-order',protectUser, createRazorpayOrder);
router.post('/checkout/verify-payment',protectUser, verifyPayment);

router.get('/coupons',protectUser, getUserCoupons);
router.post('/coupons/apply',protectUser, applyCoupon);
router.post('/coupons/remove', protectUser, removeCoupon);

export default router;