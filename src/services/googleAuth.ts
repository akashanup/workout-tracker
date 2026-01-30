/**
 * Google Authentication Service
 * Handles OAuth sign-in using Google Identity Services
 */

import { AuthState } from '../types/models';

// Configuration from environment variables
// Set VITE_GOOGLE_CLIENT_ID in your .env file
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string;
// Using drive.file scope - only allows access to files created/opened by this app
// This is more privacy-friendly than full spreadsheets access
const SCOPES = 'https://www.googleapis.com/auth/drive.file';

// Validate that Client ID is configured
if (!CLIENT_ID || CLIENT_ID === 'your-client-id.apps.googleusercontent.com') {
  console.error(
    'Google Client ID not configured. Please create a .env file with VITE_GOOGLE_CLIENT_ID'
  );
}

// Storage keys
const STORAGE_KEYS = {
  ACCESS_TOKEN: 'workout_access_token',
  TOKEN_EXPIRY: 'workout_token_expiry',
  USER_EMAIL: 'workout_user_email',
  USER_NAME: 'workout_user_name'
};

// Declare Google Identity Services types
declare global {
  interface Window {
    google: {
      accounts: {
        oauth2: {
          initTokenClient: (config: TokenClientConfig) => TokenClient;
          revoke: (token: string, callback: () => void) => void;
        };
      };
    };
    gapi: {
      load: (api: string, callback: () => void) => void;
      client: {
        init: (config: { discoveryDocs?: string[] }) => Promise<void>;
        setToken: (token: { access_token: string } | null) => void;
        sheets: {
          spreadsheets: SpreadsheetAPI;
        };
      };
    };
  }
}

interface TokenClientConfig {
  client_id: string;
  scope: string;
  callback: (response: TokenResponse) => void;
  error_callback?: (error: { type: string; message: string }) => void;
}

interface TokenClient {
  requestAccessToken: (options?: { prompt?: string }) => void;
}

interface TokenResponse {
  access_token: string;
  expires_in: number;
  error?: string;
}

interface SpreadsheetAPI {
  create: (params: { resource: object }) => Promise<{ result: { spreadsheetId: string } }>;
  get: (params: { spreadsheetId: string }) => Promise<{ result: object }>;
  batchUpdate: (params: { spreadsheetId: string; resource: object }) => Promise<{ result: object }>;
  values: {
    get: (params: { spreadsheetId: string; range: string }) => Promise<{ result: { values?: string[][] } }>;
    update: (params: {
      spreadsheetId: string;
      range: string;
      valueInputOption: string;
      resource: { values: (string | number | null)[][] };
    }) => Promise<{ result: object }>;
    append: (params: {
      spreadsheetId: string;
      range: string;
      valueInputOption: string;
      insertDataOption: string;
      resource: { values: (string | number | null)[][] };
    }) => Promise<{ result: object }>;
    batchUpdate: (params: {
      spreadsheetId: string;
      resource: object;
    }) => Promise<{ result: object }>;
    clear: (params: {
      spreadsheetId: string;
      range: string;
    }) => Promise<{ result: object }>;
  };
}

let tokenClient: TokenClient | null = null;
let gapiInitialized = false;
let gisInitialized = false;

// Callbacks for auth state changes
type AuthCallback = (state: AuthState) => void;
const authCallbacks: AuthCallback[] = [];

/**
 * Initialize the Google API client library
 */
export async function initGapiClient(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window.gapi === 'undefined') {
      reject(new Error('Google API script not loaded'));
      return;
    }

    window.gapi.load('client', async () => {
      try {
        await window.gapi.client.init({
          discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4']
        });
        gapiInitialized = true;
        
        // Restore token from storage if available
        const storedToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
        const tokenExpiry = localStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRY);
        
        if (storedToken && tokenExpiry) {
          const expiryTime = parseInt(tokenExpiry, 10);
          if (Date.now() < expiryTime) {
            window.gapi.client.setToken({ access_token: storedToken });
            notifyAuthChange();
          } else {
            // Token expired, clear storage
            clearStoredAuth();
          }
        }
        
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  });
}

/**
 * Initialize Google Identity Services token client
 */
export function initGisClient(): void {
  if (typeof window.google === 'undefined') {
    console.error('Google Identity Services script not loaded');
    return;
  }

  tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPES,
    callback: handleTokenResponse,
    error_callback: (error) => {
      console.error('GIS Error:', error);
    }
  });

  gisInitialized = true;
}

/**
 * Fetch user info from Google's userinfo endpoint
 */
async function fetchUserInfo(accessToken: string): Promise<void> {
  try {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    if (response.ok) {
      const userInfo = await response.json();
      localStorage.setItem(STORAGE_KEYS.USER_EMAIL, userInfo.email || '');
      localStorage.setItem(STORAGE_KEYS.USER_NAME, userInfo.name || '');
      localStorage.setItem('workout_user_picture', userInfo.picture || '');
    }
  } catch (error) {
    console.error('Failed to fetch user info:', error);
  }
}

/**
 * Handle the token response from Google
 */
function handleTokenResponse(response: TokenResponse): void {
  if (response.error) {
    console.error('Token error:', response.error);
    return;
  }

  // Store the token
  const expiryTime = Date.now() + response.expires_in * 1000;
  localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, response.access_token);
  localStorage.setItem(STORAGE_KEYS.TOKEN_EXPIRY, expiryTime.toString());

  // Set token for gapi client
  window.gapi.client.setToken({ access_token: response.access_token });

  // Fetch user profile from Google userinfo endpoint
  fetchUserInfo(response.access_token).then(() => {
    notifyAuthChange();
  }).catch(() => {
    // Still notify even if user info fetch fails
    notifyAuthChange();
  });
}

/**
 * Initialize both Google APIs
 */
export async function initGoogleAuth(): Promise<void> {
  // Wait for scripts to load
  await waitForGoogleScripts();
  
  await initGapiClient();
  initGisClient();
}

/**
 * Wait for Google scripts to be available
 */
function waitForGoogleScripts(): Promise<void> {
  return new Promise((resolve) => {
    const checkScripts = () => {
      if (typeof window.google !== 'undefined' && typeof window.gapi !== 'undefined') {
        resolve();
      } else {
        setTimeout(checkScripts, 100);
      }
    };
    checkScripts();
  });
}

/**
 * Sign in the user
 */
export function signIn(): void {
  if (!gisInitialized || !tokenClient) {
    console.error('Google Identity Services not initialized');
    return;
  }

  // Check if we already have a valid token
  const storedToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  const tokenExpiry = localStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRY);

  if (storedToken && tokenExpiry && Date.now() < parseInt(tokenExpiry, 10)) {
    // Token still valid, just use it
    window.gapi.client.setToken({ access_token: storedToken });
    notifyAuthChange();
    return;
  }

  // Request new token
  tokenClient.requestAccessToken({ prompt: 'consent' });
}

/**
 * Sign out the user
 */
export function signOut(): void {
  const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  
  if (token && typeof window.google !== 'undefined') {
    window.google.accounts.oauth2.revoke(token, () => {
      console.log('Token revoked');
    });
  }

  clearStoredAuth();
  
  if (typeof window.gapi !== 'undefined') {
    window.gapi.client.setToken(null);
  }

  notifyAuthChange();
}

/**
 * Clear stored authentication data
 */
function clearStoredAuth(): void {
  localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.TOKEN_EXPIRY);
  localStorage.removeItem(STORAGE_KEYS.USER_EMAIL);
  localStorage.removeItem(STORAGE_KEYS.USER_NAME);
  localStorage.removeItem('workout_user_picture');
}

/**
 * Get current authentication state
 */
export function getAuthState(): AuthState {
  const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  const tokenExpiry = localStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRY);
  const isTokenValid = token && tokenExpiry && Date.now() < parseInt(tokenExpiry, 10);

  return {
    isSignedIn: !!isTokenValid,
    accessToken: isTokenValid ? token : null,
    userEmail: isTokenValid ? localStorage.getItem(STORAGE_KEYS.USER_EMAIL) : null,
    userName: isTokenValid ? localStorage.getItem(STORAGE_KEYS.USER_NAME) : null
  };
}

/**
 * Check if user is signed in
 */
export function isSignedIn(): boolean {
  return getAuthState().isSignedIn;
}

/**
 * Get the current access token
 */
export function getAccessToken(): string | null {
  return getAuthState().accessToken;
}

/**
 * Subscribe to auth state changes
 */
export function onAuthStateChange(callback: AuthCallback): () => void {
  authCallbacks.push(callback);
  
  // Return unsubscribe function
  return () => {
    const index = authCallbacks.indexOf(callback);
    if (index > -1) {
      authCallbacks.splice(index, 1);
    }
  };
}

/**
 * Notify all subscribers of auth state change
 */
function notifyAuthChange(): void {
  const state = getAuthState();
  authCallbacks.forEach(callback => callback(state));
}

/**
 * Check if Google APIs are ready
 */
export function isGoogleReady(): boolean {
  return gapiInitialized && gisInitialized;
}
