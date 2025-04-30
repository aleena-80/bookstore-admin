import PDFDocument from 'pdfkit';
import User from '../../models/User.js';
import Order from '../../models/Order.js';

export const getDashboard = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalOrders = await Order.countDocuments();
    const orders = await Order.find();

    let totalSales = 0, totalRefund = 0, totalCancellations = 0, totalReturns = 0;

    orders.forEach(order => {
      order.items.forEach(item => {
        const price = Number(item.price) || 0;
        if (item.status === 'Cancelled') {
          totalCancellations += 1; 
        } else {
          totalSales += price;
        }
      });
    });

   
    res.render('admin/dashboard', { 
      totalUsers, 
      totalOrders, 
      totalSales, 
    });
  } catch (error) {
    console.error('Error loading dashboard:', error);
    res.status(500).send('Server error');
  }
};
//---------------------------------------------------------------------------
export const getSalesReport = async (req, res) => {
  try {
    const { start, end } = req.query;
    let filterCondition = {
      status: { $in: ['Delivered', 'Returned', 'Refunded', 'Cancelled', 'Confirmed', 'Shipped', 'Out for Delivery'] }
    };

    if (start && end) {
      filterCondition.createdAt = {
        $gte: new Date(start),
        $lte: new Date(end)
      };
    }
    const orders = await Order.find(filterCondition)
      .populate('userId', 'name')
      .populate('items.productId', 'name')
      .sort({ createdAt: -1 });


    const salesData = orders.map(order => {
      const totalPrice = order.items.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
      const discount = order.items.reduce((sum, item) => sum + (Number(item.discount) || 0), 0);
      return {
        orderId: order.orderId,
        date: order.createdAt,
        customer: order.userId?.name || 'Unknown',
        status: order.status,
        totalPrice,
        discount,
        totalAmount: Number(order.total) || totalPrice,
        paymentMethod: order.paymentMethod || 'N/A',
        items: order.items.map(item => ({
          productName: item.productId?.name || 'Unknown Product',
          quantity: item.quantity
        }))
      };
    });

    res.json(salesData);
  } catch (error) {
    console.error('Error fetching sales report:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
//----------------------------------------------------------------------------------
export const getSalesReportPDF = async (req, res) => {
  try {
    const { start, end } = req.query;
    let filterCondition = {
      status: { $in: ['Delivered', 'Returned', 'Refunded', 'Cancelled', 'Confirmed', 'Shipped', 'Out for Delivery'] }
    };

    if (start && end) {
      filterCondition.createdAt = {
        $gte: new Date(start),
        $lte: new Date(end)
      };
    }

    const orders = await Order.find(filterCondition)
      .populate('userId', 'name')
      .populate('items.productId', 'name')
      .sort({ createdAt: -1 });

    if (!orders.length) {
      return res.status(404).json({ error: 'No orders found for the selected criteria' });
    }

    const doc = new PDFDocument({ 
      margin: 50, 
      size: 'A4', 
      bufferPages: true 
    });

    let buffers = [];
    doc.on('data', chunk => buffers.push(chunk));
    doc.on('end', () => {
      const pdfData = Buffer.concat(buffers);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="sales_report.pdf"');
      res.setHeader('Content-Length', pdfData.length);
      res.status(200).send(pdfData);
    });
    doc.on('error', error => {
      res.status(500).send('Error generating PDF');
    });

    doc.fontSize(18)
       .font('Helvetica-Bold')
       .text('Sales Report', { align: 'center' });
    doc.moveDown(1);

    const headers = ['Order ID', 'Date', 'Customer', 'Status', 'Total', 'Payment', 'Products (Qty)'];
    const colWidths = [70, 60, 80, 60, 60, 80, 100];
    const rowHeight = 20;
    let y = 100;

    doc.fontSize(10).font('Helvetica-Bold');
    headers.forEach((header, i) => {
      doc.text(header, 50 + colWidths.slice(0, i).reduce((sum, w) => sum + w, 0), y, { 
        width: colWidths[i], 
        align: 'left' 
      });
    });
    y += rowHeight;
    doc.moveTo(50, y - 5).lineTo(550, y - 5).stroke();

    doc.font('Helvetica');
    orders.forEach((order, index) => {
      const productsWithQty = order.items
        ? order.items.map(item => `${item.productId?.name || 'N/A'} (${item.quantity})`).join(', ')
        : 'No items';
      const row = [
        order.orderId,
        new Date(order.createdAt).toLocaleDateString(),
        order.userId?.name || 'N/A',
        order.status,
        `₹${Number(order.total || 0).toFixed(2)}`,
        order.paymentMethod || 'N/A',
        productsWithQty
      ];

      row.forEach((cell, i) => {
        doc.text(cell, 50 + colWidths.slice(0, i).reduce((sum, w) => sum + w, 0), y, { 
          width: colWidths[i], 
          align: 'left' 
        });
      });
      y += rowHeight;

      if (y > 700 && index < orders.length - 1) {
        doc.addPage();
        y = 50;
        doc.fontSize(10).font('Helvetica-Bold');
        headers.forEach((header, i) => {
          doc.text(header, 50 + colWidths.slice(0, i).reduce((sum, w) => sum + w, 0), y, { 
            width: colWidths[i], 
            align: 'left' 
          });
        });
        y += rowHeight;
        doc.moveTo(50, y - 5).lineTo(550, y - 5).stroke();
        doc.font('Helvetica');
      }
    });

    doc.end();
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
};
//------------------------------------------------------------------------
export const getTopProducts = async (req, res) => {
  try {
    const { start, end } = req.query;
    const match = { status: { $nin: ['Cancelled', 'Returned'] } };
    if (start && end) {
      match.date = {
        $gte: new Date(start),
        $lte: new Date(new Date(end).setHours(23, 59, 59, 999))
      };
    }

    const products = await Order.aggregate([
      { $match: match },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          totalQuantity: { $sum: '$items.quantity' }
        }
      },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' },
      {
        $project: {
          name: '$product.name',
          totalQuantity: 1
        }
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 10 }
    ]);
    res.json(products);
  } catch (error) {
    console.error('Get Top Products Error:', error);
    res.status(500).json({ error: 'Failed to fetch top products' });
  }
};
//---------------------------------------------------------------------------
export const getTopCategories = async (req, res) => {
  try {
    const { start, end } = req.query;
    const match = { status: { $nin: ['Cancelled', 'Returned'] } };
    if (start && end) {
      match.date = {
        $gte: new Date(start),
        $lte: new Date(new Date(end).setHours(23, 59, 59, 999))
      };
    }

    const categories = await Order.aggregate([
      { $match: match },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'products',
          localField: 'items.productId',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' },
      {
        $group: {
          _id: '$product.category',
          totalQuantity: { $sum: '$items.quantity' }
        }
      },
      {
        $lookup: {
          from: 'categories',
          localField: '_id',
          foreignField: '_id',
          as: 'category'
        }
      },
      { $unwind: '$category' },
      {
        $project: {
          name: '$category.name',
          totalQuantity: 1
        }
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 10 }
    ]);

    res.json(categories);
  } catch (error) {
    console.error('Get Top Categories Error:', error);
    res.status(500).json({ error: 'Failed to fetch top categories' });
  }
};
//---------------------------------------------------------------------------
