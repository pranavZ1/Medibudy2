const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.user = decoded;
    next();
  } catch (error) {
    res.status(400).json({ error: 'Invalid token.' });
  }
};

// For now, we'll create a simple middleware that creates a mock user
// In a real app, you'd have proper authentication
const mockAuth = (req, res, next) => {
  // Get userId from URL parameter or create a default one
  const userId = req.params.uid || '507f1f77bcf86cd799439011'; // Default test ObjectId
  
  // Validate if userId is a valid ObjectId
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ error: 'Invalid user ID format' });
  }
  
  // Create a mock user for testing
  req.user = {
    id: userId,
    email: 'test@example.com',
    name: 'Test User'
  };
  next();
};

module.exports = {
  verifyToken,
  mockAuth
};
