/**
 * Google Sheets Client Service
 * Handles spreadsheet creation and initialization
 */

import {
  BodyPart,
  Exercise,
  SHEET_NAMES,
  DEFAULT_BODY_PARTS,
  DEFAULT_EXERCISES,
  DEFAULT_STRENGTH_EXERCISES
} from '../types/models';
import { isSignedIn, getAuthState } from './googleAuth';

// Storage key for sheet ID
const SHEET_ID_KEY = 'workout_sheet_id';

/**
 * Get the spreadsheet name from env or generate default from user name
 */
function getSpreadsheetName(): string {
  // Check for custom name in environment variable
  const envSheetName = import.meta.env.VITE_SHEET_NAME as string | undefined;
  if (envSheetName && envSheetName.trim()) {
    return envSheetName.trim();
  }

  // Default: UserName + "WorkoutTracker"
  const authState = getAuthState();
  const userName = authState.userName || 'My';
  // Remove spaces and special characters from username
  const sanitizedName = userName.replace(/[^a-zA-Z0-9]/g, '');
  return `${sanitizedName}WorkoutTracker`;
}

/**
 * Generate a unique ID
 */
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

/**
 * Get stored sheet ID
 */
export function getStoredSheetId(): string | null {
  return localStorage.getItem(SHEET_ID_KEY);
}

/**
 * Store sheet ID
 */
export function storeSheetId(sheetId: string): void {
  localStorage.setItem(SHEET_ID_KEY, sheetId);
}

/**
 * Clear stored sheet ID
 */
export function clearStoredSheetId(): void {
  localStorage.removeItem(SHEET_ID_KEY);
}

/**
 * Check if a spreadsheet exists and is accessible
 */
async function checkSpreadsheetExists(sheetId: string): Promise<boolean> {
  try {
    await window.gapi.client.sheets.spreadsheets.get({
      spreadsheetId: sheetId
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Search for an existing spreadsheet by name using Google Drive API
 * Returns the spreadsheet ID if found, null otherwise
 */
async function findSpreadsheetByName(name: string): Promise<string | null> {
  try {
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=name='${encodeURIComponent(name)}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false&fields=files(id,name)`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('workout_access_token')}`
        }
      }
    );

    if (!response.ok) {
      console.error('Failed to search for spreadsheet:', response.statusText);
      return null;
    }

    const data = await response.json();
    if (data.files && data.files.length > 0) {
      // Return the first matching spreadsheet
      return data.files[0].id;
    }

    return null;
  } catch (error) {
    console.error('Error searching for spreadsheet:', error);
    return null;
  }
}

/**
 * Create a new spreadsheet
 */
async function createSpreadsheet(name: string): Promise<string> {
  const response = await window.gapi.client.sheets.spreadsheets.create({
    resource: {
      properties: {
        title: name
      },
      sheets: [
        { properties: { title: SHEET_NAMES.BODY_PARTS, index: 0 } },
        { properties: { title: SHEET_NAMES.EXERCISES, index: 1 } },
        { properties: { title: SHEET_NAMES.WORKOUT_ENTRIES, index: 2 } }
      ]
    }
  });

  return response.result.spreadsheetId;
}

/**
 * Initialize sheet headers
 */
async function initializeHeaders(sheetId: string): Promise<void> {
  const requests = [
    // BodyParts headers
    {
      range: `${SHEET_NAMES.BODY_PARTS}!A1:B1`,
      values: [['id', 'name']]
    },
    // Exercises headers
    {
      range: `${SHEET_NAMES.EXERCISES}!A1:D1`,
      values: [['id', 'bodyPartId', 'name', 'type']]
    },
    // WorkoutEntries headers
    {
      range: `${SHEET_NAMES.WORKOUT_ENTRIES}!A1:I1`,
      values: [[
        'id',
        'date',
        'section',
        'bodyPartId',
        'exerciseId',
        'customExerciseName',
        'reps',
        'sets',
        'restSeconds'
      ]]
    }
  ];

  await window.gapi.client.sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: sheetId,
    resource: {
      valueInputOption: 'RAW',
      data: requests.map(req => ({
        range: req.range,
        values: req.values
      }))
    }
  });
}

/**
 * Seed default body parts
 */
async function seedBodyParts(sheetId: string): Promise<BodyPart[]> {
  const bodyParts: BodyPart[] = DEFAULT_BODY_PARTS.map(bp => ({
    id: generateId(),
    name: bp.name
  }));

  const values = bodyParts.map(bp => [bp.id, bp.name]);

  await window.gapi.client.sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: `${SHEET_NAMES.BODY_PARTS}!A:B`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    resource: { values }
  });

  return bodyParts;
}

/**
 * Seed default exercises
 */
async function seedExercises(sheetId: string, bodyParts: BodyPart[]): Promise<void> {
  // Create a map of body part names to IDs
  const bodyPartMap = new Map<string, string>();
  bodyParts.forEach(bp => bodyPartMap.set(bp.name, bp.id));

  // Generic exercises (warmup, cardio, core)
  const genericExercises: Exercise[] = DEFAULT_EXERCISES.map(ex => ({
    id: generateId(),
    bodyPartId: ex.bodyPartId,
    name: ex.name,
    type: ex.type
  }));

  // Strength exercises with body part references
  const strengthExercises: Exercise[] = DEFAULT_STRENGTH_EXERCISES.map(ex => ({
    id: generateId(),
    bodyPartId: bodyPartMap.get(ex.bodyPartName) || null,
    name: ex.name,
    type: 'strength'
  }));

  const allExercises = [...genericExercises, ...strengthExercises];
  const values = allExercises.map(ex => [
    ex.id,
    ex.bodyPartId || '',
    ex.name,
    ex.type
  ]);

  await window.gapi.client.sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: `${SHEET_NAMES.EXERCISES}!A:D`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    resource: { values }
  });
}

/**
 * Initialize the workout sheet with headers and seed data
 */
export async function initWorkoutSheet(sheetId: string): Promise<void> {
  // Initialize headers
  await initializeHeaders(sheetId);

  // Seed body parts and get their IDs
  const bodyParts = await seedBodyParts(sheetId);

  // Seed exercises with body part references
  await seedExercises(sheetId, bodyParts);
}

/**
 * Get or create the workout sheet
 * Returns the sheet ID
 */
export async function getOrCreateWorkoutSheet(): Promise<string> {
  if (!isSignedIn()) {
    throw new Error('User not signed in');
  }

  const spreadsheetName = getSpreadsheetName();
  console.log(`Looking for spreadsheet: ${spreadsheetName}`);

  // Check for stored sheet ID
  const storedId = getStoredSheetId();
  
  if (storedId) {
    // Verify the sheet still exists
    const exists = await checkSpreadsheetExists(storedId);
    if (exists) {
      console.log(`Using stored spreadsheet ID: ${storedId}`);
      return storedId;
    }
    // Sheet was deleted, clear stored ID
    console.log('Stored spreadsheet no longer exists, clearing...');
    clearStoredSheetId();
  }

  // Search for existing spreadsheet by name
  const existingSheetId = await findSpreadsheetByName(spreadsheetName);
  if (existingSheetId) {
    console.log(`Found existing spreadsheet: ${existingSheetId}`);
    storeSheetId(existingSheetId);
    return existingSheetId;
  }

  // Create new spreadsheet
  console.log(`Creating new spreadsheet: ${spreadsheetName}`);
  const newSheetId = await createSpreadsheet(spreadsheetName);
  
  // Initialize with schema and seed data
  await initWorkoutSheet(newSheetId);
  
  // Store the sheet ID
  storeSheetId(newSheetId);

  return newSheetId;
}

/**
 * Get spreadsheet URL for user to view/edit directly
 */
export function getSpreadsheetUrl(sheetId: string): string {
  return `https://docs.google.com/spreadsheets/d/${sheetId}`;
}
