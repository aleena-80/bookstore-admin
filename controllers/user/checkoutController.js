import  Address from  '../../models/Address.js';
import Cart from '../../models/Carts.js';
import Wishlist from '../../models/Wishlist.js';
import  Order from '../../models/Order.js';
import  Product from'../../models/Product.js';
import Coupon from '../../models/Coupon.js'
import Razorpay from 'razorpay';
import crypto from 'crypto';
import dotenv from 'dotenv'

//import { generateOrderId } from '../../utils/orderUtils'; 

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});


export const getCheckout = async (req, res) => {
  try {
    if (!req.user) return res.redirect('/users/login');
    let appliedCoupon = null; // Define here to avoid undefined error

    let order = null;
    if (req.query.orderId) {
      order = await Order.findById(req.query.orderId).populate('items.productId');

      if (order && order.couponCode) {
        const coupon = await Coupon.findOne({ code: order.couponCode });
        if (coupon && coupon.isActive && coupon.isListed && coupon.expiryDate >= new Date()) {
          appliedCoupon = { code: coupon.code, discount: coupon.discount };
          // total -= subtotal * (coupon.discount / 100); // This line needs subtotal defined, moved below
        }
      }

      if (!order || order.userId.toString() !== req.user._id.toString()) {
        return res.render('user/checkout', {
          cartItems: [],
          addresses: [],
          user: req.user,
          directProduct: null,
          order: null,
          wishlistCount: 0,
          cartCount: 0,
          subtotal: '0.00',
          taxes: '0.00',
          shipping: '0.00',
          appliedCoupon,
          total: '0.00',
          error: 'Invalid or unauthorized order'
        });
      }
      const directProduct = order.items[0].productId;
      let subtotal = order.subtotal || 0; // Define subtotal here
      let total = order.total || 0;
      if (appliedCoupon) total -= subtotal * (appliedCoupon.discount / 100); // Apply discount here
      return res.render('user/checkout', {
        user: req.user,
        cartItems: [],
        directProduct,
        order,
        appliedCoupon,
        addresses: await Address.find({ userId: req.user._id }),
        wishlistCount: await Wishlist.countDocuments({ userId: req.user._id }),
        cartCount: 1,
        subtotal: order.subtotal ? order.subtotal.toFixed(2) : '0.00',
        taxes: order.taxes ? order.taxes.toFixed(2) : '0.00',
        shipping: order.shipping ? order.shipping.toFixed(2) : '0.00',
        total: total.toFixed(2)
      });
    }

    const cartItems = await Cart.find({ userId: req.user._id }).populate('productId');
    const addresses = await Address.find({ userId: req.user._id });
    const wishlistCount = await Wishlist.countDocuments({ userId: req.user._id });
    const cartCount = cartItems.length;

    const subtotal = cartItems.reduce((sum, item) => sum + item.productId.price * item.quantity * (1 - (item.productId.discount || 0) / 100), 0);
    const taxes = subtotal * 0.05;
    const shipping = 100;
    let total = subtotal + taxes + shipping;

    // Check for applied coupon in latest pending order
    const latestOrder = await Order.findOne({ 
      userId: req.user._id, 
      status: { $nin: ['Cancelled', 'Returned'] } // Match applyCoupon
    }).sort({ createdAt: -1 });
    if (latestOrder && latestOrder.couponCode) {
      const coupon = await Coupon.findOne({ code: latestOrder.couponCode });
      if (coupon && coupon.isActive && coupon.isListed && coupon.expiryDate >= new Date()) {
        appliedCoupon = { code: coupon.code, discount: coupon.discount };
        total -= subtotal * (coupon.discount / 100);
      }
    }
    if (cartItems.length === 0 && !order) {
      return res.render('user/checkout', {
        cartItems: [],
        addresses,
        subtotal: '0.00',
        taxes: '0.00',
        shipping: '0.00',
        total: '0.00',
        user: req.user,
        wishlistCount,
        appliedCoupon,
        cartCount,
        directProduct: null,
        order: null,
        error: 'Your cart is empty'
      });
    }

    res.render('user/checkout', {
      cartItems,
      addresses,
      subtotal: subtotal.toFixed(2),
      taxes: taxes.toFixed(2),
      shipping: shipping.toFixed(2),
      total: total.toFixed(2),
      user: req.user,
      wishlistCount,
      cartCount,
      appliedCoupon,
      directProduct: null,
      order: null
    });
  } catch (error) {
    console.error('Get Checkout Error:', error);
    res.render('user/checkout', { 
      cartItems: [], 
      addresses: [], 
      user: req.user, 
      directProduct: null,
      order: null,
      wishlistCount: 0, 
      cartCount: 0, 
      subtotal: '0.00',
      taxes: '0.00',
      shipping: '0.00',
      total: '0.00',
      appliedCoupon: null, // Ensure it’s here too
      error: 'Failed to load checkout' 
    });
  }
};
//-----------------------------------------------------------------------------------------------------
export const initiateOrder = async (req, res) => {
  try {
    const { addressId } = req.body;
    const {userId}= req.body
    console.log('Initiate Order Request:', { addressId, userId: req.user.id });

    if (!addressId) return res.json({ success: false, message: 'Address is required' });
    const cartItems = await Cart.find({ userId: req.user.id }).populate('productId');
    if (!cartItems.length) return res.json({ success: false, message: 'Cart is empty' });

    const address = await Address.findOne({ _id: addressId, userId: req.user.id });
    if (!address) return res.json({ success: false, message: 'Invalid address' });

    const items = cartItems.map(item => ({
      productId: item.productId._id,
      quantity: item.quantity,
      price: item.productId.price,
      discount: item.productId.discount || 0
    }));

    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity * (1 - item.discount / 100), 0);
    const taxes = subtotal * 0.05;
    const shipping = 100;
    const total = Math.round(subtotal + taxes + shipping);

    const order = new Order({
      userId: req.user.id,
      items,
      address: {
        name: address.name,
        street: address.street,
        city: address.city,
        state: address.state,
        postalCode: address.postalCode,
        country: address.country || 'India' 
      },
      subtotal,
      taxes,
      shipping,
      total,
      paymentMethod: 'Pending',
      status: 'Confirmed',
      orderId: `ORD${Date.now()}`,
      createdAt: new Date()
    });

    await order.save();
    await Cart.deleteMany({ userId });
    await Cart.findOneAndUpdate({ userId }, { items: [] });

    console.log('Order Initiated:', order.orderId);
    res.json({ success: true, orderId: order.orderId });
  } catch (error) {
    console.error('Initiate Order Error:', error);
    res.status(500).json({ success: false, message: 'Failed to initiate order' });
  }
};
//------------------------------------------------------------------------------------------------------
export const getPaymentPage = async (req, res) => {
  try {
    const { orderId } = req.query;
    const order = await Order.findOne({ orderId, userId: req.user.id });
    if (!order) return res.status(404).send('Order not found');
    res.render('user/payment', { order,
       user: req.user,
       razorpayKeyId: process.env.RAZORPAY_KEY_ID
       });
  } catch (error) {
    console.error('Get Payment Page Error:', error);
    res.status(500).send('Failed to load payment page');
  }
};
//----------------------------------------------------------------------------------------------

//------------------------------------------------------------------------------------------------
export const addAddress = async (req, res) => {
  try {
    const { name, street, city, state, postalCode, isDefault } = req.body;
    console.log('Add Address Request:', { name, street, city, state, postalCode, isDefault, userId: req.user.id });

    const existingAddresses = await Address.countDocuments({ userId: req.user.id });
    if (isDefault === 'true' || existingAddresses === 0) {
      await Address.updateMany({ userId: req.user.id, isDefault: true }, { isDefault: false });
    }

    const address = new Address({
      userId: req.user.id,
      quartile: 0, // Default as per schema
      name,
      street,
      city,
      state,
      postalCode,
      country: 'India', // Hardcode for now
      isDefault: isDefault === 'true' || existingAddresses === 0
    });

    await address.save();
    console.log('Address Saved:', address._id);
    res.json({ success: true });
  } catch (error) {
    console.error('Add Address Error:', error);
    res.status(500).json({ success: false, message: 'Failed to add address' });
  }
};
//----------------------------------------------------------------------------------------------------
export const editAddress = async (req, res) => {
  try {
    const addressId = req.params.addressId;
    const { name, street, city, state, postalCode, isDefault } = req.body;
    console.log('Edit Address Request:', { addressId, name, street, city, state, postalCode, isDefault, userId: req.user.id });

    if (isDefault === 'true') {
      await Address.updateMany({ userId: req.user.id, isDefault: true }, { isDefault: false });
    }

    const address = await Address.findOneAndUpdate(
      { _id: addressId, userId: req.user.id },
      { 
        name, 
        street, 
        city, 
        state, 
        postalCode,
        country: 'India', 
        isDefault: isDefault === 'true' 
      },
      { new: true }
    );

    if (!address) return res.json({ success: false, message: 'Address not found' });
    console.log('Address Updated:', address._id);
    res.json({ success: true });
  } catch (error) {
    console.error('Edit Address Error:', error);
    res.status(500).json({ success: false, message: 'Failed to edit address' });
  }
};
//-------------------------------------------------------------------------
export const getOrderSuccess = async (req, res) => {
  try {
    const { orderId } = req.query; // Get orderId from query param
    const order = await Order.findOne({ orderId, userId: req.user.id });
    if (!order) {
      return res.status(404).send('Order not found');
    }
    res.render('user/order-success', { order }); // Render your EJS
  } catch (error) {
    console.error('Order Success Error:', error);
    res.status(500).send('Server Error');
  }
};

export const getOrderfailure = async (req, res) => {
  try {
    const { orderId } = req.query; // Get orderId from query param
    const order = await Order.findOne({ orderId, userId: req.user.id });
    if (!order) {
      return res.status(404).send('Order not found');
    }
    res.render('user/order-failure', { order }); // Render your EJS
  } catch (error) {
    console.error('Order failure Error:', error);
    res.status(500).send('Server Error');
  }
};

// Create Razorpay Order
export const createRazorpayOrder = async (req, res) => {
  try {
    const { orderId } = req.body;
    const order = await Order.findOne({ orderId, userId: req.user.id });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });


    const amountInPaise = Math.round(order.total * 100); // Convert to paise and round to integer
    console.log('Order Total:', order.total, 'Amount in Paise:', amountInPaise);

    const options = {
      amount: amountInPaise,
      currency: 'INR',
      receipt: orderId,
    };

    const razorpayOrder = await razorpay.orders.create(options);
    res.json({
      success: true,
      orderId: razorpayOrder.id,
      amount: options.amount,
      currency: options.currency,
    });
  } catch (error) {
    console.error('Create Razorpay Order Error:', error);
    res.status(500).json({ success: false, message: 'Failed to create payment order' });
  }
};

// Verify Razorpay Payment
export const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body;
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(razorpay_order_id + '|' + razorpay_payment_id)
      .digest('hex');

    const order = await Order.findOne({ orderId, userId: req.user.id });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    if (generatedSignature === razorpay_signature) {
      order.paymentMethod = 'Razorpay';
      order.status = 'Confirmed';
      order.paymentId = razorpay_payment_id;
      if (!order.expectedDelivery) {
        const expectedDate = new Date();
        expectedDate.setDate(expectedDate.getDate() + 7);
        order.expectedDelivery = expectedDate;
      }

      // Decrease stock
      for (const item of order.items) {
        const product = await Product.findById(item.productId);
        if (product.stock < item.quantity) {
          return res.status(400).json({ success: false, message: `Insufficient stock for ${product.name}` });
        }
        product.stock -= item.quantity;
        await product.save();
      }

      await order.save();
      await Cart.deleteMany({ userId: req.user.id });
      res.json({ success: true, redirect: '/users/order-success', orderId });
    } else {
      res.json({ success: false, redirect: '/users/order-failure', orderId });
    }
  } catch (error) {
    console.error('Verify Payment Error:', error);
    res.status(500).json({ success: false, message: 'Payment verification failed' });
  }
};

//-------------------------------------------------
export const confirmPayment = async (req, res) => {
  try {
    const { orderId, paymentMethod } = req.body;
    console.log('Confirm Payment Request:', { orderId, paymentMethod, userId: req.user.id });

    const order = await Order.findOne({ 
      orderId, 
      userId: req.user.id 
    }).populate('items.productId');
    
    if (!order) {
      console.log('Order not found for:', { orderId, userId: req.user.id });
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    console.log('Found order:', { orderId: order.orderId, status: order.status });

    if (paymentMethod === 'COD') {
      order.paymentMethod = 'COD';
      order.status = 'Confirmed';
      if (!order.expectedDelivery) {
        const expectedDate = new Date();
        expectedDate.setDate(expectedDate.getDate() + 7);
        order.expectedDelivery = expectedDate;
      }

      // Decrease stock
      for (const item of order.items) {
        const product = item.productId;
        if (product.stock < item.quantity) {
          return res.status(400).json({ success: false, message: `Insufficient stock for ${product.name}` });
        }
        product.stock -= item.quantity;
        await product.save();
      }

      await order.save();
      await Cart.deleteMany({ userId: req.user.id });
      console.log('Payment Confirmed & Cart Cleared:', orderId);
      res.json({ success: true, redirect: '/users/order-success', orderId });
    } else if (paymentMethod === 'Razorpay') {
      // Initialize Razorpay order (mock for now)
      order.paymentMethod = 'Razorpay';
      order.status = 'Confirmed'; // Keep Pending until payment verified
      await order.save();
      res.json({ 
        success: true, 
        message: 'Proceed with Razorpay payment',
        razorpayOrderId: `rzp_${order._id}`,
        amount: order.total * 100 // Razorpay expects paise
      });
    } else {
      return res.status(400).json({ success: false, message: `${paymentMethod} not implemented yet` });
    }
  } catch (error) {
    console.error('Confirm Payment Error:', error);
    res.status(500).json({ success: false, message: 'Failed to confirm payment' });
  }
};
//----------------------------------------------
