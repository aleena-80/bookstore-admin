import Order from '../../models/Order.js';
import User from '../../models/User.js';
import Product from '../../models/Product.js';

export const getOrders = async (req, res) => {
  try {
    const { page = 1, search = '', status = '', sort = 'createdAt', direction = 'desc' } = req.query;
    const limit = 10;
    const skip = (page - 1) * limit;

    const query = {};
    if (search) {
      query.$or = [
        { orderId: { $regex: search, $options: 'i' } },
        { 'userId.name': { $regex: search, $options: 'i' } },
        { 'userId.email': { $regex: search, $options: 'i' } }
      ];
    }
    if (status) query.status = status;

    const totalOrders = await Order.countDocuments(query);
    const totalPages = Math.ceil(totalOrders / limit);

    const orders = await Order.find(query)
      .populate('userId', 'name email')
      .sort({ [sort]: direction === 'desc' ? -1 : 1 })
      .skip(skip)
      .limit(limit);

    res.render('admin/orders', {
      orders,
      currentPage: parseInt(page),
      totalPages,
      search,
      status,
      error: null
    });
  } catch (error) {
    console.error('Get Orders Error:', error);
    res.render('admin/orders', { orders: [], currentPage: 1, totalPages: 1, search: '', status: '', error: 'Failed to load orders' });
  }
};

export const getOrderView = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findById(orderId)
      .populate('userId', 'name email')
      .populate('items.productId', 'name price');
    if (!order) return res.status(404).send('Order not found');
    res.render('admin/order-view', { order });
  } catch (error) {
    console.error('Get Order View Error:', error);
    res.status(500).send('Failed to load order');
  }
};
//------------------------------------------------------
export const verifyReturn = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { action } = req.body;

    const order = await Order.findById(orderId).populate('userId');
    if (!order || !order.returnRequest) {
      return res.json({ success: false, message: 'No return request found' });
    }

    if (action === 'approve') {
      order.status = 'Returned';
      order.returnRequest = false; // Clear request
      const user = order.userId;
      user.wallet = (user.wallet || 0) + order.total;
      await user.save();

      // Restore stock
      for (const item of order.items) {
        await Product.findByIdAndUpdate(item.productId, {
          $inc: { stock: item.quantity }
        });
      }
    } else if (action === 'reject') {
      order.returnRequest = false; // Clear request, keep original status
    }

    await order.save();
    res.json({ success: true });
  } catch (error) {
    console.error('Verify Return Error:', error);
    res.json({ success: false, message: 'Failed to verify return' });
  }
};
//--------------------------------------------------------
export const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (['Cancelled', 'Returned'].includes(order.status)) {
      return res.status(400).json({ success: false, message: 'Cannot modify cancelled or returned order' });
    }

    order.status = status;
    if (!['Cancelled', 'Delivered', 'Returned'].includes(status)) {
      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() + 7);
      order.expectedDelivery = expectedDate;
    }
    await order.save();

    res.json({ success: true, message: 'Order status updated successfully' });
  } catch (error) {
    console.error('Update Order Error:', error);
    res.status(500).json({ success: false, message: 'Failed to update order' });
  }
};
//-------------------------------------------------------------------