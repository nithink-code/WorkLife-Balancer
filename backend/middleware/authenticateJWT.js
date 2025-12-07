require('dotenv').config();
const jwt = require('jsonwebtoken');
const UserAuth = require('../models/Auth');

async function authenticateJWT(req, res, next) {
  (`🔐 Auth middleware hit for ${req.method} ${req.path}`);
  ('🔍 Headers received:', req.headers);
  try {
    // Extract token from header or cookie
    const authHeader = req.headers['authorization'];
    let token;

    ('🔍 Authorization header:', authHeader);
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1]; // Extract from Bearer header
      ("✅ Token found in Authorization header, length:", token ? token.length : 'null');
    } else if (req.cookies && req.cookies.jwt) {
      token = req.cookies.jwt; // Extract from cookie
      ("✅ Token found in cookie");
    }

    if (!token) {
      ("No token found in request");
      return res.status(401).json({ registered: false, message: 'Access denied. No token provided.' });
    }

    ("Token present, verifying...");
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    ("Token verified, user ID:", decoded.id);
    ("Token decoded data:", { id: decoded.id, email: decoded.email });
    
    // Fetch user from DB by id in decoded token
    const user = await UserAuth.findById(decoded.id);
    if (!user) {
      ("❌ User not found in database for ID:", decoded.id);
      ("💡 Checking if user exists with different criteria...");
      
      // Try finding by email if available in token
      if (decoded.email) {
        const userByEmail = await UserAuth.findOne({ email: decoded.email });
        if (userByEmail) {
          ("✅ Found user by email instead! User ID mismatch in token.");
          ("Token user ID:", decoded.id);
          ("Actual user ID:", userByEmail._id);
          req.user = userByEmail;
          return next();
        }
      }
      
      return res.status(404).json({ registered: false, message: 'User not found. Please log in again.' });
    }

    ("✅ User authenticated successfully:", user.id, user.email);
    // Attach user object to request
    req.user = user;
    next();
  } catch (error) {
    console.error("Authentication error:", error.message);
    return res.status(403).json({ registered: false, message: 'Invalid or expired token.' });
  }
}

module.exports = authenticateJWT;
