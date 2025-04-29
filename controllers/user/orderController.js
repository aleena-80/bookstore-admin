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

    console.log('Order Address:', order.address);
    res.render('user/order-details', { order, wishlistCount, cartCount, user: req.user , });
  } catch (error) {
    console.error('Get Order Details Error:', error);
    res.status(500).send('Server Error');
  }
};
//----------------------------------------------------------------------------------------------

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

    // Increase stock on return
    for (const item of order.items) {
      const product = item.productId;
      product.stock += item.quantity;
      await product.save();
    }

    await order.save();
    console.log('Return Requested:', order.orderId, 'Reason:', reason);
    res.json({ success: true, message: 'Return requested successfully' });
  } catch (error) {
    console.error('Request Return Error:', error);
    res.status(500).json({ success: false, message: 'Failed to request return' });
  }
};

export const cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;
    console.log('Cancel Order Attempt:', { orderId, userId: req.user.id, reason });

    const order = await Order.findById(orderId).populate('items.productId');
    if (!order || order.userId.toString() !== req.user.id) {
      console.log('Order not found or unauthorized:', { orderId, userId: req.user.id });
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    console.log('Order Details:', {
      orderId: order.orderId,
      status: order.status,
      paymentMethod: order.paymentMethod,
      paymentId: order.paymentId,
      total: order.total
    });

    if (order.status === 'Cancelled') {
      console.log('Order already cancelled:', order.orderId);
      return res.json({ success: false, message: 'Order already cancelled' });
    }
    if (order.status === 'Delivered' || order.status === 'Returned') {
      console.log('Cannot cancel order:', { orderId: order.orderId, status: order.status });
      return res.json({ success: false, message: 'Cannot cancel delivered or returned order' });
    }

    order.status = 'Cancelled';
    order.cancelReason = reason;

    if (['Razorpay', 'Wallet'].includes(order.paymentMethod)) {
      let wallet = await Wallet.findOne({ userId: req.user.id });
      if (!wallet) {
        console.log(`Creating new wallet for user ${req.user.id}`);
        wallet = new Wallet({ userId: req.user.id, balance: 0, transactions: [] });
      }
      console.log('Before refund:', { walletBalance: wallet.balance, refundAmount: order.total });
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
      console.log('After refund:', { walletBalance: wallet.balance, newTransaction: transaction.transactionId });
      // Sync User.wallet with Wallet.balance
      const userUpdate = await User.findByIdAndUpdate(req.user.id, { wallet: wallet.balance }, { new: true });
      console.log(`Synced User.wallet for user ${req.user.id}: ₹${userUpdate.wallet}`);
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
      console.log(`Restored stock for product ${product._id}: +${item.quantity}`);
    }

    await order.save();
    console.log('Order Cancelled:', order.orderId, 'Reason:', reason);
    res.json({ success: true, message: 'Order cancelled successfully' });
  } catch (error) {
    console.error('Cancel Order Error:', error);
    res.status(500).json({ success: false, message: 'Failed to cancel order' });
  }
};

// export const cancelOrder = async (req, res) => {
//   try {
//     const { orderId } = req.params;
//     const { reason } = req.body;
//     console.log('Cancel Order Attempt:', { orderId, userId: req.user.id, reason });

//     const order = await Order.findById(orderId).populate('items.productId');
//     if (!order || order.userId.toString() !== req.user.id) {
//       console.log('Order not found or unauthorized:', { orderId, userId: req.user.id });
//       return res.status(404).json({ success: false, message: 'Order not found' });
//     }
//     console.log('Order Details:', {
//       orderId: order.orderId,
//       status: order.status,
//       paymentMethod: order.paymentMethod,
//       paymentId: order.paymentId,
//       total: order.total
//     });

//     if (order.status === 'Cancelled') {
//       console.log('Order already cancelled:', order.orderId);
//       return res.json({ success: false, message: 'Order already cancelled' });
//     }
//     if (order.status === 'Delivered' || order.status === 'Returned') {
//       console.log('Cannot cancel order:', { orderId: order.orderId, status: order.status });
//       return res.json({ success: false, message: 'Cannot cancel delivered or returned order' });
//     }

//     order.status = 'Cancelled';
//     order.cancelReason = reason;

//     if (order.paymentMethod === 'Razorpay' && order.paymentId) {
//       let wallet = await Wallet.findOne({ userId: req.user.id });
//       if (!wallet) {
//         wallet = new Wallet({ userId: req.user.id, balance: 0, transactions: [] });
//       }
//       console.log('Before refund:', { walletBalance: wallet.balance, refundAmount: order.total });
//       wallet.balance += order.total;
//       wallet.transactions.push({
//         transactionId: `TXN${Date.now()}`,
//         type: 'credit',
//         amount: order.total,
//         source: { type: 'refund', orderId: order._id },
//         date: new Date()
//       });
//       await wallet.save();
//       console.log('After refund:', { walletBalance: wallet.balance });
//       console.log(`Refunded ₹${order.total} to wallet for Razorpay order ${order.orderId}`);
//     } else {
//       console.log('No refund processed:', {
//         paymentMethod: order.paymentMethod,
//         paymentId: order.paymentId
//       });
//     }

//     // Increase stock on cancellation
//     for (const item of order.items) {
//       const product = item.productId;
//       product.stock += item.quantity;
//       await product.save();
//     }

//     await order.save();
//     console.log('Order Cancelled:', order.orderId, 'Reason:', reason);
//     res.json({ success: true, message: 'Order cancelled successfully' });
//   } catch (error) {
//     console.error('Cancel Order Error:', error);
//     res.status(500).json({ success: false, message: 'Failed to cancel order' });
//   }
// };
