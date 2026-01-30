import React, { useState, useEffect } from 'react';
import { AuthState } from './types/models';
import { 
  initGoogleAuth, 
  signIn, 
  signOut, 
  getAuthState, 
  onAuthStateChange,
  isGoogleReady
} from './services/googleAuth';
import { getOrCreateWorkoutSheet, clearStoredSheetId } from './services/googleSheetsClient';
import WorkoutPage from './pages/WorkoutPage';
import './App.css';

type AppState = 'loading' | 'not-signed-in' | 'initializing-sheet' | 'ready' | 'error';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>('loading');
  const [authState, setAuthState] = useState<AuthState | null>(null);
  const [sheetId, setSheetId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Initialize Google Auth on mount
  useEffect(() => {
    const init = async () => {
      try {
        await initGoogleAuth();
        
        const currentAuth = getAuthState();
        setAuthState(currentAuth);

        if (currentAuth.isSignedIn) {
          await initializeSheet();
        } else {
          setAppState('not-signed-in');
        }
      } catch (err) {
        console.error('Initialization error:', err);
        setError('Failed to initialize Google services');
        setAppState('error');
      }
    };

    init();

    // Subscribe to auth state changes
    const unsubscribe = onAuthStateChange(async (newState) => {
      setAuthState(newState);
      
      if (newState.isSignedIn) {
        await initializeSheet();
      } else {
        setSheetId(null);
        setAppState('not-signed-in');
      }
    });

    return () => unsubscribe();
  }, []);

  // Initialize or get the workout sheet
  const initializeSheet = async () => {
    setAppState('initializing-sheet');
    setError(null);

    try {
      const id = await getOrCreateWorkoutSheet();
      setSheetId(id);
      setAppState('ready');
    } catch (err) {
      console.error('Sheet initialization error:', err);
      setError('Failed to initialize workout sheet');
      setAppState('error');
    }
  };

  // Handle sign in
  const handleSignIn = () => {
    if (isGoogleReady()) {
      signIn();
    } else {
      setError('Google services are still loading. Please try again in a moment.');
    }
  };

  // Handle sign out
  const handleSignOut = () => {
    signOut();
    clearStoredSheetId();
    setSheetId(null);
    setAppState('not-signed-in');
  };

  // Render based on app state
  const renderContent = () => {
    switch (appState) {
      case 'loading':
        return (
          <div className="app-loading">
            <div className="spinner large"></div>
            <h2>Loading Workout Tracker...</h2>
            <p>Connecting to Google services</p>
          </div>
        );

      case 'not-signed-in':
        return (
          <div className="app-login">
            <div className="login-card">
              <div className="login-header">
                <span className="login-icon">🏋️</span>
                <h1>Workout Tracker</h1>
                <p>Track your workouts using your own Google Sheet</p>
              </div>

              <div className="login-features">
                <div className="feature">
                  <span>📊</span>
                  <span>Your data stays in your Google Drive</span>
                </div>
                <div className="feature">
                  <span>📱</span>
                  <span>Works on mobile as an installable app</span>
                </div>
                <div className="feature">
                  <span>🔒</span>
                  <span>Secure OAuth authentication</span>
                </div>
              </div>

              <button 
                className="google-sign-in-button"
                onClick={handleSignIn}
              >
                <svg className="google-icon" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Sign in with Google
              </button>

              <p className="login-note">
                We only request access to read and write spreadsheets.
                Your data is never stored on our servers.
              </p>
            </div>
          </div>
        );

      case 'initializing-sheet':
        return (
          <div className="app-loading">
            <div className="spinner large"></div>
            <h2>Setting up your workout sheet...</h2>
            <p>This only happens once</p>
          </div>
        );

      case 'ready':
        if (sheetId) {
          // Get user profile from localStorage
          const userPicture = localStorage.getItem('workout_user_picture');
          const userName = localStorage.getItem('workout_user_name');
          return (
            <WorkoutPage 
              sheetId={sheetId} 
              onSignOut={handleSignOut}
              userPicture={userPicture}
              userName={userName}
            />
          );
        }
        return null;

      case 'error':
        return (
          <div className="app-error">
            <div className="error-card">
              <span className="error-icon">⚠️</span>
              <h2>Something went wrong</h2>
              <p>{error || 'An unexpected error occurred'}</p>
              <div className="error-actions">
                <button onClick={() => window.location.reload()}>
                  Reload App
                </button>
                {authState?.isSignedIn && (
                  <button className="secondary" onClick={handleSignOut}>
                    Sign Out
                  </button>
                )}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return <div className="app">{renderContent()}</div>;
};

export default App;
