import React, { useState, useEffect, useRef } from "react";
import { toast } from 'react-toastify';
import { useWeeklyData } from '../../../contexts/WeeklyDataContext';
import Modal from "../Modal";
import API_BASE_URL from '../../../config/apiConfig';

const API_URL = API_BASE_URL;

function resetBreakFormState(setType, setFeedback, setTimestamp, setDuration, setError) {
  ('[BreakForm] 🔄 Resetting form state');
  setType("stretch");
  setFeedback("");
  setTimestamp("");
  setDuration("");
  setError("");
}

export default function AddBreakForm({ show, onClose }) {
  const useCtx = useWeeklyData();
  const [type, setType] = useState("stretch");
  const [feedback, setFeedback] = useState("");
  const [timestamp, setTimestamp] = useState("");
  const [duration, setDuration] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isMounted = useRef(true);
  const prevShowRef = useRef(false);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  // Reset form when modal opens or closes
  useEffect(() => {
    if (!show) {
      setIsSubmitting(false);
    }
    if (show && !prevShowRef.current) {
      // Modal just opened - reset state
      resetBreakFormState(setType, setFeedback, setTimestamp, setDuration, setError);
    } else if (!show && prevShowRef.current) {
      // Modal just closed - reset state
      resetBreakFormState(setType, setFeedback, setTimestamp, setDuration, setError);
    }
    prevShowRef.current = show;
  }, [show]);


  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    setError("");

    const token = localStorage.getItem("token");
    if (!token) {
      const errorMsg = "Please log in to add breaks";
      setError(errorMsg);
      toast.error(errorMsg);
      return;
    }

    setIsSubmitting(true);

    // Apply optimistic update BEFORE the API call so charts update instantly
    const eventDate = timestamp ? new Date(timestamp) : new Date();
    try {
      const durNum = duration ? Number(duration) : undefined;
      useCtx.optimisticAddBreak && useCtx.optimisticAddBreak(eventDate, { duration: durNum });
    } catch (e) {
      console.warn('optimisticAddBreak failed', e);
    }

    // Dispatch a legacy event
    try {
      const detail = { type: 'break', date: eventDate, duration: duration ? Number(duration) : undefined, source: 'ctx' };
      window.dispatchEvent(new CustomEvent('weeklyDataUpdated', { detail }));
    } catch (e) { }

    // CLOSE MODAL IMMEDIATELY - Background Submission
    onClose();
    toast.info('Adding break...', { autoClose: 2000 });

    // Background Process
    (async () => {
      try {
        const body = {
          type,
          feedback: feedback || undefined,
          timestamp: timestamp ? new Date(timestamp) : new Date(),
          duration: duration ? Number(duration) : undefined,
        };

        const headers = {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        };

        const res = await fetch(`${API_URL}/break`, {
          method: "POST",
          headers: headers,
          credentials: "include",
          body: JSON.stringify(body),
        });

        if (res.status === 401 || res.status === 403) {
          localStorage.removeItem("token");
          localStorage.removeItem("userId");
          const errorMsg = "Session expired. Please log in again.";
          toast.error(errorMsg);
          if (isMounted.current) setIsSubmitting(false);
          // Optional: redirect
          setTimeout(() => { window.location.href = "/"; }, 2000);
          return;
        }

        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || `HTTP error ${res.status}`);
        }

        const savedBreak = await res.json();
        ('[BreakForm] ✅ Break added successfully:', savedBreak);

        toast.success('Break added');

        const breakAddedEvent = new CustomEvent('breakAdded', {
          detail: { break: savedBreak, timestamp: savedBreak.timestamp }
        });
        window.dispatchEvent(breakAddedEvent);

        try {
          useCtx.refresh && useCtx.refresh();
          useCtx.refreshUserStats && useCtx.refreshUserStats();
        } catch (e) { }

        if (isMounted.current) setIsSubmitting(false);

      } catch (err) {
        console.error("AddBreakForm error:", err);
        toast.error(err.message || "Failed to add break");
        if (isMounted.current) setIsSubmitting(false);
      }
    })();
  };

  return (
    <Modal show={show} onClose={onClose} title="Add Break">
      <form onSubmit={handleSubmit} className="form">
        <div className="form-group">
          <label>Break Type</label>
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="stretch">Stretch</option>
            <option value="walk">Walk</option>
            <option value="snack">Snack</option>
            <option value="meditation">Meditation</option>
            <option value="social">Social</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div className="form-group">
          <label>Timestamp (Optional)</label>
          <input
            type="datetime-local"
            value={timestamp}
            onChange={(e) => setTimestamp(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Duration (minutes)</label>
          <input
            type="number"
            min="0"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="Optional"
          />
        </div>

        <div className="form-group">
          <label>Feedback</label>
          <input
            type="text"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Optional: how was the break?"
          />
        </div>

        <div className="modal-actions">
          <button type="submit" className="btn primary" disabled={isSubmitting}>
            {isSubmitting ? 'Adding...' : 'Add Break'}
          </button>
          <button type="button" onClick={onClose} className="btn" disabled={isSubmitting}>Cancel</button>
        </div>

        {error && <div className="error">{error}</div>}
      </form>
    </Modal>
  );
}
