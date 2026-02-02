import React, { useState, useMemo } from 'react';
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
  onDeleteEntry: (index: number) => Promise<void>;
  onSaveEntry: (index: number) => Promise<void>;
  onAddExercise: (name: string) => Promise<Exercise | null>;
  isSaving?: boolean;
  defaultExpanded?: boolean;
}

// Section colors and icons
const SECTION_CONFIG: Record<SectionType, { color: string; bgColor: string; icon: string }> = {
  WARMUP: { color: '#f59e0b', bgColor: '#fef3c7', icon: '🔥' },
  STRENGTH: { color: '#3b82f6', bgColor: '#dbeafe', icon: '💪' },
  CARDIO: { color: '#ef4444', bgColor: '#fee2e2', icon: '❤️' },
  CORE: { color: '#8b5cf6', bgColor: '#ede9fe', icon: '🎯' }
};

// Group entries by body part (for strength section)
interface BodyPartGroup {
  bodyPartId: string | null;
  bodyPartName: string;
  entries: { entry: WorkoutEntryUI; originalIndex: number }[];
}

const WorkoutSection: React.FC<WorkoutSectionProps> = ({
  title,
  section,
  entries,
  exercises,
  bodyParts,
  onAddEntry,
  onUpdateEntry,
  onDeleteEntry,
  onSaveEntry,
  onAddExercise,
  isSaving = false,
  defaultExpanded = false
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [expandedBodyParts, setExpandedBodyParts] = useState<Set<string>>(new Set());
  const config = SECTION_CONFIG[section];

  // Separate unsaved entries from saved entries for Strength section
  // Unsaved entries are shown at the top without grouping to prevent remount on body part change
  const { unsavedEntries, savedEntries } = useMemo(() => {
    if (section !== 'STRENGTH') return { unsavedEntries: [], savedEntries: entries };
    const unsaved: { entry: WorkoutEntryUI; originalIndex: number }[] = [];
    const saved: WorkoutEntryUI[] = [];
    entries.forEach((entry, index) => {
      if (!entry.isSaved) {
        unsaved.push({ entry, originalIndex: index });
      } else {
        saved.push(entry);
      }
    });
    return { unsavedEntries: unsaved, savedEntries: saved };
  }, [entries, section]);

  // Group only saved entries by body part for strength section
  const bodyPartGroups = useMemo((): BodyPartGroup[] => {
    if (section !== 'STRENGTH') return [];
    
    const groups = new Map<string | null, BodyPartGroup>();
    
    // Only group saved entries
    savedEntries.forEach((entry) => {
      // Find original index in the full entries array
      const originalIndex = entries.findIndex(e => e.id === entry.id);
      const key = entry.bodyPartId;
      if (!groups.has(key)) {
        groups.set(key, {
          bodyPartId: key,
          bodyPartName: entry.bodyPartName || 'Unassigned',
          entries: []
        });
      }
      groups.get(key)!.entries.push({ entry, originalIndex });
    });
    
    // Sort by body part name, with unassigned last
    return Array.from(groups.values()).sort((a, b) => {
      if (a.bodyPartId === null) return 1;
      if (b.bodyPartId === null) return -1;
      return a.bodyPartName.localeCompare(b.bodyPartName);
    });
  }, [savedEntries, entries, section]);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const toggleBodyPart = (bodyPartId: string | null) => {
    const key = bodyPartId || 'unassigned';
    const newExpanded = new Set(expandedBodyParts);
    
    // Remove 'all' when user starts interacting with individual body parts
    if (newExpanded.has('all')) {
      newExpanded.delete('all');
      // Add all body part keys except the one being toggled (collapsed)
      bodyPartGroups.forEach(group => {
        const groupKey = group.bodyPartId || 'unassigned';
        if (groupKey !== key) {
          newExpanded.add(groupKey);
        }
      });
    } else if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedBodyParts(newExpanded);
  };

  const isBodyPartExpanded = (bodyPartId: string | null) => {
    const key = bodyPartId || 'unassigned';
    return expandedBodyParts.has(key) || expandedBodyParts.has('all');
  };

  return (
    <div className={`workout-section ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <div 
        className="section-header"
        style={{ 
          backgroundColor: config.bgColor,
          borderColor: config.color
        }}
        onClick={toggleExpanded}
      >
        <span className="section-icon">{config.icon}</span>
        <h2 className="section-title" style={{ color: config.color }}>
          {title}
        </h2>
        <span className="section-count">
          {entries.length} {entries.length === 1 ? 'exercise' : 'exercises'}
        </span>
        <span className={`expand-icon ${isExpanded ? 'expanded' : ''}`}>
          ▼
        </span>
      </div>

      {isExpanded && (
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
        ) : section === 'STRENGTH' ? (
          /* Strength section: Unsaved at top, then group saved by body part */
          <>
            {/* Unsaved entries at top - not grouped to prevent remount */}
            {unsavedEntries.map(({ entry, originalIndex }) => (
              <ExerciseRow
                key={entry.id}
                entry={entry}
                exercises={exercises}
                bodyParts={bodyParts}
                section={section}
                onUpdate={(updated) => onUpdateEntry(originalIndex, updated)}
                onDelete={() => onDeleteEntry(originalIndex)}
                onSave={() => onSaveEntry(originalIndex)}
                onAddExercise={onAddExercise}
                isSaving={isSaving}
              />
            ))}
            {/* Saved entries grouped by body part */}
            {bodyPartGroups.map((group) => (
              <div key={group.bodyPartId || 'unassigned'} className="body-part-group-container">
                <div 
                  className="body-part-header"
                  onClick={() => toggleBodyPart(group.bodyPartId)}
                >
                  <span className={`bp-expand-icon ${isBodyPartExpanded(group.bodyPartId) ? 'expanded' : ''}`}>›</span>
                  <span className="body-part-name">{group.bodyPartName}</span>
                  <span className="body-part-count">{group.entries.length}</span>
                </div>
                {isBodyPartExpanded(group.bodyPartId) && (
                  <div className="body-part-exercises">
                    {group.entries.map(({ entry, originalIndex }) => (
                      <ExerciseRow
                        key={entry.id}
                        entry={entry}
                        exercises={exercises}
                        bodyParts={bodyParts}
                        section={section}
                        onUpdate={(updated) => onUpdateEntry(originalIndex, updated)}
                        onDelete={() => onDeleteEntry(originalIndex)}
                        onSave={() => onSaveEntry(originalIndex)}
                        onAddExercise={onAddExercise}
                        isSaving={isSaving}
                      />
                    ))}
                  </div>
                )}
              </div>
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
        ) : (
          /* Other sections: Flat list */
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
                onSave={() => onSaveEntry(index)}
                onAddExercise={onAddExercise}
                isSaving={isSaving}
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
      )}
    </div>
  );
};

export default WorkoutSection;
