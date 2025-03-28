import mongoose from 'mongoose';

const newsletterSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
    },
    subscribedAt: {
        type: Date,
        default: Date.now
    }
});

export default mongoose.model('Newsletter', newsletterSchema);