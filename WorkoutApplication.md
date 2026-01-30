# Workout Application

## Prompt

You are an expert frontend engineer, PWA specialist, and Google APIs expert.

### GOAL

Help me build an MVP Progressive Web App (PWA) for workout tracking that:

- Runs entirely in the browser (frontend-only, no custom backend).
- Uses each user's own Google Sheet (Google Sheets API) as the data store.
- Automatically creates and initializes that Google Sheet with a normalized structure the first time the user logs in.
- Works well as an installable PWA on Android and iOS (home screen install).

### CONTEXT

- Tech stack: React + TypeScript + Vite.
- Architecture: 100% frontend-only.
- Data storage: Google Sheets API v4, with each user using their own spreadsheet.
- Authentication: Google OAuth in the browser using Google Identity Services or gapi, with minimal scope:
  - `https://www.googleapis.com/auth/drive.file` (only access files created by this app)
- Users: ~5–10 users, each with their own Google account and their own workout spreadsheet.
- No central backend, no shared database, no shared server logic.

#### High-level app behavior

- I deploy the PWA once (e.g., GitHub Pages / Netlify / Firebase / Cloudflare Pages).
- Each user:
  - Opens the URL.
  - Signs in with their Google account.
  - On first login, the app:
    - Searches for an existing spreadsheet by name (default: "MyWorkoutTracker").
    - If found, uses the existing spreadsheet.
    - If not found, creates a new Google Sheet and initializes it with a normalized schema.
    - Optionally seeds some default body parts & exercises.
  - The app stores that spreadsheetId in localStorage so future sessions reuse the same sheet.
  - Spreadsheet name is configurable via `VITE_SHEET_NAME` environment variable (defaults to "MyWorkoutTracker").

### FUNCTIONAL UI REQUIREMENTS (MVP 1.0)

- Main screen: daily workout view, focused on the currently selected date within a week.
- At the top: a horizontal week selector for the current week (e.g., Mon–Sun) that:
  - Shows each date.
  - Highlights the selected date.
  - Calls back to parent when the user changes the selected date.
- Below the week selector, in this order:

  1) Warm-up section
  2) Strength / Body-part training section
  3) Cardio section
  4) Core section

#### For each section

- There can be multiple exercise rows.
- An exercise row includes:
  - Exercise type:
    - A dropdown for common exercises.
    - A free-text input for custom exercise name.
  - Number of repetitions (integer).
    - Number of sets (integer).
  - Rest time after that exercise (number, e.g., seconds).
- For the Strength section specifically:
  - Multiple body parts per day should be supported.
  - Each exercise row must be associated with a body part (dropdown).
- Each section has an "Add exercise" button.
- There is a "Save" button for the selected date that persists all section data into the user's spreadsheet.

### DATA MODEL & NORMALIZATION REQUIREMENTS

I want the per-user spreadsheet to be normalized, with multiple tabs behaving like tables. Design a simple but practical schema like this (you can refine it if needed, but keep it normalized and usable):

1) Sheet: BodyParts
   Columns:

   - id (string)
   - name (string)

2) Sheet: Exercises
   Columns:

   - id (string)
   - bodyPartId (string, FK → BodyParts.id, nullable for generic exercises)
   - name (string)
   - type (string, e.g., "strength" | "warmup" | "cardio" | "core")

3) Sheet: WorkoutEntries
   Columns:

   - id (string)
   - date (string, YYYY-MM-DD)
   - section (string: "WARMUP" | "STRENGTH" | "CARDIO" | "CORE")
   - bodyPartId (string, nullable)
   - exerciseId (string, nullable)
   - customExerciseName (string, nullable)
   - reps (number, nullable)
   - sets (number, nullable)
   - restSeconds (number, nullable)

If you think additional sheets (e.g., Sections, Users, or configuration sheet) would be beneficial, propose them, but keep it MVP-friendly.

### EXPECTATIONS

Please walk me through the solution in structured sections with concrete TypeScript/React code snippets. Organize your answer with the following numbered sections:

1) ARCHITECTURE OVERVIEW

   - Summarize the frontend-only architecture.
   - Explain clearly how Google OAuth + Google Sheets API will work from the browser, including:
     - Why we don't need a backend for this use case.
     - How each user's data remains isolated (their own sheet + their own token).
   - Explain the lifecycle:
     - User visits the PWA.
     - Signs in.
     - App checks localStorage for `spreadsheetId`.
     - If not present, creates and initializes a new spreadsheet.
     - On date selection, loads that date's workouts.
     - On Save, updates the normalized WorkoutEntries sheet.

2) GOOGLE AUTHENTICATION (FRONTEND-ONLY) + TOKEN MANAGEMENT
   Focus on authentication first.

   - Explain what needs to be configured in Google Cloud Console:
     - How to create an OAuth 2.0 Client ID for a web application.
     - Setting authorized JavaScript origins and redirect URIs for a Vite app hosted at a static URL (e.g., GitHub Pages/Netlify).
   - Use the recommended approach (Google Identity Services, not the legacy gapi auth2) for browser-based OAuth when calling Google Sheets API.
   - **Environment Variables Configuration**:
     - Use Vite's environment variables with `VITE_` prefix.
     - Create a `.env` file (gitignored) with:
       - `VITE_GOOGLE_CLIENT_ID` - The OAuth 2.0 Client ID from Google Cloud Console.
       - `VITE_REPO_NAME` - The GitHub repository name for deployment base path.
       - `VITE_SHEET_NAME` - (Optional) Custom spreadsheet name. Defaults to "MyWorkoutTracker".
     - Create a `.env.example` file (committed) as a template for other developers.
     - Access variables using `import.meta.env.VITE_GOOGLE_CLIENT_ID`.
   - Implement a small `googleAuth.ts` module that:
     - Initializes the Google Identity client.
     - Handles sign-in and sign-out.
     - Exposes:
       - `signIn()`
       - `signOut()`
       - `getAccessToken()`
       - `useGoogleAuth()` React hook (or similar) that provides:
         - `isAuthenticated`
         - `userProfile` (name/email/photo if available)
         - `signIn`
         - `signOut`
   - Provide complete TypeScript code for this auth module + hook.

3) GOOGLE SHEETS CLIENT & NORMALIZED SHEET INITIALIZATION
   Now focus on the Sheets API and sheet creation.

   - Create a `googleSheetsClient.ts` module that:
     - Uses the access token from `googleAuth` to call the Google Sheets API v4 via `fetch`.
     - Exposes helper functions:
       - `getSpreadsheetName(): string`:
         - Returns `VITE_SHEET_NAME` from environment if set.
         - Otherwise returns the fixed default "MyWorkoutTracker".
       - `findSpreadsheetByName(name: string): Promise<string | null>`:
         - Uses Google Drive API to search for existing spreadsheet by name.
         - Returns spreadsheet ID if found, null otherwise.
       - `getOrCreateWorkoutSpreadsheet(): Promise<string>`:
         - Check `localStorage` for `spreadsheetId`.
         - If found and still exists, return it.
         - If not found in localStorage, search for existing spreadsheet by name.
         - If found by name, store in localStorage and return it.
         - If not found anywhere, create a new spreadsheet:
           - Call an `initWorkoutSpreadsheet(spreadsheetId)` function.
           - Store the `spreadsheetId` in localStorage.
           - Return the new id.
       - `initWorkoutSpreadsheet(spreadsheetId: string): Promise<void>`:
         - Creates the tabs/sheets:
           - BodyParts
           - Exercises
           - WorkoutEntries
         - Sets up column headers on each sheet using `batchUpdate`.
         - Optionally seeds a few default BodyParts and Exercises (e.g., Chest, Back, Legs, Squats, Push-ups, etc.).
   - Show the exact JSON payloads or helper functions to:
     - Search for existing spreadsheet by name using Drive API.
     - Create sheets (tabs) if they do not exist.
     - Set values for header rows.
     - Insert initial data rows.

4) PROJECT SCAFFOLDING & FOLDER STRUCTURE

   - Provide the Vite scaffolding commands for a React + TypeScript app.
   - **Dev Dependencies to Install**:
     - `@types/node` - For Node.js type definitions (process.env support in vite.config.ts).
     - `vite-plugin-pwa` - For PWA configuration and service worker generation.
     - `workbox-window` - For Workbox service worker utilities.
   - Propose a clean folder structure, for example:
     - src/
       - components/
         - WeekSelector.tsx
         - WeekSelector.css
         - WorkoutSection.tsx
         - WorkoutSection.css
         - ExerciseRow.tsx
         - ExerciseRow.css
       - services/
         - googleAuth.ts
         - googleSheetsClient.ts
         - workoutRepository.ts
       - hooks/
         - useGoogleAuth.ts
       - pages/
         - WorkoutPage.tsx
         - WorkoutPage.css
       - types/
         - models.ts
       - App.tsx
       - App.css
       - main.tsx
       - index.css
     - public/
       - manifest.webmanifest
       - pwa-192x192.png
       - pwa-512x512.png
       - apple-touch-icon.png
       - favicon.ico
     - .github/
       - workflows/
         - deploy.yml
     - .env.example (committed template)
     - .env (gitignored, actual values)
   - Define TypeScript interfaces in `types/models.ts` such as:
     - `BodyPart`
     - `Exercise`
     - `WorkoutEntry`
     - `WorkoutDayData` (grouped by section: warmup, strength, cardio, core)
   - Provide example interface definitions.

5) SHEETS API READ & WRITE OPERATIONS (workoutRepository)

   - Implement a `workoutRepository.ts` module that sits on top of `googleSheetsClient` and hides raw Sheets API details from the React components.
   - Implement functions like:
     - `loadBodyParts(spreadsheetId: string): Promise<BodyPart[]>`
     - `loadExercises(spreadsheetId: string): Promise<Exercise[]>`
     - `loadWorkoutForDate(spreadsheetId: string, date: string): Promise<WorkoutDayData>`
       - Reads WorkoutEntries rows for that `date`.
       - Joins bodyPartId and exerciseId with their respective sheets so the UI receives nice objects.
     - `saveWorkoutForDate(spreadsheetId: string, date: string, data: WorkoutDayData): Promise<void>`
       - Clears any existing WorkoutEntries rows for that date.
       - Writes new rows for that date based on the current UI state.
   - Show concrete examples of Google Sheets API requests:
     - Reading a range.
     - Clearing rows for a date.
     - Appending or updating rows with new data.
   - Keep the implementation straightforward and suitable for an MVP.

6) UI COMPONENTS: WEEK SELECTOR, WORKOUT SECTIONS, EXERCISE ROWS

   - Implement a `<WeekSelector />` component that:
     - Computes the current week (e.g., Monday–Sunday) based on today.
     - Renders days horizontally with date + weekday label.
     - Highlights the currently selected date.
     - Calls `onDateChange(selectedDate: Date)` when user picks a day.
     - Provide full TypeScript code and minimal mobile-friendly styling suggestions.
   - Implement a generic `<WorkoutSection />` component that:
     - Receives props:
       - `title`
       - `sectionKey` (e.g., "WARMUP" | "STRENGTH" | "CARDIO" | "CORE")
       - `exercises` array (section-specific rows)
       - callbacks like `onChange` and `onAddRow`
     - Renders a list of `<ExerciseRow />` components and an "Add exercise" button.
   - Implement `<ExerciseRow />` that:
     - Shows:
       - Exercise dropdown (options from Exercises sheet).
       - Custom exercise text input.
       - For Strength section: body-part dropdown (from BodyParts sheet).
       - Numeric inputs: reps, sets, restSeconds.
     - Calls `onChange(updatedRow)` when the user edits a field.
   - Use appropriate TypeScript interfaces for the row data and show complete component code examples.

7) SCREEN COMPOSITION: WorkoutPage + SAVE FLOW

   - Implement a `WorkoutPage.tsx` that:
     - On mount:
       - Ensures user is authenticated (using `useGoogleAuth`).
       - Calls `getOrCreateWorkoutSpreadsheet` to get the user's spreadsheetId.
       - Loads BodyParts and Exercises data (to feed dropdowns).
       - Loads current date's workout via `loadWorkoutForDate`.
     - On week/day change:
       - Reloads workout data for the selected date.
     - Maintains local state for:
       - warmup section rows
       - strength section rows
       - cardio section rows
       - core section rows
     - Renders:
       - WeekSelector
       - 4 WorkoutSection components
       - A Save button that:
         - Calls `saveWorkoutForDate`.
         - Shows basic success/error UI feedback (e.g., a toast or simple message).
   - Provide the full example `WorkoutPage.tsx` and a simple `App.tsx` that routes to it.

8) PWA CONFIGURATION (INSTALLABLE ON ANDROID & iOS)

   - **Use `vite-plugin-pwa`** for PWA configuration:
     - Install: `npm install vite-plugin-pwa workbox-window --save-dev`
     - Configure in `vite.config.ts` with `VitePWA` plugin.
     - Set `registerType: 'autoUpdate'` for automatic service worker updates.
   - Configure the manifest inline in `vite.config.ts`:
     - `name`, `short_name`, `description`
     - `icons` array with 192x192 and 512x512 PNG icons
     - `start_url` and `scope` set to the base path (e.g., `/${REPO_NAME}/`)
     - `display: 'standalone'`
     - `orientation: 'portrait'`
     - `theme_color` and `background_color`
   - Configure Workbox for smart caching:
     - Cache static assets: `globPatterns: ['**/*.{js,css,html,ico,png,svg}']`
     - Use `NetworkFirst` for Google API cache with 24-hour expiration.
     - Use `NetworkOnly` for Google Sheets API calls (prevent stale data).
     - Use `NetworkOnly` for auth-related calls (accounts.google.com, oauth2).
   - Create icon files in `public/` folder:
     - `pwa-192x192.png` (192x192 pixels)
     - `pwa-512x512.png` (512x512 pixels)
     - `apple-touch-icon.png` (180x180 pixels)
     - `favicon.ico`
   - Explain how to verify installability:
     - On Android (Chrome: "Install App" or "Add to Home screen").
     - On iOS Safari (Share → "Add to Home Screen").

9) UI/UX POLISH FOR MOBILE

   - Suggest a simple, clean mobile layout:
     - Inputs stacked vertically for each exercise row.
     - Section headers with clear labels and small icons (optional).
     - Large tap targets (at least ~44px height).
   - Propose a minimal color scheme (e.g., neutral background, accent color for selected day/section).
   - Provide concrete CSS (or CSS module) examples for:
     - Week selector layout.
     - Section containers.
     - Exercise row layout on 360–430px width screens.
   - Recommend where to place:
     - "Add exercise" buttons.
     - "Save" button (e.g., sticky at bottom or clearly visible).

10) BASIC VALIDATION & ERROR HANDLING

    - Define validation rules such as:
      - `reps` and `sets` must be positive integers when provided.
      - `restSeconds` must be >= 0.
      - For each row, at least one of `exerciseId` (dropdown) or `customExerciseName` must be filled.
    - Show how to:
      - Validate each row on change or on Save.
      - Prevent Save if critical errors exist.
      - Display inline error states (e.g., red border, small error text) without overwhelming the user.
    - Explain how to handle errors from Google APIs:
      - Token expiry → prompt to re-authenticate.
      - Network failures → show a friendly error message.

11) DEPLOYMENT (GITHUB PAGES)

    - **Vite Configuration for GitHub Pages**:
      - Configure `base` path in `vite.config.ts` using environment variable:
        ```typescript
        const REPO_NAME = process.env.VITE_REPO_NAME || 'WorkoutApp';
        const base = `/${REPO_NAME}/`;
        ```
      - Install `@types/node` as dev dependency for `process.env` TypeScript support.
    - **GitHub Actions Workflow** (`.github/workflows/deploy.yml`):
      - Trigger on push to `main` branch.
      - Use `actions/checkout@v4` and `actions/setup-node@v4` with Node.js 20.
      - Run `npm ci` for clean install.
      - Build with environment variables from GitHub Secrets:
        ```yaml
        env:
          VITE_GOOGLE_CLIENT_ID: ${{ secrets.VITE_GOOGLE_CLIENT_ID }}
          VITE_REPO_NAME: ${{ secrets.VITE_REPO_NAME }}
        ```
      - Deploy using `peaceiris/actions-gh-pages@v3` to `gh-pages` branch.
    - **GitHub Repository Configuration**:
      - Add repository secrets in Settings → Secrets and variables → Actions:
        - `VITE_GOOGLE_CLIENT_ID` - Your Google OAuth Client ID.
        - `VITE_REPO_NAME` - Your repository name.
      - Enable GitHub Pages with source set to `gh-pages` branch.
    - **OAuth Configuration for Production**:
      - Add to Authorized JavaScript origins: `https://yourusername.github.io`
      - Add to Authorized redirect URIs: `https://yourusername.github.io/your-repo-name`
    - **Local Development**:
      - Create `.env` file from `.env.example` template.
      - Set `VITE_GOOGLE_CLIENT_ID` and `VITE_REPO_NAME`.
      - Run `npm run dev` for development server at `http://localhost:5173`.

### FORMAT OF YOUR ANSWER

- Use the same numbering (1–11) in your response.
- For each section, provide:
  - A concise explanation.
  - Concrete TypeScript/React code snippets where appropriate.
  - Example API calls for Google Sheets operations.
- Aim for pragmatic, clean code that is easy to understand and extend in future MVP versions.
