const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Product = require('../models/Product');
const Coupon = require('../models/Coupon');
const { protect, adminOnly } = require('../middleware/authMiddleware');

// @desc    Place a new order (Cash on Delivery)
// @route   POST /api/orders
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { items, shippingAddress, phone, couponCode } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'No items in the order' });
    }

    if (!shippingAddress || !phone) {
      return res.status(400).json({ message: 'Shipping address and phone number are required' });
    }

    let calculatedSubtotal = 0;
    const orderItems = [];

    // Verify stock and fetch prices from database
    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(404).json({ message: `Product not found: ${item.name || item.product}` });
      }

      if (product.stock < item.quantity) {
        return res.status(400).json({
          message: `Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}`,
        });
      }

      calculatedSubtotal += product.price * item.quantity;
      orderItems.push({
        product: product._id,
        quantity: item.quantity,
        price: product.price, // Lock in price at order placement
      });
    }

    // Apply coupon if provided
    let discountAmount = 0;
    let appliedCouponCode = null;

    if (couponCode) {
      const coupon = await Coupon.findOne({ code: couponCode.toUpperCase(), isActive: true });
      if (coupon) {
        // Expiry check
        const today = new Date();
        const minAmountMet = calculatedSubtotal >= coupon.minOrderAmount;
        const notExpired = new Date(coupon.expiryDate) > today;

        let firstTimeValid = true;
        if (coupon.firstTimeOnly) {
          const orderCount = await Order.countDocuments({ user: req.user._id, status: { $ne: 'Cancelled' } });
          if (orderCount > 0) {
            firstTimeValid = false;
          }
        }

        if (minAmountMet && notExpired && firstTimeValid) {
          appliedCouponCode = coupon.code;
          if (coupon.discountType === 'percentage') {
            discountAmount = (calculatedSubtotal * coupon.discountValue) / 100;
          } else if (coupon.discountType === 'flat') {
            discountAmount = coupon.discountValue;
          }
          if (discountAmount > calculatedSubtotal) {
            discountAmount = calculatedSubtotal;
          }
        }
      }
    }

    const totalAmount = calculatedSubtotal - discountAmount;

    // Create the order
    const order = new Order({
      user: req.user._id,
      items: orderItems,
      totalAmount,
      discountAmount,
      couponApplied: appliedCouponCode,
      shippingAddress,
      phone,
      paymentMethod: 'COD',
      status: 'Pending',
    });

    // Save order and decrement stock
    const savedOrder = await order.save();

    for (const item of orderItems) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: -item.quantity },
      });
    }

    return res.status(201).json(savedOrder);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// @desc    Get logged in user's order history
// @route   GET /api/orders/my-orders
// @access  Private
router.get('/my-orders', protect, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .populate('items.product', 'name image price category')
      .sort({ createdAt: -1 });
    return res.json(orders);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// @desc    Get all orders (Admin only)
// @route   GET /api/orders
// @access  Private (Admin)
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const orders = await Order.find({})
      .populate('user', 'name email')
      .populate('items.product', 'name image price category')
      .sort({ createdAt: -1 });
    return res.json(orders);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// @desc    Update order delivery status (Admin only)
// @route   PUT /api/orders/:id/status
// @access  Private (Admin)
router.put('/:id/status', protect, adminOnly, async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid order status value' });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // If order is cancelled, return items back to stock
    if (status === 'Cancelled' && order.status !== 'Cancelled') {
      for (const item of order.items) {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { stock: item.quantity },
        });
      }
    }

    // If order was cancelled and is being restored, verify stock first
    if (order.status === 'Cancelled' && status !== 'Cancelled') {
      for (const item of order.items) {
        const product = await Product.findById(item.product);
        if (!product || product.stock < item.quantity) {
          return res.status(400).json({
            message: `Cannot restore order. Insufficient stock for ${product ? product.name : 'Unknown Product'}`,
          });
        }
      }
      for (const item of order.items) {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { stock: -item.quantity },
        });
      }
    }

    order.status = status;
    const updatedOrder = await order.save();
    return res.json(updatedOrder);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

module.exports = router;
