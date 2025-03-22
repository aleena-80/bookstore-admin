import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import Admin from '../models/Admin.js'

dotenv.config();

const createAdmin = async () => {
  await mongoose.connect(process.env.MONGO_URI|| "mongodb://127.0.0.1:27017/bookstore");

  const hashedPassword = await bcrypt.hash("admin123", 10); 

  const admin = new Admin({
    name: "Admin",
    email: "admin@gmail.com",
    password: hashedPassword,
    role: "admin",
  });

  await admin.save();
  console.log("Admin user created successfully!");
  mongoose.connection.close();
};

createAdmin().catch(console.error);
