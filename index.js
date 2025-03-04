import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import mongoose from 'mongoose';
import cookieParser from 'cookie-parser';
import path from "path";


// Import routes
import userRoutes from './routes/userRoutes.js';
import adminRoutes from './routes/adminRoutes.js'; // ✅ Import Admin Routes

dotenv.config();
const app = express();
app.use(express.static("public")); 

// Middleware
app.use(express.json());
app.use(cors());
app.use(cookieParser());

app.use(
  cors({
    origin: "http://localhost:5000", // Your frontend URL
    credentials: true, // Allow credentials (cookies)
  })
);
// Set EJS as the view engine
app.set("view engine", "ejs");
app.set("views", path.join(path.resolve(), "views"));

// Serve static files
app.use(express.static(path.join(path.resolve(), "public")));

// Use routes
app.use('/users', userRoutes);
app.use('/admin', adminRoutes); // ✅ Register Admin Routes

// Default route
app.get("/", (req, res) => {
    res.send("Book Store API is running...");
});
// Render the admin login page
app.get("/admin/login", (req, res) => {
  res.render("adminLogin",{error:null});
});


// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
