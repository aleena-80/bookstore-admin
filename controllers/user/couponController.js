import Coupon from '../../models/Coupon.js';
import User from '../../models/User.js';
import Order from '../../models/Order.js';
import Cart from '../../models/Carts.js';
import Address from '../../models/Address.js';
import Wishlist from '../../models/Wishlist.js';

export const getUserCoupons = async (req, res) => {
  try {
    const user = req.user;
    let coupons;

    if (!user || !user._id) {
      coupons = await Coupon.find({
        userId: { $exists: false },
        isListed: true,
        expiryDate: { $gte: new Date() }
      });
    } else {
      if (user.isBlocked) {
        return res.json({ success: false, message: 'Account is blocked' });
      }
      coupons = await Coupon.find({
        $or: [
          { userId: user._id },
          { userId: { $exists: false } }
        ],
        isListed: true,
        expiryDate: { $gte: new Date() }
      });
    }

    if (req.headers.accept?.includes('application/json')) {
      return res.json({ success: true, coupons });
    }

    const cartItems = await Cart.find({ userId: user?._id }).populate('productId');
    const wishlistCount = await Wishlist.countDocuments({ userId: user?._id });
    const cartCount = cartItems.length;
    res.render('user/coupons', { 
      coupons, 
      wishlistCount: wishlistCount || 0,
      cartCount
    });
  } catch (error) {
    console.error('Get User Coupons Error:', error);
    res.status(500).json({ success: false, message: 'Failed to load coupons' });
  }
};
//-----------------------------------------------------------
export const applyCoupon = async (req, res) => {
  try {
    const { code } = req.body;
    const user = req.user;
    const coupon = await Coupon.findOne({
      code,
      $or: [
        { userId: user?._id },
        { userId: { $exists: false } }
      ],
      isListed: true,
      expiryDate: { $gte: new Date() }
    });

    if (!coupon) {
      return res.json({ success: false, message: 'Invalid or expired coupon' });
    }

    if (!user || !user._id) {
      return res.json({ success: false, message: 'Please log in to apply coupon' });
    }
    if (user.isBlocked) {
      return res.json({ success: false, message: 'Account is blocked' });
    }

    let order = await Order.findOne({ 
      userId: user._id, 
      status: { $nin: ['Cancelled', 'Returned'] }
    }).sort({ createdAt: -1 });

    if (!order) {
      const cartItems = await Cart.find({ userId: user._id }).populate('productId');
      if (cartItems.length === 0) {
        return res.json({ success: false, message: 'No items in cart to apply coupon' });
      }

      const items = cartItems.map(item => {
        if (!item.productId || !item.productId.price) {
        }
        return {
          productId: item.productId._id,
          quantity: item.quantity,
          price: item.productId.price || 100
        };
      });
      const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

      // Fetch default address
      const address = await Address.findOne({ 
        userId: user._id, 
        isDefault: true 
      }) || await Address.findOne({ userId: user._id });

      if (!address) {
        return res.json({ success: false, message: 'Please add an address to apply coupon' });
      }

      order = new Order({
        userId: user._id,
        orderId:`ORD-${Date.now()}`,
        items,
        address: {
          name: address.name,
          street: address.street,
          city: address.city,
          state: address.state,
          postalCode: address.postalCode
        },
        paymentMethod: 'COD', 
        total,
        status: 'Confirmed'
      });
    }

    if (order.couponCode && order.couponCode !== code) {
      return res.json({ success: false, message: 'Another coupon is already applied' });
    }
    order.couponCode = coupon.code;
    await order.save();

    res.json({ success: true, message: 'Coupon applied successfully', discount: coupon.discount });
  } catch (error) {
    console.error('Apply Coupon Error:', error);
    res.status(500).json({ success: false, message: 'Failed to apply coupon' });
  }
};
//--------------------------------------------------------
export const removeCoupon = async (req, res) => {
  try {
    const userId = req.user._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Please log in' });
    }

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