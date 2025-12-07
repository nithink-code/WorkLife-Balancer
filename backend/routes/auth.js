const express = require("express");
const router = express.Router();
const passport = require("passport");
const jwt = require("jsonwebtoken");
const UserAuth = require('../models/Auth');
const bcrypt = require("bcrypt");
const authenticateJWT = require("../middleware/authenticateJWT");

// Verify Token
router.get("/verify", authenticateJWT, (req, res) => {
  if (req.user) {
    // Generate a new token for the frontend to use
    const token = jwt.sign(
      { id: req.user._id, email: req.user.email },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    res.json({
      registered: true,
      token: token,
      user: {
        id: req.user._id,
        email: req.user.email,
        name: req.user.displayName,
      },
    });
  } else {
    res.status(401).json({ registered: false });
  }
});

// Google OAuth login - force account selection to show all Google accounts
router.get("/google", passport.authenticate("google", {
  scope: ["profile", "email"],
  prompt: "select_account" // This forces Google to show account picker with all accounts
}));

router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/auth/failure", session: false }),
  async (req, res) => {
    try {
      const user = req.user;

      // Validate user object exists
      if (!user || !user._id || !user.email) {
        console.error('❌ OAuth callback: Invalid user object received:', user);
        const origin = req.get('origin') || req.get('referer')?.split('/').slice(0, 3).join('/') || 'https://worklife-balancer-1.onrender.com';
        const errorUrl = `${origin}/?error=oauth_failed&message=${encodeURIComponent('Authentication failed: Invalid user data. Please try again.')}`;
        console.log(`❌ [Auth] Redirecting to error page: ${errorUrl}`);
        return res.redirect(errorUrl);
      }

      console.log('✅ [Auth] OAuth callback successful for user:', user.email);

      // Generate JWT token for Google OAuth user
      const token = jwt.sign(
        { id: user._id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: "2h" }
      );

      // Set cookie
      res.cookie("jwt", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 2 * 60 * 60 * 1000,
      });

      // Don't use origin header - it will be accounts.google.com during OAuth
      // Always use the configured frontend URL or deployed URL
      const frontendUrl = process.env.FRONTEND_URL || 'https://worklife-balancer-1.onrender.com';

      // Prepare user data
      const userData = {
        token: token,
        user: {
          id: user._id.toString(),
          email: user.email,
          name: user.displayName || user.name || ''
        }
      };

      // Encode the data properly
      const encodedData = encodeURIComponent(JSON.stringify(userData));
      const successMessage = encodeURIComponent('Authentication successful. Welcome!');

      // Direct redirect to dashboard with OAuth data
      const redirectUrl = `/dashboard?oauth=success&message=${successMessage}&data=${encodedData}`;

      res.redirect(redirectUrl);
    } catch (error) {
      console.error('❌ OAuth callback error:', error);
      const origin = req.get('origin') || req.get('referer')?.split('/').slice(0, 3).join('/') || 'https://worklife-balancer-1.onrender.com';
      const errorUrl = `${origin}/?error=oauth_failed&message=${encodeURIComponent('Authentication failed. Please try again.')}`;
      res.redirect(errorUrl);
    }
  }
);

router.get("/failure", (req, res) => res.status(401).send("Failed to authenticate."));

// Logout
router.get("/logout", (req, res, next) => {
  req.logout(() => {
    res.clearCookie("jwt");
    res.json({ message: "Logged out" });
  });
});

// Login route
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  ("Login attempt for email:", email);

  try {
    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await UserAuth.findOne({ email });
    if (!user) {
      ("User not found:", email);
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Check if user has a password set
    if (!user.passwordHash) {
      ("User exists but no password set:", email);
      return res.status(401).json({
        message: "No password set for this account. Please sign up or use Google Sign-In."
      });
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      ("Invalid password for user:", email);
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    res.cookie("jwt", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // Only secure in production (HTTPS)
      sameSite: "lax",
      maxAge: 2 * 60 * 60 * 1000,
    });

    ("Login successful for user:", email);
    res.status(200).json({
      message: "Login successful",
      token: token,
      user: {
        id: user._id,
        email: user.email,
        name: user.displayName
      }
    });
  } catch (error) {
    console.error("Login error details:", error);
    res.status(500).json({
      message: "Server error during login. Please try again.",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Signup - registration only (no auto-login)
router.post("/signup", async (req, res) => {
  try {
    let { fullName, email, password } = req.body;

    ("Signup request received:", { email, hasPassword: !!password, fullName });

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    // Auto-generate fullName from email if not provided
    if (!fullName || fullName.trim() === "") {
      fullName = email.split("@")[0];
      ("Auto-generated fullName:", fullName);
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters long" });
    }

    const existingUser = await UserAuth.findOne({ email });
    if (existingUser) {
      // Check if user exists but has no password (OAuth only)
      if (!existingUser.passwordHash) {
        // Allow adding password to OAuth account
        ("Adding password to existing OAuth account:", email);
        const hashedPassword = await bcrypt.hash(password, 10);
        existingUser.passwordHash = hashedPassword;
        existingUser.displayName = existingUser.displayName || fullName;
        existingUser.name = existingUser.name || fullName;
        await existingUser.save();
        ("Password added to OAuth account successfully");
        return res.status(201).json({
          message: "Password added successfully! You can now login with email and password.",
          success: true
        });
      }
      // User already has a password
      return res.status(409).json({ message: "Email already registered. Please login." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new UserAuth({
      displayName: fullName,
      name: fullName,
      email,
      passwordHash: hashedPassword,
    });

    await newUser.save();
    ("User created successfully:", newUser.email);

    res.status(201).json({
      message: "Account created successfully! Please login.",
      success: true
    });
  } catch (error) {
    console.error("Signup error details:", error);
    if (error.code === 11000) {
      return res.status(409).json({ message: "Email already registered. Please login." });
    }
    res.status(500).json({
      message: "Server error during signup. Please try again.",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
