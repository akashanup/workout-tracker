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
- Authentication: Google OAuth in the browser using Google Identity Services or gapi, with scopes:
  - `https://www.googleapis.com/auth/drive.file` (create and access files made by this app)
  - `https://www.googleapis.com/auth/drive.metadata.readonly` (search for existing spreadsheets by name across sessions/devices)
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

- Each section is **expandable/collapsible**:
  - **Collapsed by default** - Sections start collapsed to reduce visual clutter
  - Click on section header to toggle visibility
  - Arrow icon indicates expanded/collapsed state
  - Shows exercise count in header even when collapsed

#### For each section

- There can be multiple exercise rows.
- Each exercise row is **collapsible** when saved:
  - **Collapsed by default** for saved exercises - Shows exercise name and set count badge
  - **Expanded by default** for new exercises - Shows all inputs for data entry
  - Click on header to expand/collapse
- An exercise row is organized in **3 rows** (when expanded):
  - **Row 1**: Exercise name (autocomplete input) + Measure by toggle (for non-strength sections)
    - Body part and exercise name fields are hidden for saved exercises (already visible in header)
    - Fields reappear when entering edit mode
  - **Row 2**: Sets container - each set shows Weight (kg), Reps/Duration, Rest time + Copy/Delete buttons
  - **Row 3**: Action buttons - Add Set (left), Save/Cancel/Edit/Delete (right)
- For non-strength sections (Warmup, Cardio, Core):
  - **Metric type toggle** to switch between:
    - **Reps mode**: Weight (kg) + Reps + Rest time per set
    - **Duration mode**: Weight (kg) + Minutes + Seconds + Rest time per set
  - Both modes support multiple sets
  - Duration is entered as Minutes + Seconds (stored as total seconds in backend)
- For the Strength section specifically:
  - Exercises are **grouped by body part** with collapsible subsections
  - Row 1 shows: Body Part dropdown + Exercise name (both fill 50% of the row)
  - Each body part group can be expanded/collapsed independently
  - Always uses reps mode (Weight → Reps → Rest)
- **Set management**:
  - Copy button (⧉) duplicates a set with all its values
  - Delete button (🗑) removes a set (or clears values if last set)
  - Add Set button (left-aligned) adds new empty set
- **Action buttons**:
  - Save (✓) - Saves the exercise to the sheet
  - Cancel (✕) - Reverts changes to original state (for edits) or deletes (for new)
  - Edit (✎) - Enters edit mode for saved exercises
  - Delete (🗑) - Removes the exercise entirely
- **Multi-section exercises**:
  - Some exercises (e.g., Running, Cycling, Cross Trainer) can be used in multiple sections.
  - These exercises have an `applicableSections` array (e.g., `['WARMUP', 'CARDIO']`).
  - The exercise dropdown filters options based on the current section and applicable sections.
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
   - type (string, e.g., "strength" | "cardio" | "core" - warmup exercises use 'cardio' type)
   - applicableSections (string, comma-separated list of sections, e.g., "WARMUP,CARDIO" for exercises that can be used in multiple sections)

3) Sheet: WorkoutEntries
   Each row represents a single SET of an exercise:
   Columns:

   - id (string)
   - date (string, YYYY-MM-DD)
   - section (string: "WARMUP" | "STRENGTH" | "CARDIO" | "CORE")
   - bodyPartId (string, nullable)
   - exerciseId (string, nullable)
   - customExerciseName (string, nullable)
   - metricType (string: "reps" | "duration")
   - setNumber (number) - set number (1, 2, 3, etc.)
   - reps (number, nullable) - reps for this specific set
   - weightKg (number, nullable) - weight for this specific set
   - durationSeconds (number, nullable) - used when metricType is 'duration'
   - restSeconds (number, nullable) - rest time after this set

### METRIC TYPES

Exercises can be tracked using two different metric types:

- **Reps-based** (`metricType: 'reps'`):
  - Each SET is stored as a separate row with its own reps, weightKg, and restSeconds
  - Allows different values per set (e.g., pyramid sets: 12 reps → 10 reps → 8 reps)
  - Users can add/copy/remove sets dynamically
  - Default for Strength section exercises
  - UI order: Weight (kg) → Reps → Rest (sec)

- **Duration-based** (`metricType: 'duration'`):
  - Each SET is stored as a separate row with durationSeconds and restSeconds
  - Supports multiple sets (e.g., 3 sets of 30-second planks with rest between)
  - Time-based tracking for exercises like Running, Planks, Cycling, Stretches
  - Common for Warmup, Cardio, and Core sections

The UI shows a toggle between "Reps" and "Time" modes for Warmup, Cardio, and Core sections. Strength section always uses reps mode.

### MULTI-SECTION EXERCISES

All warmup and cardio exercises use the `cardio` type with `applicableSections` to control visibility:

- **Warmup-only** (Arm Circles, Leg Swings) - `type: 'cardio', applicableSections: ['WARMUP']`
- **Both warmup & cardio** (Running, Cycling, Jumping Jacks) - `type: 'cardio', applicableSections: ['WARMUP', 'CARDIO']`
- **Cardio-only** (Burpees, Stair Climbing) - `type: 'cardio', applicableSections: ['CARDIO']`

This unified approach simplifies the exercise type system while maintaining section-specific exercise filtering.

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
     - **Implements a singleton lock pattern** to prevent race conditions when multiple calls to `getOrCreateWorkoutSpreadsheet()` happen simultaneously.
     - Exposes helper functions:
       - `getSpreadsheetName(): string`:
         - Returns `VITE_SHEET_NAME` from environment if set.
         - Otherwise returns the fixed default "MyWorkoutTracker".
       - `findSpreadsheetByName(name: string): Promise<string | null>`:
         - Uses Google Drive API to search for existing spreadsheet by name.
         - Returns spreadsheet ID if found, null otherwise.
       - `getOrCreateWorkoutSpreadsheet(): Promise<string>`:
         - **Acquires a lock immediately** before any async operations to prevent concurrent creations.
         - If a creation is already in progress, waits for the existing promise.
         - Check `localStorage` for `spreadsheetId`.
         - If found and still exists, return it.
         - If not found in localStorage, search for existing spreadsheet by name.
         - If found by name, store in localStorage and return it.
         - If not found anywhere, create a new spreadsheet:
           - Call an `initWorkoutSpreadsheet(spreadsheetId)` function.
           - Store the `spreadsheetId` in localStorage.
           - Return the new id.
         - **Releases the lock** when done (success or error).
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
     - `Exercise` (includes `applicableSections?: SectionType[]` for multi-section exercises)
     - `WorkoutEntry` (includes `metricType: MetricType` and `durationSeconds: number | null`)
     - `MetricType` (type alias: `'reps' | 'duration'`)
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
       - **Autocomplete exercise input** - Single input field that shows matching exercises as user types, with option to add new custom exercises.
       - Suggestions filtered by section and `applicableSections`.
       - For Strength section: body-part dropdown (from BodyParts sheet).
       - **Metric type toggle** (for non-Strength sections):
         - "Reps" mode: shows reps and sets inputs.
         - "Time" mode: shows duration inputs (minutes and seconds).
       - For Strength section: always shows reps and sets inputs (no toggle).
       - Numeric inputs: reps, sets, durationSeconds, restSeconds.
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
      - When `metricType` is 'reps':
        - Both `reps` AND `sets` must be > 0 (save button disabled until both are provided).
      - When `metricType` is 'duration':
        - `durationSeconds` must be > 0.
      - `restSeconds` must be >= 0.
      - For each row, an exercise name must be selected or entered.
      - For strength exercises, a body part must be selected.
    - **Per-exercise save validation**:
      - Save button is disabled until exercise has complete data (name + metric data + body part if strength).
      - Delete confirmation only shown when exercise has data entered.
    - **Full-width responsive layout**:
      - All input fields expand to fill available row width.
      - Body Part and Exercise fields split the row 50/50 in Strength section.
      - Reps, Sets, and Rest fields expand equally to fill the row.
    - Show how to:
      - Validate each row on change.
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
