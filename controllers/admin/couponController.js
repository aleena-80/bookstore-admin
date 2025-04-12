import Coupon from '../../models/Coupon.js';
import User from '../../models/User.js';

export const createCoupon = async (req, res) => {
  try {
    const { code, discount, expiryDate } = req.body;

    // No userId needed for admin creation
    const coupon = new Coupon({
      code,
      discount,
      expiryDate
    });

    await coupon.save();
    res.json({ success: true, message: 'Coupon created successfully' });
  } catch (error) {
    console.error('Create Coupon Error:', error);
    res.status(500).json({ success: false, message: 'Failed to create coupon' });
  }
};

export const deleteCoupon = async (req, res) => {
  try {
    const { couponId } = req.params;
    await Coupon.findByIdAndDelete(couponId);
    res.json({ success: true, message: 'Coupon deleted' });
  } catch (error) {
    console.error('Delete Coupon Error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete coupon' });
  }
};

export const getCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.find();
    res.render('admin/coupons', { coupons });
  } catch (error) {
    console.error('Get Coupons Error:', error);
    res.status(500).send('Failed to load coupons');
  }
};
export const unlistCoupon = async (req, res) => {
  try {
    const { couponId } = req.params;
    const coupon = await Coupon.findById(couponId);
    if (!coupon) {
      return res.status(404).json({ success: false, message: 'Coupon not found' });
    }
    // Assuming "listing" is a boolean field (e.g., isListed)
    coupon.isListed = false; // Add this field to schema if missing
    await coupon.save();
    res.json({ success: true, message: 'Coupon unlisted' });
  } catch (error) {
    console.error('Unlist Coupon Error:', error);
    res.status(500).json({ success: false, message: 'Failed to unlist coupon' });
  }
};