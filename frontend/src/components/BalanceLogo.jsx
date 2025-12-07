import React from 'react';
import './BalanceLogo.css';

const BalanceLogo = () => {
  return (
    <svg
      className="balance-logo"
      width="36"
      height="36"
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="brandGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6674CC" />
          <stop offset="100%" stopColor="#8b9aed" />
        </linearGradient>
        
        <linearGradient id="workGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#6674CC" />
        </linearGradient>
        
        <linearGradient id="lifeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#34D399" />
          <stop offset="100%" stopColor="#10b981" />
        </linearGradient>
        
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      {/* Rotating outer rings */}
      <circle
        cx="50"
        cy="50"
        r="43"
        fill="none"
        stroke="url(#brandGradient)"
        strokeWidth="1.5"
        strokeDasharray="8 4"
        className="outer-ring ring-1"
        opacity="0.6"
      />
      
      <circle
        cx="50"
        cy="50"
        r="46"
        fill="none"
        stroke="url(#brandGradient)"
        strokeWidth="1"
        strokeDasharray="4 6"
        className="outer-ring ring-2"
        opacity="0.4"
      />
      
      {/* Infinity symbol path */}
      <path
        d="M 25 50 Q 35 35, 50 50 Q 65 65, 75 50 Q 65 35, 50 50 Q 35 65, 25 50 Z"
        fill="none"
        stroke="url(#brandGradient)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="infinity-path"
        filter="url(#glow)"
      />
      
      {/* Orbiting particles */}
      <circle cx="25" cy="50" r="4" fill="url(#workGradient)" className="orbit-particle particle-1" filter="url(#glow)">
        <animateMotion
          dur="4s"
          repeatCount="indefinite"
          path="M 25 50 Q 35 35, 50 50 Q 65 65, 75 50 Q 65 35, 50 50 Q 35 65, 25 50 Z"
        />
      </circle>
      
      <circle cx="75" cy="50" r="4" fill="url(#lifeGradient)" className="orbit-particle particle-2" filter="url(#glow)">
        <animateMotion
          dur="4s"
          repeatCount="indefinite"
          path="M 75 50 Q 65 35, 50 50 Q 35 65, 25 50 Q 35 35, 50 50 Q 65 65, 75 50 Z"
        />
      </circle>
      
      {/* Work icon (left side) - laptop */}
      <g className="work-icon">
        <rect x="18" y="43" width="14" height="10" rx="1" fill="url(#workGradient)" opacity="0.9"/>
        <rect x="16" y="52" width="18" height="2" rx="1" fill="url(#workGradient)" opacity="0.9"/>
        <rect x="20" y="45" width="10" height="7" fill="#1e293b" opacity="0.8"/>
      </g>
      
      {/* Life icon (right side) - heart with pulse */}
      <g className="life-icon">
        <path
          d="M 75 45 Q 75 42, 77 42 Q 79 42, 79 44 Q 79 47, 75 51 Q 71 47, 71 44 Q 71 42, 73 42 Q 75 42, 75 45 Z"
          fill="url(#lifeGradient)"
          className="heart-pulse"
          opacity="0.9"
        />
      </g>
      
      {/* Central balance point with rotating ring */}
      <circle
        cx="50"
        cy="50"
        r="8"
        fill="none"
        stroke="url(#brandGradient)"
        strokeWidth="1.5"
        className="center-ring"
        opacity="0.5"
      />
      
      <circle
        cx="50"
        cy="50"
        r="5"
        fill="url(#brandGradient)"
        className="balance-point"
        filter="url(#glow)"
      />
      
      {/* Energy waves */}
      <circle
        cx="50"
        cy="50"
        r="12"
        fill="none"
        stroke="url(#brandGradient)"
        strokeWidth="1"
        className="energy-wave wave-1"
        opacity="0"
      />
      
      <circle
        cx="50"
        cy="50"
        r="12"
        fill="none"
        stroke="url(#brandGradient)"
        strokeWidth="1"
        className="energy-wave wave-2"
        opacity="0"
      />
      
      {/* Corner accent stars */}
      <g className="accent-stars">
        <circle cx="15" cy="15" r="1.5" fill="#8b9aed" className="star star-1" opacity="0.8"/>
        <circle cx="85" cy="15" r="1.5" fill="#8b9aed" className="star star-2" opacity="0.8"/>
        <circle cx="15" cy="85" r="1.5" fill="#8b9aed" className="star star-3" opacity="0.8"/>
        <circle cx="85" cy="85" r="1.5" fill="#8b9aed" className="star star-4" opacity="0.8"/>
      </g>
    </svg>
  );
};

export default BalanceLogo;
