import {jsPDF} from 'jspdf'; // npm install jspdf
import { Parser } from 'json2csv'; // npm install json2csv
import User from '../../models/User.js';
import Order from '../../models/Order.js'

export const getDashboard = async (req, res) => {
  const totalUsers = await User.countDocuments();
  const totalOrders = await Order.countDocuments();
  const totalSales = await Order.aggregate([{ $match: { status: 'Confirmed' } }, { $group: { _id: null, total: { $sum: '$total' } } }]);
  res.render('admin/dashboard', { totalUsers, totalOrders, totalSales: totalSales[0]?.total || 0 });
};
export const getSalesReport = async (req, res) => {
  const { startDate, endDate, period } = req.query;
  let dateFilter = {};

  // Only apply date filter if valid input is provided
  if (period || (startDate && endDate)) {
    const now = new Date();
    if (period === 'daily') {
      dateFilter = { $gte: new Date(now.setDate(now.getDate() - 1)) };
    } else if (period === 'weekly') {
      dateFilter = { $gte: new Date(now.setDate(now.getDate() - 7)) };
    } else if (period === 'monthly') {
      dateFilter = { $gte: new Date(now.setDate(now.getDate() - 30)) };
    } else if (startDate && endDate) {
      // Validate dates
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (isNaN(start) || isNaN(end)) {
        return res.status(400).json({ error: 'Invalid date range' });
      }
      dateFilter = { $gte: start, $lte: end };
    }
  }

  try {
    // If dateFilter is empty, it won't be applied (show all Confirmed orders)
    const query = { status: { $in: ['Confirmed', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled', 'Returned'] } }
    if (Object.keys(dateFilter).length > 0) {
      query.createdAt = dateFilter;
    }

    const orders = await Order.find(query).populate('userId', 'name email');
    const totalSales = orders.reduce((sum, order) => sum + order.total, 0);
    const totalDiscount = orders.reduce((sum, order) => sum + (order.discount ? (order.subtotal * order.discount / 100) : 0), 0);
    const salesCount = orders.length;

    if (req.query.format === 'pdf') {
      const doc = new jsPDF();
      doc.text(`Sales Report (${period || 'Custom'})`, 10, 10);
      let y = 20;
      orders.forEach((order, i) => {
        doc.text(`${i + 1}. ${order.orderId} - ${order.userId?.name || 'N/A'} - ₹${order.total}`, 10, y);
        y += 10;
      });
      const pdfBuffer = doc.output('arraybuffer'); // Use arraybuffer for proper response
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="sales_report.pdf"');
      return res.send(Buffer.from(pdfBuffer));
    } else if (req.query.format === 'csv') {
      const fields = ['orderId', 'username', 'email', 'total', 'paymentMethod', 'createdAt', 'expectedDelivery'];
      const csvData = new Parser({ fields }).parse(orders.map(o => ({
        orderId: o.orderId,
        username: o.userId?.name,
        email: o.userId?.email || 'N/A',
        total: o.total,
        paymentMethod: o.paymentMethod || 'N/A',
        createdAt: o.createdAt,
        expectedDelivery: o.expectedDelivery || 'N/A'
      })));
      const csv = new Parser({ fields }).parse(csvData);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="sales_report.csv"');
      return res.send(Buffer.from(csv, 'utf-8'));
    }

    res.json({
      salesCount,
      totalSales,
      totalDiscount,
      orders: orders.map(o => ({
        orderId: o.orderId,
        user: { username: o.userId?.name, email: o.userId?.email },
        total: o.total,
        paymentMethod: o.paymentMethod,
        createdAt: o.createdAt,
        expectedDelivery: o.expectedDelivery
      }))
    });
  } catch (error) {
    console.error('Sales Report Error:', error);
    res.status(500).json({ error: 'Failed to generate sales report' });
  }
};