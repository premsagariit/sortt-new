SORTT — FINAL AUTHENTICATION ARCHITECTURE REPORT
Status: Approved for Implementation (MVP Build)
Scope: Replaces Clerk + Meta WhatsApp with OTPless + Custom Backend JWTs

This document serves as the absolute ground truth for the Auth Architecture pivot. It must be read and adhered to by the Antigravity agent before executing Day 8 tasks.

🛑 WHAT NOT TO DO (STRICT BLOCKERS)
DO NOT use Clerk. @clerk/clerk-expo, @clerk/nextjs, and @clerk/clerk-sdk-node must be completely purged from the monorepo.

DO NOT implement traditional SMS. No Twilio, no MSG91, no Authkey.io. We are bypassing DLT regulations entirely.

DO NOT use Meta WhatsApp APIs. The backend will not trigger outbound WhatsApp messages. OTPless handles the entire handshake.

DO NOT use jsonwebtoken. The TRD strictly mandates the jose library for JWT generation and verification across the backend and Next.js edge environments.

DO NOT issue long-lived Access Tokens. 7-day or 30-day stateless access tokens are a massive security risk and are strictly forbidden.

DO NOT test mobile auth in Expo Go. otpless-react-native requires native modules. Testing must be done via an EAS Dev Build (pnpm dev:mobile).

DO NOT promise "Zero-Tap" login in UI copy. OTPless Silent Network Auth (SNA) only covers Jio and Vi. Airtel users (~35%) will automatically fallback to WhatsApp. The UI must reflect a "Continue with WhatsApp" primary action.

✅ WHAT TO DO (THE NEW ARCHITECTURE)
1. Mobile Users (Aggregators & Sellers)
Verification: Use the otpless-react-native SDK. The user taps "Continue with WhatsApp" → OTPless verifies the device → returns an otpless_token to the mobile app.

Backend Handshake: The mobile app sends the otpless_token to POST /api/auth/verify-token. The Express backend verifies this token server-to-server via the OTPless API to extract the verified phone number.

Session Management: The Express backend is the sole source of truth. It checks the DB, upserts the user, and signs its own custom JWTs.

2. Admin Users (Next.js Web Dashboard)
Verification: Admins do not use OTPless. They use a standard Email + Password login.

Backend Implementation: The backend will expose POST /api/admin/login. Passwords must be hashed and verified using bcrypt.

Session Management: The backend issues the exact same JWT structure as mobile, but the Next.js frontend will store them securely in HttpOnly cookies.

3. The Strict JWT Security Model
Regardless of whether a user logs in via Mobile (OTPless) or Web (Email/Password), the backend must issue two tokens using jose:

Access Token: Stateless. Expires in 1 Hour. Used for all API requests (Authorization: Bearer <token>).

Refresh Token: Stateful. Expires in 7 Days. Must be stored in the existing Upstash Redis database (key: refresh_token:<uuid>). Used to request a new Access Token.

Revocation: Logging out or banning a user is achieved by deleting their Refresh Token from Redis.

🛠 IMPLEMENTATION BLUEPRINT
Phase 1: Package Management
Remove:
pnpm rm @clerk/clerk-expo @clerk/nextjs @clerk/clerk-sdk-node

Install:
pnpm add otpless-react-native (Mobile)
pnpm add jose bcrypt (Backend)
pnpm add -D @types/bcrypt (Backend)

Phase 2: Mobile UI & State Changes (apps/mobile)
Delete OTP Screens: Remove the 4-digit OTP input screens and logic entirely.

Update Auth Screen: Replace the phone number form with a single "Continue with WhatsApp" button that triggers the OTPless SDK.

Session Storage: Replace Clerk's <SignedIn> / <SignedOut> context with a custom Zustand or Context store that reads the Access Token from Expo SecureStore.

Phase 3: Express Backend Route Changes (backend/src)
Delete: POST /api/auth/request-otp (No longer needed).

Rewrite: POST /api/auth/verify-otp becomes POST /api/auth/verify-token.

Accepts { otpless_token }.

Calls OTPless API to get phone number.

Upserts users table.

Generates jose JWTs (1hr Access, 7d Refresh).

Stores Refresh Token in Upstash Redis.

Add: POST /api/admin/login (Accepts email/password, checks bcrypt hash, returns identical JWT structure).

Middleware: Replace Clerk middleware with a custom Express middleware that uses jose to verify the Access Token and attach req.user.

Phase 4: Database Adjustments
Drop Clerk ID: If clerk_user_id exists in the schema, it can be dropped. The PostgreSQL id (UUID) is the definitive identifier.

Admin Credentials: Ensure a secure method for storing admin email and password_hash in the database.