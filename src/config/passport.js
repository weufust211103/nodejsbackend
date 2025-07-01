const passport = require("passport");
const FacebookStrategy = require("passport-facebook").Strategy;
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  const user = await prisma.users.findUnique({ where: { id } });
  done(null, user);
});

// Facebook Strategy
passport.use(new FacebookStrategy({
  clientID: process.env.FACEBOOK_CLIENT_ID,
  clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
  callbackURL: "/auth/facebook/callback",
  profileFields: ["id", "emails", "name"]
}, async (accessToken, refreshToken, profile, done) => {
  let user = await prisma.users.findUnique({ where: { facebookId: profile.id } });
  if (!user) {
    user = await prisma.users.create({
      data: {
        facebookId: profile.id,
        email: profile.emails?.[0]?.value,
        username: profile.name.givenName + profile.name.familyName
      }
    });
  }
  return done(null, user);
}));

// Google Strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: "/auth/google/callback"
}, async (accessToken, refreshToken, profile, done) => {
  let user = await prisma.users.findUnique({ where: { googleId: profile.id } });
  if (!user) {
    user = await prisma.users.create({
      data: {
        googleId: profile.id,
        email: profile.emails?.[0]?.value,
        username: profile.displayName.replace(/\s/g, "")
      }
    });
  }
  return done(null, user);
}));

module.exports = passport;