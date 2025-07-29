import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
// import { polar, checkout, portal } from "@polar-sh/better-auth";

import { db } from "@/db";
import * as schema from "@/db/schema";

// import { polarClient } from "./polar";

export const auth = betterAuth({
  trustedOrigins: [
    "http://localhost:3000",
    "https://relevant-goldfish-boss.ngrok-free.app",
    "https://solely-brave-chipmunk.ngrok-free.app"
  ],
  plugins: [
    // Temporarily disabled Polar integration - uncomment when you have valid API credentials
    // polar({
    //   client: polarClient,
    //   createCustomerOnSignUp: true,
    //   use: [
    //     checkout({
    //       authenticatedUsersOnly: true,
    //       successUrl: "/upgrade",
    //     }),
    //     portal(),
    //   ],
    // }),
  ],
  socialProviders: {
    github: { 
      clientId: process.env.GITHUB_CLIENT_ID as string, 
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string, 
    },
    google: { 
      clientId: process.env.GOOGLE_CLIENT_ID as string, 
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string, 
    }, 
  },
  emailAndPassword: {
    enabled: true,
  },
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      ...schema,
    },
  }),
});
