import Order from '../../models/Order.js';
import  Product from '../../models/Product.js';
import Address from '../../models/Address.js';  
import User from '../../models/User.js';
import Wishlist from '../../models/Wishlist.js'
import Wallet from '../../models/Wallets.js';
import Cart from '../../models/Carts.js'
import  PDFDocument from 'pdfkit';
import fs from 'fs';


export const searchOrders = async (req, res) => {
  const { query } = req.query;
  const orders = await Order.find({ userId: req.user.id, orderId: { $regex: query, $options: 'i' } }).sort({ createdAt: -1 });
  res.render('user/orders', { orders, user: req.user });
};
//-------------------------------------------------------------------------
export const getOrderDetail = async (req, res) => {
  try {

    const order = await Order.findById(req.params.id)
      .populate('items.productId');
    if (!order || order.userId.toString() !== req.user.id) {
      return res.status(404).send('Order not found');
    }
    const wishlistCount = await Wishlist.countDocuments({ userId: req.user.id });
    const cartCount = await Cart.countDocuments({ userId: req.user.id });

    res.render('user/order-details', { order, wishlistCount, cartCount, user: req.user , });
  } catch (error) {
    console.error('Get Order Details Error:', error);
    res.status(500).send('Server Error');
  }
};
//-------------------------------------------------------------------------------------------------
export const downloadInvoice = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('items.productId');
    if (!order || order.userId.toString() !== req.user.id) {
      return res.status(404).send('Order not found');
    }
    res.render('user/invoice', { order, user: req.user });
  } catch (error) {
    console.error('Invoice Error:', error);
    res.status(500).send('Error generating invoice');
  }
};
//------------------------------------------------------------------------------------------------
export const getOrders = async (req, res) => {
  try {
    const userId = req.user._id;
    const page = parseInt(req.query.page) || 1;
    const limit = 5; // Orders per page
    const skip = (page - 1) * limit;

    const totalOrders = await Order.countDocuments({ userId });
    const totalPages = Math.ceil(totalOrders / limit);
      const orders = await Order.find({ userId: req.user.id }).sort({ createdAt: -1 })
      .populate('items.productId')
      .skip(skip)
      .limit(limit);

    const wishlistCount = await Wishlist.countDocuments({ userId: req.user.id });
    const cartCount = await Cart.countDocuments({ userId: req.user.id });

    if (req.headers['x-requested-with'] === 'XMLHttpRequest') {
      res.json({ orders, totalPages, page });
    } else {
      res.render('user/orders', {
        orders,
        user: req.user,
        wishlistCount,
        cartCount,
        page,
        totalPages
      });
    }
  } catch (error) {
    console.error('Get Orders Error:', error);
    if (req.headers['x-requested-with'] === 'XMLHttpRequest') {
      res.status(500).json({ error: 'Failed to load orders' });
    } else {
      res.render('user/orders', {
        orders: [],
        user: req.user,
        wishlistCount: 0,
        cartCount: 0,
        page: 1,
        totalPages: 1,
        error: 'Failed to load orders'
      });
    }
  }
};

//------------------------------------------------------------------------------------------------
export const getOrderView = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findById(orderId)
      .populate('items.productId', 'name price images discount')

    if (!order || order.userId.toString() !== req.user.id) {
      return res.status(404).send('Order not found');
    }
    res.render('user/order-view', { order, user: req.user });
  } catch (error) {
    console.error('Get Order View Error:', error);
    res.status(500).send('Failed to load order details');
  }
};
//---------------------------------------------------------------------------
export const requestReturn = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;
    const order = await Order.findById(orderId).populate('items.productId');
    if (!order || order.userId.toString() !== req.user.id) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    if (order.status !== 'Delivered' || order.returnRequest) {
      return res.json({ success: false, message: 'Cannot request return' });
    }

    order.returnRequest = true;
    order.returnReason = reason || 'No reason provided';

    for (const item of order.items) {
      const product = item.productId;
      product.stock += item.quantity;
      await product.save();
    }

    await order.save();
    res.json({ success: true, message: 'Return requested successfully' });
  } catch (error) {
    console.error('Request Return Error:', error);
    res.status(500).json({ success: false, message: 'Failed to request return' });
  }
};
//--------------------------------------------------------------------
export const cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;

    const order = await Order.findById(orderId).populate('items.productId');
    if (!order || order.userId.toString() !== req.user.id) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
   

    if (order.status === 'Cancelled') {
      return res.json({ success: false, message: 'Order already cancelled' });
    }
    if (order.status === 'Delivered' || order.status === 'Returned') {
      return res.json({ success: false, message: 'Cannot cancel delivered or returned order' });
    }

    order.status = 'Cancelled';
    order.cancelReason = reason;

    if (['Razorpay', 'Wallet'].includes(order.paymentMethod)) {
      let wallet = await Wallet.findOne({ userId: req.user.id });
      if (!wallet) {
        wallet = new Wallet({ userId: req.user.id, balance: 0, transactions: [] });
      }
      const previousBalance = wallet.balance;
      wallet.balance += order.total;
      const transaction = {
        transactionId: `TXN${Date.now()}`,
        type: 'credit',
        amount: order.total,
        source: { type: 'cancellation', orderId: order._id },
        date: new Date()
      };
      wallet.transactions.push(transaction);
      await wallet.save();
      // Sync User.wallet with Wallet.balance
      const userUpdate = await User.findByIdAndUpdate(req.user.id, { wallet: wallet.balance }, { new: true });
    } else {
      console.log('No refund processed:', {
        paymentMethod: order.paymentMethod,
        paymentId: order.paymentId
      });
    }

    // Increase stock on cancellation
    for (const item of order.items) {
      const product = item.productId;
      product.stock += item.quantity;
      await product.save();
    }

    await order.save();
    res.json({ success: true, message: 'Order cancelled successfully' });
  } catch (error) {
    console.error('Cancel Order Error:', error);
    res.status(500).json({ success: false, message: 'Failed to cancel order' });
  }
};
