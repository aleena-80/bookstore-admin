import mongoose from 'mongoose'

const orderSchema = new mongoose.Schema({
  orderId: { type: String, unique: true, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
    discount: { type: Number, default: 0 }
  }],
  address: {
    name: { type: String},
    street: { type: String },
    city: { type: String },
    state: { type: String },
    postalCode: { type: String },
    country: { type: String, default: 'India' } 
  },

  total: { type: Number, required: true },
  taxes: { type: Number, default: 0 },
  shipping: { type: Number, default: 100 },
  couponCode: { type: String, default: null },
  status: { type: String, enum: ['Confirmed', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled', 'Returned'], default: 'Pending' },
  expectedDelivery: { type: Date },
  cancelReason: { type: String },
  couponDiscount: { type: Number, default: 0 },
  returnReason: { type: String },
  paymentId: { type: String },
  paymentMethod: { type: String, required: true },
  paymentCompleted: { type: Boolean, default: false },
  returnRequest: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
export default mongoose.model('Order', orderSchema);
