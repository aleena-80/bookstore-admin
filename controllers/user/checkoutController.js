import  Address from  '../../models/Address.js';
import Cart from '../../models/Carts.js';
import Wishlist from '../../models/Wishlist.js';
import  Order from '../../models/Order.js';
import  Product from'../../models/Product.js';
import Coupon from '../../models/Coupon.js'

//import { generateOrderId } from '../../utils/orderUtils'; 

export const getCheckout = async (req, res) => {
  try {
    if (!req.user) return res.redirect('/users/login');

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
          total: '0.00',
          error: 'Invalid or unauthorized order'
        });
      }
      const directProduct = order.items[0].productId;
      return res.render('user/checkout', {
        user: req.user,
        cartItems: [],
        directProduct,
        order,
        addresses: await Address.find({ userId: req.user._id }),
        wishlistCount: await Wishlist.countDocuments({ userId: req.user._id }),
        cartCount: 1, // Single item for Buy Now
        subtotal: order.subtotal ? order.subtotal.toFixed(2) : '0.00',
        taxes: order.taxes ? order.taxes.toFixed(2) : '0.00',
        shipping: order.shipping ? order.shipping.toFixed(2) : '0.00',
        total: order.total ? order.total.toFixed(2) : '0.00'
      });
    }

    const cartItems = await Cart.find({ userId: req.user._id }).populate('productId');
    const addresses = await Address.find({ userId: req.user._id });
    const wishlistCount = await Wishlist.countDocuments({ userId: req.user._id });
    const cartCount = cartItems.length;

    const subtotal = cartItems.reduce((sum, item) => sum + item.productId.price * item.quantity * (1 - (item.productId.discount || 0) / 100), 0);
    const taxes = subtotal * 0.05;
    const shipping = 100;
    const total = subtotal + taxes + shipping;

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
      error: 'Failed to load checkout' 
    });
  }
};
//-----------------------------------------------------------------------------------------------------
export const initiateOrder = async (req, res) => {
  try {
    const { addressId } = req.body;
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
    const total = subtotal + taxes + shipping;

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
      status: 'Pending',
      orderId: `ORD${Date.now()}`,
      createdAt: new Date()
    });

    await order.save();
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
    res.render('user/payment', { order, user: req.user });
  } catch (error) {
    console.error('Get Payment Page Error:', error);
    res.status(500).send('Failed to load payment page');
  }
};
//----------------------------------------------------------------------------------------------
export const confirmPayment = async (req, res) => {
  try {
    const { orderId, paymentMethod } = req.body;
    const order = await Order.findOne({ orderId, userId: req.user.id }).populate('items.productId');
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    if (order.status !== 'Pending') {
      return res.status(400).json({ success: false, message: 'Order already processed' });
    }

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
    } else {
      return res.status(400).json({ success: false, message: `${paymentMethod} not implemented yet` });
    }

    await order.save();
    await Cart.deleteMany({ userId: req.user.id });
    console.log('Payment Confirmed & Cart Cleared:', orderId);

    res.json({ success: true, redirect: '/users/order-success', orderId });
  } catch (error) {
    console.error('Confirm Payment Error:', error);
    res.status(500).json({ success: false, message: 'Failed to confirm payment' });
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