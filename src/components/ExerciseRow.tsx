import React, { useState, useRef, useEffect } from 'react';
import { WorkoutEntryUI, Exercise, BodyPart, SectionType, MetricType } from '../types/models';
import './ExerciseRow.css';

interface ExerciseRowProps {
  entry: WorkoutEntryUI;
  exercises: Exercise[];
  bodyParts: BodyPart[];
  section: SectionType;
  onUpdate: (updated: WorkoutEntryUI) => void;
  onDelete: () => Promise<void>;
  onSave: () => Promise<void>;
  onAddExercise?: (name: string) => Promise<Exercise | null>;
  isSaving?: boolean;
}

const ExerciseRow: React.FC<ExerciseRowProps> = ({
  entry,
  exercises,
  bodyParts,
  section,
  onUpdate,
  onDelete,
  onSave,
  onAddExercise,
  isSaving = false
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [localSaving, setLocalSaving] = useState(false);
  const [exerciseInput, setExerciseInput] = useState(entry.exerciseName || entry.customExerciseName || '');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Update input when entry changes externally
  useEffect(() => {
    setExerciseInput(entry.exerciseName || entry.customExerciseName || '');
  }, [entry.exerciseName, entry.customExerciseName]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        inputRef.current && 
        !inputRef.current.contains(event.target as Node) &&
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Determine if the row is read-only (saved and not in edit mode)
  const isReadOnly = entry.isSaved && !entry.isEditing;
  const isCurrentlySaving = isSaving || localSaving || isDeleting;

  // Check if entry has any data (for delete confirmation)
  const hasData = !!(
    entry.exerciseId || 
    entry.customExerciseName || 
    entry.reps || 
    entry.sets || 
    entry.durationSeconds || 
    entry.restSeconds
  );

  // Check if entry has all required data for saving
  const hasExerciseName = !!(entry.exerciseId || entry.customExerciseName);
  const hasMetricData = entry.metricType === 'duration' 
    ? !!(entry.durationSeconds && entry.durationSeconds > 0)
    : !!(entry.reps && entry.reps > 0 && entry.sets && entry.sets > 0);
  const hasRequiredBodyPart = section !== 'STRENGTH' || !!entry.bodyPartId;
  const canSave = hasExerciseName && hasMetricData && hasRequiredBodyPart;

  // Handle save button click
  const handleSave = async () => {
    if (!canSave) return;
    setLocalSaving(true);
    try {
      await onSave();
    } finally {
      setLocalSaving(false);
    }
  };

  // Handle edit button click
  const handleEdit = () => {
    onUpdate({ ...entry, isEditing: true });
  };

  // Handle delete with confirmation
  const handleDeleteClick = () => {
    // Only show confirmation if entry has data
    if (hasData) {
      setShowDeleteConfirm(true);
    } else {
      // Delete immediately if no data
      performDelete();
    }
  };

  const performDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete();
    } finally {
      setIsDeleting(false);
    }
  };

  const handleConfirmDelete = async () => {
    setShowDeleteConfirm(false);
    await performDelete();
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
  };

  // Filter exercises by section type OR by applicableSections
  // For WARMUP and CARDIO sections, use 'cardio' type exercises
  const sectionType = (section === 'WARMUP' || section === 'CARDIO') 
    ? 'cardio' 
    : section.toLowerCase() as 'strength' | 'core';
  
  const filteredExercises = exercises.filter(ex => {
    // Check if exercise has applicableSections and includes current section
    if (ex.applicableSections && ex.applicableSections.length > 0) {
      return ex.applicableSections.includes(section);
    }
    // Otherwise fall back to type matching
    return ex.type === sectionType;
  });

  // For strength section, also filter by selected body part if one is selected
  const availableExercises = section === 'STRENGTH' && entry.bodyPartId
    ? filteredExercises.filter(ex => ex.bodyPartId === entry.bodyPartId || !ex.bodyPartId)
    : filteredExercises;

  // Filter suggestions based on input
  const filteredSuggestions = exerciseInput.trim()
    ? availableExercises.filter(ex => 
        ex.name.toLowerCase().includes(exerciseInput.toLowerCase())
      )
    : availableExercises;

  // Handle exercise input change
  const handleExerciseInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setExerciseInput(value);
    setShowSuggestions(true);
    
    // Check if input matches an existing exercise exactly
    const exactMatch = availableExercises.find(
      ex => ex.name.toLowerCase() === value.toLowerCase()
    );
    
    if (exactMatch) {
      onUpdate({
        ...entry,
        exerciseId: exactMatch.id,
        exerciseName: exactMatch.name,
        customExerciseName: null
      });
    } else {
      onUpdate({
        ...entry,
        exerciseId: null,
        exerciseName: undefined,
        customExerciseName: value || null
      });
    }
  };

  // Handle selecting an exercise from suggestions
  const handleSelectExercise = (exercise: Exercise) => {
    setExerciseInput(exercise.name);
    setShowSuggestions(false);
    onUpdate({
      ...entry,
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      customExerciseName: null
    });
  };

  // Handle adding a new custom exercise
  const handleAddNewExercise = async () => {
    if (!exerciseInput.trim() || !onAddExercise) return;
    
    const newExercise = await onAddExercise(exerciseInput.trim());
    if (newExercise) {
      onUpdate({
        ...entry,
        exerciseId: newExercise.id,
        exerciseName: newExercise.name,
        customExerciseName: null
      });
      setShowSuggestions(false);
    }
  };

  const handleBodyPartChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const bodyPartId = e.target.value || null;
    const bodyPart = bodyParts.find(bp => bp.id === bodyPartId);
    onUpdate({
      ...entry,
      bodyPartId,
      bodyPartName: bodyPart?.name,
      // Reset exercise when body part changes
      exerciseId: null,
      exerciseName: undefined
    });
  };

  const handleNumberChange = (
    field: 'reps' | 'sets' | 'restSeconds' | 'durationSeconds',
    value: string
  ) => {
    const numValue = value === '' ? null : parseInt(value, 10);
    onUpdate({
      ...entry,
      [field]: isNaN(numValue as number) ? null : numValue
    });
  };

  const handleMetricTypeChange = (metricType: MetricType) => {
    onUpdate({
      ...entry,
      metricType,
      // Clear the other metric's values when switching
      reps: metricType === 'duration' ? null : entry.reps,
      sets: metricType === 'duration' ? null : entry.sets,
      durationSeconds: metricType === 'reps' ? null : entry.durationSeconds
    });
  };

  // Convert seconds to minutes for display
  const durationMinutes = entry.durationSeconds ? Math.floor(entry.durationSeconds / 60) : null;
  const durationRemainingSeconds = entry.durationSeconds ? entry.durationSeconds % 60 : null;

  const handleDurationMinutesChange = (minutes: string) => {
    const mins = minutes === '' ? 0 : parseInt(minutes, 10);
    const secs = durationRemainingSeconds || 0;
    const totalSeconds = (isNaN(mins) ? 0 : mins) * 60 + secs;
    onUpdate({
      ...entry,
      durationSeconds: totalSeconds > 0 ? totalSeconds : null
    });
  };

  const handleDurationSecondsChange = (seconds: string) => {
    const secs = seconds === '' ? 0 : parseInt(seconds, 10);
    const mins = durationMinutes || 0;
    const totalSeconds = mins * 60 + (isNaN(secs) ? 0 : secs);
    onUpdate({
      ...entry,
      durationSeconds: totalSeconds > 0 ? totalSeconds : null
    });
  };

  const isUsingCustomName = !entry.exerciseId && entry.customExerciseName;
  
  // For non-strength sections, show metric type toggle
  const showMetricToggle = section !== 'STRENGTH';

  return (
    <div className={`exercise-row ${isReadOnly ? 'read-only' : ''} ${isCurrentlySaving ? 'saving' : ''} ${section !== 'STRENGTH' ? 'non-strength' : ''}`}>
      {/* Delete confirmation overlay */}
      {showDeleteConfirm && (
        <div className="delete-confirm-overlay">
          <div className="delete-confirm-dialog">
            <p>Delete this exercise?</p>
            <div className="delete-confirm-buttons">
              <button className="confirm-delete-btn" onClick={handleConfirmDelete}>
                Delete
              </button>
              <button className="cancel-delete-btn" onClick={handleCancelDelete}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Row 1: Exercise name (+ Body Part for Strength, + Metric toggle for others) */}
      <div className="exercise-row-main">
        {/* Body Part selector (Strength section only) */}
        {section === 'STRENGTH' && (
          <div className="input-group body-part-group">
            <label>Body Part</label>
            <select
              value={entry.bodyPartId || ''}
              onChange={handleBodyPartChange}
              className="select-input"
              disabled={isReadOnly}
            >
              <option value="">Select body part...</option>
              {bodyParts.map(bp => (
                <option key={bp.id} value={bp.id}>
                  {bp.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Exercise autocomplete input */}
        <div className="input-group exercise-group">
          <label>Exercise</label>
          <div className="exercise-autocomplete">
            <input
              ref={inputRef}
              type="text"
              value={exerciseInput}
              onChange={handleExerciseInputChange}
              onFocus={() => setShowSuggestions(true)}
              placeholder="Type to search or add..."
              className="text-input"
              disabled={isReadOnly}
            />
            {showSuggestions && !isReadOnly && (
              <div ref={suggestionsRef} className="exercise-suggestions">
                {filteredSuggestions.length > 0 ? (
                  filteredSuggestions.slice(0, 8).map(ex => (
                    <div
                      key={ex.id}
                      className={`suggestion-item ${entry.exerciseId === ex.id ? 'selected' : ''}`}
                      onClick={() => handleSelectExercise(ex)}
                    >
                      {ex.name}
                    </div>
                  ))
                ) : exerciseInput.trim() ? (
                  <div 
                    className="suggestion-item add-new"
                    onClick={handleAddNewExercise}
                  >
                    + Add "{exerciseInput.trim()}" as new exercise
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>

        {/* Metric type toggle for non-strength sections - in row 1 */}
        {showMetricToggle && (
          <div className="input-group metric-toggle-group">
            <label>Measure by</label>
            <div className="metric-toggle">
              <button
                type="button"
                className={`metric-btn ${entry.metricType === 'reps' ? 'active' : ''}`}
                onClick={() => handleMetricTypeChange('reps')}
                disabled={isReadOnly}
              >
                Reps
              </button>
              <button
                type="button"
                className={`metric-btn ${entry.metricType === 'duration' ? 'active' : ''}`}
                onClick={() => handleMetricTypeChange('duration')}
                disabled={isReadOnly}
              >
                Time
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Row 2: Metric inputs */}
      <div className="exercise-row-details">
        {/* Show reps/sets for strength OR when metric type is 'reps' */}
        {(section === 'STRENGTH' || entry.metricType === 'reps') && (
          <>
            {/* Reps */}
            <div className="input-group number-group">
              <label>Reps</label>
              <input
                type="number"
                value={entry.reps ?? ''}
                onChange={(e) => handleNumberChange('reps', e.target.value)}
                placeholder="0"
                min="0"
                className="number-input"
                disabled={isReadOnly}
              />
            </div>

            {/* Sets */}
            <div className="input-group number-group">
              <label>Sets</label>
              <input
                type="number"
                value={entry.sets ?? ''}
                onChange={(e) => handleNumberChange('sets', e.target.value)}
                placeholder="0"
                min="0"
                className="number-input"
                disabled={isReadOnly}
              />
            </div>
          </>
        )}

        {/* Show duration for non-strength when metric type is 'duration' */}
        {section !== 'STRENGTH' && entry.metricType === 'duration' && (
          <>
            {/* Duration - Minutes */}
            <div className="input-group number-group">
              <label>Minutes</label>
              <input
                type="number"
                value={durationMinutes ?? ''}
                onChange={(e) => handleDurationMinutesChange(e.target.value)}
                placeholder="0"
                min="0"
                className="number-input"
                disabled={isReadOnly}
              />
            </div>

            {/* Duration - Seconds */}
            <div className="input-group number-group">
              <label>Seconds</label>
              <input
                type="number"
                value={durationRemainingSeconds ?? ''}
                onChange={(e) => handleDurationSecondsChange(e.target.value)}
                placeholder="0"
                min="0"
                max="59"
                className="number-input"
                disabled={isReadOnly}
              />
            </div>

            {/* Sets (optional for duration-based) */}
            <div className="input-group number-group">
              <label>Sets</label>
              <input
                type="number"
                value={entry.sets ?? ''}
                onChange={(e) => handleNumberChange('sets', e.target.value)}
                placeholder="1"
                min="1"
                className="number-input"
                disabled={isReadOnly}
              />
            </div>
          </>
        )}

        {/* Rest time */}
        <div className="input-group number-group">
          <label>Rest (sec)</label>
          <input
            type="number"
            value={entry.restSeconds ?? ''}
            onChange={(e) => handleNumberChange('restSeconds', e.target.value)}
            placeholder="0"
            min="0"
            className="number-input"
            disabled={isReadOnly}
          />
        </div>
      </div>

      {/* Row 3: Action buttons */}
      <div className="exercise-row-actions">
        <div className="action-buttons">
          {/* Save button - show when not saved or when editing */}
          {(!entry.isSaved || entry.isEditing) && (
            <button
              className={`save-button ${!canSave ? 'disabled' : ''}`}
              onClick={handleSave}
              disabled={isCurrentlySaving || !canSave}
              aria-label="Save exercise"
              title={canSave ? "Save exercise" : "Complete all required fields to save"}
            >
              {isCurrentlySaving ? '...' : '✓'}
            </button>
          )}

          {/* Edit button - show when saved and not editing */}
          {entry.isSaved && !entry.isEditing && (
            <button
              className="edit-button"
              onClick={handleEdit}
              aria-label="Edit exercise"
              title="Edit exercise"
            >
              ✎
            </button>
          )}

          {/* Delete button */}
          <button
            className="delete-button"
            onClick={handleDeleteClick}
            aria-label="Delete exercise"
            title="Remove exercise"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExerciseRow;
