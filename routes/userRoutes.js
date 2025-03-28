import express from 'express';
import { sendOtp, verifyOtp, resendOtp, login, googleAuthCallback, forgotPassword,
    resetPassword, logout,addReview,editReview, getProductDetails,getProducts,getHome,subscribeNewsletter,
    searchBooks,getWishlist,addToWishlist,removeFromWishlist,removeFromCart,addToCart,getCart,updateCartQuantity,
    getCheckout,addAddress,editAddress,getOrderDetail,getOrders,
    searchOrders,cancelOrder,returnOrder,downloadInvoice,getProfile,getEditProfile,
    postEditProfile,postVerifyOtp,getChangePassword,postChangePassword,getAddAddress,
    postAddAddress,getEditAddress,postEditAddress,deleteAddress,initiateOrder,getPaymentPage,confirmPayment,
    getOrderView,requestReturn,buyNow,getOrderSuccess} from '../controllers/userController.js';
import passport from 'passport';
import '../config/passportConfig.js';
import autheMiddleware from '../middleware/autheMiddleware.js';
//import  checkoutController from '../controllers/user/checkoutController.js'
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
router.get('/home', protectUser,getHome);
router.get('/search', protectUser,searchBooks);
router.post('/subscribe', protectUser, subscribeNewsletter);
router.get('/products', protectUser, getProducts);
router.get('/api/products', protectUser, getProducts);
router.get('/products/:id', protectUser, getProductDetails);
router.get('/wishlist',protectUser, getWishlist);
router.post('/wishlist/add/:productId', protectUser, addToWishlist);
router.post('/wishlist/remove/:productId',protectUser, removeFromWishlist);
router.post('/order/buy-now/:productId', protectUser, buyNow);
router.post('/products/:id/review', protectUser, addReview);
router.post('/products/:id/review/edit', protectUser, editReview);
router.get('/products', protectUser,getProducts);


router.post('/cart/add/:productId', protectUser,addToCart);
router.get('/cart', protectUser,getCart);
router.post('/cart/update/:productId', protectUser,updateCartQuantity);
router.post('/cart/remove/:cartId', protectUser, removeFromCart);

router.get('/checkout', protectUser,getCheckout);
router.post('/checkout/add-address', protectUser,addAddress);
router.post('/checkout/edit-address/:addressId', protectUser,editAddress);
router.get('/order-success', protectUser, getOrderSuccess);
//  router.post('/checkout/place-order', protectUser,placeOrder);
//  router.get('/order-success/:orderId',protectUser,getOrderSuccess);

router.get('/orders', protectUser,getOrders);
router.get('/orders/search',protectUser,searchOrders);
router.get('/order-detail/:orderId', protectUser,getOrderDetail);
router.post('/orders/cancel/:orderId', protectUser, cancelOrder)
router.post('/order/return/:orderId', protectUser,returnOrder);
router.get('/orders/invoice/:id', protectUser, downloadInvoice);
router.post('/checkout/confirm-payment', protectUser, confirmPayment);
router.get('/orders/view/:orderId', protectUser, getOrderView);
router.post('/orders/return/:orderId', protectUser, requestReturn);


router.get('/profile', protectUser,getProfile);
router.get('/edit-profile', protectUser,getEditProfile);
router.post('/edit-profile', protectUser,postEditProfile);
router.post('/verify-otp', protectUser,postVerifyOtp);
router.get('/change-password',protectUser,getChangePassword);
router.post('/change-password', protectUser,postChangePassword);
router.get('/address/add', protectUser,getAddAddress);
router.post('/address/add', protectUser,postAddAddress);
router.get('/address/edit/:id', protectUser,getEditAddress);
router.post('/address/edit/:id', protectUser,postEditAddress);
router.get('/address/delete/:id', protectUser,deleteAddress);


router.post('/checkout/initiate-order', protectUser, initiateOrder);
router.get('/checkout/payment', protectUser, getPaymentPage);
// app.post('/users/checkout/add-address', protectUser, addAddress);
// app.post('/users/checkout/edit-address/:addressId', protectUser, editAddress);
export default router;