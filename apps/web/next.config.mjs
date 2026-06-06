// const defaultEnv = {
//   SIGEDA_API_URL: "https://us-central1-sigeda-c80ea.cloudfunctions.net/server",
//   NEXT_PUBLIC_SIGEDA_API_URL: "https://us-central1-sigeda-c80ea.cloudfunctions.net/server",
//   NEXT_PUBLIC_FIREBASE_API_KEY: "AIzaSyB9i9YvjZsRlbV3RLbSV5Xlbu6KIDna4Gk",
//   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "sigeda-c80ea.firebaseapp.com",
//   NEXT_PUBLIC_FIREBASE_PROJECT_ID: "sigeda-c80ea",
//   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: "sigeda-c80ea.firebasestorage.app",
//   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "896328872731",
//   NEXT_PUBLIC_FIREBASE_APP_ID: "1:896328872731:web:bcf2f975ad63d5638259be",
//   NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: "G-WZTRFPBKQT"
// };

// const env = Object.fromEntries(
//   Object.entries(defaultEnv).map(([key, value]) => [key, process.env[key] ?? value])
// );

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    SIGEDA_API_URL: "https://us-central1-sigeda-c80ea.cloudfunctions.net/server",
    NEXT_PUBLIC_SIGEDA_API_URL: "https://us-central1-sigeda-c80ea.cloudfunctions.net/server",
    NEXT_PUBLIC_FIREBASE_API_KEY: "AIzaSyB9i9YvjZsRlbV3RLbSV5Xlbu6KIDna4Gk",
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "sigeda-c80ea.firebaseapp.com",
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: "sigeda-c80ea",
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: "sigeda-c80ea.firebasestorage.app",
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "896328872731",
    NEXT_PUBLIC_FIREBASE_APP_ID: "1:896328872731:web:bcf2f975ad63d5638259be",
    NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: "G-WZTRFPBKQT",
  },
};

export default nextConfig;
