'use client';

import { useState } from 'react';
import styles from '../styles/glassmorphism.module.css';
import animations from '../styles/animations.module.css';

/**
 * Animated Button
 * Applies scaleClick feedback, glow on focus
 */
export default function AnimatedButton({
  children,
  variant = 'primary',
  onClick,
  disabled = false,
  loading = false,
  className = '',
  ...props
}) {
  const [isAnimating, setIsAnimating] = useState(false);

  const handleClick = (e) => {
    if (disabled || loading) return;

    // Trigger scale animation
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 150);

    onClick?.(e);
  };

  const buttonClass =
    variant === 'primary' ? styles.btnPrimary : styles.btnSecondary;

  return (
    <button
      className={`${buttonClass} ${className} ${
        isAnimating ? animations.scaleClick : ''
      }`}
      onClick={handleClick}
      disabled={disabled || loading}
      style={{
        pointerEvents: isAnimating ? 'none' : 'auto',
      }}
      {...props}
    >
      {loading ? (
        <>
          <span className={animations.spin} style={{ display: 'inline-block' }}>
            ⟳
          </span>
          {' '}
          {children}
        </>
      ) : (
        children
      )}
    </button>
  );
}
