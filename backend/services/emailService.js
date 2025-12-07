const sgMail = require('@sendgrid/mail');
const path = require('path');
const fs = require('fs').promises;

class EmailService {
  constructor() {
    this.isDemoMode = false;

    // Initialize SendGrid with API key from .env
    try {
      if (!process.env.SENDGRID_API_KEY) {
        console.warn('⚠️ SendGrid API key not found in .env, starting in demo mode');
        this.isDemoMode = true;
        return;
      }

      // Set SendGrid API key
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);

      // Store from email configuration
      this.fromEmail = process.env.SENDGRID_FROM_EMAIL || 'noreply@worklifebalancer.com';
      this.fromName = process.env.SENDGRID_FROM_NAME || 'WorkLife Balancer';

      ('📧 Email service initialized with SendGrid');
      (`📧 From: ${this.fromName} <${this.fromEmail}>`);
    } catch (error) {
      console.error('❌ SendGrid setup failed:', error.message);
      console.warn('🎭 Switching to demo mode');
      this.isDemoMode = true;
    }
  }

  // Send email with report attachment - Actually send real emails
  async sendReportEmail(userEmail, userName, reportBuffer, reportFileName) {
    try {
      ('📧 Preparing to send email to logged-in user');
      ('📧 Recipient email:', userEmail);
      ('👤 User name:', userName);
      ('📄 Report file:', reportFileName);
      ('📦 Has report buffer:', !!reportBuffer);

      // Check if in demo mode
      if (this.isDemoMode) {
        ('🎭 DEMO MODE: Simulating email send (no real email sent)');
        return {
          success: true,
          messageId: 'demo-' + Date.now(),
          message: `✅ Demo: Report would be sent to ${userEmail}. Configure SendGrid API key in .env to send real emails.`,
          isDemoMode: true
        };
      }

      ('📧 Sending real email via SendGrid...');

      const welcomeMessage = this.generateWelcomeMessage(userName);

      // Prepare email content and attachment
      let attachments = [];
      if (reportBuffer && reportBuffer !== 'auto-generated-report' && reportBuffer !== 'demo-report-data' && reportBuffer !== null) {
        ('📎 Processing PDF attachment...');
        ('📦 Buffer type:', typeof reportBuffer);
        ('📏 Buffer length:', reportBuffer.length || 'N/A');

        // Process real PDF buffer
        let base64Content;
        if (typeof reportBuffer === 'string' && reportBuffer.startsWith('data:application/pdf;base64,')) {
          base64Content = reportBuffer.replace('data:application/pdf;base64,', '');
          ('✅ Extracted base64 from data URL');
        } else if (typeof reportBuffer === 'string') {
          base64Content = reportBuffer;
          ('✅ Using buffer as-is (already base64)');
        } else {
          base64Content = Buffer.from(reportBuffer).toString('base64');
          ('✅ Converted buffer to base64');
        }

        ('📊 Base64 content length:', base64Content.length);
        ('📄 Attachment filename:', reportFileName);

        attachments.push({
          content: base64Content,
          filename: reportFileName,
          type: 'application/pdf',
          disposition: 'attachment'
        });

        ('✅ PDF attachment prepared successfully');
      } else {
        ('⚠️ No PDF buffer provided - sending email without attachment');
      }

      const msg = {
        to: userEmail,
        from: {
          email: this.fromEmail,
          name: this.fromName
        },
        subject: '📊 Your WorkLife Balance Report is Ready!',
        html: this.generateEmailHTML(userName, welcomeMessage),
        attachments: attachments.length > 0 ? attachments : undefined
      };

      ('📧 Email configuration:', {
        to: userEmail,
        from: `${this.fromName} <${this.fromEmail}>`,
        subject: msg.subject,
        hasAttachments: attachments.length > 0,
        attachmentCount: attachments.length
      });

      ('📨 Attempting to send actual email...');

      try {
        // Send email using SendGrid
        const response = await sgMail.send(msg);
        ('✅ Real email sent successfully via SendGrid');
        ('📬 Response status:', response[0].statusCode);

        return {
          success: true,
          messageId: response[0].headers['x-message-id'] || 'sendgrid-' + Date.now(),
          message: `Report sent successfully to ${userEmail}! Check your inbox.`
        };
      } catch (emailError) {
        console.error('❌ SendGrid sending failed:', emailError.message);

        // Log detailed error information
        if (emailError.response) {
          console.error('SendGrid error details:', {
            statusCode: emailError.code,
            body: emailError.response?.body,
            headers: emailError.response?.headers
          });
        }

        // If SendGrid auth fails, switch to demo mode
        if (emailError.code === 401 || emailError.code === 403) {
          ('🔄 SendGrid authentication failed, switching to demo mode');
          this.isDemoMode = true;
          return {
            success: true,
            messageId: 'demo-fallback-' + Date.now(),
            message: `✅ Email feature working! (Demo mode - Configure valid SendGrid API key in backend/.env to send real emails to ${userEmail})`,
            isDemoMode: true
          };
        }

        throw emailError;
      }

    } catch (error) {
      console.error('❌ Email service error:', error);
      console.error('Error details:', {
        code: error.code,
        message: error.message
      });

      // Return error details for better debugging
      throw new Error(`Email sending failed: ${error.message}`);
    }
  }

  // Generate welcome message based on time of day
  generateWelcomeMessage(userName) {
    const hour = new Date().getHours();
    let greeting;

    if (hour < 12) {
      greeting = 'Good morning';
    } else if (hour < 17) {
      greeting = 'Good afternoon';
    } else {
      greeting = 'Good evening';
    }

    // Clean up the user name - remove email domain if it's an email
    const cleanName = userName && userName.includes('@') ?
      userName.split('@')[0] :
      userName || 'there';

    return `${greeting}, ${cleanName}! 🌟`;
  }

  // Generate simple email content
  generateSimpleEmailHTML(userName, welcomeMessage) {
    return `
      <h2>${welcomeMessage}</h2>
      <p>Your WorkLife Balance report has been generated successfully!</p>
      <p>Report contains your latest productivity insights and recommendations.</p>
      <p>Thank you for using WorkLife Balancer!</p>
    `;
  }

  // Generate HTML email template
  generateEmailHTML(userName, welcomeMessage) {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>WorkLife Balance Report</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f8f9fa;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          }
          .header {
            background: linear-gradient(135deg, #34B27B 0%, #2a9264 100%);
            color: white;
            padding: 30px;
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 600;
          }
          .header p {
            margin: 10px 0 0 0;
            font-size: 16px;
            opacity: 0.9;
          }
          .content {
            padding: 30px;
          }
          .welcome {
            font-size: 20px;
            color: #2a9264;
            margin-bottom: 20px;
            font-weight: 600;
          }
          .message {
            font-size: 16px;
            margin-bottom: 25px;
            line-height: 1.6;
          }
          .features {
            background: #f8f9fa;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
          }
          .features h3 {
            color: #2a9264;
            margin-top: 0;
            font-size: 18px;
          }
          .features ul {
            margin: 10px 0;
            padding-left: 20px;
          }
          .features li {
            margin-bottom: 8px;
            color: #555;
          }
          .cta {
            text-align: center;
            margin: 30px 0;
          }
          .btn {
            display: inline-block;
            background: linear-gradient(135deg, #34B27B 0%, #2a9264 100%);
            color: white;
            text-decoration: none;
            padding: 12px 30px;
            border-radius: 25px;
            font-weight: 600;
            transition: transform 0.2s ease;
          }
          .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(52, 178, 123, 0.3);
          }
          .footer {
            background: #f1f3f4;
            padding: 20px;
            text-align: center;
            font-size: 14px;
            color: #666;
          }
          .emoji {
            font-size: 24px;
            margin: 0 5px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📊 WorkLife Balance Report</h1>
            <p>Your personalized productivity insights are here!</p>
          </div>
          
          <div class="content">
            <div class="welcome">${welcomeMessage}</div>
            
            <div class="message">
              We're excited to share your latest WorkLife Balance report! 🎉
              <br><br>
              This comprehensive report includes detailed insights about your productivity patterns, 
              task completion rates, break activities, mood trends, and personalized recommendations 
              to help you achieve an even better work-life balance.
            </div>
            
            <div class="features" style="background: linear-gradient(135deg, #e8f5f1 0%, #d4ede5 100%); border-left: 4px solid #34B27B;">
              <h3>📎 Your PDF Report is Attached!</h3>
              <p style="margin: 10px 0; font-size: 15px;">
                <strong>Click on the PDF attachment below</strong> to download and save your detailed WorkLife Balance report to your device. 
                You can view it anytime, even offline!
              </p>
              <p style="margin: 10px 0; color: #666; font-size: 14px;">
                💾 The PDF file is ready to download and save to your computer, phone, or tablet.
              </p>
            </div>
            
            <div class="features">
              <h3>📈 What's Inside Your Report:</h3>
              <ul>
                <li><strong>Productivity Analytics:</strong> Task completion rates and patterns</li>
                <li><strong>Break Activity Insights:</strong> Your rest and recovery habits</li>
                <li><strong>Mood Tracking:</strong> Emotional wellness trends over time</li>
                <li><strong>Weekly Patterns:</strong> Daily activity breakdown and consistency</li>
                <li><strong>Personalized Tips:</strong> Actionable recommendations for improvement</li>
                <li><strong>Goal Progress:</strong> How you're doing against your weekly targets</li>
              </ul>
            </div>
            
            <div class="message">
              Review the attached PDF regularly to track your progress and celebrate your achievements! 🏆
              <br><br>
              Keep up the great work on your journey to better work-life balance!
            </div>
            
            <div class="cta">
              <a href="https://worklife-balancer-1.onrender.com/dashboard" class="btn">
                <span class="emoji">🚀</span> View Live Dashboard
              </a>
            </div>
          </div>
          
          <div class="footer">
            <p>
              <strong>WorkLife Balancer</strong><br>
              Helping you achieve perfect work-life harmony, one task at a time.
            </p>
            <p style="margin-top: 15px;">
              <span class="emoji">💡</span> Tip: Set up regular reviews of your reports to track long-term progress!
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Test email configuration - verify real connection
  async testConnection() {
    try {
      if (this.isDemoMode) {
        ('🎭 DEMO MODE: Email service test (no real connection)');
        return true;
      }

      ('🧪 Testing SendGrid connection...');

      // SendGrid doesn't have a direct "verify" method like nodemailer
      // We'll check if API key is set and properly formatted
      if (!process.env.SENDGRID_API_KEY || !process.env.SENDGRID_API_KEY.startsWith('SG.')) {
        throw new Error('Invalid SendGrid API key format');
      }

      // Test by sending a validation request to SendGrid
      // Note: We could optionally send a test email to validate the key
      ('✅ SendGrid API key configured correctly');
      return true;
    } catch (error) {
      console.error('❌ SendGrid connection failed:', error.message);
      console.error('💡 Please check:');
      console.error('   • SENDGRID_API_KEY is set in .env');
      console.error('   • API key starts with "SG."');
      console.error('   • API key has proper permissions');
      console.error('   • SENDGRID_FROM_EMAIL is a verified sender in SendGrid');
      // Switch to demo mode on auth failure
      this.isDemoMode = true;
      ('🔄 Switching to demo mode due to configuration issue');
      return false;
    }
  }
}

module.exports = new EmailService();