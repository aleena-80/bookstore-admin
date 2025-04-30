import Product from '../../models/Product.js';
import Category from "../../models/Category.js";
import Language from "../../models/Language.js";
import upload from '../../middleware/upload.js';
import cloudinary from '../../config/cloudinary.js';


export const getProducts = async (req, res) => {
  try {
    const { search = '', page = 1 } = req.query;
    const limit = 10;
    const skip = (page - 1) * limit;

    let query = {};
    if (search) query.name = { $regex: search, $options: 'i' };

    const totalProducts = await Product.countDocuments(query);
    const products = await Product.find(query)
      .populate('category')
      .skip(skip)
      .sort({createdAt :-1})
      .limit(limit);

    const categories = await Category.find({ isDeleted: false });
    const languages = await Language.find();

    res.render('admin/products', {
      products,
      categories,
      languages,
      totalPages: Math.ceil(totalProducts / limit),
      currentPage: Number(page),
      search,
    });
  } catch (error) {
    console.error('Get Products Error:', error.message);
    res.status(500).render('admin/error', { message: 'Failed to load products.' });
  }
};
//----------------------------------------------------------------
export const editProduct = async (req, res) => {
  upload.array('images', 10)(req, res, async (err) => {
    try {
      if (err) {
        console.error('Upload Error:', err.message);
        return res.status(400).json({ message: 'Image upload failed: Only images allowed' });
      }

      const { id } = req.params;
      const { name, price, discount, category, language, stock, author, description, existingImages } = req.body;

      // Validate required fields
      if (!name || name.trim() === '') {
        return res.status(400).json({ message: 'Name is required' });
      }
      if (!author || author.trim() === '') {
        return res.status(400).json({ message: 'Author is required' });
      }
      if (!language || language.trim() === '') {
        return res.status(400).json({ message: 'Language is required' });
      }
      if (!category) {
        return res.status(400).json({ message: 'Category is required' });
      }
      const priceNum = Number(price);
      if (isNaN(priceNum) || priceNum <= 0) {
        return res.status(400).json({ message: 'Price must be a positive number' });
      }
      const stockNum = Number(stock);
      if (isNaN(stockNum) || stockNum < 0) {
        return res.status(400).json({ message: 'Stock must be a non-negative number' });
      }
      const discountNum = Number(discount) || 0;
      if (discountNum < 0 || discountNum > 100) {
        return res.status(400).json({ message: 'Discount must be between 0 and 100' });
      }

      // Validate category
      const categoryExists = await Category.findById(category);
      if (!categoryExists || categoryExists.isDeleted) {
        return res.status(400).json({ message: 'Invalid or deleted category' });
      }

      // Validate language
      const languageExists = await Language.findOne({ name: language });
      if (!languageExists) {
        return res.status(400).json({ message: 'Invalid language' });
      }

      const product = await Product.findById(id);
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }

      let images = [];
      if (existingImages) {
        images = Array.isArray(existingImages) ? existingImages : [existingImages];
      }
      if (req.files && req.files.length > 0) {
        const newImages = req.files.map(file => file.path);
        images = [...images, ...newImages];
      }
      if (images.length < 3) {
        return res.status(400).json({ message: 'At least 3 images are required' });
      }
      if (images.length > 10) {
        return res.status(400).json({ message: 'Maximum 10 images allowed' });
      }

      // Update fields
      product.name = name.trim();
      product.price = priceNum;
      product.discount = discountNum;
      product.category = category;
      product.language = language;
      product.stock = stockNum;
      product.author = author.trim();
      product.description = description?.trim() || product.description;
      product.images = images;

      await product.save();
      res.json({ success: true });
    } catch (error) {
      console.error('Edit Product Error:', error.message);
      res.status(400).json({ message: error.message || 'Failed to update product' });
    }
  });
};
//---------------------------------------------------------------
export const toggleProductListing = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    product.isListed = !product.isListed;
    await product.save();
    res.redirect('/admin/products');
  } catch (error) {
    console.error('Toggle Product Error:', error.message);
    res.status(500).json({ message: 'Failed to toggle product listing' });
  }
};
//----------------------------------------------------------------
export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    await Product.findByIdAndDelete(id,{ isDeleted: true });
    res.json({ success: true });
  } catch (error) {
    console.error('Delete Product Error:', error.message);
    res.status(500).json({ message: 'Failed to delete product' });
  }
};
//---------------------------------------------------------------------
export const updateProductOffer = async (req, res) => {
  try {
    const { id } = req.params;
    const { discount } = req.body;

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const offerValue = Math.max(0, Math.min(100, Number(discount) || 0));
    product.discount = offerValue;
    await product.save();
    res.json({ success: true, discount: offerValue });
  } catch (error) {
    console.error('Update Product Offer Error:', error.message);
    res.status(500).json({ message: 'Failed to update product offer' });
  }
};
//-------------------------------------------------------------------------
export const addProduct = (req, res) => {
  upload.array('images', 10)(req, res, async (err) => { 

    if (err) {
      return res.status(500).json({
        success: false,
        message: "❌ Please upload only valid image files: JPEG, PNG, WEBP, or GIF."
      });
    }
    try {
      const { name, price, discount, category, language, stock, author, description } = req.body;
      const images = req.files ? req.files.map(file => file.path) : []; 

      const product = new Product({
        name,
        price: Number(price),
        discount: Number(discount || 0),
        category,
        language,
        stock: Number(stock),
        author,
        description,
        images 
      });
      await product.save();
      res.status(200).json({ success: true, message: "Product added successfully!" });
    } catch (error) {
      console.error("Add Product Error:", error);
      res.status(500).json({ success: false, message: "Error: " + error.message });
    }
  });
};
// //--------------------------------------------------------------------------------
  export const getaddProduct = async (req, res) => {
    try {
      const categories = await Category.find();
      const languages = await Language.find();
      res.render("admin/products-add", { categories, languages, currentPath: "/admin/products-add" });
    } catch (error) {
      console.error("Get Add Product Error:", error);
      res.status(500).render("admin/error", { message: "Failed to load add product page." });
    }
  };
//-------------------------------------------------------------------------
export const unlistProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ message: 'Product not found' });
        product.isListed = !product.isListed; 
        await product.save();
        res.redirect('/admin/products'); 
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};
//------------------------------------------------------------