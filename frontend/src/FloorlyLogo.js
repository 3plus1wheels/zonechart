import React from 'react';

function FloorlyLogo({ size = 'md', color = '#000', className = '' }) {
  const sizeMap = {
    sm: 20,
    md: 34,
    lg: 52,
    xl: 78,
  };

  const fontSize = sizeMap[size] || sizeMap.md;

  return (
    <span
      className={className}
      style={{
        display: 'inline-block',
        color,
        fontFamily: 'Inter, sans-serif',
        fontWeight: 900,
        letterSpacing: '-0.045em',
        lineHeight: 0.9,
        fontSize,
        userSelect: 'none',
      }}
      aria-label="Floorly logo"
    >
      Floorly.
    </span>
  );
}

export default FloorlyLogo;
