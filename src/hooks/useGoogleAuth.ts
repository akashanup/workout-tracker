/**
 * useGoogleAuth React Hook
 * Provides authentication state and user profile for components
 */

import { useState, useEffect, useCallback } from 'react';
import { AuthState } from '../types/models';
import {
  getAuthState,
  onAuthStateChange,
  signIn as authSignIn,
  signOut as authSignOut,
  isGoogleReady
} from '../services/googleAuth';

// User profile interface
export interface UserProfile {
  name: string | null;
  email: string | null;
  picture: string | null;
}

// Return type for the hook
export interface UseGoogleAuthReturn {
  isAuthenticated: boolean;
  isLoading: boolean;
  userProfile: UserProfile;
  signIn: () => void;
  signOut: () => void;
  accessToken: string | null;
}

// Storage key for user picture
const USER_PICTURE_KEY = 'workout_user_picture';

/**
 * Get user profile from localStorage
 */
function getUserProfileFromStorage(): UserProfile {
  return {
    name: localStorage.getItem('workout_user_name'),
    email: localStorage.getItem('workout_user_email'),
    picture: localStorage.getItem(USER_PICTURE_KEY)
  };
}

/**
 * React hook for Google authentication
 * Provides isAuthenticated, userProfile, signIn, and signOut
 */
export function useGoogleAuth(): UseGoogleAuthReturn {
  const [authState, setAuthState] = useState<AuthState>(getAuthState());
  const [isLoading, setIsLoading] = useState(!isGoogleReady());
  const [userProfile, setUserProfile] = useState<UserProfile>(getUserProfileFromStorage());

  useEffect(() => {
    // Subscribe to auth state changes
    const unsubscribe = onAuthStateChange((newState) => {
      setAuthState(newState);
      setUserProfile(getUserProfileFromStorage());
      setIsLoading(false);
    });

    // Check if already ready
    if (isGoogleReady()) {
      setIsLoading(false);
      setUserProfile(getUserProfileFromStorage());
    }

    return () => unsubscribe();
  }, []);

  const signIn = useCallback(() => {
    if (isGoogleReady()) {
      authSignIn();
    }
  }, []);

  const signOut = useCallback(() => {
    authSignOut();
    // Clear user profile from state
    setUserProfile({ name: null, email: null, picture: null });
  }, []);

  return {
    isAuthenticated: authState.isSignedIn,
    isLoading,
    userProfile,
    signIn,
    signOut,
    accessToken: authState.accessToken
  };
}

export default useGoogleAuth;
