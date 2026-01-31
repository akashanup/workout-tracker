/**
 * Workout Repository Service
 * Handles reading and writing workout data to Google Sheets
 */

import {
  BodyPart,
  Exercise,
  WorkoutEntry,
  WorkoutEntryUI,
  WorkoutDayData,
  SHEET_NAMES,
  SectionType,
  ExerciseType,
  MetricType,
  ExerciseSet
} from '../types/models';

/**
 * Custom error class for token expiry
 */
export class TokenExpiredError extends Error {
  constructor(message: string = 'Your session has expired. Please sign in again.') {
    super(message);
    this.name = 'TokenExpiredError';
  }
}

/**
 * Custom error class for network errors
 */
export class NetworkError extends Error {
  constructor(message: string = 'Network error. Please check your connection and try again.') {
    super(message);
    this.name = 'NetworkError';
  }
}

/**
 * Check if an error indicates token expiry (401 Unauthorized)
 */
function isTokenExpiredError(error: unknown): boolean {
  if (error && typeof error === 'object') {
    // Check for gapi error format
    if ('status' in error && (error as { status: number }).status === 401) {
      return true;
    }
    // Check for result.error.code format
    if ('result' in error) {
      const result = (error as { result?: { error?: { code?: number } } }).result;
      if (result?.error?.code === 401) {
        return true;
      }
    }
    // Check for error message
    if ('message' in error) {
      const message = (error as { message: string }).message.toLowerCase();
      if (message.includes('unauthorized') || message.includes('invalid credentials') || message.includes('token')) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Check if an error is a network error
 */
function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return true;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message: string }).message.toLowerCase();
    return message.includes('network') || 
           message.includes('failed to fetch') || 
           message.includes('offline') ||
           message.includes('connection');
  }
  return false;
}

/**
 * Wrap an API call with standardized error handling
 * Transforms Google API errors into user-friendly error types
 */
export async function withErrorHandling<T>(
  apiCall: () => Promise<T>
): Promise<T> {
  try {
    return await apiCall();
  } catch (error) {
    if (isTokenExpiredError(error)) {
      throw new TokenExpiredError();
    }
    if (isNetworkError(error)) {
      throw new NetworkError();
    }
    // Re-throw other errors as-is
    throw error;
  }
}

/**
 * Generate a unique ID
 */
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

/**
 * Load all body parts from the sheet
 */
export async function loadBodyParts(sheetId: string): Promise<BodyPart[]> {
  try {
    const response = await window.gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${SHEET_NAMES.BODY_PARTS}!A2:B`
    });

    const rows = response.result.values || [];
    return rows.map(row => ({
      id: row[0] || '',
      name: row[1] || ''
    }));
  } catch (error) {
    console.error('Error loading body parts:', error);
    return [];
  }
}

/**
 * Load all exercises from the sheet
 */
export async function loadExercises(sheetId: string): Promise<Exercise[]> {
  try {
    const response = await window.gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${SHEET_NAMES.EXERCISES}!A2:E`
    });

    const rows = response.result.values || [];
    return rows.map(row => ({
      id: row[0] || '',
      bodyPartId: row[1] || null,
      name: row[2] || '',
      type: (row[3] || 'strength') as ExerciseType,
      // Parse applicableSections from comma-separated string
      applicableSections: row[4] ? row[4].split(',').filter((s: string) => s.trim()) as SectionType[] : undefined
    }));
  } catch (error) {
    console.error('Error loading exercises:', error);
    return [];
  }
}

/**
 * Load workout entries for a specific date (raw rows from sheet)
 * Each row represents one SET of an exercise
 */
export async function loadWorkoutEntriesForDate(
  sheetId: string,
  date: string
): Promise<WorkoutEntry[]> {
  try {
    const response = await window.gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${SHEET_NAMES.WORKOUT_ENTRIES}!A2:L`
    });

    const rows = response.result.values || [];
    
    // Filter rows for the specific date
    const entries: WorkoutEntry[] = rows
      .filter(row => row[1] === date)
      .map(row => ({
        id: row[0] || '',
        date: row[1] || '',
        section: (row[2] || 'STRENGTH') as SectionType,
        bodyPartId: row[3] || null,
        exerciseId: row[4] || null,
        customExerciseName: row[5] || null,
        metricType: (row[6] || 'reps') as MetricType,
        setNumber: row[7] ? parseInt(row[7], 10) : null,
        reps: row[8] ? parseInt(row[8], 10) : null,
        weightKg: row[9] ? parseFloat(row[9]) : null,
        durationSeconds: row[10] ? parseInt(row[10], 10) : null,
        restSeconds: row[11] ? parseInt(row[11], 10) : null
      }));

    return entries;
  } catch (error) {
    console.error('Error loading workout entries:', error);
    return [];
  }
}

/**
 * Load complete workout data for a date with resolved references
 * Groups individual set rows into exercise entries with sets array
 */
export async function loadWorkoutForDate(
  sheetId: string,
  date: string
): Promise<WorkoutDayData> {
  // Load all reference data and entries in parallel
  const [bodyParts, exercises, entries] = await Promise.all([
    loadBodyParts(sheetId),
    loadExercises(sheetId),
    loadWorkoutEntriesForDate(sheetId, date)
  ]);

  // Create lookup maps
  const bodyPartMap = new Map<string, string>();
  bodyParts.forEach(bp => bodyPartMap.set(bp.id, bp.name));

  const exerciseMap = new Map<string, string>();
  exercises.forEach(ex => exerciseMap.set(ex.id, ex.name));

  // Group entries by exercise (using exerciseId or customExerciseName + section + bodyPartId as key)
  const exerciseGroups = new Map<string, WorkoutEntry[]>();
  
  entries.forEach(entry => {
    const key = `${entry.section}|${entry.bodyPartId || ''}|${entry.exerciseId || ''}|${entry.customExerciseName || ''}`;
    const existing = exerciseGroups.get(key) || [];
    existing.push(entry);
    exerciseGroups.set(key, existing);
  });

  // Convert groups to WorkoutEntryUI with sets array
  const enrichedEntries: WorkoutEntryUI[] = [];
  
  exerciseGroups.forEach((setEntries) => {
    // Sort sets by setNumber
    setEntries.sort((a, b) => (a.setNumber || 0) - (b.setNumber || 0));
    
    // Use first entry as the base
    const firstEntry = setEntries[0];
    
    // Build sets array for reps-based exercises
    const sets: ExerciseSet[] = setEntries
      .filter(e => e.metricType === 'reps')
      .map(e => ({
        setNumber: e.setNumber || 1,
        reps: e.reps,
        weightKg: e.weightKg,
        restSeconds: e.restSeconds
      }));

    // For duration-based, use the first entry's duration
    const durationSeconds = firstEntry.metricType === 'duration' 
      ? firstEntry.durationSeconds 
      : null;

    const uiEntry: WorkoutEntryUI = {
      id: firstEntry.id, // Use first entry's ID as the exercise group ID
      date: firstEntry.date,
      section: firstEntry.section,
      bodyPartId: firstEntry.bodyPartId,
      bodyPartName: firstEntry.bodyPartId ? bodyPartMap.get(firstEntry.bodyPartId) : undefined,
      exerciseId: firstEntry.exerciseId,
      exerciseName: firstEntry.exerciseId ? exerciseMap.get(firstEntry.exerciseId) : undefined,
      customExerciseName: firstEntry.customExerciseName,
      metricType: firstEntry.metricType,
      sets: sets.length > 0 ? sets : [{ setNumber: 1, reps: null, weightKg: null, restSeconds: null }],
      durationSeconds,
      isSaved: true
    };

    enrichedEntries.push(uiEntry);
  });

  // Group entries by section
  const warmup = enrichedEntries.filter(e => e.section === 'WARMUP');
  const strength = enrichedEntries.filter(e => e.section === 'STRENGTH');
  const cardio = enrichedEntries.filter(e => e.section === 'CARDIO');
  const core = enrichedEntries.filter(e => e.section === 'CORE');

  return {
    date,
    warmup,
    strength,
    cardio,
    core
  };
}

/**
 * Get all entries for all dates (needed to find rows to delete)
 */
async function getAllWorkoutEntries(sheetId: string): Promise<{ rowIndex: number; entry: WorkoutEntry }[]> {
  try {
    const response = await window.gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${SHEET_NAMES.WORKOUT_ENTRIES}!A2:L`
    });

    const rows = response.result.values || [];
    
    return rows.map((row, index) => ({
      rowIndex: index + 2, // +2 because we start at row 2 (after header)
      entry: {
        id: row[0] || '',
        date: row[1] || '',
        section: (row[2] || 'STRENGTH') as SectionType,
        bodyPartId: row[3] || null,
        exerciseId: row[4] || null,
        customExerciseName: row[5] || null,
        metricType: (row[6] || 'reps') as MetricType,
        setNumber: row[7] ? parseInt(row[7], 10) : null,
        reps: row[8] ? parseInt(row[8], 10) : null,
        weightKg: row[9] ? parseFloat(row[9]) : null,
        durationSeconds: row[10] ? parseInt(row[10], 10) : null,
        restSeconds: row[11] ? parseInt(row[11], 10) : null
      }
    }));
  } catch (error) {
    console.error('Error getting all workout entries:', error);
    return [];
  }
}

/**
 * Save workout data for a specific date
 * This clears existing entries for the date and writes new ones
 * Each set is saved as a separate row
 */
export async function saveWorkoutForDate(
  sheetId: string,
  date: string,
  data: WorkoutDayData
): Promise<void> {
  // Get all current entries to find which rows to clear
  const allEntries = await getAllWorkoutEntries(sheetId);
  
  // Find rows for this date (we need to delete them)
  const rowsToDelete = allEntries
    .filter(({ entry }) => entry.date === date)
    .map(({ rowIndex }) => rowIndex)
    .sort((a, b) => b - a); // Sort descending to delete from bottom up

  // Get the sheet ID (numeric) for the WorkoutEntries sheet
  const spreadsheet = await window.gapi.client.sheets.spreadsheets.get({
    spreadsheetId: sheetId
  });

  const workoutEntriesSheet = (spreadsheet.result as { sheets: { properties: { title: string; sheetId: number } }[] }).sheets?.find(
    (s: { properties: { title: string } }) => s.properties.title === SHEET_NAMES.WORKOUT_ENTRIES
  );

  if (!workoutEntriesSheet) {
    throw new Error('WorkoutEntries sheet not found');
  }

  const numericSheetId = workoutEntriesSheet.properties.sheetId;

  // Delete existing rows for this date (if any)
  if (rowsToDelete.length > 0) {
    const deleteRequests = rowsToDelete.map(rowIndex => ({
      deleteDimension: {
        range: {
          sheetId: numericSheetId,
          dimension: 'ROWS',
          startIndex: rowIndex - 1, // 0-indexed
          endIndex: rowIndex // exclusive
        }
      }
    }));

    await window.gapi.client.sheets.spreadsheets.batchUpdate({
      spreadsheetId: sheetId,
      resource: { requests: deleteRequests }
    });
  }

  // Combine all entries
  const allNewEntries = [
    ...data.warmup,
    ...data.strength,
    ...data.cardio,
    ...data.core
  ];

  if (allNewEntries.length === 0) {
    return; // Nothing to save
  }

  // Prepare rows for insertion - each set is a separate row
  const values: (string | number)[][] = [];
  
  allNewEntries.forEach(entry => {
    if (entry.metricType === 'duration') {
      // For duration-based exercises, save one row
      values.push([
        entry.id || generateId(),
        date,
        entry.section,
        entry.bodyPartId || '',
        entry.exerciseId || '',
        entry.customExerciseName || '',
        entry.metricType,
        1, // setNumber
        '', // reps (not used for duration)
        '', // weightKg (not used for duration)
        entry.durationSeconds ?? '',
        '' // restSeconds (not typically used for duration)
      ]);
    } else {
      // For reps-based exercises, save each set as a separate row
      entry.sets.forEach((set, index) => {
        values.push([
          index === 0 ? (entry.id || generateId()) : generateId(), // First set uses exercise ID
          date,
          entry.section,
          entry.bodyPartId || '',
          entry.exerciseId || '',
          entry.customExerciseName || '',
          entry.metricType,
          set.setNumber || (index + 1),
          set.reps ?? '',
          set.weightKg ?? '',
          '', // durationSeconds (not used for reps)
          set.restSeconds ?? ''
        ]);
      });
    }
  });

  // Append new rows
  await window.gapi.client.sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: `${SHEET_NAMES.WORKOUT_ENTRIES}!A:L`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    resource: { values }
  });
}

/**
 * Add a new custom exercise to the Exercises sheet
 */
export async function addCustomExercise(
  sheetId: string,
  exercise: Omit<Exercise, 'id'>
): Promise<Exercise> {
  const newExercise: Exercise = {
    ...exercise,
    id: generateId()
  };

  await window.gapi.client.sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: `${SHEET_NAMES.EXERCISES}!A:E`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    resource: {
      values: [[
        newExercise.id,
        newExercise.bodyPartId || '',
        newExercise.name,
        newExercise.type,
        (newExercise.applicableSections || []).join(',')
      ]]
    }
  });

  return newExercise;
}

/**
 * Create an empty workout entry for a section
 */
export function createEmptyEntry(section: SectionType, date: string): WorkoutEntryUI {
  return {
    id: generateId(),
    date,
    section,
    bodyPartId: null,
    exerciseId: null,
    customExerciseName: null,
    metricType: 'reps', // Default to reps
    sets: [{ setNumber: 1, reps: null, weightKg: null, restSeconds: null }],
    durationSeconds: null
  };
}
