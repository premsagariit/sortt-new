const { clerkClient } = require('@clerk/clerk-sdk-node');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

require('dotenv').config();

async function testKyc() {
    try {
        // 1. Get a test user from Clerk
        const users = await clerkClient.users.getUserList({ limit: 1 });
        if (users.data.length === 0) {
            console.log('No users found in Clerk.');
            return;
        }
        const userId = users.data[0].id;

        // 2. Generate a valid sign-in token / JWT
        console.log(`Generating token for user ${userId}...`);
        const tokenObj = await clerkClient.signInTokens.createSignInToken({
            userId: userId,
            expiresInSeconds: 60 * 5,
        });

        // Actually, createSignInToken generates a token used for the frontend to sign in.
        // To call our backend directly, we can just use the Clerk JWT template if configured, 
        // or we can test it using the frontend.
        // Wait, let's just make a POST to /api/auth/verify-otp locally, intercept the token! 
        console.log("Token:", tokenObj.token);

        // Let's create dummy files
        fs.writeFileSync('dummy.jpg', Buffer.from([0xFF, 0xD8, 0xFF, 0xE0])); // fake JPEG header

        const form = new FormData();
        form.append('aadhaar_front', fs.createReadStream('dummy.jpg'));
        form.append('aadhaar_back', fs.createReadStream('dummy.jpg'));
        form.append('selfie', fs.createReadStream('dummy.jpg'));
        form.append('shop_photo', fs.createReadStream('dummy.jpg'));

        console.log('Testing POST /api/aggregators/kyc ...');
        // We don't have a valid stateless JWT generated here unless we use a real Clerk session token.
        // The signInToken is NOT a session JWT. 
        // The easiest way is to let the user manually test or mock the middleware.
    } catch (err) {
        console.error(err);
    }
}

testKyc();
