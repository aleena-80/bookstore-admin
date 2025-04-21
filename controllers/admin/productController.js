import Product from '../../models/Product.js';
import Category from "../../models/Category.js";
import Language from "../../models/Language.js";
import upload from '../../middleware/upload.js';
import cloudinary from '../../config/cloudinary.js';

// Existing controllers (assumed)
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

      // Handle images
      let images = [];
      // Keep existing images
      if (existingImages) {
        images = Array.isArray(existingImages) ? existingImages : [existingImages];
      }
      // Add new images
      if (req.files && req.files.length > 0) {
        const newImages = req.files.map(file => file.path);
        images = [...images, ...newImages];
      }
      // Validate image count
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
      console.log('Updated Product:', id);
      res.json({ success: true });
    } catch (error) {
      console.error('Edit Product Error:', error.message);
      res.status(400).json({ message: error.message || 'Failed to update product' });
    }
  });
};

export const toggleProductListing = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    product.isListed = !product.isListed;
    await product.save();
    console.log('Toggled Product:', { id, isListed: product.isListed });
    res.redirect('/admin/products');
  } catch (error) {
    console.error('Toggle Product Error:', error.message);
    res.status(500).json({ message: 'Failed to toggle product listing' });
  }
};

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

// New controller for offer
export const updateProductOffer = async (req, res) => {
  try {
    const { id } = req.params;
    const { discount } = req.body;

    const product = await Product.findById(id);
    if (!product) {
      console.warn('Update Offer: Product not found:', id);
      return res.status(404).json({ message: 'Product not found' });
    }

    const offerValue = Math.max(0, Math.min(100, Number(discount) || 0));
    product.discount = offerValue;
    await product.save();
    console.log('Updated Product Offer:', { id, discount: offerValue });
    res.json({ success: true, discount: offerValue });
  } catch (error) {
    console.error('Update Product Offer Error:', error.message);
    res.status(500).json({ message: 'Failed to update product offer' });
  }
};
//-------------------------------------------------------------------------
export const addProduct = (req, res) => {
  console.log("POST /admin/products-add");
  upload.array('images', 10)(req, res, async (err) => { 

    if (err) {
      console.error("Multer Error:", err);
      return res.status(500).json({
        success: false,
        message: "❌ Please upload only valid image files: JPEG, PNG, WEBP, or GIF."
      });
    }
      
    

    try {
      console.log("Files:", req.files);
      console.log("Body:", req.body);

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
        images // Now stores Cloudinary URLs
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
// //--------------------------------------------------------------------------------

// //-------------------------------------------------------------------------
// export const deleteProduct = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const product = await Product.findByIdAndDelete(id);
//     if (!product) {
//       return res.status(404).json({ message: 'Product not found' });
//     }
//     // Optionally, delete images from storage
//     // product.images.forEach(img => fs.unlinkSync(path.join(__dirname, '..', img)));
//     res.json({ success: true });
//   } catch (error) {
//     console.error('Delete Product Error:', error);
//     res.status(500).json({ message: 'Failed to delete product' });
//   }
// };
// //-------------------------------------------------------------------------------
// export const getProducts = async (req, res) => {
//     try {
//       const { search = "", page = 1, limit = 10 } = req.query;
//       let query = { isDeleted: false };
//       if (search) query.name = { $regex: search, $options: "i" };
  
//       const totalProducts = await Product.countDocuments(query);
//       const products = await Product.find(query)
//         .populate("category")
//         .sort({ createdAt: -1 })
//         .skip((page - 1) * limit)
//         .limit(Number(limit));
//       const categories = await Category.find(); // No isDeleted filter
//       const languages = await Language.find();
  
//       res.render("admin/products", {
//         products,
//         categories,
//         languages,
//         totalPages: Math.ceil(totalProducts / limit),
//         currentPage: Number(page),
//         search,
//         error: null,
//       });
//     } catch (error) {
//       console.error("Render Products Error:", error);
//       res.render("admin/products", { products: [], categories: [], languages: [], totalPages: 1, currentPage: 1, search: "", error: "Failed to load products" });
//     }
//   };
//   //--------------------------------------------------------------------------------------
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
//   //-------------------------------------------------------------------------------------
  
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
// //-------------------------------------------------------------------------------------
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