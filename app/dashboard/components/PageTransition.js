'use client';

import { useEffect, useState } from 'react';
import animations from '../styles/animations.module.css';

/**
 * Page Transition Wrapper
 * Wraps page content with entrance animation
 */
export default function PageTransition({ children }) {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Trigger animation on mount
    setIsLoaded(true);
  }, []);

  return (
    <div
      className={isLoaded ? animations.pageEnter : ''}
      style={{
        width: '100%',
        height: '100%',
      }}
    >
      {children}
    </div>
  );
}
