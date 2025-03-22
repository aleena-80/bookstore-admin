// import Product from '../models/Product.js';
// import Category from '../models/Category.js';
// import mongoose from 'mongoose';
// import jwt from 'jsonwebtoken';
// export const getProducts = async (req, res) => {
//   try {
//     const { search = '', sort = '', category = '', priceMin = '', priceMax = '', page = 1, limit = 10 } = req.query;
//     const skip = (page - 1) * limit;

//     let query = { isListed: true, isDeleted: false };
//     if (search) query.name = { $regex: search, $options: 'i' };
//     if (category) query.category = category;
//     if (priceMin) query.price = { ...query.price, $gte: Number(priceMin) };
//     if (priceMax) query.price = { ...query.price, $lte: Number(priceMax) };

//     let sortOption = {};
//     switch (sort) {
//       case 'priceLow': sortOption.price = 1; break;
//       case 'priceHigh': sortOption.price = -1; break;
//       case 'aZ': sortOption.name = 1; break;
//       case 'zA': sortOption.name = -1; break;
//       case 'new': sortOption.createdAt = -1; break;
//       case 'featured': sortOption.isFeatured = -1; break;
//       default: sortOption.createdAt = -1;
//     }

//     const totalProducts = await Product.countDocuments(query);
//     const products = await Product.find(query)
//       .populate('category')
//       .sort(sortOption)
//       .skip(skip)
//       .limit(Number(limit));
//       console.log("User products images:", products.map(p => p.images));

//     const categories = await Category.find();

    
//     if (req.headers['x-requested-with'] === 'XMLHttpRequest') {
//       return res.json({
//         success: true,
//         products,
//         totalPages: Math.ceil(totalProducts / limit),
//         currentPage: Number(page)
//       });
//     }

//     res.render('user/products', {
//       products,
//       categories,
//       search,
//       sort,
//       category,
//       priceMin,
//       priceMax,
//       currentPage: Number(page),
//       totalPages: Math.ceil(totalProducts / limit)
//     });
//   } catch (error) {
//     console.error('Get User Products Error:', error);
//     if (req.headers['x-requested-with'] === 'XMLHttpRequest') {
//       return res.status(500).json({ success: false, message: 'Failed to load products' });
//     }
//     res.render('user/products', {
//       products: [],
//       categories: [],
//       search: '',
//       sort: '',
//       category: '',
//       priceMin: '',
//       priceMax: '',
//       currentPage: 1,
//       totalPages: 1,
//       error: 'Failed to load products'
//     });
//   }
// };
// //------------------------------------------------------------------------------------- 
// export const getProductDetails = async (req, res) => {
//   try {
//     const user = req.user
//     const product = await Product.findById(req.params.id).populate('category');
//     if (!product) return res.status(404).send("Product not found");
//     const relatedProducts = await Product.find({ 
//       category: product.category, 
//       _id: { $ne: product._id }, 
//       isListed: true, 
//       isDeleted: false 
//     }).limit(5);
//     const categoryName = product.category && product.category.name ? product.category.name : 'Unknown';

//     product.reviews = product.reviews || [];

//     product.reviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

//     let userReview = null;
//     if (user) {
//         const userReviewIndex = product.reviews.findIndex(review => review.user.toString() === user);
//         if (userReviewIndex !== -1) {
//             userReview = product.reviews[userReviewIndex];
//         }
//     }

//     const limit = 5;
//     const page = parseInt(req.query.page) || 1;
//     const totalReviews = product.reviews.length;
//     const totalPages = Math.ceil(totalReviews / limit);
//     const startIndex = (page - 1) * limit;
//     const endIndex = startIndex + limit;
//     let paginatedReviews = product.reviews.slice(startIndex, endIndex);
//     if (userReview) {
//         paginatedReviews = [
//             userReview,
//             ...paginatedReviews.filter(r => r.user.toString() !== user)
//         ];
//     }
//     const averageRating = totalReviews > 0
//         ? (product.reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews).toFixed(1)
//         : 0;
//     const ratingCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
//     product.reviews.forEach(review => {
//         ratingCounts[review.rating] = (ratingCounts[review.rating] || 0) + 1;
//     });
//     if (req.xhr) {
//       return res.json({
//           reviews: paginatedReviews,
//           currentPage: page,
//           totalPages,
//       });
//   }

//     res.render('user/product-details', { product, relatedProducts, user, categoryName, averageRating,
//       totalReviews,
//       ratingCounts,
//       reviews: paginatedReviews,
//       currentPage: page,
//       totalPages });




//   } catch (error) {
//     console.error("Get Product Error:", error);
//     res.status(500).send("Error loading product");
//   }
// };

// //--------------------------------------------------------------------
// export const addReview = async (req, res) => {
//   try {
//     const { productId, rating, comment } = req.body;
//     const user = req.user;

//     console.log("User from JWT:", user);

//     if (!user || !user._id) {
//       return res.json({ success: false, message: "Please log in to add a review." });
//     }

//     if (!mongoose.Types.ObjectId.isValid(productId)) {
//       return res.json({ success: false, message: "Invalid product ID." });
//     }

//     if (!rating || rating < 1 || rating > 5) {
//       return res.json({ success: false, message: "Invalid rating value." });
//     }

//     const product = await Product.findById(productId).populate('reviews.user');
//     if (!product) {
//       return res.json({ success: false, message: "Product not found." });
//     }

//     const existingReview = product.reviews.find(
//       (review) => review.user && review.user.toString() === user._id.toString()
//     );

//     if (existingReview) {
//       return res.json({ success: false, message: "You have already reviewed this product." });
//     }

//     // ✅ Fix: Add user._id properly
//     product.reviews.push({ user: user._id, rating, comment });

//     await product.save();
//     await product.populate('reviews.user');

//     return res.json({ success: true, message: "Review added successfully!" });

//   } catch (error) {
//     console.error("Error adding review:", error);
//     res.json({ success: false, message: "Error adding review." });
//   }
// };

// //----------------------------------------------
// export const editReview = async (req, res) => {
//   try {
//       const { reviewId, rating, comment } = req.body;
//       const user = req.user

//       if (!user) {
//           return res.json({ success: false, message: "Please log in to edit your review." });


//       }

//       if (!rating || rating < 1 || rating > 5) {
//           return res.json({ success: false, message: "Invalid rating value." });
//       }


//       const product = await Product.findOne({ "reviews._id": reviewId });

//       if (!product) {
//           return res.json({ success: false, message: "Review not found." });
//       }


//       const review = product.reviews.find(r => r._id.toString() === reviewId);

//       if (!review) {
//           return res.json({ success: false, message: "Review not found." });
//       }

    
//       if (review.user.toString() !== user) {
//           return res.json({ success: false, message: "You are not authorized to edit this review." });
//       }

    
//       review.rating = rating;
//       review.comment = comment;
//       await product.save();

//       return res.json({ success: true, message: "Review updated successfully!" });

//   } catch (error) {
//       console.error("Error updating review:", error);
//       res.json({ success: false, message: "Error updating review." });
//   }
// };