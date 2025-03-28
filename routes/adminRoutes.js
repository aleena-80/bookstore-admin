import express from 'express';
import autheMiddleware from '../middleware/autheMiddleware.js';
const { protectAdmin } = autheMiddleware;
import {
   loginAdmin,getAddProduct, addProduct, getEditProduct, editProduct, unlistProduct,
  renderCategories, addCategory, editCategory, deleteCategory,renderUsers,
  getLanguages, addLanguage, editLanguage, deleteLanguage,
  renderDashboard, logoutAdmin,getProducts,blockUser,unblockUser,
  getAdminLogin,getOrders,updateOrderStatus,getOrderView,verifyReturn
} from '../controllers/adminController.js';
import multer from 'multer';

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'images/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

const router = express.Router();

router.get('/login',getAdminLogin);
router.post('/login',loginAdmin);
router.get('/dashboard', protectAdmin, renderDashboard);
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
router.post('/orders/status/:orderId', protectAdmin,updateOrderStatus);
router.get('/orders/view/:orderId', protectAdmin, getOrderView);
router.post('/orders/verify-return/:orderId', protectAdmin,verifyReturn);

export default router;