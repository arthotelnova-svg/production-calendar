'use client';

import animations from '../styles/animations.module.css';

/**
 * Animated List
 * Applies stagger animation to children
 * Each child slides up with increasing delay
 */
export default function AnimatedList({
  children,
  className = '',
  as: Component = 'div',
}) {
  return (
    <Component className={className}>
      {Array.isArray(children)
        ? children.map((child, index) => (
            <div
              key={index}
              className={animations.staggerItem}
            >
              {child}
            </div>
          ))
        : children}
    </Component>
  );
}
