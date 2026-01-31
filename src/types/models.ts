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
  // Exercises can belong to multiple sections (e.g., running for warmup and cardio)
  applicableSections?: SectionType[];
}

// Exercise types - 'warmup' type is deprecated, use 'cardio' with applicableSections for warmup exercises
export type ExerciseType = 'strength' | 'cardio' | 'core';

// Section types for the workout
export type SectionType = 'WARMUP' | 'STRENGTH' | 'CARDIO' | 'CORE';

// Metric type - whether exercise is measured in reps or duration
export type MetricType = 'reps' | 'duration';

// A single set within an exercise (for reps-based exercises)
export interface ExerciseSet {
  setNumber: number;
  reps: number | null;
  weightKg: number | null;
  restSeconds: number | null;
}

// Workout entry (row in the WorkoutEntries sheet)
// For reps-based exercises, each row represents one SET
export interface WorkoutEntry {
  id: string;
  date: string; // YYYY-MM-DD
  section: SectionType;
  bodyPartId: string | null;
  exerciseId: string | null;
  customExerciseName: string | null;
  // Metric type: 'reps' for reps/sets, 'duration' for time-based
  metricType: MetricType;
  // For reps-based exercises: each row is one set
  setNumber: number | null;
  reps: number | null;
  weightKg: number | null;
  // Duration in seconds (for time-based exercises)
  durationSeconds: number | null;
  restSeconds: number | null;
}

// UI-friendly workout entry with resolved references
// For reps-based exercises, this represents one EXERCISE with multiple sets
export interface WorkoutEntryUI {
  // Unique ID for the exercise group (not individual sets)
  id: string;
  date: string;
  section: SectionType;
  bodyPartId: string | null;
  bodyPartName?: string;
  exerciseId: string | null;
  exerciseName?: string;
  customExerciseName: string | null;
  metricType: MetricType;
  // For reps-based: array of sets
  sets: ExerciseSet[];
  // For duration-based: single duration value
  durationSeconds: number | null;
  // UI state: whether the entry has been saved to the sheet
  isSaved?: boolean;
  // UI state: whether the entry is in edit mode (only applies to saved entries)
  isEditing?: boolean;
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
// Warmup and Cardio exercises all use 'cardio' type with applicableSections to control visibility
export const DEFAULT_EXERCISES: (Omit<Exercise, 'id'> & { applicableSections?: SectionType[] })[] = [
  // Warmup-specific exercises (only show in warmup)
  { name: 'Arm Circles', bodyPartId: null, type: 'cardio', applicableSections: ['WARMUP'] },
  { name: 'Leg Swings', bodyPartId: null, type: 'cardio', applicableSections: ['WARMUP'] },
  { name: 'Hip Circles', bodyPartId: null, type: 'cardio', applicableSections: ['WARMUP'] },
  { name: 'Dynamic Stretching', bodyPartId: null, type: 'cardio', applicableSections: ['WARMUP'] },
  
  // Exercises that work for both warmup and cardio
  { name: 'Jumping Jacks', bodyPartId: null, type: 'cardio', applicableSections: ['WARMUP', 'CARDIO'] },
  { name: 'High Knees', bodyPartId: null, type: 'cardio', applicableSections: ['WARMUP', 'CARDIO'] },
  { name: 'Butt Kicks', bodyPartId: null, type: 'cardio', applicableSections: ['WARMUP', 'CARDIO'] },
  { name: 'Running', bodyPartId: null, type: 'cardio', applicableSections: ['WARMUP', 'CARDIO'] },
  { name: 'Cycling', bodyPartId: null, type: 'cardio', applicableSections: ['WARMUP', 'CARDIO'] },
  { name: 'Cross Trainer', bodyPartId: null, type: 'cardio', applicableSections: ['WARMUP', 'CARDIO'] },
  { name: 'Jump Rope', bodyPartId: null, type: 'cardio', applicableSections: ['WARMUP', 'CARDIO'] },
  { name: 'Mountain Climbers', bodyPartId: null, type: 'cardio', applicableSections: ['WARMUP', 'CARDIO', 'CORE'] },
  { name: 'Rowing', bodyPartId: null, type: 'cardio', applicableSections: ['WARMUP', 'CARDIO'] },
  { name: 'Treadmill Walking', bodyPartId: null, type: 'cardio', applicableSections: ['WARMUP', 'CARDIO'] },
  
  // Cardio-only exercises
  { name: 'Burpees', bodyPartId: null, type: 'cardio', applicableSections: ['CARDIO'] },
  { name: 'Stair Climbing', bodyPartId: null, type: 'cardio', applicableSections: ['CARDIO'] },
  
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
