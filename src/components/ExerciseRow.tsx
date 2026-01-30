import React from 'react';
import { WorkoutEntryUI, Exercise, BodyPart, SectionType } from '../types/models';
import './ExerciseRow.css';

interface ExerciseRowProps {
  entry: WorkoutEntryUI;
  exercises: Exercise[];
  bodyParts: BodyPart[];
  section: SectionType;
  onUpdate: (updated: WorkoutEntryUI) => void;
  onDelete: () => void;
}

const ExerciseRow: React.FC<ExerciseRowProps> = ({
  entry,
  exercises,
  bodyParts,
  section,
  onUpdate,
  onDelete
}) => {
  // Filter exercises by section type
  const sectionType = section.toLowerCase() as 'warmup' | 'strength' | 'cardio' | 'core';
  const filteredExercises = exercises.filter(ex => ex.type === sectionType);

  // For strength section, also filter by selected body part if one is selected
  const availableExercises = section === 'STRENGTH' && entry.bodyPartId
    ? filteredExercises.filter(ex => ex.bodyPartId === entry.bodyPartId || !ex.bodyPartId)
    : filteredExercises;

  const handleExerciseChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const exerciseId = e.target.value || null;
    const exercise = exercises.find(ex => ex.id === exerciseId);
    onUpdate({
      ...entry,
      exerciseId,
      exerciseName: exercise?.name,
      customExerciseName: exerciseId ? null : entry.customExerciseName
    });
  };

  const handleCustomNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate({
      ...entry,
      customExerciseName: e.target.value || null,
      exerciseId: e.target.value ? null : entry.exerciseId
    });
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
    field: 'reps' | 'sets' | 'restSeconds',
    value: string
  ) => {
    const numValue = value === '' ? null : parseInt(value, 10);
    onUpdate({
      ...entry,
      [field]: isNaN(numValue as number) ? null : numValue
    });
  };

  const isUsingCustomName = !entry.exerciseId && entry.customExerciseName;

  return (
    <div className="exercise-row">
      <div className="exercise-row-main">
        {/* Body Part selector (Strength section only) */}
        {section === 'STRENGTH' && (
          <div className="input-group body-part-group">
            <label>Body Part</label>
            <select
              value={entry.bodyPartId || ''}
              onChange={handleBodyPartChange}
              className="select-input"
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

        {/* Exercise selector */}
        <div className="input-group exercise-group">
          <label>Exercise</label>
          <select
            value={entry.exerciseId || ''}
            onChange={handleExerciseChange}
            className="select-input"
            disabled={isUsingCustomName as boolean}
          >
            <option value="">Select exercise...</option>
            {availableExercises.map(ex => (
              <option key={ex.id} value={ex.id}>
                {ex.name}
              </option>
            ))}
          </select>
        </div>

        {/* Custom exercise name */}
        <div className="input-group custom-name-group">
          <label>Or custom name</label>
          <input
            type="text"
            value={entry.customExerciseName || ''}
            onChange={handleCustomNameChange}
            placeholder="Custom exercise..."
            className="text-input"
            disabled={!!entry.exerciseId}
          />
        </div>
      </div>

      <div className="exercise-row-details">
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
          />
        </div>

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
          />
        </div>

        {/* Delete button */}
        <button
          className="delete-button"
          onClick={onDelete}
          aria-label="Delete exercise"
          title="Remove exercise"
        >
          ×
        </button>
      </div>
    </div>
  );
};

export default ExerciseRow;
