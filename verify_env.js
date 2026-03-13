const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

const backendEnvPath = path.resolve(__dirname, 'backend/.env');
console.log('Checking for .env at:', backendEnvPath);

if (fs.existsSync(backendEnvPath)) {
    console.log('.env file exists.');
    const result = dotenv.config({ path: backendEnvPath });
    if (result.error) {
        console.error('Error loading .env:', result.error);
    } else {
        console.log('CLERK_SECRET_KEY loaded:', process.env.CLERK_SECRET_KEY ? 'YES' : 'NO');
        console.log('CLERK_PUBLISHABLE_KEY loaded:', process.env.CLERK_PUBLISHABLE_KEY ? 'YES' : 'NO');
    }
} else {
    console.error('.env file NOT found.');
}
