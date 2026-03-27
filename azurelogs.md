2026-03-27T10:40:00.0843964Z [Scheduler] Running job: Aggregator Online Culling
2026-03-27T10:40:00.0868573Z [Scheduler] Running job: Ably Connection Monitor
2026-03-27T10:40:00.0892569Z [Scheduler] Completed job: Ably Connection Monitor
2026-03-27T10:40:00.1445562Z [Scheduler] Completed job: Aggregator Online Culling
2026-03-27T10:45:00.0375055Z [Scheduler] Running job: Rating Stats Refresh
2026-03-27T10:45:00.0375436Z [Scheduler] Running job: Ably Connection Monitor
2026-03-27T10:45:00.0381091Z [Scheduler] Completed job: Ably Connection Monitor
2026-03-27T10:45:00.038869Z [Scheduler] Running job: Aggregator Online Culling
2026-03-27T10:45:00.2110961Z [Scheduler] Completed job: Rating Stats Refresh
2026-03-27T10:45:00.2178618Z [Scheduler] Completed job: Aggregator Online Culling
2026-03-27T10:45:13.7251334Z Unhandled Error: Error: Publishable key is missing. Ensure that your publishable key is correctly configured. Double-check your environment configuration for your keys, or access them here: https://dashboard.clerk.com/last-active?path=api-keys
2026-03-27T10:45:13.7251754Z     at parsePublishableKey (/node_modules/@clerk/shared/dist/runtime/keys-wr08qE7Y.js:53:36)
2026-03-27T10:45:13.7251789Z     at assertValidPublishableKey (/node_modules/@clerk/backend/dist/index.js:2828:39)
2026-03-27T10:45:13.725181Z     at AuthenticateContext.initPublishableKeyValues (/node_modules/@clerk/backend/dist/index.js:4822:5)
2026-03-27T10:45:13.725439Z     at new AuthenticateContext (/node_modules/@clerk/backend/dist/index.js:4715:12)
2026-03-27T10:45:13.7254413Z     at createAuthenticateContext (/node_modules/@clerk/backend/dist/index.js:4916:10)
2026-03-27T10:45:13.7254435Z     at authenticateRequest (/node_modules/@clerk/backend/dist/index.js:5874:37)
2026-03-27T10:45:13.7254457Z     at Proxy.authenticateRequest2 (/node_modules/@clerk/backend/dist/index.js:6401:12)
2026-03-27T10:45:13.7254476Z     at authenticateRequest (/node_modules/@clerk/express/dist/index.js:150:23)
2026-03-27T10:45:13.7254494Z     at middleware (/node_modules/@clerk/express/dist/index.js:195:34)
2026-03-27T10:45:13.7254548Z     at /node_modules/@clerk/express/dist/index.js:236:5
2026-03-27T10:45:13.7331731Z Unhandled Error: Error: Publishable key is missing. Ensure that your publishable key is correctly configured. Double-check your environment configuration for your keys, or access them here: https://dashboard.clerk.com/last-active?path=api-keys
2026-03-27T10:45:13.7332039Z     at parsePublishableKey (/node_modules/@clerk/shared/dist/runtime/keys-wr08qE7Y.js:53:36)
2026-03-27T10:45:13.7332067Z     at assertValidPublishableKey (/node_modules/@clerk/backend/dist/index.js:2828:39)
2026-03-27T10:45:13.7332087Z     at AuthenticateContext.initPublishableKeyValues (/node_modules/@clerk/backend/dist/index.js:4822:5)
2026-03-27T10:45:13.7332106Z     at new AuthenticateContext (/node_modules/@clerk/backend/dist/index.js:4715:12)
2026-03-27T10:45:13.7332129Z     at createAuthenticateContext (/node_modules/@clerk/backend/dist/index.js:4916:10)
2026-03-27T10:45:13.7332151Z     at authenticateRequest (/node_modules/@clerk/backend/dist/index.js:5874:37)
2026-03-27T10:45:13.733217Z     at Proxy.authenticateRequest2 (/node_modules/@clerk/backend/dist/index.js:6401:12)
2026-03-27T10:45:13.7332915Z     at authenticateRequest (/node_modules/@clerk/express/dist/index.js:150:23)
2026-03-27T10:45:13.7332959Z     at middleware (/node_modules/@clerk/express/dist/index.js:195:34)
2026-03-27T10:45:13.7332976Z     at /node_modules/@clerk/express/dist/index.js:236:5
2026-03-27T10:45:29.443619Z [OTP] WhatsApp send failed (non-fatal): {
2026-03-27T10:45:29.4438321Z   error: {
2026-03-27T10:45:29.4438365Z     message: 'Error validating access token: Session has expired on Friday, 27-Mar-26 00:00:00 PDT. The current time is Friday, 27-Mar-26 03:45:29 PDT.',
2026-03-27T10:45:29.4438386Z     type: 'OAuthException',
2026-03-27T10:45:29.4438411Z     code: 190,
2026-03-27T10:45:29.4438428Z     error_subcode: 463,
2026-03-27T10:45:29.4438444Z     fbtrace_id: 'ABNEtH34xWn6Ij7cjMvybKN'
2026-03-27T10:45:29.4438457Z   }
2026-03-27T10:45:29.4438539Z }
2026-03-27T10:45:29.4479731Z [OTP DEV] Testing Code for 1009: 732378
2026-03-27T10:45:43.2231815Z Unhandled Error: Error: Publishable key is missing. Ensure that your publishable key is correctly configured. Double-check your environment configuration for your keys, or access them here: https://dashboard.clerk.com/last-active?path=api-keys
2026-03-27T10:45:43.223219Z     at parsePublishableKey (/node_modules/@clerk/shared/dist/runtime/keys-wr08qE7Y.js:53:36)
2026-03-27T10:45:43.2232218Z     at assertValidPublishableKey (/node_modules/@clerk/backend/dist/index.js:2828:39)
2026-03-27T10:45:43.2232243Z     at AuthenticateContext.initPublishableKeyValues (/node_modules/@clerk/backend/dist/index.js:4822:5)
2026-03-27T10:45:43.2232267Z     at new AuthenticateContext (/node_modules/@clerk/backend/dist/index.js:4715:12)
2026-03-27T10:45:43.2232289Z     at createAuthenticateContext (/node_modules/@clerk/backend/dist/index.js:4916:10)
2026-03-27T10:45:43.2232311Z     at authenticateRequest (/node_modules/@clerk/backend/dist/index.js:5874:37)
2026-03-27T10:45:43.2232332Z     at Proxy.authenticateRequest2 (/node_modules/@clerk/backend/dist/index.js:6401:12)
2026-03-27T10:45:43.2232396Z     at authenticateRequest (/node_modules/@clerk/express/dist/index.js:150:23)
2026-03-27T10:45:43.2232419Z     at middleware (/node_modules/@clerk/express/dist/index.js:195:34)
2026-03-27T10:45:43.2232438Z     at /node_modules/@clerk/express/dist/index.js:236:5
2026-03-27T10:45:43.4127391Z Unhandled Error: Error: Publishable key is missing. Ensure that your publishable key is correctly configured. Double-check your environment configuration for your keys, or access them here: https://dashboard.clerk.com/last-active?path=api-keys
2026-03-27T10:45:43.4127759Z     at parsePublishableKey (/node_modules/@clerk/shared/dist/runtime/keys-wr08qE7Y.js:53:36)
2026-03-27T10:45:43.412779Z     at assertValidPublishableKey (/node_modules/@clerk/backend/dist/index.js:2828:39)
2026-03-27T10:45:43.4127812Z     at AuthenticateContext.initPublishableKeyValues (/node_modules/@clerk/backend/dist/index.js:4822:5)
2026-03-27T10:45:43.4127835Z     at new AuthenticateContext (/node_modules/@clerk/backend/dist/index.js:4715:12)
2026-03-27T10:45:43.4127854Z     at createAuthenticateContext (/node_modules/@clerk/backend/dist/index.js:4916:10)
2026-03-27T10:45:43.4127872Z     at authenticateRequest (/node_modules/@clerk/backend/dist/index.js:5874:37)
2026-03-27T10:45:43.4127933Z     at Proxy.authenticateRequest2 (/node_modules/@clerk/backend/dist/index.js:6401:12)
2026-03-27T10:45:43.4127951Z     at authenticateRequest (/node_modules/@clerk/express/dist/index.js:150:23)
2026-03-27T10:45:43.4127969Z     at middleware (/node_modules/@clerk/express/dist/index.js:195:34)
2026-03-27T10:45:43.4127986Z     at /node_modules/@clerk/express/dist/index.js:236:5