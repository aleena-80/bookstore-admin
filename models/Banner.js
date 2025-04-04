// models/Banner.js
import mongoose from 'mongoose';

const bannerSchema = new mongoose.Schema({
  image: { type: String, required: true }, // Cloudinary URL
  link: { type: String },
  startDate: { type: Date, default: Date.now },
  endDate: { type: Date },
  active: { type: Boolean, default: true }
});

export default mongoose.model('Banner', bannerSchema);