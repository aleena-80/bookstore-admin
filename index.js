import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import mongoose from 'mongoose';
import morgan from 'morgan'
import cookieParser from 'cookie-parser';
import path from 'path';
import passport from './config/passportConfig.js'; 
import userRoutes from './routes/userRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import Product from './models/Product.js';
import multer from 'multer';


dotenv.config();

const app = express();


app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true })); 
app.use(passport.initialize()); 

app.use(cookieParser());
app.use(cors({
  origin: "http://localhost:5000", 
  credentials: true, 
}));
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private'); // ✅ Disable cache
  next();
});

app.use((req, res, next) => {
  console.log(`${req.method} request to ${req.url}`);
  next();
  });
  
  app.set('view engine', 'ejs');
  app.set('views', path.join(path.resolve(), 'views'));
  
  app.use(express.static(path.join(path.resolve(), 'public')));
  app.use('/images', express.static(path.join(path.resolve(), 'images')));
  
  app.get('/', (req, res) => {
    res.render('user/landing');
  });
  
app.use('/users', userRoutes); 
app.use('/admin', adminRoutes);



app._router?.stack.forEach((r) => {
    if (r.route) {
        console.log(r.route.path);
    }
});

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch((err) => console.error('MongoDB connection error:', err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});