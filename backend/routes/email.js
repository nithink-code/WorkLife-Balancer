const express = require("express");
const router = express.Router();
const authenticateJWT = require("../middleware/authenticateJWT");
const emailService = require("../services/emailService");
const UserAuth = require("../models/Auth");

// Debug endpoint to check user authentication
router.get('/debug-auth', authenticateJWT, async (req, res) => {
  try {
    ('🔍 Debug auth endpoint hit');
    res.json({
      success: true,
      user: {
        id: req.user._id,
        email: req.user.email,
        displayName: req.user.displayName,
        name: req.user.name
      },
      message: 'User authenticated successfully'
    });
  } catch (error) {
    console.error('❌ Debug auth failed:', error);
    res.status(500).json({
      success: false,
      message: 'Debug auth failed',
      error: error.message
    });
  }
});

// Test endpoint to check if email service is working
router.get('/test', authenticateJWT, async (req, res) => {
  try {
    ('🧪 Email service connection test requested');
    const isConnected = await emailService.testConnection();
    
    if (isConnected) {
      res.json({
        success: true,
        message: 'Email service is configured and ready to send emails',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Email service configuration issue - check SENDGRID_API_KEY and SENDGRID_FROM_EMAIL in .env',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('❌ Email test failed:', error);
    res.status(500).json({
      success: false,
      message: 'Email service test failed',
      error: error.message
    });
  }
});

// Send report via email - Send to the currently logged-in user's email
router.post('/send-report', authenticateJWT, async (req, res) => {
  ('🔔 ========== EMAIL ENDPOINT HIT ==========');
  ('🔔 Timestamp:', new Date().toISOString());
  ('🔔 Request received at /email/send-report');
  
  try {
    ('📧 Email report request received for logged-in user');
    
    // req.user is set by the authenticateJWT middleware and contains the full user object
    const user = req.user;
    const { reportBuffer, reportFileName } = req.body;
    
    ('👤 User from JWT:', { 
      userId: user?._id, 
      email: user?.email,
      displayName: user?.displayName,
      name: user?.name,
      googleId: user?.googleId
    });

    if (!user) {
      ('❌ User not found in request');
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Get user's email and name from the authenticated user object
    // Support both regular and OAuth users
    const userEmail = user.email;
    const userName = user.displayName || user.name || user.email?.split('@')[0] || 'User';
    
    ('📧 Extracted email info:', { userEmail, userName, hasEmail: !!userEmail });

    if (!userEmail) {
      ('❌ User email not found for user:', user._id);
      return res.status(400).json({
        success: false,
        message: 'User email address is required to send the report'
      });
    }

    ('📋 Sending report to logged-in user:', {
      userId: user._id,
      userName,
      userEmail,
      hasBuffer: !!reportBuffer,
      hasFileName: !!reportFileName
    });

    // Set response timeout to prevent hanging
    req.setTimeout(25000); // 25 seconds timeout for the entire request
    
    ('📨 About to call emailService.sendReportEmail...');
    
    // Attempt to send real email
    const result = await emailService.sendReportEmail(
      userEmail,
      userName,
      reportBuffer,
      reportFileName || 'WorkLife-Report.pdf'
    );

    ('✅ Email sent successfully:', result);

    res.json({
      success: true,
      message: result.message,
      messageId: result.messageId
    });

  } catch (error) {
    console.error('❌ Email sending failed:', error);
    
    let errorMessage = 'Failed to send email to your address';
    let statusCode = 500;
    
    if (error.code === 'EAUTH') {
      errorMessage = 'Email service authentication issue. Please contact support.';
    } else if (error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT') {
      errorMessage = 'Unable to connect to email service. Please try again in a few minutes.';
    } else if (error.code === 'EMESSAGE') {
      errorMessage = 'Invalid email format. Please check your email address.';
      statusCode = 400;
    } else if (error.message && error.message.includes('recipient')) {
      errorMessage = 'Unable to deliver to your email address. Please verify it\'s correct.';
      statusCode = 400;
    } else if (error.message) {
      errorMessage = `Email service error: ${error.message}`;
    }

    res.status(statusCode).json({
      success: false,
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? {
        code: error.code,
        message: error.message,
        stack: error.stack?.slice(0, 300)
      } : undefined
    });
  }
});

// Test email configuration endpoint
router.get('/test-email', authenticateJWT, async (req, res) => {
  try {
    const isValid = await emailService.testConnection();
    res.json({
      success: isValid,
      message: isValid ? 'Email configuration is valid' : 'Email configuration has issues'
    });
  } catch (error) {
    console.error('❌ Email test failed:', error);
    res.status(500).json({
      success: false,
      message: 'Email test failed',
      error: error.message
    });
  }
});

module.exports = router;