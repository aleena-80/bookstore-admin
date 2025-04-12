
import mongoose from "mongoose";

const couponSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  code: { type: String, required: true },
  discount: { type: Number, required: true },
  expiryDate: { type: Date, required: true },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  isListed: { type: Boolean, default: true }
});
export default mongoose.model('Coupon', couponSchema);