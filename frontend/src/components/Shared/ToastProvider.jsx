import React, { createContext, useContext, useState, useCallback } from 'react';
import Toast from './Toast';
import './toast.css';

const ToastContext = createContext(null);

export function useToast() {
  return useContext(ToastContext);
}

let idCounter = 1;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'success', ttl = 3500) => {
    const id = idCounter++;
    setToasts((t) => [...t, { id, message, type }]);
    if (ttl) setTimeout(() => setToasts((t) => t.filter(x => x.id !== id)), ttl);
    return id;
  }, []);

  const removeToast = useCallback((id) => setToasts((t) => t.filter(x => x.id !== id)), []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <div className="toast-container">
        {toasts.map((t) => (
          <Toast key={t.id} id={t.id} type={t.type} message={t.message} onClose={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
