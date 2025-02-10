require("dotenv").config();
const express = require("express");
const session = require("express-session");
const passport = require("passport");
const OIDCStrategy = require("passport-azure-ad").OIDCStrategy;

const app = express();

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || "fallback-secret",
    resave: false,
    saveUninitialized: true,
  })
);

// Passport initialization
app.use(passport.initialize());
app.use(passport.session());

// Azure AD OIDC Strategy
passport.use(
  new OIDCStrategy(
    {
      identityMetadata: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/v2.0/.well-known/openid-configuration`,
      clientID: process.env.AZURE_CLIENT_ID,
      clientSecret: process.env.AZURE_CLIENT_SECRET,
      responseType: "code",
      responseMode: "query",
      redirectUrl: "http://localhost:3000/auth/openid/return",
      allowHttpForRedirectUrl: true, // Use HTTPS in production
      validateIssuer: false,
      scope: ["openid", "profile", "email"],
    },
    (iss, sub, profile, accessToken, refreshToken, params, done) => {
      console.log("User authenticated:", profile);
      console.log("Access Token:", accessToken);
      console.log("Refresh Token:", refreshToken);

      // Store tokens in session
      profile.accessToken = accessToken;
      profile.refreshToken = refreshToken;

      return done(null, profile);
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((obj, done) => {
  done(null, obj);
});

// Route to trigger authentication
app.get(
  "/",
  passport.authenticate("azuread-openidconnect", { failureRedirect: "/login" })
);

// Callback route for Azure authentication
app.get(
  "/auth/openid/return",
  passport.authenticate("azuread-openidconnect", { failureRedirect: "/login" }),
  (req, res) => {
    console.log("User logged in:", req.user.displayName);
    console.log("Access Token from session:", req.user.accessToken);

    res.send(`Hello ${req.user.displayName}, you are authenticated!`);
  }
);

// Logout route
app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.send("Logged out!");
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
