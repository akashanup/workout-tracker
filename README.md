# Workout Tracker PWA

A Progressive Web App (PWA) for tracking workouts using Google Sheets as the data store.

## Features

- 📊 **Your data stays in your Google Drive** - Each user's workout data is stored in their own Google Sheet
- 📱 **Works as an installable app** - PWA support for Android and iOS
- 🔒 **Secure OAuth authentication** - Uses Google Identity Services
- � **User profile display** - Shows your Google profile picture and name
- 📅 **Week-based navigation** - Easy date selection with weekly view
- 🏋️ **Four workout sections** - Warm-up, Strength, Cardio, and Core
- 💾 **Auto-creates your workout sheet** - Normalized schema with body parts and exercises pre-seeded
- ⚠️ **Smart error handling** - User-friendly messages for token expiry and network errors

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Data Storage**: Google Sheets API v4
- **Authentication**: Google OAuth 2.0 (Google Identity Services)
- **PWA**: vite-plugin-pwa with Workbox

## Google Cloud Console Setup

Before running the app, you need to configure a Google Cloud project:

### 1. Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Note your project ID

### 2. Enable the Google Sheets API

1. Go to **APIs & Services > Library**
2. Search for "Google Sheets API"
3. Click **Enable**

### 3. Configure OAuth Consent Screen

1. Go to **APIs & Services > OAuth consent screen**
2. Choose **External** user type (or Internal if using Google Workspace)
3. Fill in the required fields:
   - App name: "Workout Tracker"
   - User support email: Your email
   - Developer contact: Your email
4. Add scopes:
   - `https://www.googleapis.com/auth/spreadsheets`
5. Add test users (your Google account email) if in testing mode

### 4. Create OAuth 2.0 Credentials

1. Go to **APIs & Services > Credentials**
2. Click **Create Credentials > OAuth client ID**
3. Choose **Web application**
4. Configure:
   - Name: "Workout Tracker Web"
   - Authorized JavaScript origins:
     - `http://localhost:5173` (for development)
     - `https://yourusername.github.io` (for GitHub Pages)
   - Authorized redirect URIs:
     - `http://localhost:5173` (for development)
     - `https://yourusername.github.io/your-repo-name` (for GitHub Pages)
5. Copy the **Client ID**

### 5. Configure Environment Variables

1. Copy the example environment file:

    ```bash
    cp .env.example .env
    ```

2. Open `.env` and configure your values:

    ```bash
    # Your Google OAuth Client ID
    VITE_GOOGLE_CLIENT_ID=123456789-abcdefg.apps.googleusercontent.com
    
    # Your GitHub repository name (for GitHub Pages deployment)
    VITE_REPO_NAME=your-repo-name
    ```

> **Note:** The `.env` file is gitignored and should never be committed to version control.

## Installation

```bash
# Install dependencies
npm install

# Create .env file from example
cp .env.example .env
# Edit .env and add your VITE_GOOGLE_CLIENT_ID

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Project Structure

```text
src/
├── components/
│   ├── WeekSelector.tsx    # Weekly date navigation
│   ├── WeekSelector.css
│   ├── WorkoutSection.tsx  # Section container (Warmup, Strength, etc.)
│   ├── WorkoutSection.css
│   ├── ExerciseRow.tsx     # Individual exercise entry
│   └── ExerciseRow.css
├── hooks/
│   └── useGoogleAuth.ts    # React hook for auth state & user profile
├── pages/
│   ├── WorkoutPage.tsx     # Main workout tracking page
│   └── WorkoutPage.css
├── services/
│   ├── googleAuth.ts       # Google OAuth handling & token management
│   ├── googleSheetsClient.ts  # Sheet creation & initialization
│   └── workoutRepository.ts   # CRUD operations & error handling
├── types/
│   └── models.ts           # TypeScript interfaces & constants
├── App.tsx                 # Main app component
├── App.css
├── main.tsx               # Entry point
└── index.css
```

## Data Model

The app creates a Google Sheet with three tabs:

### BodyParts Sheet

| Column | Type   | Description                        |
| ------ | ------ | ---------------------------------- |
| id     | string | Unique identifier                  |
| name   | string | Body part name (Chest, Back, etc.) |

### Exercises Sheet

| Column     | Type   | Description                       |
| ---------- | ------ | --------------------------------- |
| id         | string | Unique identifier                 |
| bodyPartId | string | FK to BodyParts (nullable)        |
| name       | string | Exercise name                     |
| type       | string | warmup, strength, cardio, or core |

### WorkoutEntries Sheet

| Column             | Type   | Description                       |
| ------------------ | ------ | --------------------------------- |
| id                 | string | Unique identifier                 |
| date               | string | YYYY-MM-DD format                 |
| section            | string | WARMUP, STRENGTH, CARDIO, or CORE |
| bodyPartId         | string | FK to BodyParts (nullable)        |
| exerciseId         | string | FK to Exercises (nullable)        |
| customExerciseName | string | Custom name if not using preset   |
| reps               | number | Number of repetitions             |
| sets               | number | Number of sets                    |
| restSeconds        | number | Rest time in seconds              |

## Deployment (GitHub Pages)

### Step 1: Configure Environment Variables

Ensure your `.env` file has the correct values:

```bash
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
VITE_REPO_NAME=your-repo-name
```

### Step 2: Build for Production

```bash
npm run build
```

This creates a `dist/` folder with all static files ready for deployment.

### Step 3: Deploy to GitHub Pages

#### Option A: Using GitHub Actions (Recommended)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        run: npm run build
        env:
          VITE_GOOGLE_CLIENT_ID: ${{ secrets.VITE_GOOGLE_CLIENT_ID }}
          VITE_REPO_NAME: ${{ secrets.VITE_REPO_NAME }}
      
      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

> **Important:** Add these secrets to your repository:
> Go to **Settings > Secrets and variables > Actions > New repository secret**
    > - `VITE_GOOGLE_CLIENT_ID` - Your Google OAuth Client ID
    > - `VITE_REPO_NAME` - Your GitHub repository name

#### Option B: Manual Deployment

1. Create `.env` file with your `VITE_GOOGLE_CLIENT_ID` and `VITE_REPO_NAME`
2. Build the project: `npm run build`
3. Push the `dist/` folder to the `gh-pages` branch
4. In GitHub repo settings, set Pages source to `gh-pages` branch

### Step 4: Configure OAuth for GitHub Pages

Update your Google Cloud Console OAuth credentials:

1. Go to **APIs & Services > Credentials**
2. Edit your OAuth 2.0 Client ID
3. Add to **Authorized JavaScript origins**:
   - `https://yourusername.github.io`
4. Add to **Authorized redirect URIs**:
   - `https://yourusername.github.io/your-repo-name`

### Step 5: Access Your App

Your app will be available at:

```text
https://yourusername.github.io/your-repo-name/
```

Users can install the PWA from this URL on their phones.

## PWA Installation

### Android (Chrome)

1. Open the app in Chrome
2. Tap the three-dot menu
3. Select "Add to Home screen" or "Install app"

### iOS (Safari)

1. Open the app in Safari
2. Tap the Share button
3. Select "Add to Home Screen"

## Adding PWA Icons

Create the following icon files in the `public/` folder:

- `pwa-192x192.png` (192x192 pixels)
- `pwa-512x512.png` (512x512 pixels)
- `apple-touch-icon.png` (180x180 pixels)
- `favicon.ico`

## Development Notes

- The app runs entirely in the browser with no backend server
- Each user's data is isolated in their own Google Sheet
- The sheet ID is stored in localStorage after first login
- Access tokens are refreshed automatically

## Troubleshooting

### "Google services not loading"

- Check if ad blockers are blocking Google scripts
- Ensure the Google API scripts are loading in index.html

### "Failed to initialize workout sheet"

- Verify your OAuth client ID is correct
- Check that Google Sheets API is enabled
- Ensure your account is added as a test user (if in testing mode)

### "Your session has expired"

- Click the "Sign Out & Re-authenticate" button in the error banner
- Sign in again to get a fresh access token
- The app will automatically restore your workout sheet

### "Network error"

- Check your internet connection
- Try refreshing the page
- If the problem persists, check if Google services are accessible

### User profile picture not showing

- Ensure you've granted the app permission to access your profile
- Try signing out and signing in again
- Check browser console for any API errors

## License

MIT
