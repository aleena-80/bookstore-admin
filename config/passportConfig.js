import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import User from "../models/User.js"; // Ensure correct path

dotenv.config();
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:5000/users/auth/google/callback",
      scope: ["profile", "email"],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ googleId: profile.id });

        if (!profile.emails || !profile.emails[0] || !profile.emails[0].value) {
          return done(new Error("Email not found in profile"), null);
        }
        if (!profile.photos || !profile.photos[0] || !profile.photos[0].value) {
          return done(new Error("Avatar not found in profile"), null);
        }
        if (!profile) {
          return done(new Error("No profile returned from Google"), null);
        }

        if (!user) {
          user = await User.findOne({ email: profile.emails[0].value });
          if (user) {
            user.googleId = profile.id;
            await user.save();
          } else {
            user = new User({
              googleId: profile.id,
              name: profile.displayName,
              email: profile.emails[0].value,
              avatar: profile.photos[0].value,
              isBlocked: false // Ensure new users aren’t blocked by default
            });
            await user.save();
          }
        }

        if (user.isBlocked) {
          return done(null, false, { message: "Your account is blocked." });
        }

        const token = jwt.sign({ id: user._id, role: user.role || 'user' }, process.env.JWT_SECRET, { expiresIn: "7d" });
        user.token = token; // Temporarily attach token to user object for callback
        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

export default passport;