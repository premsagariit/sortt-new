import Ably from 'ably';

let ablyRest: Ably.Rest | null = null;

if (process.env.ABLY_API_KEY) {
  ablyRest = new Ably.Rest(process.env.ABLY_API_KEY);
} else {
  console.warn('[ablyProvider] ABLY_API_KEY is not set. Realtime features will be disabled.');
}

export { ablyRest };
