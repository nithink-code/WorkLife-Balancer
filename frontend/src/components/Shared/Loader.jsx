import React from 'react';
import './loader.css';

export default function Loader() {
  return (
    <div className="wlb-loader-overlay" role="status" aria-live="polite">
      <div className="wlb-spinner" />
    </div>
  );
}
