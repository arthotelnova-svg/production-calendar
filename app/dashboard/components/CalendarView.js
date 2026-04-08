'use client';

import GlassCard from './GlassCard';
import styles from '../styles/glassmorphism.module.css';
import animations from '../styles/animations.module.css';

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
  // Returns Monday=0, Tuesday=1, ... Sunday=6
  const date = new Date(year, month, 1);
  return (date.getDay() + 6) % 7; // Shift Sunday to 6
}

/**
 * Calendar Month View - Full month grid with day states
 * @param {Object} props
 * @param {number} props.month - Month (0-11)
 * @param {number} props.year - Year (e.g., 2026)
 * @param {object} props.overtime - OT data by "${month}-${day}"
 * @param {object} props.absences - Absence data by "${month}-${day}"
 * @param {array} props.holidays - Holiday day numbers
 * @param {function} props.onSelectDay - Callback when day clicked
 * @param {number} props.selectedDay - Currently selected day (1-31)
 */
export default function CalendarView({
  month = 0,
  year = 2026,
  overtime = {},
  absences = {},
  holidays = [],
  onSelectDay,
  selectedDay = null,
}) {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const today = new Date();
  const isToday = today.getFullYear() === year && today.getMonth() === month;

  // Build calendar grid
  const cells = [];
  // Empty cells for days before month starts
  for (let i = 0; i < firstDay; i++) {
    cells.push(null);
  }
  // Days of month
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(day);
  }

  const getDayClasses = (day) => {
    if (!day) return null;

    const classes = [styles.dayCell];
    const dayKey = `${month}-${day}`;

    // Check if weekend (Saturday = 5, Sunday = 6)
    const cellIndex = cells.indexOf(day);
    const dayOfWeek = cellIndex % 7;
    if (dayOfWeek >= 5) {
      classes.push(styles.weekend);
    }

    // Check if holiday
    if (holidays.includes(day)) {
      classes.push(styles.holiday);
    }

    // Check if overtime
    if (overtime[dayKey]) {
      classes.push(styles.overtime);
    }

    // Check if absence
    if (absences[dayKey]) {
      classes.push(styles.absence);
    }

    // Check if today
    if (isToday && day === today.getDate()) {
      classes.push(styles.today);
    }

    // Check if selected
    if (selectedDay === day) {
      classes.push(styles.selected);
    }

    return classes.join(' ');
  };

  return (
    <GlassCard className={styles.calendarContainer}>
      <div className={styles.calendarHeader}>
        <div className={styles.calendarTitle}>
          {MONTHS[month]} {year}
        </div>
      </div>

      <table className={styles.calendarGrid}>
        <thead>
          <tr>
            {DAYS_OF_WEEK.map((day) => (
              <th key={day} className={styles.calendarHeader}>
                {day}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: Math.ceil(cells.length / 7) }).map(
            (_, weekIndex) => (
              <tr key={weekIndex}>
                {cells.slice(weekIndex * 7, (weekIndex + 1) * 7).map((day, dayIndex) => {
                  const cellIndex = weekIndex * 7 + dayIndex;
                  return (
                  <td key={dayIndex} className={styles.dayCellContainer}>
                    {day && (
                      <div
                        className={`${getDayClasses(day)} ${animations.staggerItem}`}
                        style={{
                          animationDelay: `${cellIndex * 30}ms`,
                        }}
                        data-day={day}
                        onClick={() => onSelectDay?.(month, day)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === 'Enter' && onSelectDay?.(month, day)}
                      >
                        <span>{day}</span>
                        {overtime[`${month}-${day}`] && (
                          <span className={styles.otBadge}>
                            {overtime[`${month}-${day}`]}h
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                );
                })}
              </tr>
            )
          )}
        </tbody>
      </table>
    </GlassCard>
  );
}
