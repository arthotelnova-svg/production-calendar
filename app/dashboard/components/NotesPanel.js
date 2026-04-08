'use client';

import GlassCard from './GlassCard';
import styles from '../styles/glassmorphism.module.css';

/**
 * Day Notes Panel - Sidebar/modal for adding notes to selected day
 * Phase 3 feature
 */
export default function NotesPanel({ month, day, note, onSave, onClose }) {
  return (
    <GlassCard className={styles.notesPanel}>
      <h3>{day} {month || ''}</h3>
      <textarea
        placeholder="Add a note..."
        defaultValue={note || ''}
        maxLength={500}
      />
      <button onClick={onSave}>Save Note</button>
    </GlassCard>
  );
}
