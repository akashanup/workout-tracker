// Body part model
export interface BodyPart {
  id: string;
  name: string;
}

// Exercise model
export interface Exercise {
  id: string;
  bodyPartId: string | null;
  name: string;
  type: ExerciseType;
}

// Exercise types
export type ExerciseType = 'warmup' | 'strength' | 'cardio' | 'core';

// Section types for the workout
export type SectionType = 'WARMUP' | 'STRENGTH' | 'CARDIO' | 'CORE';

// Workout entry (row in the WorkoutEntries sheet)
export interface WorkoutEntry {
  id: string;
  date: string; // YYYY-MM-DD
  section: SectionType;
  bodyPartId: string | null;
  exerciseId: string | null;
  customExerciseName: string | null;
  reps: number | null;
  sets: number | null;
  restSeconds: number | null;
}

// UI-friendly workout entry with resolved references
export interface WorkoutEntryUI extends WorkoutEntry {
  bodyPartName?: string;
  exerciseName?: string;
}

// Section data for UI
export interface SectionData {
  section: SectionType;
  entries: WorkoutEntryUI[];
}

// Complete workout data for a single day
export interface WorkoutDayData {
  date: string;
  warmup: WorkoutEntryUI[];
  strength: WorkoutEntryUI[];
  cardio: WorkoutEntryUI[];
  core: WorkoutEntryUI[];
}

// Google Auth state
export interface AuthState {
  isSignedIn: boolean;
  accessToken: string | null;
  userEmail: string | null;
  userName: string | null;
}

// App configuration
export interface AppConfig {
  sheetId: string | null;
}

// Sheet names
export const SHEET_NAMES = {
  BODY_PARTS: 'BodyParts',
  EXERCISES: 'Exercises',
  WORKOUT_ENTRIES: 'WorkoutEntries'
} as const;

// Default body parts for seeding
export const DEFAULT_BODY_PARTS: Omit<BodyPart, 'id'>[] = [
  { name: 'Chest' },
  { name: 'Back' },
  { name: 'Shoulders' },
  { name: 'Biceps' },
  { name: 'Triceps' },
  { name: 'Legs' },
  { name: 'Glutes' },
  { name: 'Core' },
  { name: 'Full Body' }
];

// Default exercises for seeding
export const DEFAULT_EXERCISES: Omit<Exercise, 'id'>[] = [
  // Warmup exercises
  { name: 'Jumping Jacks', bodyPartId: null, type: 'warmup' },
  { name: 'Arm Circles', bodyPartId: null, type: 'warmup' },
  { name: 'Leg Swings', bodyPartId: null, type: 'warmup' },
  { name: 'Hip Circles', bodyPartId: null, type: 'warmup' },
  { name: 'High Knees', bodyPartId: null, type: 'warmup' },
  { name: 'Butt Kicks', bodyPartId: null, type: 'warmup' },
  { name: 'Dynamic Stretching', bodyPartId: null, type: 'warmup' },
  
  // Cardio exercises
  { name: 'Running', bodyPartId: null, type: 'cardio' },
  { name: 'Cycling', bodyPartId: null, type: 'cardio' },
  { name: 'Jump Rope', bodyPartId: null, type: 'cardio' },
  { name: 'Burpees', bodyPartId: null, type: 'cardio' },
  { name: 'Mountain Climbers', bodyPartId: null, type: 'cardio' },
  { name: 'Rowing', bodyPartId: null, type: 'cardio' },
  { name: 'Stair Climbing', bodyPartId: null, type: 'cardio' },
  
  // Core exercises
  { name: 'Plank', bodyPartId: null, type: 'core' },
  { name: 'Crunches', bodyPartId: null, type: 'core' },
  { name: 'Russian Twists', bodyPartId: null, type: 'core' },
  { name: 'Leg Raises', bodyPartId: null, type: 'core' },
  { name: 'Bicycle Crunches', bodyPartId: null, type: 'core' },
  { name: 'Dead Bug', bodyPartId: null, type: 'core' },
  { name: 'Bird Dog', bodyPartId: null, type: 'core' }
];

// Strength exercises will be linked to body parts after initialization
export const DEFAULT_STRENGTH_EXERCISES: { name: string; bodyPartName: string }[] = [
  // Chest
  { name: 'Bench Press', bodyPartName: 'Chest' },
  { name: 'Push-ups', bodyPartName: 'Chest' },
  { name: 'Dumbbell Fly', bodyPartName: 'Chest' },
  { name: 'Incline Press', bodyPartName: 'Chest' },
  
  // Back
  { name: 'Pull-ups', bodyPartName: 'Back' },
  { name: 'Lat Pulldown', bodyPartName: 'Back' },
  { name: 'Bent Over Row', bodyPartName: 'Back' },
  { name: 'Deadlift', bodyPartName: 'Back' },
  
  // Shoulders
  { name: 'Overhead Press', bodyPartName: 'Shoulders' },
  { name: 'Lateral Raises', bodyPartName: 'Shoulders' },
  { name: 'Front Raises', bodyPartName: 'Shoulders' },
  { name: 'Face Pulls', bodyPartName: 'Shoulders' },
  
  // Biceps
  { name: 'Bicep Curls', bodyPartName: 'Biceps' },
  { name: 'Hammer Curls', bodyPartName: 'Biceps' },
  { name: 'Preacher Curls', bodyPartName: 'Biceps' },
  
  // Triceps
  { name: 'Tricep Dips', bodyPartName: 'Triceps' },
  { name: 'Tricep Pushdown', bodyPartName: 'Triceps' },
  { name: 'Skull Crushers', bodyPartName: 'Triceps' },
  
  // Legs
  { name: 'Squats', bodyPartName: 'Legs' },
  { name: 'Leg Press', bodyPartName: 'Legs' },
  { name: 'Lunges', bodyPartName: 'Legs' },
  { name: 'Leg Curls', bodyPartName: 'Legs' },
  { name: 'Leg Extensions', bodyPartName: 'Legs' },
  { name: 'Calf Raises', bodyPartName: 'Legs' },
  
  // Glutes
  { name: 'Hip Thrusts', bodyPartName: 'Glutes' },
  { name: 'Glute Bridges', bodyPartName: 'Glutes' },
  { name: 'Kickbacks', bodyPartName: 'Glutes' }
];
