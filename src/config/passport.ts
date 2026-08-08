import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { config } from "../config.js";
import { authService } from "../modules/auth/authService.js";

export function configurePassport() {
  passport.use(
    new GoogleStrategy(
      {
        clientID: config.googleClientId,
        clientSecret: config.googleClientSecret,
        callbackURL: config.googleCallbackUrl,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          // Google doesn't always provide email if user hasn't set one or scope missing,
          // but "email" scope typically guarantees at least one.
          const email = profile.emails?.[0]?.value;
          
          if (!email) {
            return done(new Error("Google did not return an email address."));
          }

          const googleProfile = {
            id: profile.id,
            email: email,
            displayName: profile.displayName,
            avatar: profile.photos?.[0]?.value,
          };

          const user = await authService.findOrCreateGoogleUser(googleProfile);
          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  // We don't need serialize/deserialize if we are not using session.
}
