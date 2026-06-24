const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const connectDB = require('./db');

// Load environment variables
dotenv.config();

// Connect to MongoDB database
connectDB();

const app = express();

// Standard Middlewares
app.use(cors());
app.use(express.json());

// Request logger for development
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Simple health-check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'UP', message: 'Supermarket API is running smoothly' });
});

// Import route modules
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const couponRoutes = require('./routes/coupons');
const orderRoutes = require('./routes/orders');

// Register API Route Mounts
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/orders', orderRoutes);

// Global Error Handler Middleware
app.use((err, req, res, next) => {
  console.error(`Unhandled Error: ${err.message}`);
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode).json({
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
});

// Define and start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
