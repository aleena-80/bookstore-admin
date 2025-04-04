import Order from '../../models/Order.js';
import  Product from '../../models/Product.js';
import Address from '../../models/Address.js';  
import Wishlist from '../../models/Wishlist.js'
import Wallet from '../../models/Wallet.js';
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
    console.log('Order Address:', order.address);
    res.render('user/order-details', { order, wishlistCount, cartCount, user: req.user });
  } catch (error) {
    console.error('Get Order Details Error:', error);
    res.status(500).send('Server Error');
  }
};
//----------------------------------------------------------------------------------------------
export const returnOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;
    const order = await Order.findOne({ orderId }).populate('items.productId');
    if (order.status === 'Delivered' && reason) {
      order.status = 'Returned';
      order.returnReason = reason;
      let wallet = await Wallet.findOne({ userId: req.user._id });
      if (!wallet) wallet = new Wallet({ userId: req.user._id, balance: 0 });
      wallet.balance += order.totalAmount; // Adjust to your field name
      await wallet.save();
      await order.save();

      // Increase stock on return
      for (const item of order.items) {
        const product = item.productId;
        product.stock += item.quantity;
        await product.save();
      }

      await order.save();
    }
    res.redirect('/users/orders');
  } catch (error) {
    console.error('Return Order Error:', error);
    res.status(500).send('Error processing return');
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
    const orders = await Order.find({ userId: req.user.id })
      .populate('items.productId');
    const wishlistCount = await Wishlist.countDocuments({ userId: req.user.id });
    const cartCount = await Cart.countDocuments({ userId: req.user.id });
    res.render('user/orders', { orders, wishlistCount, cartCount, user: req.user });
  } catch (error) {
    console.error('Get Orders Error:', error);
    res.status(500).send('Server Error');
  }
};
//----------------------------------------------------------------------------------------------------------
export const cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;
    const order = await Order.findById(orderId).populate('items.productId');
    if (!order || order.userId.toString() !== req.user.id) {
      return res.json({ success: false, message: 'Order not found' });
    }
    if (order.status === 'Cancelled') {
      return res.json({ success: false, message: 'Order already cancelled' });
    }
    if (order.status === 'Delivered' || order.status === 'Returned') {
      return res.json({ success: false, message: 'Cannot cancel delivered or returned order' });
    }

    order.status = 'Cancelled';
    order.cancelReason = reason;

    // Increase stock on cancellation
    for (const item of order.items) {
      const product = item.productId;
      product.stock += item.quantity;
      await product.save();
    }

    await order.save();
    console.log('Order Cancelled:', orderId, 'Reason:', reason);
    res.json({ success: true, message: 'Order cancelled successfully' });
  } catch (error) {
    console.error('Cancel Order Error:', error);
    res.status(500).json({ success: false, message: 'Failed to cancel order' });
  }
};
//------------------------------------------------------------------------------------------------
export const requestReturn = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body; // Reason is optional now
    const order = await Order.findById(orderId);
    if (!order || order.userId.toString() !== req.user.id) {
      return res.json({ success: false, message: 'Order not found' });
    }
    if (order.status !== 'Delivered' || order.returnRequest) {
      return res.json({ success: false, message: 'Cannot request return' });
    }

    order.returnRequest = true;
    order.returnReason = reason || 'No reason provided'; // Default if empty
    await order.save();
    res.json({ success: true });
  } catch (error) {
    console.error('Request Return Error:', error);
    res.json({ success: false, message: 'Failed to request return' });
  }
};
//------------------------------------------------------------------------------------------------
export const getOrderView = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findById(orderId)
      .populate('items.productId', 'name price images discount')

      console.log('Full order data:', JSON.stringify(order, null, 2));

    if (!order || order.userId.toString() !== req.user.id) {
      return res.status(404).send('Order not found');
    }
    console.log('Order Address:', order.address); 
    res.render('user/order-view', { order, user: req.user });
  } catch (error) {
    console.error('Get Order View Error:', error);
    res.status(500).send('Failed to load order details');
  }
};
//---------------------------------------------------------------------------