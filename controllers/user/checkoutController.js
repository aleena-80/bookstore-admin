import  Address from  '../../models/Address.js';
import Cart from '../../models/Carts.js';
import Wishlist from '../../models/Wishlist.js';
import  Order from '../../models/Order.js';
import Wallet from '../../models/Wallets.js';
import  Product from'../../models/Product.js';
import User from '../../models/User.js';
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
    let appliedCoupon = req.query.couponCode ? { code: req.query.couponCode, discount: 0 } : null;
    console.log('Get Checkout Coupon:', { couponCode: req.query.couponCode, userId: req.user._id });

    let order = null;
    if (req.query.orderId) {
      order = await Order.findById(req.query.orderId).populate('items.productId');
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
      let subtotal = order.subtotal || 0;
      let total = order.total || 0;
      if (order.couponCode) {
        const coupon = await Coupon.findOne({ 
          code: order.couponCode, 
          isActive: true, 
          userId: req.user._id, 
          expiryDate: { $gte: new Date() }
        });
        if (coupon) {
          appliedCoupon = { code: coupon.code, discount: coupon.discount };
          total = subtotal + (subtotal * 0.05) + 100 - (subtotal * coupon.discount / 100);
        }
      }
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

    if (req.query.couponCode) {
      const coupon = await Coupon.findOne({ 
        code: req.query.couponCode, 
        isActive: true, 
        expiryDate: { $gte: new Date() }
      });
      console.log('Coupon Check in getCheckout:', coupon ? { 
        code: coupon.code, 
        discount: coupon.discount, 
        userId: coupon.userId?.toString(), 
        isActive: coupon.isActive, 
        isListed: coupon.isListed, 
        expiryDate: coupon.expiryDate 
      } : 'None');
      if (coupon) {
        appliedCoupon = { code: coupon.code, discount: coupon.discount };
        total -= subtotal * (coupon.discount / 100);
      } else {
        appliedCoupon = null;
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
        cartCount,
        appliedCoupon,
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
      appliedCoupon: null,
      error: 'Failed to load checkout' 
    });
  }
};
//-----------------------------------------------------------------------------------------------------
export const initiateOrder = async (req, res) => {
  try {
    const { addressId, couponCode } = req.body;
    const userId = req.user.id;
    console.log('Initiate Order Request:', { addressId, couponCode, userId });

    if (!addressId) return res.json({ success: false, message: 'Address is required' });
    const cartItems = await Cart.find({ userId }).populate('productId');
    if (!cartItems.length) return res.json({ success: false, message: 'Cart is empty' });

    const address = await Address.findOne({ _id: addressId, userId });
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

    let appliedCoupon = null;
    let couponDiscount = 0;
    if (couponCode) {
      console.log('Checking Coupon:', { couponCode, userId });
      const coupon = await Coupon.findOne({ 
        code: couponCode, 
        isActive: true, 
        expiryDate: { $gte: new Date() }
      });
      console.log('Coupon Found:', coupon ? { 
        code: coupon.code, 
        discount: coupon.discount, 
        userId: coupon.userId?.toString(), 
        isActive: coupon.isActive, 
        isListed: coupon.isListed, 
        expiryDate: coupon.expiryDate 
      } : 'None');
      if (!coupon) return res.json({ success: false, message: 'Invalid or expired coupon' });
      appliedCoupon = coupon.code;
      couponDiscount = coupon.discount;
    }

    const discountAmount = (subtotal * couponDiscount) / 100;
    const total = Math.round(subtotal + taxes + shipping - discountAmount);

    const order = new Order({
      userId,
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
      couponCode: appliedCoupon,
      couponDiscount,
      total,
      paymentMethod: 'Pending',
      status: 'Confirmed',
      orderId: `ORD${Date.now()}`,
      createdAt: new Date()
    });

    await order.save();
    await Cart.deleteMany({ userId });
    await Cart.findOneAndUpdate({ userId }, { items: [] });

    console.log('Order Initiated:', { orderId: order.orderId, total, couponCode: appliedCoupon, couponDiscount });
    res.json({ success: true, orderId: order.orderId, total, couponCode: appliedCoupon, couponDiscount });
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
export const getPaymentPageReturn = async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId).populate('items.productId');
    if (!order || order.userId.toString() !== req.user.id) {
      console.log('Order not found or unauthorized:', { orderId: req.params.orderId, userId: req.user.id });
      return res.status(404).render('user/error', { message: 'Order not found or unauthorized' });
    }
    if (order.status !== 'Confirmed' || order.expectedDelivery || order.paymentCompleted) {
      console.log('Invalid order for retry payment:', { orderId: order.orderId, status: order.status });
      return res.status(400).render('user/error', { message: 'Order not eligible for retry payment' });
    }
    console.log('Rendering payment page:', { orderId: order.orderId, total: order.total });
    res.render('user/payment', {
      order,
      user: req.user,
      razorpayKeyId: process.env.RAZORPAY_KEY_ID
    });
  } catch (error) {
    console.error('Get Payment Page Error:', error);
    res.status(500).render('user/error', { message: 'Failed to load payment page' });
  }
};
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
    const { orderId, paymentMethod, userId: bodyUserId } = req.body;
    const userId = req.user?.id || bodyUserId;

    console.log('Confirm Payment Attempt:', {
      orderId,
      paymentMethod,
      userId,
      bodyUserId,
      authSource: req.user?.id ? 'JWT' : 'Body'
    });

    // Validate input
    if (!orderId || !paymentMethod) {
      console.log('Missing orderId or paymentMethod:', { orderId, paymentMethod });
      return res.status(400).json({ success: false, message: 'Order ID and payment method are required' });
    }
    // Find order
    const order = await Order.findOne({ orderId, userId }).populate('items.productId');
    if (!order) {
      console.log('Order not found:', { orderId, userId });
      return res.status(404).json({ success: false, message: 'Order not found or does not belong to user' });
    }

    console.log('Order Details:', {
      orderId: order.orderId,
      status: order.status,
      total: order.total,
      paymentCompleted: order.paymentCompleted,
      paymentMethod: order.paymentMethod
    });

    // Check if order is eligible for payment
    if (order.paymentCompleted) {
      console.log('Order already paid:', { orderId });
      return res.status(400).json({ success: false, message: 'Order already paid' });
    }
    if (order.status !== 'Confirmed') {
      console.log('Order not eligible for payment:', { orderId, status: order.status });
      return res.status(400).json({ success: false, message: 'Order not eligible for payment' });
    }

    if (paymentMethod === 'Wallet') {
      let wallet = await Wallet.findOne({ userId });
      if (!wallet) {
        console.log('Wallet not found, creating new:', { userId });
        wallet = new Wallet({ userId,balance: 0, transactions: [] });
        await wallet.save();
      }
      if (wallet.balance < order.total) {
        console.log('Insufficient balance:', { balance: wallet.balance, required: order.total });
        return res.status(400).json({ success: false, message: `Insufficient wallet balance. Required: ₹${order.total}, Available: ₹${wallet.balance}` });
      }

      // Deduct balance and add transaction
      wallet.balance -= order.total;
      wallet.transactions.push({
        transactionId: `TXN${Date.now()}`,
        type: 'debit',
        amount: order.total,
        paymentMethod: 'Wallet',
        source: { type: 'order', orderId: order._id },
        date: new Date()
      });
      await wallet.save();

      // Sync User.wallet
      await User.findByIdAndUpdate(userId, { wallet: wallet.balance });

      console.log('Wallet payment successful:', {
        orderId,
        newBalance: wallet.balance,
        transactionId: wallet.transactions.slice(-1)[0].transactionId
      });

      // Update order
      order.paymentId = `WALLET${Date.now()}`;
      order.paymentMethod = 'Wallet';
      order.paymentCompleted = true;
      order.expectedDelivery = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await order.save();

      console.log('Order updated:', {
        orderId,
        paymentCompleted: order.paymentCompleted,
        paymentMethod: order.paymentMethod
      });

      return res.json({
        success: true,
        redirect: '/users/order-success',
        orderId: order.orderId
      });
    } else if (paymentMethod === 'COD') {
      order.paymentMethod = 'COD';
      order.paymentCompleted = true;
      order.expectedDelivery = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await order.save();
      console.log('COD payment successful:', { orderId });
      return res.json({
        success: true,
        redirect: '/users/order-success',
        orderId: order.orderId
      });
    } else if (paymentMethod === 'Razorpay') {
      console.log('Initiating Razorpay payment:', { orderId });
      return res.json({ success: true, message: 'Proceed with Razorpay' });
    } else {
      console.log('Invalid payment method:', paymentMethod);
      return res.status(400).json({ success: false, message: 'Invalid payment method' });
    }
  } catch (error) {
    console.error('Confirm Payment Error:', {
      message: error.message,
      stack: error.stack,
      orderId: req.body.orderId,
      userId: req.body.userId || req.user?.id,
      paymentMethod: req.body.paymentMethod
    });
    return res.status(500).json({
      success: false,
      message: 'Failed to confirm payment',
      error: error.message
    });
  }
};
//----------------------------------------------


export const retryPayment = async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order || order.status !== 'Confirmed' || order.expectedDelivery || order.paymentCompleted) {
      console.log('Invalid order for retry payment:', {
        orderId: req.params.orderId,
        exists: !!order,
        status: order?.status,
        expectedDelivery: order?.expectedDelivery,
        paymentCompleted: order?.paymentCompleted
      });
      return res.status(400).json({ success: false, message: 'Invalid order for payment retry' });
    }

    console.log('Retry Payment Order Details:', {
      orderId: order.orderId,
      total: order.total,
      receipt: order.orderId
    });

    // Validate Razorpay request data
    const amount = Math.round(order.total * 100);
    if (!Number.isInteger(amount) || amount <= 0) {
      console.log('Invalid Razorpay amount:', { total: order.total, amount });
      return res.status(400).json({ success: false, message: 'Invalid order amount for payment' });
    }
    if (!order.orderId || typeof order.orderId !== 'string' || order.orderId.length > 40) {
      console.log('Invalid Razorpay receipt:', { orderId: order.orderId });
      return res.status(400).json({ success: false, message: 'Invalid order ID for payment' });
    }

    // Create Razorpay order
    const paymentSession = await razorpay.orders.create({
      amount,
      currency: 'INR',
      receipt: order.orderId,
      notes: { orderId: order.orderId }
    });

    console.log('Razorpay Order Created:', {
      razorpayOrderId: paymentSession.id,
      amount: paymentSession.amount,
      receipt: paymentSession.receipt
    });

    // Update order with Razorpay order_id
    order.paymentId = paymentSession.id;
    await order.save();

    // Redirect to payment page
    return res.json({ success: true, redirectUrl: `/users/orders/payment/${req.params.orderId}` });
  } catch (error) {
    console.error('Retry Payment Error:', {
      message: error.message,
      statusCode: error.statusCode,
      errorCode: error.error?.code,
      description: error.error?.description,
      metadata: error.error?.metadata,
      orderId: req.params.orderId
    });
    return res.status(500).json({ success: false, message: 'Server error during payment retry', error: error.error?.description || error.message });
  }
};

// POST /payment/callback
export const handlePaymentCallback = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    // Verify payment signature
    const crypto = require('crypto');
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Invalid payment signature' });
    }

    // Find order by paymentId
    const order = await Order.findOne({ paymentId: razorpay_order_id });
    if (!order) {
      return res.status(400).json({ success: false, message: 'Order not found' });
    }

    order.paymentId = razorpay_payment_id;
    order.paymentCompleted = true; // Hide "Retry Payment" button
    order.expectedDelivery = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
    await order.save();

    return res.json({ success: true, redirectUrl: '/users/orders' });
  } catch (error) {
    console.error('Payment Callback Error:', error);
    return res.status(500).json({ success: false, message: 'Error processing payment callback' });
  }
};