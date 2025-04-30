import express from 'express';
import autheMiddleware from '../middleware/autheMiddleware.js';
const { protectAdmin } = autheMiddleware;
import {
   loginAdmin,addProduct, editProduct, unlistProduct,getaddProduct,
  renderCategories, addCategory, editCategory, deleteCategory,renderUsers,
  getLanguages, addLanguage, editLanguage, deleteLanguage,
   logoutAdmin,getProducts,blockUser,unblockUser,
  getAdminLogin,getOrders,updateOrderStatus,getOrderView,verifyReturn,addBanner,getBanners,deleteBanner,
  getCoupons,createCoupon,deleteCoupon,getDashboard,getSalesReport,deleteProduct,getSalesReportPDF,toggleCategoryListing,
  updateCategoryOffer,updateProductOffer,toggleCoupon,getTransactionDetails,getTransactions,getTopCategories,getTopProducts
} from '../controllers/adminController.js';

import multer from 'multer';
import upload from '../middleware/upload.js';

const router = express.Router();

router.get('/login',getAdminLogin);
router.post('/login',loginAdmin);
router.get('/logout', protectAdmin, logoutAdmin);
router.post('/logout', protectAdmin, logoutAdmin);


router.get('/products', protectAdmin, getProducts);
router.get('/products-add', protectAdmin, getaddProduct);
router.post('/products-add', protectAdmin, addProduct);
router.post('/products/offer/:id', protectAdmin,updateProductOffer);
router.post('/products/delete/:id', deleteProduct);
router.post('/products/edit/:id', protectAdmin, editProduct);
router.post('/products/toggle-list/:id',protectAdmin,unlistProduct )


router.get('/languages', protectAdmin, getLanguages);
router.post('/languages/add', protectAdmin, addLanguage);
router.post('/languages/edit/:id', protectAdmin, editLanguage);
router.post('/languages/delete/:id', protectAdmin, deleteLanguage);

router.get('/users', protectAdmin, renderUsers);
router.post('/users/block/:id', protectAdmin, blockUser);
router.post('/users/unblock/:id', protectAdmin, unblockUser);

router.get('/orders', protectAdmin, getOrders);
router.post('/orders/status/:orderId', protectAdmin, updateOrderStatus);
router.get('/orders/view/:orderId', protectAdmin, getOrderView);
router.post('/orders/verify-return/:orderId', protectAdmin,verifyReturn);

router.get('/banners', getBanners);
router.post('/banners/add', addBanner);
router.post('/banners/delete/:id', deleteBanner);

router.post('/coupons/create',protectAdmin, createCoupon);
router.delete('/coupons/:couponId',protectAdmin, deleteCoupon);
router.get('/coupons',protectAdmin, getCoupons);
router.post('/coupons/toggle/:couponId', toggleCoupon);


router.get('/dashboard', protectAdmin,getDashboard);
router.get('/sales-report',protectAdmin, getSalesReport)
router.get('/sales-report-pdf',protectAdmin, getSalesReportPDF);
router.get('/top-products', protectAdmin,getTopProducts);
router.get('/top-categories', protectAdmin,getTopCategories);



// Category Routes
router.post('/categories/delete/:id',protectAdmin, deleteCategory);
router.post('/categories/toggle/:id',protectAdmin, toggleCategoryListing);
router.post('/categories/offer/:id', updateCategoryOffer);
router.get('/categories', protectAdmin, renderCategories);
router.post('/categories/add', protectAdmin, addCategory);
router.post('/categories/edit/:id', protectAdmin, editCategory);
router.post('/categories/delete/:id', protectAdmin, deleteCategory);

router.get('/transactions',protectAdmin, getTransactions);
router.get('/transactions/:transactionId',protectAdmin, getTransactionDetails);



export default router;