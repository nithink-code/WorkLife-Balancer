import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { useWeeklyData } from '../../contexts/WeeklyDataContext';
import Navbar from '../Navbar';
import Loader from '../Shared/Loader';
import './MoodCheckIns.css';
import API_BASE_URL from '../../config/apiConfig';

const API_URL = API_BASE_URL;

const moodEmojis = {
  1: { emoji: '😢', label: 'Very Bad', color: '#ef4444' },
  2: { emoji: '😟', label: 'Bad', color: '#f97316' },
  3: { emoji: '😐', label: 'Okay', color: '#eab308' },
  4: { emoji: '🙂', label: 'Good', color: '#84cc16' },
  5: { emoji: '😄', label: 'Great', color: '#22c55e' }
};

const stressLevels = {
  1: { label: 'Very Low', color: '#22c55e' },
  2: { label: 'Low', color: '#84cc16' },
  3: { label: 'Medium', color: '#eab308' },
  4: { label: 'High', color: '#f97316' },
  5: { label: 'Very High', color: '#ef4444' }
};

export default function MoodCheckIns() {
  const { refresh, refreshUserStats, syncMoodCountsFromBackend } = useWeeklyData();
  const [moodCheckIns, setMoodCheckIns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ mood: 3, stress: 3 });
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    ('[MoodCheckIns] 🔄 Mounting component, fetching mood check-ins');
    setLoading(true);
    
    // Add a timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      if (loading) {
        console.error('[MoodCheckIns] ❌ Fetch timeout - took too long');
        setLoading(false);
        toast.error('Failed to load mood check-ins. Please try again.');
      }
    }, 10000); // 10 second timeout
    
    fetchMoodCheckIns().finally(() => {
      clearTimeout(timeoutId);
    });
    
    // Sync mood counts from backend to ensure weekly stats are accurate
    if (syncMoodCountsFromBackend) {
      syncMoodCountsFromBackend();
    }
  }, []);

  // Mouse tracking for card hover effects
  useEffect(() => {
    const handleMouseMove = (e) => {
      const cards = document.querySelectorAll('.mood-card');
      cards.forEach(card => {
        const rect = card.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        card.style.setProperty('--mouse-x', `${x}%`);
        card.style.setProperty('--mouse-y', `${y}%`);
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [moodCheckIns]);

  // Listen for mood added events to refresh the list
  useEffect(() => {
    const handleMoodAdded = (e) => {
      ('[MoodCheckIns] 📢 Mood added event received:', e.detail);
      ('[MoodCheckIns] 🔄 Refreshing mood check-ins list...');
      setLoading(true);
      fetchMoodCheckIns();
    };

    window.addEventListener('moodAdded', handleMoodAdded);
    return () => {
      window.removeEventListener('moodAdded', handleMoodAdded);
    };
  }, []);

  const fetchMoodCheckIns = async () => {
    try {
      ('[MoodCheckIns] 🔄 Starting fetch of mood check-ins');
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('[MoodCheckIns] ❌ No token found');
        toast.error('Please log in to view mood check-ins');
        setTimeout(() => window.location.href = '/', 2000);
        setLoading(false);
        return;
      }

      ('[MoodCheckIns] 📡 Fetching from:', `${API_URL}/mood`);
      const res = await fetch(`${API_URL}/mood`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include'
      });

      ('[MoodCheckIns] 📬 Response received, status:', res.status);

      if (res.status === 401 || res.status === 403) {
        console.error('[MoodCheckIns] ❌ Authentication failed');
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
        toast.error('Session expired. Please log in again.');
        setTimeout(() => window.location.href = '/', 2000);
        setLoading(false);
        return;
      }

      if (!res.ok) {
        console.error('[MoodCheckIns] ❌ Response not ok:', res.status);
        throw new Error(`Failed to fetch mood check-ins: ${res.status}`);
      }

      const data = await res.json();
      ('[MoodCheckIns] ✅ Fetched mood check-ins:', data.length, 'entries');
      if (data.length > 0) {
        ('[MoodCheckIns] 📊 Latest entry details:', {
          _id: data[0]._id,
          timeStamp: data[0].timeStamp,
          createdAt: data[0].createdAt,
          mood: data[0].mood,
          stress: data[0].stress
        });
      }
      
      setMoodCheckIns(data);
    } catch (err) {
      console.error('[MoodCheckIns] ❌ Error fetching mood check-ins:', err);
      toast.error(err.message || 'Failed to load mood check-ins');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this mood check-in?')) {
      ('Delete cancelled by user');
      return;
    }

    ('Deleting mood check-in:', id);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No token found');
        toast.error('Please log in to delete mood check-ins');
        setTimeout(() => window.location.href = '/', 2000);
        return;
      }

      const res = await fetch(`${API_URL}/mood/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include'
      });

      ('Delete response status:', res.status);

      if (res.status === 401 || res.status === 403) {
        console.error('Authentication failed');
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
        toast.error('Session expired. Please log in again.');
        setTimeout(() => window.location.href = '/', 2000);
        return;
      }

      if (res.status === 404) {
        console.error('Mood check-in not found');
        toast.error('Mood check-in not found or already deleted');
        // Refresh the list to sync with server
        await fetchMoodCheckIns();
        return;
      }

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error('Delete failed:', errorData);
        throw new Error(errorData.message || 'Failed to delete mood check-in');
      }

      ('Successfully deleted mood check-in');
      
      // Remove from local state
      const remainingMoods = moodCheckIns.filter(m => m._id !== id);
      setMoodCheckIns(remainingMoods);
      
      // Recalculate mood counts based on remaining moods
      if (syncMoodCountsFromBackend) {
        ('[MoodCheckIns] 🗑️ Mood deleted - syncing counts with backend');
        syncMoodCountsFromBackend();
      }
      
      toast.success('Mood check-in deleted successfully');
      
      // Trigger data refresh for other components
      if (refresh) {
        setTimeout(() => refresh(), 500);
      }
      if (refreshUserStats) {
        setTimeout(() => refreshUserStats(), 500);
      }
      window.dispatchEvent(new CustomEvent('weeklyDataUpdated', { detail: { type: 'mood' } }));
    } catch (err) {
      toast.error(err.message || 'Failed to delete mood check-in');
      console.error('Error deleting mood check-in:', err);
    }
  };

  const handleEdit = (moodCheckIn) => {
    ('Editing mood check-in:', moodCheckIn);
    ('Current mood:', moodCheckIn.mood, 'Current stress:', moodCheckIn.stress);
    setEditingId(moodCheckIn._id);
    setEditForm({ 
      mood: parseInt(moodCheckIn.mood), 
      stress: parseInt(moodCheckIn.stress) 
    });
    ('Edit form initialized with:', { mood: moodCheckIn.mood, stress: moodCheckIn.stress });
  };

  const handleCancelEdit = () => {
    ('Cancelling edit');
    setEditingId(null);
    setEditForm({ mood: 3, stress: 3 });
    setIsUpdating(false);
  };

  const handleUpdate = async (id) => {
    if (isUpdating) {
      ('Update already in progress, ignoring click');
      return;
    }
    
    ('Updating mood check-in:', id, 'with data:', editForm);
    setIsUpdating(true);
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No token found');
        toast.error('Please log in to update mood check-ins');
        setTimeout(() => window.location.href = '/', 2000);
        setIsUpdating(false);
        return;
      }

      // Validate form data
      if (!editForm.mood || editForm.mood < 1 || editForm.mood > 5) {
        console.error('Invalid mood value:', editForm.mood);
        toast.error('Please select a valid mood (1-5)');
        setIsUpdating(false);
        return;
      }
      if (!editForm.stress || editForm.stress < 1 || editForm.stress > 5) {
        console.error('Invalid stress value:', editForm.stress);
        toast.error('Please select a valid stress level (1-5)');
        setIsUpdating(false);
        return;
      }
      ('Validation passed, making API call...');

      const res = await fetch(`${API_URL}/mood/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include',
        body: JSON.stringify({
          mood: parseInt(editForm.mood),
          stress: parseInt(editForm.stress)
        })
      });

      ('Update response status:', res.status);

      if (res.status === 401 || res.status === 403) {
        console.error('Authentication failed');
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
        toast.error('Session expired. Please log in again.');
        setTimeout(() => window.location.href = '/', 2000);
        return;
      }

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error('Update failed:', errorData);
        throw new Error(errorData.message || 'Failed to update mood check-in');
      }

      const updatedMood = await res.json();
      ('Successfully updated mood:', updatedMood);
      ('Updating local state with new data');
      
      // Update the mood check-ins array with the new data
      setMoodCheckIns(prevMoods => prevMoods.map(m => 
        m._id === id ? updatedMood : m
      ));
      
      // Clear edit state
      setEditingId(null);
      setEditForm({ mood: 3, stress: 3 });
      
      toast.success('✅ Mood check-in updated successfully!');
      
      // Trigger data refresh for other components
      window.dispatchEvent(new CustomEvent('weeklyDataUpdated', { detail: { type: 'mood' } }));
      
      ('Update complete - UI should reflect changes');
    } catch (err) {
      toast.error(err.message || 'Failed to update mood check-in');
      console.error('Error updating mood check-in:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown time';
    
    try {
      const date = new Date(dateString);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.warn('[MoodCheckIns] Invalid date:', dateString);
        return 'Invalid date';
      }
      
      const now = new Date();
      const diffInMs = now - date;
      const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
      const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
      const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

      if (diffInMinutes < 1) {
        return 'Just now';
      } else if (diffInMinutes < 60) {
        return `${diffInMinutes} ${diffInMinutes === 1 ? 'minute' : 'minutes'} ago`;
      } else if (diffInHours < 24) {
        return `${diffInHours} ${diffInHours === 1 ? 'hour' : 'hours'} ago`;
      } else if (diffInDays === 1) {
        return `Yesterday at ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}`;
      } else if (diffInDays < 7) {
        return `${diffInDays} days ago at ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}`;
      } else {
        return date.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric', 
          year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined 
        }) + ` at ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}`;
      }
    } catch (err) {
      console.error('[MoodCheckIns] Error formatting date:', err, dateString);
      return 'Time unavailable';
    }
  };

  const formatFullDate = (dateString) => {
    if (!dateString) return 'Unknown date/time';
    
    try {
      const date = new Date(dateString);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.warn('[MoodCheckIns] Invalid date:', dateString);
        return 'Invalid date';
      }
      
      return date.toLocaleString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
    } catch (err) {
      console.error('[MoodCheckIns] Error formatting full date:', err, dateString);
      return 'Time unavailable';
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <Loader />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="mood-checkins-container">
        <div className="mood-checkins-header">
          <h1 className="mood-title">
            <span className="mood-icon">🌈</span>
            Mood Check-Ins
          </h1>
          <p className="mood-subtitle">Track and manage your emotional well-being</p>
        </div>

        {moodCheckIns.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">😊</div>
            <h2>No mood check-ins yet</h2>
            <p>Start tracking your mood by adding check-ins from the Task Dashboard</p>
          </div>
        ) : (
          <div className="mood-grid">
            {moodCheckIns.map((moodCheckIn, index) => (
              <div 
                key={moodCheckIn._id} 
                className="mood-card"
              >
                {editingId === moodCheckIn._id ? (
                  // Edit Mode
                  <div className="edit-mode" key={`edit-${moodCheckIn._id}`}>
                    <div className="edit-header">
                      <h3>Edit Mood Check-In</h3>
                      <button 
                        className="btn-close-edit"
                        onClick={handleCancelEdit}
                        aria-label="Cancel edit"
                      >
                        ✕
                      </button>
                    </div>
                    
                    <div className="edit-form">
                      <div className="form-group-edit">
                        <label>Mood</label>
                        <div className="mood-selector">
                          {[1, 2, 3, 4, 5].map((value) => (
                            <button
                              key={value}
                              type="button"
                              className={`mood-option ${editForm.mood === value ? 'selected' : ''}`}
                              onClick={() => {
                                ('Mood clicked:', value, 'Current form:', editForm);
                                setEditForm(prev => {
                                  ('Previous form:', prev);
                                  const newForm = { ...prev, mood: value };
                                  ('New form:', newForm);
                                  return newForm;
                                });
                              }}
                              style={{
                                borderColor: editForm.mood === value ? moodEmojis[value].color : 'rgba(255, 255, 255, 0.1)',
                                backgroundColor: editForm.mood === value ? `${moodEmojis[value].color}20` : 'rgba(255, 255, 255, 0.05)'
                              }}
                            >
                              <span className="mood-emoji">{moodEmojis[value].emoji}</span>
                              <span className="mood-label">{moodEmojis[value].label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="form-group-edit">
                        <label>Stress Level</label>
                        <div className="stress-slider-container">
                          <input
                            type="range"
                            min="1"
                            max="5"
                            value={editForm.stress}
                            onChange={(e) => {
                              const newStress = parseInt(e.target.value);
                              ('Stress slider changed to:', newStress, 'Current form:', editForm);
                              setEditForm(prev => {
                                ('Previous stress form:', prev);
                                const newForm = { ...prev, stress: newStress };
                                ('New stress form:', newForm);
                                return newForm;
                              });
                            }}
                            className="stress-slider"
                            style={{
                              background: `linear-gradient(to right, ${stressLevels[editForm.stress].color} 0%, ${stressLevels[editForm.stress].color} ${(editForm.stress - 1) * 25}%, rgba(255, 255, 255, 0.1) ${(editForm.stress - 1) * 25}%, rgba(255, 255, 255, 0.1) 100%)`
                            }}
                          />
                          <div className="stress-value" style={{ color: stressLevels[editForm.stress].color }}>
                            <strong>{stressLevels[editForm.stress].label}</strong>
                          </div>
                        </div>
                      </div>

                      <div className="edit-actions">
                        <button 
                          type="button"
                          className="btn-cancel"
                          onClick={handleCancelEdit}
                        >
                          Cancel
                        </button>
                        <button 
                          type="button"
                          className="btn-save"
                          disabled={isUpdating}
                          onClick={() => {
                            ('Save clicked with form data:', editForm);
                            handleUpdate(moodCheckIn._id);
                          }}
                        >
                          {isUpdating ? '💾 Saving...' : 'Save Changes'}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  // View Mode
                  <>
                    <div className="mood-card-header">
                      <div className="mood-display">
                        <span 
                          className="mood-emoji-large"
                          style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.1))' }}
                        >
                          {moodEmojis[moodCheckIn.mood].emoji}
                        </span>
                        <div className="mood-info">
                          <h3 style={{ color: moodEmojis[moodCheckIn.mood].color }}>
                            {moodEmojis[moodCheckIn.mood].label}
                          </h3>
                          <p className="mood-time">{formatDate(moodCheckIn.timeStamp)}</p>
                        </div>
                      </div>
                      <div className="mood-actions">
                        <button
                          className="btn-edit"
                          onClick={() => handleEdit(moodCheckIn)}
                          aria-label="Edit mood check-in"
                          title="Edit"
                        >
                          ✏️
                        </button>
                        <button
                          className="btn-delete"
                          onClick={() => handleDelete(moodCheckIn._id)}
                          aria-label="Delete mood check-in"
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>

                    <div className="mood-details">
                      <div className="detail-row">
                        <span className="detail-label">Stress Level:</span>
                        <div className="stress-indicator">
                          <div className="stress-dots">
                            {[1, 2, 3, 4, 5].map((level) => (
                              <div
                                key={level}
                                className={`stress-dot ${level <= moodCheckIn.stress ? 'active' : ''}`}
                                style={{
                                  backgroundColor: level <= moodCheckIn.stress 
                                    ? stressLevels[moodCheckIn.stress].color 
                                    : '#e5e7eb'
                                }}
                              />
                            ))}
                          </div>
                          <span 
                            className="stress-label"
                            style={{ color: stressLevels[moodCheckIn.stress].color }}
                          >
                            {stressLevels[moodCheckIn.stress].label}
                          </span>
                        </div>
                      </div>

                      <div className="detail-row">
                        <span className="detail-label">Recorded:</span>
                        <span className="detail-value">{formatFullDate(moodCheckIn.timeStamp)}</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
