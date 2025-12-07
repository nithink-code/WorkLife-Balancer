import React from 'react';
import './toast.css';

export default function Toast({ id, type = 'success', message, onClose }) {
  return (
    <div className={`toast ${type}`} role="status" aria-live="polite">
      <div className="toast-message">{message}</div>
      <button className="toast-close" onClick={() => onClose(id)} aria-label="Close">×</button>
    </div>
  );
}
