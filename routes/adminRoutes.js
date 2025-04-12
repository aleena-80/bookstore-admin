import express from 'express';
import autheMiddleware from '../middleware/autheMiddleware.js';
const { protectAdmin } = autheMiddleware;
import {
   loginAdmin,getAddProduct, addProduct, getEditProduct, editProduct, unlistProduct,
  renderCategories, addCategory, editCategory, deleteCategory,renderUsers,
  getLanguages, addLanguage, editLanguage, deleteLanguage,
   logoutAdmin,getProducts,blockUser,unblockUser,
  getAdminLogin,getOrders,updateOrderStatus,getOrderView,verifyReturn,addBanner,getBanners,deleteBanner,
  getCoupons,createCoupon,deleteCoupon,getDashboard,getSalesReport,unlistCoupon
} from '../controllers/adminController.js';

import multer from 'multer';
import upload from '../middleware/upload.js';

const router = express.Router();

router.get('/login',getAdminLogin);
router.post('/login',loginAdmin);
router.get('/logout', protectAdmin, logoutAdmin);
router.post('/logout', protectAdmin, logoutAdmin);
router.get('/products', protectAdmin, getProducts);
router.get('/products-add', protectAdmin, getAddProduct);
router.post('/products-add', protectAdmin, addProduct);
router.get('/products/edit/:id', protectAdmin, getEditProduct);
router.post('/products/edit/:id', protectAdmin, editProduct);
router.post('/products/toggle-list/:id',protectAdmin,unlistProduct )
router.get('/categories', protectAdmin, renderCategories);
router.post('/categories/add', protectAdmin, addCategory);
router.post('/categories/edit/:id', protectAdmin, editCategory);
router.post('/categories/delete/:id', protectAdmin, deleteCategory);
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
router.post('/coupons/unlist/:couponId',protectAdmin, unlistCoupon);


router.get('/dashboard', protectAdmin,getDashboard);
router.get('/sales-report',protectAdmin, getSalesReport)

//router.post('/', protectAdmin, cloudinaryUpload.single('image'), createBanner);
//router.put('/:id', protectAdmin, cloudinaryUpload.single('image'), updateBanner);
//router.delete('/:id', protectAdmin, deleteBanner);

export default router;