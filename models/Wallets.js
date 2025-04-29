import mongoose from "mongoose";

const walletSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    balance: { type: Number, default: 0 },
    transactions: [{
      transactionId: { type: String, required: true },
      type: { type: String, enum: ['credit', 'debit'], required: true },
      amount: { type: Number, required: true },
      date: { type: Date, default: Date.now },
      source: {
          type: { type: String, enum: ['order', 'cancellation','refund', 'add_funds', 'manual'], required: true },
          orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' }
      }
  }]
  });
export default mongoose.model('Wallet', walletSchema);