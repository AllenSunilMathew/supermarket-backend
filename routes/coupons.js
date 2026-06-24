const express = require('express');
const router = express.Router();
const Coupon = require('../models/Coupon');
const Order = require('../models/Order');
const { protect, adminOnly } = require('../middleware/authMiddleware');

// @desc    Get all coupons (Admin only)
// @route   GET /api/coupons
// @access  Private (Admin)
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const coupons = await Coupon.find({}).sort({ createdAt: -1 });
    return res.json(coupons);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// @desc    Create a coupon (Admin only)
// @route   POST /api/coupons
// @access  Private (Admin)
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const { code, discountType, discountValue, minOrderAmount, expiryDate, firstTimeOnly } = req.body;

    if (!code || !discountType || !discountValue || !expiryDate) {
      return res.status(400).json({ message: 'Please add all required coupon fields' });
    }

    const couponExists = await Coupon.findOne({ code: code.toUpperCase() });
    if (couponExists) {
      return res.status(400).json({ message: 'Coupon code already exists' });
    }

    const coupon = new Coupon({
      code: code.toUpperCase(),
      discountType,
      discountValue: Number(discountValue),
      minOrderAmount: minOrderAmount ? Number(minOrderAmount) : 0,
      expiryDate: new Date(expiryDate),
      firstTimeOnly: !!firstTimeOnly,
    });

    const createdCoupon = await coupon.save();
    return res.status(201).json(createdCoupon);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// @desc    Validate a coupon code
// @route   POST /api/coupons/validate
// @access  Private (User must be logged in to apply coupon since some check user order history)
router.post('/validate', protect, async (req, res) => {
  try {
    const { code, cartTotal } = req.body;

    if (!code) {
      return res.status(400).json({ message: 'Coupon code is required' });
    }

    const coupon = await Coupon.findOne({ code: code.toUpperCase() });

    // Condition 1: Check existence
    if (!coupon) {
      return res.status(404).json({ message: 'Invalid coupon code' });
    }

    // Condition 2: Check activity
    if (!coupon.isActive) {
      return res.status(400).json({ message: 'Coupon is no longer active' });
    }

    // Condition 3: Check expiry
    const today = new Date();
    if (new Date(coupon.expiryDate) < today) {
      return res.status(400).json({ message: 'Coupon has expired' });
    }

    // Condition 4: Check minimum order amount
    if (Number(cartTotal) < coupon.minOrderAmount) {
      return res.status(400).json({
        message: `Minimum order amount of $${coupon.minOrderAmount.toFixed(2)} is required to use this coupon`,
      });
    }

    // Condition 5: Check if it's first-time only
    if (coupon.firstTimeOnly) {
      const orderCount = await Order.countDocuments({ user: req.user._id, status: { $ne: 'Cancelled' } });
      if (orderCount > 0) {
        return res.status(400).json({ message: 'This coupon is only valid for your first order' });
      }
    }

    // Dynamic Discount Calculation
    let discountAmount = 0;
    if (coupon.discountType === 'percentage') {
      discountAmount = (Number(cartTotal) * coupon.discountValue) / 100;
    } else if (coupon.discountType === 'flat') {
      discountAmount = coupon.discountValue;
    }

    // Limit discount to not exceed cart total
    if (discountAmount > cartTotal) {
      discountAmount = cartTotal;
    }

    return res.json({
      message: 'Coupon applied successfully!',
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      discountAmount,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// @desc    Delete a coupon (Admin only)
// @route   DELETE /api/coupons/:id
// @access  Private (Admin)
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) {
      return res.status(404).json({ message: 'Coupon not found' });
    }

    await Coupon.deleteOne({ _id: req.params.id });
    return res.json({ message: 'Coupon deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

module.exports = router;
