import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const ADMIN_EMAIL = 'ezehaustine1@gmail.com';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Validate connection to Firestore on boot
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

// Validation and Defensive Payload Truncation Constants synced with firebase-blueprint.json
export const BLUEPRINT_LIMITS = {
  PORTFOLIO: {
    TITLE_MAX: 150,
    DESC_MAX: 1000,
    CATEGORY_MAX: 80,
    MEDIA_URL_MAX: 2000,
    THUMB_URL_MAX: 2000,
    EXIF_MAX: 200,
    CLIENT_MAX: 120,
  },
  CATEGORY: {
    NAME_MAX: 80,
    SLUG_MAX: 80,
    SLUG_REGEX: /^[a-zA-Z0-9_-]+$/,
  },
  SERVICE: {
    TITLE_MAX: 150,
    DESC_MAX: 1000,
    IMAGE_URL_MAX: 2000,
    DELIVERABLES_MAX: 300,
  },
  BOOKING: {
    NAME_MAX: 120,
    PHONE_MAX: 40,
    EMAIL_MAX: 150,
    EVENT_TYPE_MAX: 100,
    EVENT_DATE_MAX: 40,
    LOCATION_MAX: 250,
    SERVICE_MAX: 150,
    INFO_MAX: 2000,
  },
  TESTIMONIAL: {
    NAME_MAX: 120,
    ROLE_MAX: 120,
    REVIEW_MAX: 1500,
    PHOTO_URL_MAX: 2000,
  },
  SITE_SETTINGS: {
    HERO_TITLE_MAX: 150,
    SLOGAN_MAX: 250,
    HERO_SUBTITLE_MAX: 300,
    ABOUT_MAX: 3000,
    PHONE_MAX: 40,
    WHATSAPP_MAX: 40,
    LOCATION_MAX: 200,
  },
};

export function sanitizeString(val: string, maxLength: number, fallback = ''): string {
  const trimmed = (val || fallback).trim();
  return trimmed.slice(0, maxLength);
}

export function makeValidDocId(prefix: string): string {
  const rand = Math.random().toString(36).substring(2, 10);
  const cleanPrefix = prefix.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 24) || 'doc';
  return `${cleanPrefix}_${Date.now()}_${rand}`.slice(0, 120);
}
