import React, { useState, useEffect, useCallback } from 'react';
import { WorkoutEntryUI, WorkoutDayData, Exercise, BodyPart, SectionType } from '../types/models';
import { 
  loadWorkoutForDate, 
  saveWorkoutForDate, 
  loadBodyParts, 
  loadExercises,
  createEmptyEntry,
  addCustomExercise,
  TokenExpiredError,
  NetworkError
} from '../services/workoutRepository';
import { getSpreadsheetUrl } from '../services/googleSheetsClient';
import WeekSelector, { formatDateISO } from '../components/WeekSelector';
import WorkoutSection from '../components/WorkoutSection';
import './WorkoutPage.css';

interface WorkoutPageProps {
  sheetId: string;
  onSignOut: () => void;
  userPicture?: string | null;
  userName?: string | null;
}

const WorkoutPage: React.FC<WorkoutPageProps> = ({ sheetId, onSignOut, userPicture, userName }) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [workoutData, setWorkoutData] = useState<WorkoutDayData | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [bodyParts, setBodyParts] = useState<BodyPart[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isTokenExpired, setIsTokenExpired] = useState(false);


  // Load reference data (body parts and exercises)
  useEffect(() => {
    const loadReferenceData = async () => {
      try {
        const [loadedBodyParts, loadedExercises] = await Promise.all([
          loadBodyParts(sheetId),
          loadExercises(sheetId)
        ]);
        setBodyParts(loadedBodyParts);
        setExercises(loadedExercises);
      } catch (err) {
        console.error('Error loading reference data:', err);
        setError('Failed to load exercise data');
      }
    };

    loadReferenceData();
  }, [sheetId]);

  // Load workout data for selected date
  const loadWorkout = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setSaveSuccess(false);
    setIsTokenExpired(false);

    try {
      const dateStr = formatDateISO(selectedDate);
      const data = await loadWorkoutForDate(sheetId, dateStr);
      // Mark all loaded entries as saved (they came from the sheet)
      const markAsSaved = (entries: WorkoutEntryUI[]) => 
        entries.map(e => ({ ...e, isSaved: true, isEditing: false }));
      
      setWorkoutData({
        ...data,
        warmup: markAsSaved(data.warmup),
        strength: markAsSaved(data.strength),
        cardio: markAsSaved(data.cardio),
        core: markAsSaved(data.core),
      });
      setHasUnsavedChanges(false);
    } catch (err) {
      console.error('Error loading workout:', err);
      if (err instanceof TokenExpiredError) {
        setError('Your session has expired. Please sign out and sign in again.');
        setIsTokenExpired(true);
      } else if (err instanceof NetworkError) {
        setError('Network error. Please check your connection and try again.');
      } else {
        setError('Failed to load workout data. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [sheetId, selectedDate]);

  useEffect(() => {
    loadWorkout();
  }, [loadWorkout]);

  // Handle date change
  const handleDateChange = (date: Date) => {
    if (hasUnsavedChanges) {
      const confirm = window.confirm('You have unsaved changes. Discard them?');
      if (!confirm) return;
    }
    setSelectedDate(date);
  };

  // Update section entries
  const updateSection = (
    section: 'warmup' | 'strength' | 'cardio' | 'core',
    entries: WorkoutEntryUI[]
  ) => {
    if (!workoutData) return;
    setWorkoutData({
      ...workoutData,
      [section]: entries
    });
    setHasUnsavedChanges(true);
    setSaveSuccess(false);
  };

  // Add entry to section
  const addEntry = (section: 'warmup' | 'strength' | 'cardio' | 'core') => {
    if (!workoutData) return;
    const sectionType = section.toUpperCase() as 'WARMUP' | 'STRENGTH' | 'CARDIO' | 'CORE';
    const newEntry = createEmptyEntry(sectionType, workoutData.date);
    updateSection(section, [...workoutData[section], newEntry]);
  };

  // Update entry in section
  const updateEntry = (
    section: 'warmup' | 'strength' | 'cardio' | 'core',
    index: number,
    entry: WorkoutEntryUI
  ) => {
    if (!workoutData) return;
    const entries = [...workoutData[section]];
    entries[index] = entry;
    updateSection(section, entries);
  };

  // Delete entry from section
  const deleteEntry = async (
    section: 'warmup' | 'strength' | 'cardio' | 'core',
    index: number
  ) => {
    if (!workoutData) return;
    
    const entryToDelete = workoutData[section][index];
    const entries = [...workoutData[section]];
    entries.splice(index, 1);
    
    const updatedWorkoutData = {
      ...workoutData,
      [section]: entries
    };
    
    // Update local state first
    setWorkoutData(updatedWorkoutData);
    
    // If the entry was saved, save the updated workout data to persist the deletion
    if (entryToDelete.isSaved) {
      try {
        await saveWorkoutForDate(sheetId, updatedWorkoutData.date, updatedWorkoutData);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
      } catch (err) {
        console.error('Error saving after delete:', err);
        // Revert on error
        setWorkoutData(workoutData);
        if (err instanceof TokenExpiredError) {
          setError('Your session has expired. Please sign out and sign in again.');
          setIsTokenExpired(true);
        } else {
          setError('Failed to delete exercise. Please try again.');
        }
        throw err;
      }
    }
    
    setHasUnsavedChanges(false);
  };

  // Save individual entry
  const saveEntry = async (
    section: 'warmup' | 'strength' | 'cardio' | 'core',
    index: number
  ) => {
    if (!workoutData) return;

    const entry = workoutData[section][index];
    
    // Validate this single entry
    if (!entry.exerciseId && !entry.customExerciseName) {
      setError('Exercise must have either a selected exercise or a custom name');
      throw new Error('Validation failed');
    }
    
    if (entry.section === 'STRENGTH' && !entry.bodyPartId) {
      setError('Strength exercises must have a body part selected');
      throw new Error('Validation failed');
    }

    setError(null);
    setIsTokenExpired(false);

    try {
      // Save the entire workout data (this is simpler than partial saves)
      await saveWorkoutForDate(sheetId, workoutData.date, workoutData);
      
      // Mark this entry as saved and not editing
      const entries = [...workoutData[section]];
      entries[index] = { ...entries[index], isSaved: true, isEditing: false };
      setWorkoutData({
        ...workoutData,
        [section]: entries
      });
      
      setSaveSuccess(true);
      setHasUnsavedChanges(false);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      console.error('Error saving entry:', err);
      if (err instanceof TokenExpiredError) {
        setError('Your session has expired. Please sign out and sign in again.');
        setIsTokenExpired(true);
      } else if (err instanceof NetworkError) {
        setError('Network error. Please check your connection and try again.');
      } else if ((err as Error).message !== 'Validation failed') {
        setError('Failed to save exercise. Please try again.');
      }
      throw err;
    }
  };

  // Add a new custom exercise to the Exercises sheet
  const handleAddExercise = async (
    name: string,
    section: SectionType
  ): Promise<Exercise | null> => {
    try {
      // Determine the exercise type based on section
      // For WARMUP and CARDIO, use 'cardio' type with applicableSections
      const exerciseType = section === 'STRENGTH' 
        ? 'strength' 
        : section === 'CORE' 
          ? 'core' 
          : 'cardio';
      
      // Set applicable sections for cardio-type exercises
      const applicableSections: SectionType[] = exerciseType === 'cardio' 
        ? ['WARMUP', 'CARDIO'] 
        : [];
      
      const newExercise = await addCustomExercise(sheetId, {
        name,
        bodyPartId: null,
        type: exerciseType,
        applicableSections
      });
      
      // Add to local exercises list
      setExercises(prev => [...prev, newExercise]);
      
      return newExercise;
    } catch (err) {
      console.error('Error adding custom exercise:', err);
      setError('Failed to add new exercise. Please try again.');
      return null;
    }
  };

  // Validate entries
  const validateEntries = (): boolean => {
    if (!workoutData) return false;

    const allEntries = [
      ...workoutData.warmup,
      ...workoutData.strength,
      ...workoutData.cardio,
      ...workoutData.core
    ];

    for (const entry of allEntries) {
      // Check if exercise is selected or custom name is provided
      if (!entry.exerciseId && !entry.customExerciseName) {
        setError('Each exercise must have either a selected exercise or a custom name');
        return false;
      }

      // Validate reps
      if (entry.reps !== null && entry.reps < 0) {
        setError('Reps must be a positive number');
        return false;
      }

      // Validate sets
      if (entry.sets !== null && entry.sets < 0) {
        setError('Sets must be a positive number');
        return false;
      }

      // Validate rest time
      if (entry.restSeconds !== null && entry.restSeconds < 0) {
        setError('Rest time must be 0 or greater');
        return false;
      }

      // Strength exercises should have body part
      if (entry.section === 'STRENGTH' && !entry.bodyPartId) {
        setError('Strength exercises must have a body part selected');
        return false;
      }
    }

    return true;
  };

  // Save workout
  const handleSave = async () => {
    if (!workoutData) return;

    // Validate first
    if (!validateEntries()) {
      return;
    }

    setIsSaving(true);
    setError(null);
    setIsTokenExpired(false);

    try {
      await saveWorkoutForDate(sheetId, workoutData.date, workoutData);
      setSaveSuccess(true);
      setHasUnsavedChanges(false);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving workout:', err);
      if (err instanceof TokenExpiredError) {
        setError('Your session has expired. Please sign out and sign in again.');
        setIsTokenExpired(true);
      } else if (err instanceof NetworkError) {
        setError('Network error. Please check your connection and try again.');
      } else {
        setError('Failed to save workout. Please try again.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Count total exercises
  const totalExercises = workoutData
    ? workoutData.warmup.length +
      workoutData.strength.length +
      workoutData.cardio.length +
      workoutData.core.length
    : 0;

  return (
    <div className="workout-page">
      <header className="page-header">
        <div className="header-content">
          <h1>🏋️ Workout Tracker</h1>
          <div className="header-actions">
            {userPicture && (
              <img 
                src={userPicture} 
                alt={userName || 'User'} 
                className="user-avatar"
                title={userName || 'User'}
              />
            )}
            <a
              href={getSpreadsheetUrl(sheetId)}
              target="_blank"
              rel="noopener noreferrer"
              className="sheet-link"
            >
              📊 View Sheet
            </a>
            <button className="sign-out-button" onClick={onSignOut}>
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="page-content">
        <WeekSelector 
          selectedDate={selectedDate} 
          onDateChange={handleDateChange} 
        />

        {error && (
          <div className={`error-banner ${isTokenExpired ? 'token-expired' : ''}`}>
            <span>{error}</span>
            <div className="error-actions">
              {isTokenExpired && (
                <button className="reauth-button" onClick={onSignOut}>
                  Sign Out & Re-authenticate
                </button>
              )}
              <button className="dismiss-button" onClick={() => setError(null)}>×</button>
            </div>
          </div>
        )}

        {saveSuccess && (
          <div className="success-banner">
            ✓ Workout saved successfully!
          </div>
        )}

        {isLoading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading workout...</p>
          </div>
        ) : workoutData ? (
          <>
            <WorkoutSection
              title="Warm-up"
              section="WARMUP"
              entries={workoutData.warmup}
              exercises={exercises}
              bodyParts={bodyParts}
              onAddEntry={() => addEntry('warmup')}
              onUpdateEntry={(index, entry) => updateEntry('warmup', index, entry)}
              onDeleteEntry={(index) => deleteEntry('warmup', index)}
              onSaveEntry={(index) => saveEntry('warmup', index)}
              onAddExercise={(name) => handleAddExercise(name, 'WARMUP')}
              isSaving={isSaving}
            />

            <WorkoutSection
              title="Strength Training"
              section="STRENGTH"
              entries={workoutData.strength}
              exercises={exercises}
              bodyParts={bodyParts}
              onAddEntry={() => addEntry('strength')}
              onUpdateEntry={(index, entry) => updateEntry('strength', index, entry)}
              onDeleteEntry={(index) => deleteEntry('strength', index)}
              onSaveEntry={(index) => saveEntry('strength', index)}
              onAddExercise={(name) => handleAddExercise(name, 'STRENGTH')}
              isSaving={isSaving}
            />

            <WorkoutSection
              title="Cardio"
              section="CARDIO"
              entries={workoutData.cardio}
              exercises={exercises}
              bodyParts={bodyParts}
              onAddEntry={() => addEntry('cardio')}
              onUpdateEntry={(index, entry) => updateEntry('cardio', index, entry)}
              onDeleteEntry={(index) => deleteEntry('cardio', index)}
              onSaveEntry={(index) => saveEntry('cardio', index)}
              onAddExercise={(name) => handleAddExercise(name, 'CARDIO')}
              isSaving={isSaving}
            />

            <WorkoutSection
              title="Core"
              section="CORE"
              entries={workoutData.core}
              exercises={exercises}
              bodyParts={bodyParts}
              onAddEntry={() => addEntry('core')}
              onUpdateEntry={(index, entry) => updateEntry('core', index, entry)}
              onDeleteEntry={(index) => deleteEntry('core', index)}
              onSaveEntry={(index) => saveEntry('core', index)}
              onAddExercise={(name) => handleAddExercise(name, 'CORE')}
              isSaving={isSaving}
            />
          </>
        ) : (
          <div className="error-state">
            <p>Failed to load workout data</p>
            <button onClick={loadWorkout}>Retry</button>
          </div>
        )}
      </main>
    </div>
  );
};

export default WorkoutPage;
