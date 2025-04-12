// controllers/userCouponController.js
import Coupon from '../../models/Coupon.js';
import User from '../../models/User.js';
import Order from '../../models/Order.js';
import Cart from '../../models/Carts.js';
import Wishlist from '../../models/Wishlist.js';

export const getUserCoupons = async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user._id) {
      return res.json({ success: false, message: "Please log in to view coupons." });
    }

    const cartItems = await Cart.find({ userId: req.user._id }).populate('productId');
    const wishlistCount = await Wishlist.countDocuments({ userId: req.user._id });
    const cartCount = cartItems.length;
    const coupons = await Coupon.find({
      $or: [
        { userId: user._id },
        { userId: { $exists: false } }
      ],
      isListed: true,
      isActive: true,
      expiryDate: { $gte: new Date() }
    });
    res.render('user/coupons', { 
      coupons, 
      wishlistCount,
      cartCount
    });
  } catch (error) {
    console.error('Get User Coupons Error:', error);
    res.status(500).send('Failed to load coupons');
  }
};

export const applyCoupon = async (req, res) => {
  try {
    const { code } = req.body;
    const user = req.user;

    if (!user || !user._id) {
      return res.json({ success: false, message: "Please log in to apply a coupon." });
    }

    const coupon = await Coupon.findOne({
      code,
      $or: [
        { userId: user._id },
        { userId: { $exists: false } }
      ],
      isListed: true,
      isActive: true,
      expiryDate: { $gte: new Date() }
    });

    if (!coupon) {
      return res.json({ success: false, message: 'Invalid or expired coupon' });
    }

    // Find latest active order (not Cancelled or Returned)
    let order = await Order.findOne({ 
      userId: user._id, 
      status: { $nin: ['Cancelled', 'Returned'] } // Exclude final states
    }).sort({ createdAt: -1 });

    if (!order) {
      const cartItems = await Cart.find({ userId: user._id }).populate('productId');
      if (cartItems.length === 0) {
        return res.json({ success: false, message: 'No items in cart to apply coupon' });
      }
      order = new Order({
        userId: user._id,
        items: cartItems.map(item => ({ productId: item.productId._id, quantity: item.quantity })),
        addressId: null,
        total: 0,
        status: 'Pending' // Default per your schema
      });
    }
    if (order.couponCode) {
      return res.json({ success: false, message: 'A coupon is already applied' });
    }
    order.couponCode = coupon.code;
    await order.save();

    res.json({ success: true, message: 'Coupon applied successfully', discount: coupon.discount });
  } catch (error) {
    console.error('Apply Coupon Error:', error);
    res.status(500).json({ success: false, message: 'Failed to apply coupon' });
  }
};

export const removeCoupon = async (req, res) => {
  try {
    const userId = req.user._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Please log in' });
    }

    // Find latest active order (not Cancelled or Returned)
    const order = await Order.findOne({ 
      userId, 
      status: { $nin: ['Cancelled', 'Returned'] }
    }).sort({ createdAt: -1 });

    if (order && order.couponCode) {
      order.couponCode = null;
      await order.save();
    }

    res.json({ success: true, message: 'Coupon removed' });
  } catch (error) {
    console.error('Remove Coupon Error:', error);
    res.status(500).json({ success: false, message: 'Failed to remove coupon' });
  }
};
