# Workout Tracker PWA

A Progressive Web App (PWA) for tracking workouts using Google Sheets as the data store.

⭐ **If you find this project useful, please consider giving it a star!** It helps others discover it and motivates continued development.

## Features

- 📊 **Your data stays in your Google Drive** - Each user's workout data is stored in their own Google Sheet
- 📱 **Works as an installable app** - PWA support for Android and iOS
- 🔒 **Minimal permissions** - Only accesses spreadsheets created by this app, not your other files
- 👤 **User profile display** - Shows your Google profile picture and name
- 📅 **Week-based navigation** - Easy date selection with weekly view
- 🏋️ **Four workout sections** - Warm-up, Strength, Cardio, and Core
- ⏱️ **Flexible exercise tracking** - Track exercises by reps/sets OR duration (minutes/seconds)
- 🔄 **Multi-section exercises** - Some exercises (e.g., Running, Cycling) can be used in both Warmup and Cardio
- 🔍 **Autocomplete exercise input** - Single input field with suggestions as you type, including option to add custom exercises
- ✏️ **Per-exercise save/edit/delete** - Individual controls for each exercise row
- ✅ **Smart validation** - Save button only enabled when exercise has complete data (reps AND sets > 0 for reps-based)
- 📐 **Responsive full-width layout** - All input fields expand to fill available space
- 💾 **Smart spreadsheet management** - Automatically finds existing sheet or creates a new one
- 🔍 **Configurable sheet name** - Custom name via environment variable (defaults to "MyWorkoutTracker")
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
   - `https://www.googleapis.com/auth/drive.file` (create and access files made by this app)
   - `https://www.googleapis.com/auth/drive.metadata.readonly` (search for existing spreadsheets by name)
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
    
    # (Optional) Custom spreadsheet name
    # If not set, defaults to "MyWorkoutTracker"
    # VITE_SHEET_NAME=MyCustomWorkoutTracker
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

| Column             | Type   | Description                                               |
| ------------------ | ------ | --------------------------------------------------------- |
| id                 | string | Unique identifier                                         |
| bodyPartId         | string | FK to BodyParts (nullable)                                |
| name               | string | Exercise name                                             |
| type               | string | strength, cardio, or core (warmup uses cardio type)       |
| applicableSections | string | Comma-separated sections (e.g., "WARMUP,CARDIO") if multi |

### WorkoutEntries Sheet

| Column             | Type   | Description                                     |
| ------------------ | ------ | ----------------------------------------------- |
| id                 | string | Unique identifier                               |
| date               | string | YYYY-MM-DD format                               |
| section            | string | WARMUP, STRENGTH, CARDIO, or CORE               |
| bodyPartId         | string | FK to BodyParts (nullable)                      |
| exerciseId         | string | FK to Exercises (nullable)                      |
| customExerciseName | string | Custom name if not using preset                 |
| reps               | number | Number of repetitions (when metricType='reps')  |
| sets               | number | Number of sets (when metricType='reps')         |
| restSeconds        | number | Rest time in seconds                            |
| metricType         | string | 'reps' or 'duration'                            |
| durationSeconds    | number | Duration in seconds (when metricType='duration')|

### Exercise Metric Types

Exercises can be tracked using two different metric types:

- **Reps-based** (`metricType: 'reps'`): Traditional rep/set counting for exercises like Push-ups, Squats
- **Duration-based** (`metricType: 'duration'`): Time-based tracking for exercises like Running, Planks, Cycling

The UI automatically shows the appropriate input fields based on the selected metric type.

### Multi-Section Exercises

All warmup and cardio exercises use the `cardio` type with `applicableSections` to control where they appear:

- **Warmup-only exercises** (Arm Circles, Leg Swings, etc.) - `applicableSections: ['WARMUP']`
- **Both warmup & cardio** (Running, Cycling, Jumping Jacks) - `applicableSections: ['WARMUP', 'CARDIO']`
- **Cardio-only** (Burpees, Stair Climbing) - `applicableSections: ['CARDIO']`

This allows exercises to appear in the autocomplete suggestions for all their applicable sections.

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

The workflow file is already included at `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  build:
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
      
      - name: Setup Pages
        uses: actions/configure-pages@v4
      
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: './dist'

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

> **Important Setup Steps:**
>
> 1. **Configure GitHub Pages source:**
>    - Go to **Settings > Pages**
>    - Under "Build and deployment", set **Source** to **GitHub Actions**
>
> 2. **Add repository secrets:**
>    - Go to **Settings > Secrets and variables > Actions > New repository secret**
>    - Add `VITE_GOOGLE_CLIENT_ID` - Your Google OAuth Client ID
>    - Add `VITE_REPO_NAME` - Your GitHub repository name

#### Option B: Manual Deployment

1. Create `.env` file with your `VITE_GOOGLE_CLIENT_ID` and `VITE_REPO_NAME`
2. Build the project: `npm run build`
3. Deploy the `dist/` folder to your preferred static hosting

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
- On login, the app searches for an existing spreadsheet by name before creating a new one
- Spreadsheet name defaults to `MyWorkoutTracker`
- Custom spreadsheet name can be set via `VITE_SHEET_NAME` environment variable
- The sheet ID is stored in localStorage for faster subsequent access
- Uses a singleton lock pattern to prevent duplicate sheet creation during concurrent calls
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

TBD
