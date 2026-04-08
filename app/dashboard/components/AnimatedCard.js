'use client';

import { useEffect, useRef, useState } from 'react';
import styles from '../styles/glassmorphism.module.css';
import animations from '../styles/animations.module.css';

/**
 * Animated Card Wrapper
 * Applies entrance animation, hover lift + glow, and parallax on scroll
 */
export default function AnimatedCard({
  children,
  delay = 0,
  onHover = false,
  parallax = false,
  className = '',
}) {
  const cardRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  const [parallaxOffset, setParallaxOffset] = useState(0);

  // Entrance animation with delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  // Parallax scroll effect
  useEffect(() => {
    if (!parallax) return;

    const handleScroll = () => {
      if (!cardRef.current) return;

      const rect = cardRef.current.getBoundingClientRect();
      const scrollProgress = 1 - rect.top / window.innerHeight;
      const offset = Math.min(scrollProgress * 20, 20); // Max 20px offset

      setParallaxOffset(offset);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [parallax]);

  return (
    <div
      ref={cardRef}
      className={`${styles.glassCard} ${className} ${
        isVisible ? animations.fadeInScale : ''
      }`}
      style={{
        animationDelay: `${delay}ms`,
        transform: parallax ? `translateY(-${parallaxOffset}px)` : undefined,
        transition: parallax ? 'transform 0.3s ease-out' : undefined,
      }}
      onMouseEnter={(e) => {
        if (!onHover) return;
        e.currentTarget.classList.add(animations.glow);
      }}
      onMouseLeave={(e) => {
        if (!onHover) return;
        e.currentTarget.classList.remove(animations.glow);
      }}
    >
      {children}
    </div>
  );
}
