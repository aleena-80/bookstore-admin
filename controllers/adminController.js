export * from '../controllers/admin/authController.js'
export * from '../controllers/admin/categoryController.js'
export * from '../controllers/admin/userController.js'
export * from  '../controllers/admin/languageController.js'
export * from '../controllers/admin/productController.js'




// import User from "../models/User.js"; // Assuming a User model exists
// import bcrypt from "bcryptjs";
// import jwt from "jsonwebtoken";

// import path from 'path'
// import Admin from "../models/Admin.js";
// import multer from 'multer';


// import fs from 'fs'
// import { writeFileSync } from "fs";
// import Product from '../models/Product.js';
// import Category from "../models/Category.js";
// import Language from '../models/Language.js';



// const uploadDir = path.join(process.cwd(), "images");
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     if (!fs.existsSync(uploadDir)) {
//       fs.mkdirSync(uploadDir, { recursive: true });
//     }
//     cb(null, uploadDir);
//   },
//   filename: (req, file, cb) => {
//     const uniqueName = `${Date.now()}-${file.originalname}`;
//     console.log("Saving file as:", path.join(uploadDir, uniqueName));
//     cb(null, uniqueName);
//   },
// });
// const upload = multer({ storage }).array("images", 5);


// //--------------------------------------------------------------------
// export const addProduct = (req, res) => {
//   console.log("POST /admin/products-add");
//   upload(req, res, async (err) => {
//     if (err) {
//       console.error("Multer Error:", err);
//       return res.status(500).json({ success: false, message: "Upload error: " + err.message });
//     }

//     try {
//       console.log("Files:", req.files);
//       console.log("Body:", req.body);

//       const { name, price, discount, category, language, stock, author, description } = req.body;
//       const images = req.files ? req.files.map(file => file.filename) : [];

//       console.log("Images to save:", images);

//       const product = new Product({
//         name, price: Number(price), discount: Number(discount || 0), category, language,
//         stock: Number(stock), author, description, images
//       });
//       await product.save();

//       console.log("Saved product:", product);
//       res.status(200).json({ success: true, message: "Product added successfully!" });
//     } catch (error) {
//       console.error("Add Product Error:", error);
//       res.status(500).json({ success: false, message: "Error: " + error.message });
//     }
//   });
// };
// //--------------------------------------------------------------------------------
// export const editProduct = (req, res) => {
//   upload(req, res, async (err) => {
//     if (err) return res.status(500).json({ success: false, message: "Failed to upload images: " + err.message });

//     try {
//       const { id } = req.params;
//       const { name, price, discount, category, language, stock, author, description, existingImages } = req.body;
//       const newImages = req.files ? req.files.map(file => file.filename) : [];
//       const images = [
//         ...(existingImages ? (Array.isArray(existingImages) ? existingImages : [existingImages]) : []),
//         ...newImages
//       ];

//       if (!name || !price || !category || !language || !stock) {
//         return res.status(400).json({ success: false, message: "Required fields missing" });
//       }
//       if (price < 1 || stock < 0 || (discount && (discount < 0 || discount > 100))) {
//         return res.status(400).json({ success: false, message: "Invalid field values" });
//       }
//       if (images.length < 3) {
//         return res.status(400).json({ success: false, message: "At least 3 images required" });
//       }

//       const product = await Product.findByIdAndUpdate(
//         id,
//         { name, price: Number(price), discount: Number(discount || 0), category, language, stock: Number(stock), author, description, images },
//         { new: true }
//       );

//       if (!product) return res.status(404).json({ success: false, message: "Product not found" });
//       res.status(200).json({ success: true, message: "Product updated successfully!" });
//     } catch (error) {
//       console.error("Edit Product Error:", error);
//       res.status(500).json({ success: false, message: "Failed to update product: " + error.message });
//     }
//   });
// };




// // Other exports unchanged.
// export const renderCategories = async (req, res) => {
//   try {
//     const { search = '', page = 1 } = req.query;
//     const limit = 10;
//     const skip = (page - 1) * limit;

//     let query = {};
//     if (search) query.name = { $regex: search, $options: 'i' };

//     const totalCategories = await Category.countDocuments(query);
//     const categories = await Category.find(query)
//       .skip(skip)
//       .limit(limit);

//     res.render('admin/categories', {
//       categories,
//       totalPages: Math.ceil(totalCategories / limit),
//       currentPage: Number(page),
//       search,
//       error: null
//     });
//   } catch (error) {
//     console.error('Get Categories Error:', error);
//     res.status(500).render('admin/error', { message: 'Failed to load categories.' });
//   }
// };


// // Add new category
// export const addCategory = async (req, res) => {
//   try {
//     const { name } = req.body;
//     const existingCategory = await Category.findOne({ name });

//     if (existingCategory) {
//       const categories = await Category.find();
//       return res.render('admin/categories', {
//         categories,
//         totalPages: Math.ceil(categories.length / 10),
//         currentPage: 1,
//         search: '',
//         error: 'Category already exists!'
//       });
//     }

//     const newCategory = new Category({ name });
//     await newCategory.save();
//     res.redirect('/admin/categories');
//   } catch (error) {
//     console.error('Add Category Error:', error);
//     res.status(500).render('admin/error', { message: 'Failed to add category.' });
//   }
// };

// // Edit category
// export const editCategory = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { name } = req.body;
//     const existingCategory = await Category.findOne({ name, _id: { $ne: id } });

//     if (existingCategory) {
//       const categories = await Category.find();
//       return res.render('admin/categories', {
//         categories,
//         totalPages: Math.ceil(categories.length / 10),
//         currentPage: 1,
//         search: '',
//         error: 'Category name already exists!'
//       });
//     }

//     await Category.findByIdAndUpdate(id, { name });
//     res.redirect('/admin/categories');
//   } catch (error) {
//     console.error('Edit Category Error:', error);
//     res.status(500).render('admin/error', { message: 'Failed to edit category.' });
//   }
// };

// // Delete category
// export const deleteCategory = async (req, res) => {
//   try {
//     const { id } = req.params;
//     await Category.findByIdAndDelete(id);
//     res.redirect('/admin/categories');
//   } catch (error) {
//     console.error('Delete Category Error:', error);
//     res.status(500).render('admin/error', { message: 'Failed to delete category.' });
//   }
// };
// Languages Page

// export const getLanguages = async (req, res) => {
//   try {
//     const { search = '', page = 1 } = req.query;
//     const limit = 10;
//     const skip = (page - 1) * limit;

//     let query = {};
//     if (search) query.name = { $regex: search, $options: 'i' };

//     const totalLanguages = await Language.countDocuments(query);
//     const languages = await Language.find(query)
//       .skip(skip)
//       .limit(limit);

//     res.render('admin/languages', {
//       languages,
//       totalPages: Math.ceil(totalLanguages / limit),
//       currentPage: Number(page),
//       search,
//       error: null
//     });
//   } catch (error) {
//     console.error('Get Languages Error:', error);
//     res.status(500).render('admin/error', { message: 'Failed to load languages.' });
//   }
// };

// export const addLanguage = async (req, res) => {
//   try {
//     const { name } = req.body;
//     if (!name) return res.status(400).send("Language name required");
//     const language = new Language({ name });
//     await language.save();
//     res.redirect("/admin/languages");
//   } catch (error) {
//     console.error("Add Language Error:", error);
//     res.status(500).send("Failed to add language"); // No error view
//   }
// };

// export const editLanguage = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { name } = req.body;
//     const existingLanguage = await Language.findOne({ name, _id: { $ne: id } });

//     if (existingLanguage) {
//       const languages = await Language.find();
//       return res.render('admin/languages', {
//         languages,
//         totalPages: Math.ceil(languages.length / 10),
//         currentPage: 1,
//         search: '',
//         error: 'Language name already exists!'
//       });
//     }

//     await Language.findByIdAndUpdate(id, { name });
//     res.redirect('/admin/languages');
//   } catch (error) {
//     console.error('Edit Language Error:', error);
//     res.status(500).render('admin/error', { message: 'Failed to edit language.' });
//   }
// };
// //---------------------------------------------------------------------------
// export const deleteLanguage = async (req, res) => {
//   try {
//     const { id } = req.params;
//     await Language.findByIdAndDelete(id);
//     res.redirect('/admin/languages');
//   } catch (error) {
//     console.error('Delete Language Error:', error);
//     res.status(500).render('admin/error', { message: 'Failed to delete language.' });
//   }
// };
//--------------------------------------------------------------------
// export const getProducts = async (req, res) => {
//   try {
//     const { search = "", page = 1, limit = 10 } = req.query;
//     let query = { isDeleted: false };
//     if (search) query.name = { $regex: search, $options: "i" };

//     const totalProducts = await Product.countDocuments(query);
//     const products = await Product.find(query)
//       .populate("category")
//       .sort({ createdAt: -1 })
//       .skip((page - 1) * limit)
//       .limit(Number(limit));
//     const categories = await Category.find(); // No isDeleted filter
//     const languages = await Language.find();

//     res.render("admin/products", {
//       products,
//       categories,
//       languages,
//       totalPages: Math.ceil(totalProducts / limit),
//       currentPage: Number(page),
//       search,
//       error: null,
//     });
//   } catch (error) {
//     console.error("Render Products Error:", error);
//     res.render("admin/products", { products: [], categories: [], languages: [], totalPages: 1, currentPage: 1, search: "", error: "Failed to load products" });
//   }
// };
// //--------------------------------------------------------------------------------------
// export const getAddProduct = async (req, res) => {
//   try {
//     const categories = await Category.find();
//     const languages = await Language.find();
//     res.render("admin/products-add", { categories, languages, currentPath: "/admin/products-add" });
//   } catch (error) {
//     console.error("Get Add Product Error:", error);
//     res.status(500).render("admin/error", { message: "Failed to load add product page." });
//   }
// };
// //-------------------------------------------------------------------------------------

// export const getEditProduct = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const product = await Product.findById(id).populate("category");
//     if (!product) {
//       return res.status(404).render("admin/error", { message: "Product not found." });
//     }
//     const categories = await Category.find();
//     const languages = await Language.find();
//     res.render("admin/products-edit", {
//       product,
//       categories,
//       languages,
//       currentPath: "/admin/products-edit",
//     });
//   } catch (error) {
//     console.error("Get Edit Product Error:", error);
//     res.status(500).render("admin/error", { message: "Failed to load edit product page." });
//   }
// };
// export const deleteProduct = async (req, res) => {
//   try {
//     const { id } = req.params;
//     await Product.findByIdAndUpdate(id, { isDeleted: true });
//     res.redirect('/admin/products');
//   } catch (error) {
//     console.error("Delete Product Error:", error);
//     res.status(500).send("Failed to delete product");
//   }
// };
//-----------------------------------------------
// export const getAdminLogin = async (req, res) => {
//   console.log("GET /admin/login - Rendering form");
//   res.render('admin/login', { message: null });
// };

//-----------------------------------------------------
// export const loginAdmin = async (req, res) => {
//   const { email, password } = req.body;
//   if (req.cookies.token) {
//     return res.redirect('/admin/dashboard');
//   }
//   try {
//     let errors = [];
//     if (!email || !password) errors.push("Email and password are required");
//     if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("Invalid email format");
//     if (password && password.length < 6) errors.push("Password must be at least 6 characters long");

//     if (errors.length > 0) {
//       console.log("Validation errors:", errors);
//       return res.render('admin/login', { message: errors.join(", ") });
//     }

//     const admin = await Admin.findOne({ email });
//     if (!admin) {
//       console.log("Admin not found:", email);
//       return res.render('admin/login', { message: "Admin not found" });
//     }

//     const isMatch = await bcrypt.compare(password, admin.password);
//     if (!isMatch) {
//       console.log("Password mismatch for:", email);
//       return res.render('admin/login', { message: "Invalid credentials" });
//     }

//     const token = jwt.sign({ id: admin._id, role: "admin" }, process.env.JWT_SECRET, { expiresIn: "7d" });
//     res.cookie("token", token, { 
//       httpOnly: true, 
//       secure: process.env.NODE_ENV === "production", 
//       sameSite: "lax",
//       maxAge: 7 * 24 * 60 * 60 * 1000
//     });

//     console.log("Redirecting to dashboard");
//     return res.redirect("/admin/dashboard");
//   } catch (error) {
//     console.error("Login Error:", error);
//     return res.render('admin/login', { message: "Server Error" });
//   }
// };

// export const logoutAdmin = (req, res) => {
//   res.clearCookie("token");
//   console.log("User logged out, token cleared");
//   res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
//   res.set('Pragma', 'no-cache');
//   res.set('Expires', '0');
//   res.redirect("/admin/login");
// };



// export const renderDashboard = (req, res) => {
//   res.render("admin/dashboard");
//   res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
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