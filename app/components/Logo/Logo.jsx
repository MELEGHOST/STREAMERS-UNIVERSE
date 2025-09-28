'use client';

import React from 'react';

export default function Logo({ width = 400, height = 150, className = '' }) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 1400 600"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Streamers Universe Logo"
      style={{ display: 'block', background: 'transparent' }}
      className={className}
    >
      <defs>
        <linearGradient id="strokeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#B37CFF" />
          <stop offset="50%" stopColor="#8E7CFF" />
          <stop offset="100%" stopColor="#6B5BFF" />
        </linearGradient>
        <filter id="neon" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="8" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g filter="url(#neon)">
        <text
          x="50%"
          y="42%"
          textAnchor="middle"
          dominantBaseline="middle"
          style={{
            fill: 'none',
            stroke: 'url(#strokeGrad)',
            strokeWidth: 18,
            fontFamily:
              'Montserrat, Inter, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, sans-serif',
            fontWeight: 800,
            fontSize: 210,
            letterSpacing: 10,
          }}
        >
          STREAMERS
        </text>
        <text
          x="50%"
          y="78%"
          textAnchor="middle"
          dominantBaseline="middle"
          style={{
            fill: 'none',
            stroke: 'url(#strokeGrad)',
            strokeWidth: 18,
            fontFamily:
              'Montserrat, Inter, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, sans-serif',
            fontWeight: 800,
            fontSize: 210,
            letterSpacing: 10,
          }}
        >
          UNIVERSE
        </text>
      </g>
    </svg>
  );
}
