import React from 'react';
import './AnimatedLogo.css';

const AnimatedLogo = () => {
  return (
    <div className="animated-logo-container">
      <svg 
        viewBox="0 0 400 400" 
        className="animated-logo"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Glow effect definitions */}
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          
          <linearGradient id="workGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
          
          <linearGradient id="lifeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#34B27B" />
            <stop offset="100%" stopColor="#2dd4bf" />
          </linearGradient>
          
          <linearGradient id="balanceGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
          
          <radialGradient id="energyGradient">
            <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.8"/>
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0"/>
          </radialGradient>
          
          <filter id="strongGlow">
            <feGaussianBlur stdDeviation="6" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Energy Waves from Center */}
        <g className="energy-waves">
          <circle cx="200" cy="200" r="30" fill="none" stroke="url(#energyGradient)" strokeWidth="3" className="energy-wave wave-1" opacity="0.6"/>
          <circle cx="200" cy="200" r="30" fill="none" stroke="url(#energyGradient)" strokeWidth="3" className="energy-wave wave-2" opacity="0.4"/>
          <circle cx="200" cy="200" r="30" fill="none" stroke="url(#energyGradient)" strokeWidth="3" className="energy-wave wave-3" opacity="0.3"/>
        </g>

        {/* Central Balance Point - Animated Circle */}
        <g className="balance-pivot">
          <circle 
            cx="200" 
            cy="200" 
            r="20" 
            fill="url(#balanceGradient)"
            filter="url(#strongGlow)"
            className="pivot-circle"
          />
          <circle 
            cx="200" 
            cy="200" 
            r="15" 
            fill="none"
            stroke="#fbbf24"
            strokeWidth="2"
            className="pivot-ring"
          />
          <circle 
            cx="200" 
            cy="200" 
            r="25" 
            fill="none"
            stroke="#fbbf24"
            strokeWidth="1"
            opacity="0.5"
            className="pivot-ring-outer"
          />
        </g>

        {/* Balance Beam - Animated */}
        <g className="balance-beam">
          <rect 
            x="80" 
            y="195" 
            width="240" 
            height="10" 
            rx="5"
            fill="url(#balanceGradient)"
            filter="url(#glow)"
            className="beam"
          />
        </g>

        {/* Left Side - WORK (Blue/Purple theme) */}
        <g className="work-side">
          {/* Work Platform */}
          <rect 
            x="70" 
            y="150" 
            width="80" 
            height="8" 
            rx="4"
            fill="url(#workGradient)"
            className="platform"
          />
          
          {/* Laptop Icon */}
          <g className="work-icon laptop">
            <rect x="85" y="120" width="50" height="30" rx="2" fill="#3b82f6" opacity="0.8"/>
            <rect x="80" y="149" width="60" height="3" rx="1.5" fill="#3b82f6"/>
            <rect x="90" y="125" width="40" height="20" fill="#1e293b"/>
          </g>

          {/* Briefcase Icon */}
          <g className="work-icon briefcase">
            <rect x="75" y="95" width="30" height="22" rx="2" fill="#8b5cf6" opacity="0.8"/>
            <rect x="85" y="92" width="10" height="3" rx="1.5" fill="#8b5cf6"/>
            <rect x="80" y="100" width="20" height="2" fill="#1e293b"/>
          </g>

          {/* Clock Icon */}
          <g className="work-icon chart">
            <rect x="115" y="95" width="25" height="20" rx="2" fill="#6366f1" opacity="0.8"/>
            <path d="M120 108 L125 103 L130 105 L135 100" stroke="#fff" strokeWidth="2" fill="none"/>
          </g>
          
          {/* Calendar Icon */}
          <g className="work-icon calendar">
            <rect x="100" y="70" width="20" height="18" rx="2" fill="#3b82f6" opacity="0.7"/>
            <rect x="100" y="70" width="20" height="5" rx="1" fill="#1e40af"/>
            <line x1="103" y1="78" x2="117" y2="78" stroke="#fff" strokeWidth="1"/>
            <line x1="103" y1="82" x2="117" y2="82" stroke="#fff" strokeWidth="1"/>
          </g>
        </g>

        {/* Right Side - LIFE (Green/Teal theme) */}
        <g className="life-side">
          {/* Life Platform */}
          <rect 
            x="250" 
            y="150" 
            width="80" 
            height="8" 
            rx="4"
            fill="url(#lifeGradient)"
            className="platform"
          />
          
          {/* Heart Icon */}
          <g className="life-icon heart">
            <path 
              d="M285 120 L285 120 Q285 110, 293 110 Q300 110, 300 118 Q300 125, 285 135 Q270 125, 270 118 Q270 110, 277 110 Q285 110, 285 120 Z" 
              fill="#34B27B" 
              opacity="0.9"
              className="heart-shape"
            />
          </g>

          {/* Coffee Icon */}
          <g className="life-icon coffee">
            <rect x="260" y="95" width="20" height="22" rx="2" fill="#2dd4bf" opacity="0.8"/>
            <ellipse cx="270" cy="95" rx="10" ry="3" fill="#2dd4bf"/>
            <path d="M280 100 Q285 100, 285 105" stroke="#2dd4bf" strokeWidth="2" fill="none"/>
          </g>

          {/* Smile Icon */}
          <g className="life-icon smile">
            <circle cx="310" cy="105" r="12" fill="#10b981" opacity="0.8"/>
            <circle cx="305" cy="102" r="2" fill="#fff"/>
            <circle cx="315" cy="102" r="2" fill="#fff"/>
            <path d="M305 108 Q310 112, 315 108" stroke="#fff" strokeWidth="2" fill="none"/>
          </g>
          
          {/* Sun/Vacation Icon */}
          <g className="life-icon sun">
            <circle cx="295" cy="75" r="8" fill="#fbbf24" opacity="0.8"/>
            <line x1="295" y1="65" x2="295" y2="62" stroke="#fbbf24" strokeWidth="2" className="sun-ray"/>
            <line x1="295" y1="85" x2="295" y2="88" stroke="#fbbf24" strokeWidth="2" className="sun-ray"/>
            <line x1="305" y1="75" x2="308" y2="75" stroke="#fbbf24" strokeWidth="2" className="sun-ray"/>
            <line x1="285" y1="75" x2="282" y2="75" stroke="#fbbf24" strokeWidth="2" className="sun-ray"/>
          </g>
        </g>

        {/* Connecting Lines - Animated */}
        <g className="connection-lines">
          <line x1="110" y1="150" x2="110" y2="195" stroke="url(#workGradient)" strokeWidth="2" className="connect-line left-line"/>
          <line x1="290" y1="150" x2="290" y2="195" stroke="url(#lifeGradient)" strokeWidth="2" className="connect-line right-line"/>
        </g>

        {/* Floating Particles with Trails */}
        <g className="particles">
          <circle cx="150" cy="180" r="3" fill="#3b82f6" className="particle particle-1" opacity="0.6" filter="url(#glow)"/>
          <circle cx="130" cy="170" r="2" fill="#8b5cf6" className="particle particle-2" opacity="0.5" filter="url(#glow)"/>
          <circle cx="170" cy="160" r="2.5" fill="#6366f1" className="particle particle-3" opacity="0.7" filter="url(#glow)"/>
          <circle cx="160" cy="145" r="2" fill="#3b82f6" className="particle particle-7" opacity="0.4" filter="url(#glow)"/>
          <circle cx="140" cy="155" r="1.5" fill="#8b5cf6" className="particle particle-8" opacity="0.5" filter="url(#glow)"/>
          
          <circle cx="250" cy="180" r="3" fill="#34B27B" className="particle particle-4" opacity="0.6" filter="url(#glow)"/>
          <circle cx="270" cy="170" r="2" fill="#2dd4bf" className="particle particle-5" opacity="0.5" filter="url(#glow)"/>
          <circle cx="230" cy="160" r="2.5" fill="#10b981" className="particle particle-6" opacity="0.7" filter="url(#glow)"/>
          <circle cx="240" cy="145" r="2" fill="#34B27B" className="particle particle-9" opacity="0.4" filter="url(#glow)"/>
          <circle cx="260" cy="155" r="1.5" fill="#2dd4bf" className="particle particle-10" opacity="0.5" filter="url(#glow)"/>
        </g>

        {/* Infinity Symbol Background */}
        <g className="infinity-symbol" opacity="0.15">
          <path 
            d="M 120 200 Q 140 180, 160 200 Q 180 220, 200 200 Q 220 180, 240 200 Q 260 220, 280 200" 
            fill="none"
            stroke="url(#balanceGradient)"
            strokeWidth="3"
            className="infinity-path"
          />
        </g>

        {/* Orbiting Rings */}
        <g className="orbit-rings">
          <circle 
            cx="200" 
            cy="200" 
            r="80" 
            fill="none"
            stroke="#34B27B"
            strokeWidth="1"
            opacity="0.2"
            className="orbit-ring ring-1"
            strokeDasharray="5,5"
          />
          <circle 
            cx="200" 
            cy="200" 
            r="100" 
            fill="none"
            stroke="#3b82f6"
            strokeWidth="1"
            opacity="0.15"
            className="orbit-ring ring-2"
            strokeDasharray="5,5"
          />
          <circle 
            cx="200" 
            cy="200" 
            r="120" 
            fill="none"
            stroke="url(#balanceGradient)"
            strokeWidth="1"
            opacity="0.1"
            className="orbit-ring ring-3"
            strokeDasharray="3,3"
          />
        </g>
        
        {/* Orbiting Dots */}
        <g className="orbit-dots">
          <circle cx="200" cy="120" r="3" fill="#3b82f6" className="orbit-dot dot-1" opacity="0.8" filter="url(#glow)"/>
          <circle cx="280" cy="200" r="3" fill="#34B27B" className="orbit-dot dot-2" opacity="0.8" filter="url(#glow)"/>
          <circle cx="200" cy="280" r="3" fill="#fbbf24" className="orbit-dot dot-3" opacity="0.8" filter="url(#glow)"/>
          <circle cx="120" cy="200" r="3" fill="#8b5cf6" className="orbit-dot dot-4" opacity="0.8" filter="url(#glow)"/>
        </g>

        {/* Text Labels */}
        <text x="110" y="175" textAnchor="middle" fill="#3b82f6" fontSize="14" fontWeight="bold" className="label work-label" filter="url(#glow)">
          WORK
        </text>
        <text x="290" y="175" textAnchor="middle" fill="#34B27B" fontSize="14" fontWeight="bold" className="label life-label" filter="url(#glow)">
          LIFE
        </text>
        
        {/* Connecting Energy Streams */}
        <g className="energy-streams">
          <path 
            d="M 110 158 Q 155 180, 200 200" 
            fill="none"
            stroke="#3b82f6"
            strokeWidth="2"
            opacity="0.4"
            className="energy-stream stream-1"
            strokeDasharray="5,5"
          />
          <path 
            d="M 290 158 Q 245 180, 200 200" 
            fill="none"
            stroke="#34B27B"
            strokeWidth="2"
            opacity="0.4"
            className="energy-stream stream-2"
            strokeDasharray="5,5"
          />
        </g>
      </svg>
      
      {/* Tagline */}
      <div className="logo-tagline">
        <span className="tagline-text">Find Your Perfect Balance</span>
      </div>
    </div>
  );
};

export default AnimatedLogo;
