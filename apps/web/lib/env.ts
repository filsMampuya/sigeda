const defaultApiUrl = "http://127.0.0.1:4000";

export function getServerApiBaseUrl() {
  return process.env.SIGEDA_API_URL ?? process.env.NEXT_PUBLIC_SIGEDA_API_URL ?? defaultApiUrl;
}

export function getPublicApiBaseUrl() {
  return process.env.NEXT_PUBLIC_SIGEDA_API_URL ?? defaultApiUrl;
}

function getRequiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }

  return value;
}

type FirebaseWebConfig = {
  apiKey: string;
  authDomain: string;
  appId: string;
  messagingSenderId: string;
  projectId: string;
  storageBucket: string;
  measurementId?: string;
};

function getFirebaseWebConfigFromNextPublicEnv(): FirebaseWebConfig | null {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? null;
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? null;
  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? null;
  const messagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? null;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? null;
  const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? null;

  if (!apiKey || !authDomain || !appId || !messagingSenderId || !projectId || !storageBucket) {
    return null;
  }

  return {
    apiKey,
    authDomain,
    appId,
    messagingSenderId,
    projectId,
    storageBucket,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
  };
}

function getFirebaseWebConfigFromFirebaseSystemEnv(): FirebaseWebConfig | null {
  const rawConfig = process.env.FIREBASE_WEBAPP_CONFIG;

  if (!rawConfig) {
    return null;
  }

  try {
    const parsedConfig = JSON.parse(rawConfig) as Partial<FirebaseWebConfig>;

    if (
      !parsedConfig.apiKey ||
      !parsedConfig.authDomain ||
      !parsedConfig.appId ||
      !parsedConfig.messagingSenderId ||
      !parsedConfig.projectId ||
      !parsedConfig.storageBucket
    ) {
      return null;
    }

    return {
      apiKey: parsedConfig.apiKey,
      authDomain: parsedConfig.authDomain,
      appId: parsedConfig.appId,
      messagingSenderId: parsedConfig.messagingSenderId,
      projectId: parsedConfig.projectId,
      storageBucket: parsedConfig.storageBucket,
      measurementId: parsedConfig.measurementId
    };
  } catch {
    return null;
  }
}

export function getFirebaseWebConfig() {
  return (
    getFirebaseWebConfigFromNextPublicEnv() ??
    getFirebaseWebConfigFromFirebaseSystemEnv() ?? {
      apiKey: getRequiredEnv("NEXT_PUBLIC_FIREBASE_API_KEY"),
      authDomain: getRequiredEnv("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"),
      appId: getRequiredEnv("NEXT_PUBLIC_FIREBASE_APP_ID"),
      messagingSenderId: getRequiredEnv("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"),
      projectId: getRequiredEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID"),
      storageBucket: getRequiredEnv("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"),
      measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
    }
  );
}

export function getOptionalFirebaseWebConfig() {
  return getFirebaseWebConfigFromNextPublicEnv() ?? getFirebaseWebConfigFromFirebaseSystemEnv();
}
