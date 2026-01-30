import React, { useMemo } from 'react';
import './WeekSelector.css';

interface WeekSelectorProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

/**
 * Get the start of the week (Monday) for a given date
 */
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get all days of the week for a given date
 */
function getWeekDays(date: Date): Date[] {
  const weekStart = getWeekStart(date);
  const days: Date[] = [];
  
  for (let i = 0; i < 7; i++) {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + i);
    days.push(day);
  }
  
  return days;
}

/**
 * Format date as YYYY-MM-DD
 */
export function formatDateISO(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Format day name (Mon, Tue, etc.)
 */
function formatDayName(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'short' });
}

/**
 * Format day number
 */
function formatDayNumber(date: Date): string {
  return date.getDate().toString();
}

/**
 * Check if two dates are the same day
 */
function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

/**
 * Check if a date is today
 */
function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

const WeekSelector: React.FC<WeekSelectorProps> = ({ selectedDate, onDateChange }) => {
  const weekDays = useMemo(() => getWeekDays(selectedDate), [selectedDate]);

  const goToPreviousWeek = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 7);
    onDateChange(newDate);
  };

  const goToNextWeek = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 7);
    onDateChange(newDate);
  };

  const goToToday = () => {
    onDateChange(new Date());
  };

  const monthYear = selectedDate.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  });

  return (
    <div className="week-selector">
      <div className="week-selector-header">
        <button 
          className="week-nav-button" 
          onClick={goToPreviousWeek}
          aria-label="Previous week"
        >
          ‹
        </button>
        <div className="week-title">
          <span className="month-year">{monthYear}</span>
          <button className="today-button" onClick={goToToday}>
            Today
          </button>
        </div>
        <button 
          className="week-nav-button" 
          onClick={goToNextWeek}
          aria-label="Next week"
        >
          ›
        </button>
      </div>
      
      <div className="week-days">
        {weekDays.map((day) => {
          const selected = isSameDay(day, selectedDate);
          const today = isToday(day);
          
          return (
            <button
              key={formatDateISO(day)}
              className={`day-button ${selected ? 'selected' : ''} ${today ? 'today' : ''}`}
              onClick={() => onDateChange(day)}
              aria-label={day.toLocaleDateString('en-US', { 
                weekday: 'long', 
                month: 'long', 
                day: 'numeric' 
              })}
              aria-pressed={selected}
            >
              <span className="day-name">{formatDayName(day)}</span>
              <span className="day-number">{formatDayNumber(day)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default WeekSelector;
