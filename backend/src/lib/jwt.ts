/**
 * backend/src/lib/jwt.ts
 * ─────────────────────────────────────────────────────────────────
 * Central JWT issuing and verification using `jose` (TRD §13).
 *
 * Rules:
 *  - Algorithm: HS256
 *  - Secret:    JWT_SECRET env var (min 32 chars enforced at startup)
 *  - Issuance:  issueToken()  — returns compact JWS string
 *  - Check:     verifyAppToken() — throws on any verification failure
 *
 * The `sub` field is always the internal `users.id` (UUID).
 * Role is determined at middleware time by DB lookup — NEVER trusted
 * from the JWT claim alone (MEMORY.md security rule).
 * ─────────────────────────────────────────────────────────────────
 */

import { SignJWT, jwtVerify, type JWTPayload } from 'jose';

const ALG = 'HS256';
const DEV_FALLBACK_JWT_SECRET = 'sortt-dev-insecure-jwt-secret-please-set-jwt-secret';
let warnedAboutDevFallback = false;

function getSecret(): Uint8Array {
    const raw = process.env.JWT_SECRET;
    if (raw && raw.length >= 32) {
        return new TextEncoder().encode(raw);
    }

    if (process.env.NODE_ENV !== 'production') {
        if (!warnedAboutDevFallback) {
            warnedAboutDevFallback = true;
            console.warn('[jwt] JWT_SECRET missing/too short in non-production. Using dev fallback secret; set JWT_SECRET to remove this warning.');
        }
        return new TextEncoder().encode(DEV_FALLBACK_JWT_SECRET);
    }

    throw new Error('[jwt] JWT_SECRET must be set and at least 32 characters long');
}

export interface AppTokenPayload extends JWTPayload {
    /** internal users.id (UUID) */
    sub: string;
}

/**
 * Issue a short-lived JWT for a verified user.
 * @param userId   internal users.id UUID
 * @param ttl      duration string understood by jose (e.g. '15m', '7d')
 */
export async function issueToken(userId: string, ttl: string = '7d'): Promise<string> {
    const secret = getSecret();
    return new SignJWT({ sub: userId })
        .setProtectedHeader({ alg: ALG })
        .setIssuedAt()
        .setExpirationTime(ttl)
        .sign(secret);
}

/**
 * Verify a JWT produced by this module.
 * Throws `JWTExpired`, `JWSInvalid`, or `JWTClaimValidationFailed` on failure.
 */
export async function verifyAppToken(token: string): Promise<AppTokenPayload> {
    const secret = getSecret();
    const { payload } = await jwtVerify(token, secret, { algorithms: [ALG] });
    if (!payload.sub) {
        throw new Error('JWT missing sub claim');
    }
    return payload as AppTokenPayload;
}
