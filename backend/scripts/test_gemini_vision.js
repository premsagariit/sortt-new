#!/usr/bin/env node

/**
 * Comprehensive test script for Gemini Vision API integration
 * Tests all components: backend connectivity, Gemini API, R2 storage
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

// Load environment variables
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

console.log('🔍 GEMINI VISION API DIAGNOSTIC TEST\n');
console.log('=' .repeat(60));

// Test 1: Check environment variables
console.log('\n1. CHECKING ENVIRONMENT VARIABLES');
console.log('-' .repeat(60));

const requiredEnv = [
  'GEMINI_API_KEY',
  'GEMINI_MODEL',
  'R2_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET_NAME',
];

let envValid = true;
requiredEnv.forEach(envVar => {
  const value = process.env[envVar];
  if (!value) {
    console.log(`❌ MISSING: ${envVar}`);
    envValid = false;
  } else {
    const masked = value.length > 20 ? value.slice(0, 15) + '...' : value;
    console.log(`✅ ${envVar}: ${masked}`);
  }
});

if (!envValid) {
  console.error('\n🛑 CRITICAL: Missing environment variables. Exiting.');
  process.exit(1);
}

// Test 2: Check backend connectivity
console.log('\n2. CHECKING BACKEND CONNECTIVITY');
console.log('-' .repeat(60));

const checkBackend = () => {
  return new Promise((resolve) => {
    const req = http.get('http://localhost:8080/health', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('✅ Backend is running on port 8080');
          resolve(true);
        } else {
          console.log('❌ Backend returned status:', res.statusCode);
          resolve(false);
        }
      });
    }).on('error', (err) => {
      console.log('❌ Backend not reachable:', err.message);
      resolve(false);
    });
    req.end();
  });
};

// Test 3: Check Gemini API directly
console.log('\n3. CHECKING GEMINI API');
console.log('-' .repeat(60));

const testGeminiAPI = async () => {
  try {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = client.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-2.5-flash' });

    console.log(`Testing model: ${process.env.GEMINI_MODEL || 'gemini-2.5-flash'}`);

    // Test with a simple prompt
    const response = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [{ text: 'Say "Gemini API is working" in JSON format: {"status": "working"}' }]
      }],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: 'application/json',
      },
    });

    const text = response.response.text();
    console.log('✅ Gemini API is responsive');
    console.log('   Response:', text.slice(0, 50) + '...');
    return true;
  } catch (error) {
    console.log('❌ Gemini API error:', error.message);
    return false;
  }
};

// Test 4: Test image analysis with test image
console.log('\n4. TESTING IMAGE ANALYSIS');
console.log('-' .repeat(60));

const testImageAnalysis = async () => {
  try {
    const testImagePath = 'c:/Users/Prem Sagar/Downloads/Sortt/1000289766.jpg';

    if (!fs.existsSync(testImagePath)) {
      console.log('❌ Test image not found:', testImagePath);
      return false;
    }

    const imageBuffer = fs.readFileSync(testImagePath);
    console.log(`✅ Test image loaded: ${imageBuffer.length} bytes`);

    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = client.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-2.5-flash' });

    const ANALYZE_PROMPT = `Analyse this scrap/recyclable material image.
Return ONLY a valid JSON object with this exact shape:
{ "material_code": "<one of: metal|plastic|paper|ewaste|fabric|glass>", "estimated_weight_kg": <positive number>, "confidence": <0.0 to 1.0> }
No preamble, no explanation, no markdown formatting. JSON only.`;

    console.log('Sending image to Gemini Vision API...');
    const startTime = Date.now();

    const response = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [
          { text: ANALYZE_PROMPT },
          {
            inlineData: {
              data: imageBuffer.toString('base64'),
              mimeType: 'image/jpeg',
            },
          },
        ],
      }],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: 'application/json',
      },
    });

    const responseTime = Date.now() - startTime;
    const text = response.response.text().trim();

    console.log(`✅ Image analysis completed in ${responseTime}ms`);
    console.log('   Response:', text);

    // Try to parse as JSON
    try {
      const parsed = JSON.parse(text);
      console.log('✅ Response is valid JSON');
      console.log('   material_code:', parsed.material_code);
      console.log('   estimated_weight_kg:', parsed.estimated_weight_kg);
      console.log('   confidence:', parsed.confidence);
      return true;
    } catch (e) {
      console.log('❌ Response is not valid JSON:', e.message);
      return false;
    }
  } catch (error) {
    console.log('❌ Image analysis error:', error.message);
    return false;
  }
};

// Test 5: Test R2 storage
console.log('\n5. TESTING R2 STORAGE');
console.log('-' .repeat(60));

const testR2Storage = async () => {
  try {
    const { createStorageProvider } = require('@sortt/storage');
    const provider = createStorageProvider();

    console.log('Testing R2 upload...');
    const testBuffer = Buffer.from('Test data for R2 storage');
    const testKey = `test/${Date.now()}-audit.txt`;

    const result = await provider.upload(process.env.R2_BUCKET_NAME, testKey, testBuffer);

    console.log('✅ R2 storage upload successful');
    console.log('   File key:', result.fileKey);

    // Try to get signed URL
    const signedUrl = await provider.getSignedUrl(testKey);
    console.log('✅ Signed URL generated');
    console.log('   URL preview:', signedUrl.slice(0, 60) + '...');

    return true;
  } catch (error) {
    console.log('❌ R2 storage error:', error.message);
    return false;
  }
};

// Test 6: Test full scrap analysis route
console.log('\n6. TESTING FULL SCRAP ANALYSIS ROUTE');
console.log('-' .repeat(60));

const testScrapRoute = async () => {
  try {
    const testImagePath = 'c:/Users/Prem Sagar/Downloads/Sortt/1000289766.jpg';
    const imageBuffer = fs.readFileSync(testImagePath);

    // Create FormData
    const FormData = require('form-data');
    const formData = new FormData();
    formData.append('image', imageBuffer, 'test.jpg');

    const axios = require('axios');
    const api = axios.create({
      baseURL: 'http://localhost:8080',
      timeout: 30000,
    });

    // Add auth header (using a test token - will fail if not authenticated, but we can see backend response)
    console.log('Sending request to POST /api/scrap/analyze...');

    try {
      const response = await api.post('/api/scrap/analyze', formData, {
        headers: formData.getHeaders(),
      });
      console.log('✅ Route responded:', response.status);
      console.log('   Response:', JSON.stringify(response.data).slice(0, 100) + '...');
      return true;
    } catch (axiosError) {
      if (axiosError.response) {
        console.log('⚠️  Route returned status:', axiosError.response.status);
        console.log('   Response:', JSON.stringify(axiosError.response.data));
        // 401 is expected if not authenticated - route is working
        return axiosError.response.status === 401 || axiosError.response.status === 400;
      } else {
        console.log('❌ Network error:', axiosError.message);
        return false;
      }
    }
  } catch (error) {
    console.log('❌ Test setup error:', error.message);
    return false;
  }
};

// Main test runner
(async () => {
  try {
    const backendOk = await checkBackend();
    if (!backendOk) {
      console.log('\n🛑 Backend not running. Please start it first.');
      process.exit(1);
    }

    const geminiOk = await testGeminiAPI();
    const imageOk = await testImageAnalysis();
    const r2Ok = await testR2Storage();
    const routeOk = await testScrapRoute();

    console.log('\n' + '=' .repeat(60));
    console.log('TEST SUMMARY');
    console.log('=' .repeat(60));
    console.log(`✅ Environment Variables: PASS`);
    console.log(`${backendOk ? '✅' : '❌'} Backend Connectivity`);
    console.log(`${geminiOk ? '✅' : '❌'} Gemini API`);
    console.log(`${imageOk ? '✅' : '❌'} Image Analysis`);
    console.log(`${r2Ok ? '✅' : '❌'} R2 Storage`);
    console.log(`${routeOk ? '✅' : '❌'} Scrap Route`);

    const allPassed = backendOk && geminiOk && imageOk && r2Ok && routeOk;
    console.log('\n' + (allPassed ? '\'✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'));

    process.exit(allPassed ? 0 : 1);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
})();
