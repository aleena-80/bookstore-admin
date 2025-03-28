import multer from 'multer';
import Product from '../../models/Product.js';
import Category from "../../models/Category.js";
import Language from "../../models/Language.js";
import path from 'path'
import fs from 'fs'


const uploadDir = path.join(process.cwd(), "images");
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    console.log("Saving file as:", path.join(uploadDir, uniqueName));
    cb(null, uniqueName);
  },
});
const upload = multer({ storage }).array("images", 5);


//--------------------------------------------------------------------
export const addProduct = (req, res) => {
  console.log("POST /admin/products-add");
  upload(req, res, async (err) => {
    if (err) {
      console.error("Multer Error:", err);
      return res.status(500).json({ success: false, message: "Upload error: " + err.message });
    }

    try {
      console.log("Files:", req.files);
      console.log("Body:", req.body);

      const { name, price, discount, category, language, stock, author, description } = req.body;
      const images = req.files ? req.files.map(file => file.filename) : [];

      console.log("Images to save:", images);

      const product = new Product({
        name, price: Number(price), discount: Number(discount || 0), category, language,
        stock: Number(stock), author, description, images
      });
      await product.save();

      console.log("Saved product:", product);
      res.status(200).json({ success: true, message: "Product added successfully!" });
    } catch (error) {
      console.error("Add Product Error:", error);
      res.status(500).json({ success: false, message: "Error: " + error.message });
    }
  });
};
//--------------------------------------------------------------------------------
export const editProduct = (req, res) => {
  upload(req, res, async (err) => {
    if (err) return res.status(500).json({ success: false, message: "Failed to upload images: " + err.message });

    try {
      const { id } = req.params;
      const { name, price, discount, category, language, stock, author, description, existingImages } = req.body;
      const newImages = req.files ? req.files.map(file => file.filename) : [];
      const images = [
        ...(existingImages ? (Array.isArray(existingImages) ? existingImages : [existingImages]) : []),
        ...newImages
      ];

      if (!name || !price || !category || !language || !stock) {
        return res.status(400).json({ success: false, message: "Required fields missing" });
      }
      if (price < 1 || stock < 0 || (discount && (discount < 0 || discount > 100))) {
        return res.status(400).json({ success: false, message: "Invalid field values" });
      }
      if (images.length < 3) {
        return res.status(400).json({ success: false, message: "At least 3 images required" });
      }

      const product = await Product.findByIdAndUpdate(
        id,
        { name, price: Number(price), discount: Number(discount || 0), category, language, stock: Number(stock), author, description, images },
        { new: true }
      );

      if (!product) return res.status(404).json({ success: false, message: "Product not found" });
      res.status(200).json({ success: true, message: "Product updated successfully!" });
    } catch (error) {
      console.error("Edit Product Error:", error);
      res.status(500).json({ success: false, message: "Failed to update product: " + error.message });
    }
  });
};

//-------------------------------------------------------------------------------
export const getProducts = async (req, res) => {
    try {
      const { search = "", page = 1, limit = 10 } = req.query;
      let query = { isDeleted: false };
      if (search) query.name = { $regex: search, $options: "i" };
  
      const totalProducts = await Product.countDocuments(query);
      const products = await Product.find(query)
        .populate("category")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit));
      const categories = await Category.find(); // No isDeleted filter
      const languages = await Language.find();
  
      res.render("admin/products", {
        products,
        categories,
        languages,
        totalPages: Math.ceil(totalProducts / limit),
        currentPage: Number(page),
        search,
        error: null,
      });
    } catch (error) {
      console.error("Render Products Error:", error);
      res.render("admin/products", { products: [], categories: [], languages: [], totalPages: 1, currentPage: 1, search: "", error: "Failed to load products" });
    }
  };
  //--------------------------------------------------------------------------------------
  export const getAddProduct = async (req, res) => {
    try {
      const categories = await Category.find();
      const languages = await Language.find();
      res.render("admin/products-add", { categories, languages, currentPath: "/admin/products-add" });
    } catch (error) {
      console.error("Get Add Product Error:", error);
      res.status(500).render("admin/error", { message: "Failed to load add product page." });
    }
  };
  //-------------------------------------------------------------------------------------
  
  export const getEditProduct = async (req, res) => {
    try {
      const { id } = req.params;
      const product = await Product.findById(id).populate("category");
      if (!product) {
        return res.status(404).render("admin/error", { message: "Product not found." });
      }
      const categories = await Category.find();
      const languages = await Language.find();
      res.render("admin/products-edit", {
        product,
        categories,
        languages,
        currentPath: "/admin/products-edit",
      });
    } catch (error) {
      console.error("Get Edit Product Error:", error);
      res.status(500).render("admin/error", { message: "Failed to load edit product page." });
    }
  };
//-------------------------------------------------------------------------------------
export const unlistProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ message: 'Product not found' });
        product.isListed = !product.isListed; // Toggle isListed (add this field if missing)
        await product.save();
        res.redirect('/admin/products'); // Refresh page after toggle
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};





















// const upload = multer({ storage: multer.memoryStorage() }).array('images', 3);

// export const renderProducts = async (req, res) => {
//   const { search = '', page = 1, limit = 3 } = req.query;
//   let query = { isDeleted: false };
//   if (search) query.name = { $regex: search, $options: 'i' };

//   const totalProducts = await Product.countDocuments(query);
//   const products = await Product.find(query)
//     .sort({ createdAt: -1 })
//     .skip((page - 1) * limit)
//     .limit(Number(limit));

//   res.render('admin/products', { 
//     products, 
//     totalPages: Math.ceil(totalProducts / limit), 
//     currentPage: Number(page), 
//     currentPath: req.path,
//     search 
//   });
// };

// export const getAddProduct = async (req, res) => {
//   try {
//     const categories = await Category.find();
//     const languages = await Language.find(); // Use Language model
//     res.render('admin/products-add', { categories, languages, currentPath: '/admin/products-add' });
//   } catch (error) {
//     console.error('Get Add Product Error:', error);
//     res.status(500).render('admin/error', { message: 'Failed to load add product page.' });
//   }
// };

// export const getProducts = async (req, res) => {
//   try {
//     const { search = '', page = 1 } = req.query;
//     const limit = 10;
//     const skip = (page - 1) * limit;

//     let query = { isDeleted: false };
//     if (search) query.name = { $regex: search, $options: 'i' };

//     const totalProducts = await Product.countDocuments(query);
//     const products = await Product.find(query)
//       .populate('category')
//       .skip(skip)
//       .limit(limit);

//     const categories = await Category.find();
//     const languages = await Language.find();

//     res.render('admin/products', {
//       products,
//       categories,
//       languages,
//       search,
//       totalPages: Math.ceil(totalProducts / limit),
//       currentPage: Number(page)
//     });
//   } catch (error) {
//     console.error('Get Products Error:', error);
//     res.render('admin/products', {
//       products: [],
//       categories: [],
//       languages: [],
//       search: '',
//       totalPages: 1,
//       currentPage: 1,
//       error: 'Failed to load products'
//     });
//   }
// };
// export const getEditProduct = async (req, res) => {
//     try {
//       const { id } = req.params;
//       const product = await Product.findById(id).populate('category');
//       const categories = await Category.find();
//       const languages = await Language.find();
//       res.render('admin/products/edit', { product, categories, languages, currentPath: '/admin/products/edit' });
//     } catch (error) {
//       console.error('Get Edit Product Error:', error);
//       res.status(500).render('admin/error', { message: 'Failed to load edit product page.' });
//     }
//   };
//   export const addProduct = async (req, res) => {
//     try {
//       const { name, price, discount, category, language, stock, author, description } = req.body;
//       const images = req.files ? req.files.map(file => file.path) : [];
  
//       if (!name || !price || !category || !language || !stock || !author || !description || images.length < 3) {
//         return res.status(400).json({ success: false, message: 'All fields are required, including at least 3 images.' });
//       }
//       if (images.length > 5) {
//         return res.status(400).json({ success: false, message: 'Maximum 5 images allowed.' });
//       }
  
//       const product = new Product({
//         name, price, discount: discount || 0, category, language, stock, author, description, images
//       });
//       await product.save();
//       res.status(201).json({ success: true, message: 'Product added successfully!' });
//     } catch (error) {
//       console.error('Add Product Error:', error);
//       res.status(500).json({ success: false, message: 'Failed to add product.' });
//     }
//   };
  
//   export const editProduct = async (req, res) => {
//     try {
//       const { id } = req.params;
//       const { name, price, discount, category, language, stock, author, description, existingImages } = req.body;
//       const newImages = req.files ? req.files.map(file => file.path) : [];
  
//       if (!name || !price || !category || !language || !stock || !author || !description) {
//         return res.status(400).json({ success: false, message: 'All fields are required.' });
//       }
  
//       const product = await Product.findById(id);
//       if (!product) {
//         return res.status(404).json({ success: false, message: 'Product not found.' });
//       }
  
//       const updatedImages = [...(existingImages ? (Array.isArray(existingImages) ? existingImages : [existingImages]) : []), ...newImages];
//       if (updatedImages.length < 3) {
//         return res.status(400).json({ success: false, message: 'At least 3 images are required.' });
//       }
//       if (updatedImages.length > 5) {
//         return res.status(400).json({ success: false, message: 'Maximum 5 images allowed.' });
//       }
  
//       product.name = name;
//       product.price = price;
//       product.discount = discount || 0;
//       product.category = category;
//       product.language = language;
//       product.stock = stock;
//       product.author = author;
//       product.description = description;
//       product.images = updatedImages;
  
//       await product.save();
//       res.status(200).json({ success: true, message: 'Product updated successfully!' });
//     } catch (error) {
//       console.error('Edit Product Error:', error);
//       res.status(500).json({ success: false, message: 'Failed to update product.' });
//     }
//   };

// export const deleteProduct = async (req, res) => {
//   await Product.findByIdAndUpdate(req.params.id, { isDeleted: true });
//   res.redirect('/admin/products');
// };