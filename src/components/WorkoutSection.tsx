import React from 'react';
import { WorkoutEntryUI, Exercise, BodyPart, SectionType } from '../types/models';
import ExerciseRow from './ExerciseRow';
import './WorkoutSection.css';

interface WorkoutSectionProps {
  title: string;
  section: SectionType;
  entries: WorkoutEntryUI[];
  exercises: Exercise[];
  bodyParts: BodyPart[];
  onAddEntry: () => void;
  onUpdateEntry: (index: number, entry: WorkoutEntryUI) => void;
  onDeleteEntry: (index: number) => void;
}

// Section colors and icons
const SECTION_CONFIG: Record<SectionType, { color: string; bgColor: string; icon: string }> = {
  WARMUP: { color: '#f59e0b', bgColor: '#fef3c7', icon: '🔥' },
  STRENGTH: { color: '#3b82f6', bgColor: '#dbeafe', icon: '💪' },
  CARDIO: { color: '#ef4444', bgColor: '#fee2e2', icon: '❤️' },
  CORE: { color: '#8b5cf6', bgColor: '#ede9fe', icon: '🎯' }
};

const WorkoutSection: React.FC<WorkoutSectionProps> = ({
  title,
  section,
  entries,
  exercises,
  bodyParts,
  onAddEntry,
  onUpdateEntry,
  onDeleteEntry
}) => {
  const config = SECTION_CONFIG[section];

  return (
    <div className="workout-section">
      <div 
        className="section-header"
        style={{ 
          backgroundColor: config.bgColor,
          borderColor: config.color
        }}
      >
        <span className="section-icon">{config.icon}</span>
        <h2 className="section-title" style={{ color: config.color }}>
          {title}
        </h2>
        <span className="section-count">
          {entries.length} {entries.length === 1 ? 'exercise' : 'exercises'}
        </span>
      </div>

      <div className="section-content">
        {entries.length === 0 ? (
          <div className="empty-section">
            <p>No exercises added yet</p>
            <button 
              className="add-first-button"
              onClick={onAddEntry}
              style={{ 
                backgroundColor: config.color,
                borderColor: config.color
              }}
            >
              Add your first {section.toLowerCase()} exercise
            </button>
          </div>
        ) : (
          <>
            {entries.map((entry, index) => (
              <ExerciseRow
                key={entry.id}
                entry={entry}
                exercises={exercises}
                bodyParts={bodyParts}
                section={section}
                onUpdate={(updated) => onUpdateEntry(index, updated)}
                onDelete={() => onDeleteEntry(index)}
              />
            ))}
            <button 
              className="add-exercise-button"
              onClick={onAddEntry}
              style={{ 
                color: config.color,
                borderColor: config.color
              }}
            >
              + Add exercise
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default WorkoutSection;
