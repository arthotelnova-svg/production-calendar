'use client';

import { useEffect, useState } from 'react';
import animations from '../styles/animations.module.css';

/**
 * Animated Feedback Component
 * Shows success, error, or loading feedback with animations
 */
export default function AnimatedFeedback({
  type = 'loading', // 'loading' | 'success' | 'error'
  message = '',
  autoHide = true,
  duration = 3000,
  onDismiss,
}) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (!autoHide || type === 'loading') return;

    const timer = setTimeout(() => {
      setIsVisible(false);
      onDismiss?.();
    }, duration);

    return () => clearTimeout(timer);
  }, [autoHide, duration, type, onDismiss]);

  if (!isVisible) return null;

  const getIcon = () => {
    switch (type) {
      case 'loading':
        return <span className={animations.spin}>⟳</span>;
      case 'success':
        return <span className={animations.bounce}>✓</span>;
      case 'error':
        return <span className={animations.shake}>✕</span>;
      default:
        return null;
    }
  };

  const getStyle = () => {
    switch (type) {
      case 'success':
        return {
          color: 'var(--color-success)',
          borderColor: 'var(--color-success)',
        };
      case 'error':
        return {
          color: 'var(--color-danger)',
          borderColor: 'var(--color-danger)',
        };
      default:
        return {};
    }
  };

  return (
    <div
      className={animations.slideUp}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 16px',
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        ...getStyle(),
      }}
    >
      <span style={{ display: 'inline-flex', fontSize: '18px' }}>
        {getIcon()}
      </span>
      <span style={{ color: 'var(--color-text-primary)', fontSize: '14px' }}>
        {message}
      </span>
    </div>
  );
}
