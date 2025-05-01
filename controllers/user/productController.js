import Product from '../../models/Product.js'
import Category from '../../models/Category.js'
import Address from '../../models/Address.js';  
import Order from '../../models/Order.js';  
import Wishlist from '../../models/Wishlist.js'
import Banner from '../../models/Banner.js'
import Cart from '../../models/Carts.js'
import Language from '../../models/Language.js'
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import Newsletter from '../../models/Newsletter.js'


export const getProducts = async (req, res) => {
  try {
    const user = req.user || null;
    const { search = '', sort = '', category = '', priceMin = '', priceMax = '', page = 1, limit = 12 ,language=''} = req.query;
    console.log("Query Params:", { search, sort, category, priceMin, priceMax, page, limit, language });
    const skip = (page - 1) * limit;

    let query = { isListed: true, isDeleted: false };
    if (search) query.name = { $regex: search, $options: 'i' };
    if (category) query.category = category;
    if (language) query.language = language;
    if (priceMin) query.price = { ...query.price, $gte: Number(priceMin) };
    if (priceMax) query.price = { ...query.price, $lte: Number(priceMax) };

    let sortOption = {};
    switch (sort) {
      case 'priceLow': sortOption.price = 1; break;
      case 'priceHigh': sortOption.price = -1; break;
      case 'aZ': sortOption.name = 1; break;
      case 'zA': sortOption.name = -1; break;
      case 'new': sortOption.createdAt = -1; break;
      case 'featured': sortOption.isFeatured = -1; break;
      default: sortOption.createdAt = -1;
    }

    const totalProducts = await Product.countDocuments(query);
    const products = await Product.find(query)
      .populate({ path: 'category', select: 'name isListed' })
      .sort(sortOption)
      .skip(skip)
      .limit(Number(limit));

    const categories = await Category.find();
    const languages = await Language.find().select('name');
    const wishlistCount = user ? await Wishlist.countDocuments({ userId: user.id }) : 0;
    const cartCount = user ? await Cart.countDocuments({ userId: user.id }) : 0;

    if (req.headers['x-requested-with'] === 'XMLHttpRequest') {
      return res.json({
        success: true,
        products,
        totalPages: Math.ceil(totalProducts / limit),
        currentPage: Number(page),
        wishlistCount,
        cartCount
      });
    }

    res.render('user/products', {
      products,
      categories,
      search,
      sort,
      category,
      priceMin,
      priceMax,
      languages: languages.map(l => l.name),
      user,
      currentPage: Number(page),
      wishlistCount,
      cartCount,
      totalPages: Math.ceil(totalProducts / limit)
    });
  } catch (error) {
    console.error('Get User Products Error:', error);
    res.render('user/products', { products: [], categories: [], languages: [], user, wishlistCount: 0, cartCount: 0, error: 'Failed to load products' });
  }
};
//------------------------------------------------------------------------------------- 
export const getProductDetails = async (req, res) => {
  try {
    const user = req.user
    const product = await Product.findById(req.params.id).populate('category');
    if (!product) return res.status(404).send("Product not found");
    const relatedProducts = await Product.find({ 
      category: product.category, 
      _id: { $ne: product._id }, 
      isListed: true, 
      isDeleted: false 
    }).limit(5);
    const categoryName = product.category && product.category.name ? product.category.name : 'Unknown';
    const wishlistCount = user ? await Wishlist.countDocuments({ userId: user.id }) : 0;
    const cartCount = user ? await Cart.countDocuments({ userId: user.id }) : 0;

    product.reviews = product.reviews || [];

    product.reviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    let userReview = null;
    if (user) {
        const userReviewIndex = product.reviews.findIndex(review => review.user.toString() === user);
        if (userReviewIndex !== -1) {
            userReview = product.reviews[userReviewIndex];
        }
    }

    const limit = 5;
    const page = parseInt(req.query.page) || 1;
    const totalReviews = product.reviews.length;
    const totalPages = Math.ceil(totalReviews / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    let paginatedReviews = product.reviews.slice(startIndex, endIndex);
    if (userReview) {
        paginatedReviews = [
            userReview,
            ...paginatedReviews.filter(r => r.user.toString() !== user)
        ];
    }
    const averageRating = totalReviews > 0
        ? (product.reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews).toFixed(1)
        : 0;
    const ratingCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    product.reviews.forEach(review => {
        ratingCounts[review.rating] = (ratingCounts[review.rating] || 0) + 1;
    });
    if (req.xhr) {
      return res.json({
          reviews: paginatedReviews,
          currentPage: page,
          totalPages,
      });
  }

    res.render('user/product-details', { product, relatedProducts, user, categoryName, averageRating,
      totalReviews,
      ratingCounts,
      reviews: paginatedReviews,
      currentPage: page,
      cartCount,
      wishlistCount,
      totalPages });

  } catch (error) {
    console.error("Get Product Error:", error);
    res.status(500).send("Error loading product");
  }
};
//--------------------------------------------------------------------
export const addReview = async (req, res) => {
  try {
    const { productId, rating, comment } = req.body;
    const user = req.user;


    if (!user || !user._id) {
      return res.json({ success: false, message: "Please log in to add a review." });
    }

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.json({ success: false, message: "Invalid product ID." });
    }

    if (!rating || rating < 1 || rating > 5) {
      return res.json({ success: false, message: "Invalid rating value." });
    }

    const product = await Product.findById(productId).populate('reviews.user');
    if (!product) {
      return res.json({ success: false, message: "Product not found." });
    }

    const existingReview = product.reviews.find(
      (review) => review.user && review.user.toString() === user._id.toString()
    );

    if (existingReview) {
      return res.json({ success: false, message: "You have already reviewed this product." });
    }

    product.reviews.push({ user: user._id, rating, comment });

    await product.save();
    await product.populate('reviews.user');

    return res.json({ success: true, message: "Review added successfully!" });

  } catch (error) {
    console.error("Error adding review:", error);
    res.json({ success: false, message: "Error adding review." });
  }
};

//----------------------------------------------
export const editReview = async (req, res) => {
  try {
      const { reviewId, rating, comment } = req.body;
      const user = req.user

      if (!user) {
          return res.json({ success: false, message: "Please log in to edit your review." });
      }

      if (!rating || rating < 1 || rating > 5) {
          return res.json({ success: false, message: "Invalid rating value." });
      }
      const product = await Product.findOne({ "reviews._id": reviewId });

      if (!product) {
          return res.json({ success: false, message: "Review not found." });
      }
      const review = product.reviews.find(r => r._id.toString() === reviewId);

      if (!review) {
          return res.json({ success: false, message: "Review not found." });
      }
      review.rating = rating;
      review.comment = comment;
      await product.save();

      return res.json({ success: true, message: "Review updated successfully!" });

  } catch (error) {
      console.error("Error updating review:", error);
      res.json({ success: false, message: "Error updating review." });
  }
};
//-------------------------------------------------------------------------------------------------------------------------
export const getHome = async (req, res) => {
  try {
    const books = await Product.find({ 
      isListed: true, 
      isDeleted: false 
    })
    .sort({ createdAt: -1 })
    .limit(15)
    .select('name images price author language stock');
    const categories = await Category.find({}); 

    const formattedBooks = books.map(book => ({
      id: book._id.toString(),
      title: book.name,
      coverImage: book.images[0] || 'https://res.cloudinary.com/dlxnlxmaz/image/upload/images/default-product',
      author: book.author,
      price: book.price,
      language: book.language || 'English',
      inStock: book.stock > 0
    }));
   

    const banners = await Banner.find({ 
      active: true,
      startDate: { $lte: new Date() },
      $or: [{ endDate: { $gte: new Date() } }, { endDate: null }]
    }).sort({ startDate: -1 });
    const bannersToShow = banners.length > 0 ? banners : [{ image: '/images/default-banner.jpg' }];
    
    let wishlistCount = 0;
    let cartCount = 0;
    let cartItems = [];

    if (req.user) {
      cartItems = await Cart.find({ userId: req.user._id }).populate('productId');
      wishlistCount = await Wishlist.countDocuments({ userId: req.user._id });
      cartCount = cartItems.length;
    }

    res.render('user/home', { 
      books: formattedBooks, 
      banners: bannersToShow, 
      user: req.user || null, 
      wishlistCount, 
      categories,
      cartItems,
      cartCount,
      success: req.query.success || null 
    });
  } catch (error) {
    console.error('Home Page Error:', error);
    res.render('user/home', { 
      books: [], 
      banners: [{ image: '/images/default-banner.jpg' }], 
      user: req.user || null, 
      wishlistCount: 0, 
      cartCount: 0,
      cartItems: [],
      success: null, 
      error: 'Failed to load products' 
    });
  }
};
//---------------------------------------------------------------------
export const searchBooks = async (req, res) => {
    try {
        const query = req.query.q || '';
        const books = await Product.find({ 
            isListed: true, 
            isDeleted: false,
            $or: [
                { name: { $regex: query, $options: 'i' } },
                { author: { $regex: query, $options: 'i' } },
                { language: { $regex: query, $options: 'i' } }
            ]
        })
        .sort({ createdAt: -1 })
        .select('name images price author language inStock');

        const formattedBooks = books.map(book => ({
          id: book._id.toString(),
          title: book.name,
          coverImage: book.images[0] || 'https://res.cloudinary.com/dlxnlxmaz/image/upload/images/default-product',
          author: book.author,
          price: book.price,
          language: book.language || 'English',
          inStock: book.stock > 0
        }));
    
        res.json({ books: formattedBooks });
    } catch (error) {
        console.error('Search Error:', error);
        res.status(500).json({ error: 'Search failed' });
    }
};
//--------------------------------------------------------------------------
export const subscribeNewsletter = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) throw new Error('Email is required');

        const existing = await Newsletter.findOne({ email });
        if (existing) {
            return res.redirect('/users/home?success=Already subscribed!');
        }

        const subscriber = new Newsletter({ email });
        await subscriber.save();

        res.redirect('/users/home?success=Subscribed successfully!');
    } catch (error) {
        console.error('Newsletter Subscription Error:', error);
        res.redirect('/users/home?error=Subscription failed');
    }
};
//----------------------------------------------------------------------------------