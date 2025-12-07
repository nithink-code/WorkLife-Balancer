const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const userGoogle = require('../models/Auth');
const jwt = require("jsonwebtoken");

const callbackURL = process.env.GOOGLE_CALLBACK_URL || "https://worklife-balancer-1.onrender.com/auth/google/callback";

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: callbackURL,
}, async (accessToken, refreshToken, profile, done) => {
  try {

    if (!profile.emails || !profile.emails[0]) {
      return done(new Error('No email found in Google profile'), null);
    }

    const email = profile.emails[0].value;

    // First, try to find user by googleId
    let user = await userGoogle.findOne({ googleId: profile.id });

    if (!user) {
      // If not found by googleId, check if user exists by email
      user = await userGoogle.findOne({ email: email });

      if (user) {
        // User exists but doesn't have googleId - link the account
        user.googleId = profile.id;
        if (!user.displayName && profile.displayName) {
          user.displayName = profile.displayName;
        }
        await user.save();
      } else {
        user = new userGoogle({
          googleId: profile.id,
          displayName: profile.displayName || email.split('@')[0],
          email: email,
          name: profile.displayName || email.split('@')[0]
        });
        await user.save();
      }
    } else {
      // Update display name if it's missing or changed
      if (profile.displayName && (!user.displayName || user.displayName !== profile.displayName)) {
        user.displayName = profile.displayName;
        if (!user.name) {
          user.name = profile.displayName;
        }
        await user.save();
      }
      ('✅ [Passport] Existing user found with ID:', user._id);
    }

    ('📤 [Passport] Returning user object:', {
      id: user._id.toString(),
      email: user.email,
      displayName: user.displayName
    });

    // Return the USER OBJECT, not the token
    // The token will be created in the callback route
    done(null, user);
  } catch (error) {
    console.error('❌ [Passport] OAuth error:', error);
    done(error, null);
  }
}));

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((obj, done) => {
  done(null, obj);
});
