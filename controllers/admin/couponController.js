import Coupon from '../../models/Coupon.js';
import User from '../../models/User.js';

export const createCoupon = async (req, res) => {
  try {
    const { code, discount, expiryDate } = req.body;

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
//---------------------------------------------------------
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
//-------------------------------------------------------------------
export const getCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.find();
    res.render('admin/coupons', { coupons });
  } catch (error) {
    console.error('Get Coupons Error:', error);
    res.status(500).send('Failed to load coupons');
  }
};
//------------------------------------------------------------
export const toggleCoupon = async (req, res) => {
  try {
    const { couponId } = req.params;
    const coupon = await Coupon.findById(couponId);
    if (!coupon) {
      return res.status(404).json({ success: false, message: 'Coupon not found' });
    }
    coupon.isListed = !coupon.isListed; 
    await coupon.save();
    res.json({ success: true, message: `Coupon ${coupon.isListed ? 'listed' : 'unlisted'}`, isListed: coupon.isListed });
  } catch (error) {
    console.error('Toggle Coupon Error:', error);
    res.status(500).json({ success: false, message: 'Failed to toggle coupon' });
  }
};