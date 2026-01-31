import React, { useState, useRef, useEffect } from 'react';
import { WorkoutEntryUI, Exercise, BodyPart, SectionType, MetricType, ExerciseSet } from '../types/models';
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
    entry.sets.some(s => s.reps || s.weightKg || s.restSeconds) || 
    entry.durationSeconds
  );

  // Check if entry has all required data for saving
  const hasExerciseName = !!(entry.exerciseId || entry.customExerciseName);
  const hasMetricData = entry.metricType === 'duration' 
    ? !!(entry.durationSeconds && entry.durationSeconds > 0)
    : entry.sets.some(s => s.reps && s.reps > 0); // At least one set with reps
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
    if (hasData) {
      setShowDeleteConfirm(true);
    } else {
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
  const sectionType = (section === 'WARMUP' || section === 'CARDIO') 
    ? 'cardio' 
    : section.toLowerCase() as 'strength' | 'core';
  
  const filteredExercises = exercises.filter(ex => {
    if (ex.applicableSections && ex.applicableSections.length > 0) {
      return ex.applicableSections.includes(section);
    }
    return ex.type === sectionType;
  });

  const availableExercises = section === 'STRENGTH' && entry.bodyPartId
    ? filteredExercises.filter(ex => ex.bodyPartId === entry.bodyPartId || !ex.bodyPartId)
    : filteredExercises;

  const filteredSuggestions = exerciseInput.trim()
    ? availableExercises.filter(ex => 
        ex.name.toLowerCase().includes(exerciseInput.toLowerCase())
      )
    : availableExercises;

  const handleExerciseInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setExerciseInput(value);
    setShowSuggestions(true);
    
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
      exerciseId: null,
      exerciseName: undefined
    });
  };

  const handleMetricTypeChange = (metricType: MetricType) => {
    onUpdate({
      ...entry,
      metricType,
      sets: metricType === 'duration' ? [] : (entry.sets.length > 0 ? entry.sets : [{ setNumber: 1, reps: null, weightKg: null, restSeconds: null }]),
      durationSeconds: metricType === 'reps' ? null : entry.durationSeconds
    });
  };

  // Handle set field changes
  const handleSetChange = (setIndex: number, field: keyof ExerciseSet, value: string) => {
    const numValue = value === '' ? null : (field === 'weightKg' ? parseFloat(value) : parseInt(value, 10));
    const newSets = [...entry.sets];
    newSets[setIndex] = {
      ...newSets[setIndex],
      [field]: isNaN(numValue as number) ? null : numValue
    };
    onUpdate({ ...entry, sets: newSets });
  };

  // Add a new set
  const handleAddSet = () => {
    const newSetNumber = entry.sets.length + 1;
    const newSets = [...entry.sets, { setNumber: newSetNumber, reps: null, weightKg: null, restSeconds: null }];
    onUpdate({ ...entry, sets: newSets });
  };

  // Remove a set
  const handleRemoveSet = (setIndex: number) => {
    if (entry.sets.length <= 1) return; // Keep at least one set
    const newSets = entry.sets.filter((_, i) => i !== setIndex).map((s, i) => ({ ...s, setNumber: i + 1 }));
    onUpdate({ ...entry, sets: newSets });
  };

  // Duration handlers
  const durationMinutes = entry.durationSeconds ? Math.floor(entry.durationSeconds / 60) : null;
  const durationRemainingSeconds = entry.durationSeconds ? entry.durationSeconds % 60 : null;

  const handleDurationMinutesChange = (minutes: string) => {
    const mins = minutes === '' ? 0 : parseInt(minutes, 10);
    const secs = durationRemainingSeconds || 0;
    const totalSeconds = (isNaN(mins) ? 0 : mins) * 60 + secs;
    onUpdate({ ...entry, durationSeconds: totalSeconds > 0 ? totalSeconds : null });
  };

  const handleDurationSecondsChange = (seconds: string) => {
    const secs = seconds === '' ? 0 : parseInt(seconds, 10);
    const mins = durationMinutes || 0;
    const totalSeconds = mins * 60 + (isNaN(secs) ? 0 : secs);
    onUpdate({ ...entry, durationSeconds: totalSeconds > 0 ? totalSeconds : null });
  };
  
  const showMetricToggle = section !== 'STRENGTH';

  return (
    <div className={`exercise-row ${isReadOnly ? 'read-only' : ''} ${isCurrentlySaving ? 'saving' : ''} ${section !== 'STRENGTH' ? 'non-strength' : ''}`}>
      {/* Delete confirmation overlay */}
      {showDeleteConfirm && (
        <div className="delete-confirm-overlay">
          <div className="delete-confirm-dialog">
            <p>Delete this exercise?</p>
            <div className="delete-confirm-buttons">
              <button className="confirm-delete-btn" onClick={handleConfirmDelete}>Delete</button>
              <button className="cancel-delete-btn" onClick={handleCancelDelete}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Row 1: Exercise name (+ Body Part for Strength, + Metric toggle for others) */}
      <div className="exercise-row-main">
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
                <option key={bp.id} value={bp.id}>{bp.name}</option>
              ))}
            </select>
          </div>
        )}

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
                  <div className="suggestion-item add-new" onClick={handleAddNewExercise}>
                    + Add "{exerciseInput.trim()}" as new exercise
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>

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

      {/* Row 2: Sets or Duration */}
      <div className="exercise-row-details">
        {(section === 'STRENGTH' || entry.metricType === 'reps') ? (
          <div className="sets-container">
            <div className="sets-header">
              <span className="sets-label">Sets</span>
              {!isReadOnly && (
                <button 
                  type="button" 
                  className="add-set-btn"
                  onClick={handleAddSet}
                  title="Add set"
                >
                  + Add Set
                </button>
              )}
            </div>
            <div className="sets-list">
              {entry.sets.map((set, index) => (
                <div key={index} className="set-row">
                  <span className="set-number">{index + 1}</span>
                  <div className="input-group number-group">
                    <label>Reps</label>
                    <input
                      type="number"
                      value={set.reps ?? ''}
                      onChange={(e) => handleSetChange(index, 'reps', e.target.value)}
                      placeholder="0"
                      min="0"
                      className="number-input"
                      disabled={isReadOnly}
                    />
                  </div>
                  <div className="input-group number-group">
                    <label>Weight (kg)</label>
                    <input
                      type="number"
                      value={set.weightKg ?? ''}
                      onChange={(e) => handleSetChange(index, 'weightKg', e.target.value)}
                      placeholder="0"
                      min="0"
                      step="0.5"
                      className="number-input"
                      disabled={isReadOnly}
                    />
                  </div>
                  <div className="input-group number-group">
                    <label>Rest (sec)</label>
                    <input
                      type="number"
                      value={set.restSeconds ?? ''}
                      onChange={(e) => handleSetChange(index, 'restSeconds', e.target.value)}
                      placeholder="0"
                      min="0"
                      className="number-input"
                      disabled={isReadOnly}
                    />
                  </div>
                  {!isReadOnly && entry.sets.length > 1 && (
                    <button
                      type="button"
                      className="remove-set-btn"
                      onClick={() => handleRemoveSet(index)}
                      title="Remove set"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
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
          </>
        )}
      </div>

      {/* Row 3: Action buttons */}
      <div className="exercise-row-actions">
        <div className="action-buttons">
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
