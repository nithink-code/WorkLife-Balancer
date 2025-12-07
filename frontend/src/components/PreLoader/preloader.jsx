import React, { useState, useEffect } from 'react';
// Assuming the CSS is imported or in a global stylesheet
import './preloader.css'; 

const WorkLifeBalancerPreloader = ({ onAnimationEnd }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [hasFadedIn, setHasFadedIn] = useState(false);

  useEffect(() => {
    // Trigger fade-in immediately on mount
    const fadeInTimer = setTimeout(() => {
      setHasFadedIn(true);
    }, 0);

    // After the initial display (5 seconds), start the fade out.
    const DISPLAY_DURATION_MS = 3000;
    const FADE_OUT_DURATION_MS = 800;
    const fadeOutTimer = setTimeout(() => {
      setIsFadingOut(true);
    }, DISPLAY_DURATION_MS);

    // After the fade-out animation completes, hide the component and notify parent.
    const hideTimer = setTimeout(() => {
      setIsVisible(false);
      if (onAnimationEnd) {
        onAnimationEnd();
      }
    }, DISPLAY_DURATION_MS + FADE_OUT_DURATION_MS);

    return () => {
      clearTimeout(fadeInTimer);
      clearTimeout(fadeOutTimer);
      clearTimeout(hideTimer);
    };
  }, [onAnimationEnd]);

  if (!isVisible) {
    return null; // Don't render anything once fully hidden
  }

  return (
    <div className={`preloader-overlay ${hasFadedIn ? 'fade-in' : ''} ${isFadingOut ? 'fade-out' : ''}`}>
      <div className={`preloader-content ${hasFadedIn ? 'zoom-in' : ''} ${isFadingOut ? 'zoom-out' : ''}`}>
        <div className="animated-lines-container">
          <div className="animated-line line-1"></div>
          <div className="animated-line line-2"></div>
          <div className="animated-line line-3"></div>
          <div className="animated-line line-4"></div>
        </div>
        <div className="logo-text">
          <span className="logo-main-text">WORK LIFE</span>
          <span className="logo-sub-text">BALANCER</span>
        </div>
      </div>
    </div>
  );
};

export default WorkLifeBalancerPreloader;