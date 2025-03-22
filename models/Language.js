import mongoose from 'mongoose';

const languageSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true }
});

export default mongoose.model('Language', languageSchema);