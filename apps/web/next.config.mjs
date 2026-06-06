const envKeys = [
  "SIGEDA_API_URL",
  "NEXT_PUBLIC_SIGEDA_API_URL",
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
  "NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID"
];

const env = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));

/** @type {import('next').NextConfig} */
const nextConfig = {
  env
};

export default nextConfig;
