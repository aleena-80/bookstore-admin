import Order from '../../models/Order.js';
import  Product from '../../models/Product.js';
import Address from '../../models/Address.js';  
import Wishlist from '../../models/Wishlist.js'
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
      .populate('items.productId'); // No .populate('address') if embedded
    if (!order || order.userId.toString() !== req.user.id) {
      return res.status(404).send('Order not found');
    }
    const wishlistCount = await Wishlist.countDocuments({ userId: req.user.id });
    const cartCount = await Cart.countDocuments({ userId: req.user.id });
    console.log('Order Address:', order.address); // Debug
    res.render('user/order-details', { order, wishlistCount, cartCount, user: req.user });
  } catch (error) {
    console.error('Get Order Details Error:', error);
    res.status(500).send('Server Error');
  }
};
// export const getOrderDetail = async (req, res) => {
//   try {
//     const order = await Order.findById(req.params.id)
//       .populate('items.productId')
//       .populate('address'); 
//     if (!order || order.userId.toString() !== req.user.id) {
//       return res.status(404).send('Order not found');
//     }
//     const wishlistCount = await Wishlist.countDocuments({ userId: req.user.id });
//     const cartCount = await Cart.countDocuments({ userId: req.user.id });
//     res.render('user/order-details', { order, wishlistCount, cartCount, user: req.user });
//   } catch (error) {
//     console.error('Get Order Details Error:', error);
//     res.status(500).send('Server Error');
//   }
// };
// export const getOrderDetail = async (req, res) => {
//   const { orderId } = req.params;
//   const order = await Order.findOne({ orderId }).populate('items.productId');
//   res.render('user/order-detail', { order, user: req.user });
// };
//----------------------------------------------------------------------------------------------
export const returnOrder = async (req, res) => {
  const { orderId } = req.params;
  const { reason } = req.body;
  const order = await Order.findOne({ orderId });
  if (order.status === 'Delivered' && reason) {
    order.status = 'Returned';
    order.returnReason = reason;
    await order.save();
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.productId, { $inc: { stock: item.quantity } });
    }
  }
  res.redirect('/users/orders');
};
//-------------------------------------------------------------------------------------------------
export const downloadInvoice = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('items.productId', 'name price images discount')
      .populate('address', 'name street city state postalCode phone');
    if (!order || order.userId.toString() !== req.user.id) {
      return res.status(404).send('Order not found');
    }

    // Create PDF
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${order.orderId}.pdf`);
    doc.pipe(res);

    // Header: Ocean Books Logo and Title
    doc.fontSize(28).fillColor('#58CC02').text('Ocean Books', 50, 50);
    doc.fontSize(10).fillColor('black').text('Dive into a Sea of Stories', 50, 80);
    doc.fontSize(20).fillColor('#58CC02').text('INVOICE', 50, 100);

    // Order Info
    doc.fontSize(12).fillColor('black');
    doc.text(`Order ID: ${order.orderId}`, 50, 140);
    doc.text(`Date: ${new Date(order.createdAt).toLocaleString()}`, 50, 155);
    doc.text(`Customer: ${req.user.name || 'N/A'}`, 50, 170);
    doc.text(`Payment Method: ${order.paymentMethod || 'N/A'}`, 50, 185);
    doc.text(`Status: ${order.status}`, 50, 200);
    const addressText = order.address 
      ? `${order.address.name || 'N/A'}, ${order.address.street || 'N/A'}, ${order.address.city || 'N/A'}, ${order.address.state || 'N/A'} - ${order.address.postalCode || 'N/A'} | Phone: ${order.address.phone || 'N/A'}`
      : 'Address not available';
    doc.text(`Address: ${addressText}`, 50, 215, { width: 450 });

    // Order Details Table
    doc.fontSize(14).fillColor('#58CC02').text('Order Details', 50, 260);
    const tableTop = 280;
    const colWidths = [250, 70, 100, 100]; // Product, Qty, Status, Price
    const colPositions = [50, 300, 370, 470];
    const tableWidth = 510; // Full width minus margins

    // Table Header
    doc.fontSize(12).font('Helvetica-Bold').fillColor('black');
    doc.rect(50, tableTop - 5, tableWidth, 20).fill('#58CC02').fillColor('white');
    doc.text('Product', colPositions[0] + 5, tableTop, { width: colWidths[0] - 10 });
    doc.text('Quantity', colPositions[1] + 5, tableTop, { width: colWidths[1] - 10, align: 'center' });
    doc.text('Status', colPositions[2] + 5, tableTop, { width: colWidths[2] - 10, align: 'center' });
    doc.text('Price', colPositions[3] + 5, tableTop, { width: colWidths[3] - 10, align: 'right' });

    // Table Rows
    doc.font('Helvetica').fillColor('black');
    let y = tableTop + 20;
    order.items.forEach(item => {
      doc.rect(50, y - 5, tableWidth, 20).strokeColor('#58CC02').stroke();
      doc.text(item.productId.name.slice(0, 35) + (item.productId.name.length > 35 ? '...' : ''), colPositions[0] + 5, y, { width: colWidths[0] - 10 });
      doc.text(item.quantity.toString(), colPositions[1] + 5, y, { width: colWidths[1] - 10, align: 'center' });
      doc.text(order.status, colPositions[2] + 5, y, { width: colWidths[2] - 10, align: 'center' });
      doc.text(`₹${(item.price * (1 - (item.discount || 0) / 100)).toFixed(2)}`, colPositions[3] + 5, y, { width: colWidths[3] - 10, align: 'right' });
      y += 20;
    });
    doc.rect(50, y - 5, tableWidth, 5).fill('#58CC02'); // Bottom border

    // Order Summary Table
    const summaryTop = y + 20;
    doc.fontSize(14).fillColor('#58CC02').text('Order Summary', 50, summaryTop);
    const summaryTableTop = summaryTop + 20;
    const summaryColWidths = [150, 100];
    const summaryColPositions = [390, 440]; // Right-aligned table
    const summaryTableWidth = summaryColWidths.reduce((sum, w) => sum + w, 0);

    // Summary Table
    doc.fontSize(12).fillColor('black');
    doc.rect(390, summaryTableTop - 5, summaryTableWidth, 95).strokeColor('#58CC02').stroke(); // Full table border
    y = summaryTableTop;

    // Total Amount
    doc.font('Helvetica-Bold');
    doc.text('Total Amount:', summaryColPositions[0] + 5, y, { width: summaryColWidths[0] - 10 });
    doc.font('Helvetica');
    doc.text(`₹${order.total.toFixed(2)}`, summaryColPositions[1] + 5, y, { width: summaryColWidths[1] - 10, align: 'right' });
    y += 20;
    doc.moveTo(390, y - 5).lineTo(540, y - 5).strokeColor('#58CC02').stroke();

    // Discount
    doc.font('Helvetica-Bold');
    doc.text('Discount:', summaryColPositions[0] + 5, y, { width: summaryColWidths[0] - 10 });
    doc.font('Helvetica');
    const totalDiscount = order.items.reduce((sum, item) => sum + (item.price * item.quantity * (item.discount || 0) / 100), 0);
    doc.text(`₹${totalDiscount.toFixed(2)}`, summaryColPositions[1] + 5, y, { width: summaryColWidths[1] - 10, align: 'right' });
    y += 20;
    doc.moveTo(390, y - 5).lineTo(540, y - 5).strokeColor('#58CC02').stroke();

    // Coupon Applied
    doc.font('Helvetica-Bold');
    doc.text('Coupon Applied:', summaryColPositions[0] + 5, y, { width: summaryColWidths[0] - 10 });
    doc.font('Helvetica');
    doc.text(order.couponName ? `Yes (${order.couponName})` : 'No', summaryColPositions[1] + 5, y, { width: summaryColWidths[1] - 10, align: 'right' });
    y += 20;
    doc.moveTo(390, y - 5).lineTo(540, y - 5).strokeColor('#58CC02').stroke();

    // Final Amount
    doc.font('Helvetica-Bold');
    doc.text('Final Amount:', summaryColPositions[0] + 5, y, { width: summaryColWidths[0] - 10 });
    doc.text(`₹${order.total.toFixed(2)}`, summaryColPositions[1] + 5, y, { width: summaryColWidths[1] - 10, align: 'right' });

    // Footer
    doc.fontSize(10).font('Helvetica').fillColor('#58CC02').text('Thank you for shopping with Ocean Books!', 50, doc.page.height - 50, { align: 'center' });

    doc.end();
  } catch (error) {
    console.error('Invoice Error:', error);
    res.status(500).send('Error generating invoice');
  }
};
//------------------------------------------------------------------------------------------------
export const getOrders = async (req, res) => {
  try {
    if (!req.user) return res.redirect('/users/login');
    const { search = '' } = req.query;
    const wishlistCount = Wishlist ? await Wishlist.countDocuments({ userId: req.user.id }) : 0;
    const cartCount = Cart ? await Cart.countDocuments({ userId: req.user.id }) : 0;

    const query = { userId: req.user.id };
    if (search) query.orderId = { $regex: search, $options: 'i' };

    const orders = await Order.find(query)
      .populate('items.productId', 'name price discount images')
      .sort({ createdAt: -1 });

    
    res.render('user/orders', {
      orders,
      user: req.user,
      wishlistCount,
      cartCount,
      search
    });
  } catch (error) {
    console.error('Get Orders Error:', error);
    res.render('user/orders', {
      orders: [],
      user: req.user,
      wishlistCount: 0,
      cartCount: 0,
      search: '',
      error: 'Failed to load orders'
    });
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
    if (!['Pending', 'Shipped'].includes(order.status)) {
      return res.json({ success: false, message: 'Cannot cancel this order' });
    }
    if (!reason) {
      return res.json({ success: false, message: 'Reason is required' });
    }

    order.status = 'Cancelled';
    order.cancelReason = reason;
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.productId._id, {
        $inc: { stock: item.quantity }
      });
    }
    await order.save();
    console.log('Order Cancelled:', order.orderId, 'Reason:', reason); // Debug
    res.json({ success: true });
  } catch (error) {
    console.error('Cancel Order Error:', error);
    res.status(500).json({ success: false, message: 'Failed to cancel order' });
  }
};
//------------------------------------------------------------------------------------------------
export const requestReturn = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findById(orderId);
    if (!order || order.userId.toString() !== req.user.id) {
      return res.json({ success: false, message: 'Order not found' });
    }
    if (order.status !== 'Delivered' || order.returnRequest) {
      return res.json({ success: false, message: 'Cannot request return' });
    }

    order.returnRequest = true;
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