// public/scripts/uploadToCloudinary.js
import cloudinary from '../../config/cloudinary.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename); 

const uploadImages = async () => {
  const imagesDir = path.join(__dirname, '../../images');
  const files = fs.readdirSync(imagesDir);

  for (const file of files) {
    const filePath = path.join(imagesDir, file);
    const publicId = `images/${file.split('.')[0]}`; // e.g., images/image1
    try {
      const result = await cloudinary.uploader.upload(filePath, { public_id: publicId });
      console.log(`Uploaded ${file}: ${result.secure_url}`);
    } catch (error) {
      console.error(`Error uploading ${file}:`, error);
    }
  }
};

uploadImages();