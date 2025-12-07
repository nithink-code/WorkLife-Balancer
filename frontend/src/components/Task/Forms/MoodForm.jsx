import React, { useState, useEffect, useRef } from "react";
import { toast } from 'react-toastify';
import { useWeeklyData } from '../../../contexts/WeeklyDataContext';
import Modal from "../Modal";
import API_BASE_URL from '../../../config/apiConfig';

const API_URL = API_BASE_URL;

function resetMoodFormState(setMood, setStress, setTimestamp, setError) {
  ('[MoodForm] 🔄 Resetting form state');
  setMood(3);
  setStress(3);
  setTimestamp("");
  setError("");
}

export default function AddMoodCheckinForm({ show, onClose }) {
  const useCtx = useWeeklyData();
  const [mood, setMood] = useState(3);
  const [stress, setStress] = useState(3);
  const [timestamp, setTimestamp] = useState("");
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
      resetMoodFormState(setMood, setStress, setTimestamp, setError);
    } else if (!show && prevShowRef.current) {
      // Modal just closed - reset state
      resetMoodFormState(setMood, setStress, setTimestamp, setError);
    }
    prevShowRef.current = show;
  }, [show]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    setError("");
    const token = localStorage.getItem("token");
    if (!token) {
      const errorMsg = "Please log in to add mood check-ins";
      setError(errorMsg);
      toast.error(errorMsg);
      return;
    }

    setIsSubmitting(true);

    // Ensure we have a valid timestamp - use current time if not provided
    const moodTimestamp = timestamp ? new Date(timestamp) : new Date();

    // Apply optimistic update BEFORE the API call so charts update instantly
    const eventDate = moodTimestamp;
    try {
      useCtx.optimisticAddMood && useCtx.optimisticAddMood(mood, eventDate);
    } catch (e) {
      console.warn('optimisticAddMood failed', e);
    }

    // Dispatch a legacy event
    try {
      const detail = { type: 'mood', moodValue: mood, date: eventDate, source: 'ctx' };
      window.dispatchEvent(new CustomEvent('weeklyDataUpdated', { detail }));
    } catch (e) { }

    // CLOSE MODAL IMMEDIATELY - Background Submission
    onClose();
    toast.info("Adding mood check-in...", { autoClose: 2000 });

    // Background Process
    (async () => {
      try {
        const headers = {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        };

        const res = await fetch(`${API_URL}/mood`, {
          method: "POST",
          headers: headers,
          credentials: "include",
          body: JSON.stringify({
            mood,
            stress,
            timestamp: moodTimestamp.toISOString(),
          }),
        });

        if (res.status === 401 || res.status === 403) {
          localStorage.removeItem("token");
          localStorage.removeItem("userId");
          const errorMsg = "Session expired. Please log in again.";
          toast.error(errorMsg);
          if (isMounted.current) setIsSubmitting(false);
          setTimeout(() => { window.location.href = "/"; }, 2000);
          return;
        }

        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(errorText || "Failed to add mood check-in");
        }

        const savedMood = await res.json();
        ('[MoodForm] ✅ Mood check-in saved successfully:', savedMood);

        toast.success('Mood check-in added');

        // Dispatch event
        const moodAddedEvent = new CustomEvent('moodAdded', {
          detail: {
            mood: savedMood,
            timestamp: savedMood.timeStamp
          }
        });
        window.dispatchEvent(moodAddedEvent);

        try {
          useCtx.refresh && useCtx.refresh();
          useCtx.refreshUserStats && useCtx.refreshUserStats();
          useCtx.syncMoodCountsFromBackend && useCtx.syncMoodCountsFromBackend();
        } catch (e) { }

        if (isMounted.current) setIsSubmitting(false);

      } catch (err) {
        console.error(err);
        toast.error(err.message || 'Failed to add mood check-in');
        if (isMounted.current) setIsSubmitting(false);
      }
    })();
  };

  return (
    <Modal show={show} onClose={onClose} title="Add Mood Check-In">
      <form onSubmit={handleSubmit} className="form">
        <div className="form-group">
          <label>Mood (1=Bad, 5=Great)</label>
          <input
            type="number"
            min={1}
            max={5}
            value={mood}
            onChange={e => setMood(Number(e.target.value))}
            required
          />
        </div>
        <div className="form-group">
          <label>Stress (1=Low, 5=High)</label>
          <input
            type="number"
            min={1}
            max={5}
            value={stress}
            onChange={e => setStress(Number(e.target.value))}
            required
          />
        </div>
        <div className="form-group">
          <label>Timestamp (Optional)</label>
          <input
            type="datetime-local"
            value={timestamp}
            onChange={(e) => setTimestamp(e.target.value)}
          />
        </div>
        <div className="modal-actions">
          <button type="submit" className="btn primary" disabled={isSubmitting}>
            {isSubmitting ? 'Adding...' : 'Add'}
          </button>
          <button type="button" onClick={onClose} className="btn" disabled={isSubmitting}>Cancel</button>
        </div>
        {error && <div className="error">{error}</div>}
      </form>
    </Modal>
  );
}
