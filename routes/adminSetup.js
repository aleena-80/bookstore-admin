import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import Admin from '../models/Admin.js'

dotenv.config();

const createAdmin = async () => {
  await mongoose.connect(process.env.MONGO_URI|| "mongodb://127.0.0.1:27017/bookstore");

  const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10); 

  const admin = new Admin({
    name: process.env.ADMIN_NAME,
    email: process.env.ADMIN_EMAIL,
    password: hashedPassword,
    role: "admin",
  });

  await admin.save();
  mongoose.connection.close();
};

createAdmin().catch(console.error);
