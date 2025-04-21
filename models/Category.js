import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    isDeleted: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    offer: {type: Number,default: 0, min: 0, max: 100,},
});

export default mongoose.model('Category', categorySchema);