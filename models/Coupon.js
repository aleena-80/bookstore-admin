
import mongoose from "mongoose";

const couponSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  code: { type: String, required: true },
  discount: { type: Number, required: true },
  minAmount: { type: Number, required: true },
  expiryDate: { type: Date, required: true }
});
export default mongoose.model('Coupon', couponSchema);