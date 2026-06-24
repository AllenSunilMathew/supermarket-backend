const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

// Load env variables
dotenv.config();

const User = require('./models/User');
const Product = require('./models/Product');
const Coupon = require('./models/Coupon');
const Order = require('./models/Order');

const connectDB = async () => {
  const connStr = process.env.DBCONNECTIONSTRING || 'mongodb://127.0.0.1:27017/supermarket';
  await mongoose.connect(connStr);
  console.log('MongoDB Connected for Seeding...');
};

const products = [
  // Vegetables
  {
    name: 'Foster Farms Takeout Crispy Classic Potatoes',
    description: 'Crispy classic potatoes ready to cook, perfect side dish for any breakfast or dinner.',
    price: 17.85,
    oldPrice: 19.99,
    image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=500&auto=format&fit=crop&q=60',
    category: 'Vegetables',
    stock: 60,
    rating: 4.8,
    brand: 'Country Crock',
    badge: 'Hot',
  },
  {
    name: 'Everyday Fresh Organic Broccoli',
    description: 'Rich in fiber and vitamins, fresh organic green broccoli sourced from local farms.',
    price: 3.49,
    oldPrice: 4.25,
    image: 'https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?w=500&auto=format&fit=crop&q=60',
    category: 'Vegetables',
    stock: 45,
    rating: 4.5,
    brand: 'Hambgar Hel',
    badge: 'Sale',
  },
  {
    name: 'Seeds of Change Organic Red Bell Peppers',
    description: 'Vibrant and crunchy bell peppers loaded with Vitamin C. Great for stir fries and salads.',
    price: 4.50,
    oldPrice: 5.25,
    image: 'https://images.unsplash.com/photo-1563565312-7a88d7541f53?w=500&auto=format&fit=crop&q=60',
    category: 'Vegetables',
    stock: 35,
    rating: 4.7,
    brand: 'NestFood',
    badge: 'New',
  },
  // Fresh Fruits
  {
    name: 'Blue Almonds Lightly Salted Vegetables & Fruits Mix',
    description: 'Convenient mix of premium dried fruits and lightly salted almonds for a healthy snack.',
    price: 25.85,
    oldPrice: 28.00,
    image: 'https://images.unsplash.com/photo-1596362601603-b74f6ef166e4?w=500&auto=format&fit=crop&q=60',
    category: 'Fresh Fruits',
    stock: 50,
    rating: 4.6,
    brand: 'Country Crock',
    badge: 'Hot',
  },
  {
    name: 'Organic Sweet Golden kiwi',
    description: 'Juicy, sweet golden kiwi fruits packed with vitamin E and digestive enzymes.',
    price: 5.99,
    oldPrice: 6.99,
    image: 'https://images.unsplash.com/photo-1585059895524-72359e06133a?w=500&auto=format&fit=crop&q=60',
    category: 'Fresh Fruits',
    stock: 80,
    rating: 4.9,
    brand: 'NestFood',
    badge: '-15%',
  },
  // Milks & Dairies
  {
    name: 'Organic Cage Grade A Large Eggs',
    description: 'Farm-fresh, pasture-raised organic large brown eggs. High in protein.',
    price: 21.00,
    oldPrice: 24.50,
    image: 'https://images.unsplash.com/photo-1516448620398-c5f44bf9f441?w=500&auto=format&fit=crop&q=60',
    category: 'Milks & Dairies',
    stock: 25,
    rating: 4.2,
    brand: 'Hambgar Hel',
    badge: 'Hot',
  },
  {
    name: 'Fresh Organic Whole Milk Bottle',
    description: 'Pure, rich whole milk pasteurized and sourced from local grass-fed organic dairies.',
    price: 4.25,
    oldPrice: 4.99,
    image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=500&auto=format&fit=crop&q=60',
    category: 'Milks & Dairies',
    stock: 30,
    rating: 4.8,
    brand: 'NestFood',
    badge: 'Sale',
  },
  // Baking material
  {
    name: 'Seeds of Change Organic Red Rice & Quinoa',
    description: 'Quick cooking fiber-rich organic red rice and organic quinoa blend.',
    price: 28.05,
    oldPrice: 31.00,
    image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500&auto=format&fit=crop&q=60',
    category: 'Baking material',
    stock: 40,
    rating: 4.4,
    brand: 'NestFood',
    badge: 'New',
  },
  {
    name: 'Haagen Caramel Cone Ice Cream Boxed',
    description: 'Vanilla ice cream with sweet caramel swirls and chocolate-dipped cone pieces.',
    price: 22.85,
    oldPrice: 25.00,
    image: 'https://images.unsplash.com/photo-1576506295286-5cda18df43e7?w=500&auto=format&fit=crop&q=60',
    category: 'Baking material',
    stock: 15,
    rating: 3.5,
    brand: 'Hambgar Hel',
    badge: 'Hot',
  },
  // Meats
  {
    name: 'All Natural Style Chicken Meatballs',
    description: 'Fully cooked chicken meatballs made with clean ingredients, gluten-free and delicious.',
    price: 23.00,
    oldPrice: 26.00,
    image: 'https://images.unsplash.com/photo-1529042410759-befb1204b468?w=500&auto=format&fit=crop&q=60',
    category: 'Meats',
    stock: 20,
    rating: 4.0,
    brand: 'WonderFul',
    badge: 'Sale',
  },
  // Coffee & Tea
  {
    name: 'Canada Dry Ginger Ale - 2 L Bottle',
    description: 'Crisp and clean carbonated beverage, perfect on its own or as a mixer.',
    price: 32.85,
    oldPrice: 35.00,
    image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=500&auto=format&fit=crop&q=60',
    category: 'Coffee & Tea',
    stock: 50,
    rating: 4.1,
    brand: 'Hambgar Hel',
    badge: 'New',
  },
];

const coupons = [
  {
    code: 'WELCOME10',
    discountType: 'percentage',
    discountValue: 10,
    minOrderAmount: 0,
    expiryDate: new Date('2027-12-31'),
    isActive: true,
    firstTimeOnly: true,
  },
  {
    code: 'FRESH25',
    discountType: 'percentage',
    discountValue: 25,
    minOrderAmount: 50,
    expiryDate: new Date('2027-12-31'),
    isActive: true,
    firstTimeOnly: false,
  },
  {
    code: 'SUPER5',
    discountType: 'flat',
    discountValue: 5.0,
    minOrderAmount: 30,
    expiryDate: new Date('2027-12-31'),
    isActive: true,
    firstTimeOnly: false,
  },
];

const seedData = async () => {
  try {
    await connectDB();

    // Clear existing data
    console.log('Clearing database collections...');
    await User.deleteMany({});
    await Product.deleteMany({});
    await Coupon.deleteMany({});
    await Order.deleteMany({});

    // Create Admin User
    console.log('Seeding Admin credentials...');
    const salt = await bcrypt.genSalt(10);
    const hashedAdminPassword = await bcrypt.hash('AdminPass123', salt);

    await User.create({
      name: 'Supermarket Manager',
      email: 'admin@supermarket.com',
      password: hashedAdminPassword,
      role: 'admin',
    });

    console.log('Admin user seeded (admin@supermarket.com / AdminPass123)');

    // Create Products
    console.log('Seeding products...');
    await Product.insertMany(products);
    console.log(`Seeded ${products.length} products successfully.`);

    // Create Coupons
    console.log('Seeding coupons...');
    await Coupon.insertMany(coupons);
    console.log(`Seeded ${coupons.length} coupons successfully.`);

    console.log('Data Seeding completed successfully!');
    process.exit();
  } catch (error) {
    console.error(`Seeding failed: ${error.message}`);
    process.exit(1);
  }
};

seedData();
