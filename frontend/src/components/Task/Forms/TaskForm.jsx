import React, { useState, useEffect, useRef } from "react";
import { toast } from 'react-toastify';
import { useWeeklyData } from '../../../contexts/WeeklyDataContext';
import Modal from "../Modal";
import API_BASE_URL from '../../../config/apiConfig';

const API_URL = API_BASE_URL;

export default function AddTaskForm({ show, onClose }) {
  const useCtx = useWeeklyData();
  const [type, setType] = useState("work");
  // Helpers
  const pad = (n) => String(n).padStart(2, '0');
  const toDateStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const toTimeStr = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const fromParts = (dateStr, timeStr) => new Date(`${dateStr}T${timeStr}`);

  const now = new Date();
  const plus25 = new Date(now.getTime() + 25 * 60 * 1000);

  // Format for datetime-local input (YYYY-MM-DDTHH:MM)
  const toDateTimeLocalString = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const [startDateTime, setStartDateTime] = useState(toDateTimeLocalString(now));
  const [endDateTime, setEndDateTime] = useState(toDateTimeLocalString(plus25));
  const [isPomodoroEnabled, setIsPomodoroEnabled] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  useEffect(() => {
    if (!show) setIsSubmitting(false);
  }, [show]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    setError("");

    // Check if user is authenticated first
    const token = localStorage.getItem("token");
    if (!token) {
      const errorMsg = "Please log in to add tasks";
      setError(errorMsg);
      toast.error(errorMsg);
      return;
    }

    // Build dates from datetime-local strings and validate
    const st = new Date(startDateTime);
    const et = new Date(endDateTime);
    if (isNaN(st.getTime()) || isNaN(et.getTime())) {
      const msg = "Please provide valid start and end times";
      setError(msg);
      toast.error(msg);
      return;
    }
    if (et < st) {
      const msg = "End time cannot be before start time";
      setError(msg);
      toast.error(msg);
      return;
    }

    // CRITICAL: Check if the task is in the past
    const currentTime = new Date();
    if (et < currentTime) {
      const msg = "⚠️ Task end time has already passed! The timer cannot run for past tasks.\n\nCurrent time: " + currentTime.toLocaleTimeString() + "\nTask end time: " + et.toLocaleTimeString() + "\n\nPlease select a future time or a currently active time window.";
      setError(msg);
      toast.error(msg, { autoClose: 7000 });
      return;
    }

    // Validated! Start submission
    setIsSubmitting(true);

    // optimistic update
    const eventDate = et || st;
    try {
      useCtx.optimisticAddTask && useCtx.optimisticAddTask(st);
    } catch (e) {
      console.warn('optimisticAddTask failed', e);
    }

    // Dispatch legacy event
    try {
      const detail = { type: 'task', date: eventDate, source: 'ctx' };
      window.dispatchEvent(new CustomEvent('weeklyDataUpdated', { detail }));
    } catch (e) { }

    // CLOSE MODAL IMMEDIATELY - FIRE AND FORGET PATTERN
    ('[TaskForm] 🚀 Starting background submission. Closing modal now.');

    // OPTIMISTIC TIMER START (Immediate Feedback)
    try {
      const tempId = 'temp_' + Date.now();
      const optimisticTask = {
        _id: tempId,
        taskId: tempId,
        type,
        startTime: st.toISOString(),
        endTime: et.toISOString(),
        completed: false,
        isPomodoroEnabled
      };

      const userId = localStorage.getItem('userId');
      const isCurrentlyActive = currentTime >= st && currentTime < et;

      // Store Timer immediately
      const timerData = {
        task: optimisticTask,
        timestamp: Date.now(),
        userId: userId,
        isActive: isCurrentlyActive,
        currentProgress: 0,
        isFuture: currentTime < st
      };

      if (userId) localStorage.setItem(`activeTaskTimer_${userId}`, JSON.stringify(timerData));
      localStorage.setItem('activeTaskTimer', JSON.stringify(timerData));
      sessionStorage.setItem('activeTaskTimer', JSON.stringify(timerData));

      // Dispatch event immediately
      ('[TaskForm] 🚀 Dispatching optimistic taskCreated event');
      window.dispatchEvent(new CustomEvent('taskCreated', {
        detail: { task: optimisticTask, source: 'TaskForm_Optimistic' }
      }));
    } catch (optErr) {
      console.warn('[TaskForm] Optimistic setup failed:', optErr);
    }

    onClose(null);
    toast.info("Creating task...", { autoClose: 2000, position: "bottom-right" });

    // Background Execution
    (async () => {
      try {
        const headers = {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        };

        const res = await fetch(`${API_URL}/tasks`, {
          method: "POST",
          headers: headers,
          credentials: "include",
          body: JSON.stringify({
            type,
            startTime: st,
            endTime: et,
            isPomodoroEnabled,
          }),
        });

        if (res.status === 401 || res.status === 403) {
          toast.error("Session expired. Please log in again.");
          if (isMounted.current) setIsSubmitting(false);
          return;
        }

        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(errorText || 'Failed to add task');
        }

        const createdTask = await res.json();
        const completeTask = {
          ...createdTask,
          _id: createdTask._id || createdTask.id,
          taskId: createdTask._id || createdTask.id,
          startTime: st.toISOString(),
          endTime: et.toISOString(),
          type: type,
          isPomodoroEnabled: isPomodoroEnabled,
          createdAt: createdTask.createdAt || new Date().toISOString(),
          completed: false
        };

        toast.success("Task added successfully! ✅");

        // Store timer data
        const userId = localStorage.getItem('userId');
        const isCurrentlyActive = currentTime >= st && currentTime < et;
        try {
          const timerData = {
            task: completeTask,
            timestamp: Date.now(),
            userId: userId,
            isActive: isCurrentlyActive,
            currentProgress: isCurrentlyActive ? ((currentTime - st) / (et - st)) * 100 : 0,
            isFuture: currentTime < st,
            isInProgress: isCurrentlyActive
          };
          if (userId) localStorage.setItem(`activeTaskTimer_${userId}`, JSON.stringify(timerData));
          localStorage.setItem('activeTaskTimer', JSON.stringify(timerData));
          sessionStorage.setItem('activeTaskTimer', JSON.stringify(timerData));
        } catch (e) { }

        // Dispatch events
        try {
          const taskCreatedEvent = new CustomEvent('taskCreated', { detail: { task: completeTask, timestamp: Date.now(), source: 'TaskForm' } });
          window.dispatchEvent(taskCreatedEvent);

          const taskAddedEvent = new CustomEvent('taskAdded', { detail: { task: completeTask, timestamp: Date.now(), source: 'TaskForm' } });
          window.dispatchEvent(taskAddedEvent);
        } catch (e) { }

        // Refresh Stats
        try { useCtx.refresh && useCtx.refresh(); } catch (e) { }

        if (isMounted.current) {
          setIsSubmitting(false);
          // Reset form fields
          setType("work");
          setStartDateTime(toDateTimeLocalString(new Date()));
          setEndDateTime(toDateTimeLocalString(new Date(Date.now() + 25 * 60 * 1000)));
          setIsPomodoroEnabled(false);
        }
      } catch (err) {
        console.error('[TaskForm] Background submission failed:', err);
        toast.error(err.message || 'Failed to add task');
        if (isMounted.current) setIsSubmitting(false);
      }
    })();
  };

  // Handle modal close without task (user clicked X or outside)
  const handleModalClose = () => {
    ('[TaskForm] Modal closed without submitting');
    onClose(null);
  };

  return (
    <Modal show={show} onClose={handleModalClose} title="Add Task">
      <form onSubmit={handleSubmit} className="form">
        {error && (
          <div style={{
            backgroundColor: '#fee',
            border: '1px solid #fcc',
            borderRadius: '6px',
            padding: '12px',
            marginBottom: '16px',
            color: '#c00',
            fontSize: '13px',
            whiteSpace: 'pre-line'
          }}>
            {error}
          </div>
        )}
        <div className="form-group">
          <label>Type</label>
          <select value={type} onChange={e => setType(e.target.value)}>
            <option value="work">Work</option>
            <option value="break">Break</option>
          </select>
        </div>
        <div className="form-group">
          <label>Start Date & Time</label>
          <input
            type="datetime-local"
            value={startDateTime}
            onChange={(e) => setStartDateTime(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label>End Date & Time</label>
          <input
            type="datetime-local"
            value={endDateTime}
            onChange={(e) => setEndDateTime(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label>
            <input
              type="checkbox"
              checked={isPomodoroEnabled}
              onChange={e => setIsPomodoroEnabled(e.target.checked)}
            />&nbsp;
            Enable Pomodoro?
          </label>
        </div>

        {/* Task-specific form only (break fields removed) */}
        <div className="modal-actions">
          <button type="submit" className="btn primary" disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Add'}
          </button>
          <button type="button" onClick={handleModalClose} className="btn" disabled={isSubmitting}>Cancel</button>
        </div>
        {error && <div className="error">{error}</div>}
      </form>
    </Modal>
  );
}
