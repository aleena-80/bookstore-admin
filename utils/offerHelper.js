import Category from "../models/Category.js";
import Product from "../models/Product.js";

export const getEffectiveOffer = async (productId) => {
  try {
    const product = await Product.findById(productId);
    if (!product) return 0;

    const category = await Category.findById(product.categoryId);
    const productOffer = Number(product.offer) || 0;
    const categoryOffer = category ? Number(category.offer) || 0 : 0;

    return Math.max(productOffer, categoryOffer);
  } catch (error) {
    console.error('Get Effective Offer Error:', error);
    return 0;
  }
};