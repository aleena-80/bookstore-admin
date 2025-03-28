import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String },
    price: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    brand: { type: String },
    stock: { type: Number, required: true, default: 0 },
    images: [{ type: String }], 
    isDeleted: { type: Boolean, default: false },
    author: { type: String, required: true }, 
    language: { type: String, required: true }, 
    ratings: [{ user: String, rating: Number, review: String }], 
    isListed: { type: Boolean, default: true }, 
    createdAt: { type: Date, default: Date.now },
    popularity: { type: Number, default: 0 },
    featured: { type: Boolean, default: false },
    discount: { type: Number, default: 0 },
    reviews: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        rating: { type: Number, required: true, min: 1, max: 5 },
        comment: { type: String, required: true },
        createdAt: { type: Date, default: Date.now }
    }]

});

export default mongoose.model('Product', productSchema);