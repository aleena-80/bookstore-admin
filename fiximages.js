// fixImages.js
import mongoose from 'mongoose';
import Product from './models/Product.js'; // Adjust path

mongoose.connect('mongodb://127.0.0.1:27017/bookstore', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB error:', err));

const cloudinaryUrls = {
  "1742493865661-if he had been with me.jpg" :"https://res.cloudinary.com/dlxnlxmaz/image/upload/v1743429518/images/1742392495399-a%20good%20girl%27s%20guide%20to%20murderhe.jpg",
  "1742494016173-âThe Prison Healer.jpg" :"https://res.cloudinary.com/dlxnlxmaz/image/upload/v1743429518/images/1742392495399-a%20good%20girl%27s%20guide%20to%20murderhe.jpg",
"1742494029408-âThe Prison Healer.jpg":"https://res.cloudinary.com/dlxnlxmaz/image/upload/v1743429518/images/1742392495399-a%20good%20girl%27s%20guide%20to%20murderhe.jpg",
"1742494205731-Haunting Adeline book - Copy (2).jpeg":"https://res.cloudinary.com/dlxnlxmaz/image/upload/v1743429518/images/1742392495399-a%20good%20girl%27s%20guide%20to%20murderhe.jpg",
"1742494205740-Haunting Adeline book - Copy - Copy.jpeg":"https://res.cloudinary.com/dlxnlxmaz/image/upload/v1743429518/images/1742392495399-a%20good%20girl%27s%20guide%20to%20murderhe.jpg",
"1742494345893-a good girl's guide to murderhe.jpg":"https://res.cloudinary.com/dlxnlxmaz/image/upload/v1743429518/images/1742392495399-a%20good%20girl%27s%20guide%20to%20murderhe.jpg",
"1742494463794-download - Copy.jpg":"https://res.cloudinary.com/dlxnlxmaz/image/upload/v1743429518/images/1742392495399-a%20good%20girl%27s%20guide%20to%20murderhe.jpg",
"1742494345899-A Good Girls Guide to Murder Mini Book Cover.jpg":"https://res.cloudinary.com/dlxnlxmaz/image/upload/v1743429518/images/1742392495399-a%20good%20girl%27s%20guide%20to%20murderhe.jpg",
"1742494463782-download78.jpg":"https://res.cloudinary.com/dlxnlxmaz/image/upload/v1743429518/images/1742392495399-a%20good%20girl%27s%20guide%20to%20murderhe.jpg",
"1742494345900-A Good Girl's Guide to Murder.jpg":"https://res.cloudinary.com/dlxnlxmaz/image/upload/v1743429518/images/1742392495399-a%20good%20girl%27s%20guide%20to%20murderhe.jpg",


};

async function updateImages() {
  try {
    for (const [local, url] of Object.entries(cloudinaryUrls)) {
      const result = await Product.updateMany(
        { images: local },
        { $set: { 'images.$': url } }
      );
      console.log(`Updated ${result.modifiedCount} docs for ${local}`);
    }
    console.log('All images updated!');
    mongoose.connection.close();
  } catch (error) {
    console.error('Error updating images:', error);
  }
}

updateImages();