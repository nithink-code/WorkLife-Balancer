import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import API_BASE_URL from "../config/apiConfig";

const TaskTimerContext = createContext(null);

export const TaskTimerProvider = ({ children }) => {
  const [activeTask, setActiveTask] = useState(null);
  const [timerProgress, setTimerProgress] = useState(0);
  const [isTaskActive, setIsTaskActive] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [remainingMs, setRemainingMs] = useState(0);
  const [totalDurationMs, setTotalDurationMs] = useState(0);
  const [upcomingTasks, setUpcomingTasks] = useState([]);
  const [taskCheckInterval, setTaskCheckInterval] = useState(null);

  // Function to mark task as completed in the backend
  const markTaskAsCompleted = useCallback(async (taskId) => {
    if (!taskId) {
      console.warn('[TaskTimerContext] ⚠️ No taskId provided to markTaskAsCompleted');
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.warn('[TaskTimerContext] ⚠️ No token found');
        return;
      }
      
      ('[TaskTimerContext] 🔄 Marking task as completed:', taskId);
      ('[TaskTimerContext] 📤 Sending PATCH request to:', `${API_BASE_URL}/tasks/${taskId}`);
      
      const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ completed: true })
      });
      
      ('[TaskTimerContext] 📥 Response status:', response.status);
      
      if (response.ok) {
        const updatedTask = await response.json();
        ('[TaskTimerContext] ✅ Task marked as completed successfully:', updatedTask);
        ('[TaskTimerContext] ✅ Updated task completed field:', updatedTask.completed);
        
        // Dispatch event to notify other components (including WeeklyDataContext)
        window.dispatchEvent(new CustomEvent('taskCompleted', { 
          detail: { 
            taskId, 
            task: updatedTask,
            completionDate: updatedTask.endTime || new Date(),
            source: 'timer'
          } 
        }));
      } else {
        const errorText = await response.text();
        console.warn('[TaskTimerContext] ⚠️ Failed to mark task as completed:', response.status, errorText);
      }
    } catch (error) {
      console.error('[TaskTimerContext] ❌ Error marking task as completed:', error);
    }
  }, []);

  // Function to find the next scheduled task from the backend
  const findNextScheduledTask = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const userId = localStorage.getItem('userId');
      
      if (!token || !userId) return null;
      
      const response = await fetch(`${API_BASE_URL}/tasks/upcoming`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      
      if (response.ok) {
        const tasks = await response.json();
        const now = new Date();
        
        // Find tasks that haven't ended yet (includes future and currently active)
        const validTasks = tasks.filter(task => {
          const endTime = new Date(task.endTime);
          return endTime > now;
        });
        
        // Sort by start time
        validTasks.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
        
        setUpcomingTasks(validTasks);
        
        // Return the next task (either currently active or upcoming)
        return validTasks.length > 0 ? validTasks[0] : null;
      }
    } catch (error) {
      console.warn('[TaskTimerContext] Failed to fetch upcoming tasks:', error);
    }
    return null;
  }, []);

  // Format time for display (HH:MM:SS or MM:SS)
  const formatTime = useCallback((milliseconds) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  }, []);

  // Calculate real-time progress with smooth interpolation
  const calculateProgress = useCallback(() => {
    if (!activeTask) return 0;

    const now = Date.now();
    const start = new Date(activeTask.startTime).getTime();
    const end = new Date(activeTask.endTime).getTime();

    // If task ended, return 100% and check for next task
    if (now >= end) {
      setIsTaskActive(false);
      setElapsedMs(end - start);
      setRemainingMs(0);
      setTotalDurationMs(end - start);
      
      // Mark task as completed if not already done
      if (activeTask && !activeTask.completed) {
        markTaskAsCompleted(activeTask._id || activeTask.taskId);
      }
      
      // Check for next scheduled task when current task ends
      setTimeout(() => {
        findNextScheduledTask().then(nextTask => {
          if (nextTask && nextTask.taskId !== activeTask.taskId) {
            ('[TaskTimerContext] 🔄 Current task ended, switching to next task:', nextTask.taskId);
            setActiveTask(nextTask);
          } else if (!nextTask) {
            ('[TaskTimerContext] ✅ No more scheduled tasks');
            setActiveTask(null);
          }
        });
      }, 1000);
      
      return 100;
    }

    // If task hasn't started yet, return 0% (but keep it tracked for scheduled tasks)
    if (now < start) {
      setIsTaskActive(false);
      setElapsedMs(0);
      setRemainingMs(end - now);
      setTotalDurationMs(end - start);
      ('[TaskTimerContext] ⏰ Task scheduled for future, progress: 0%');
      return 0;
    }

    // Task is in progress - calculate smooth progress immediately
    setIsTaskActive(true);
    
    const totalDuration = end - start;
    const elapsed = now - start;
    const remaining = Math.max(0, end - now);
    
    // Smooth progress calculation (0-100%)
    const progress = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
    
    // Update time states
    setElapsedMs(elapsed);
    setRemainingMs(remaining);
    setTotalDurationMs(totalDuration);
    
    // Log progress for debugging - especially on initial calculation
    ('[TaskTimerContext] ⏳ Task progress calculated:', {
      progress: Math.round(progress) + '%',
      elapsed: Math.round(elapsed / 1000) + 's',
      total: Math.round(totalDuration / 1000) + 's',
      isImmediateCalc: progress > 0
    });
    
    return progress;
  }, [activeTask, markTaskAsCompleted, findNextScheduledTask]);

  // Update progress smoothly using requestAnimationFrame for smooth animations
  useEffect(() => {
    if (!activeTask) {
      setIsTaskActive(false);
      setTimerProgress(0);
      setElapsedMs(0);
      setRemainingMs(0);
      setTotalDurationMs(0);
      return;
    }

    // Calculate initial progress immediately when activeTask changes
    const initialProgress = calculateProgress();
    setTimerProgress(initialProgress);
    
    ('[TaskTimerContext] 🎬 Starting timer animation for task:', {
      taskId: activeTask.taskId || activeTask._id,
      initialProgress: Math.round(initialProgress) + '%',
      isActive: isTaskActive,
      startTime: activeTask.startTime,
      endTime: activeTask.endTime
    });

    let animationFrameId;
    let lastUpdateTime = Date.now();
    let lastProgressValue = initialProgress;

    const updateProgress = () => {
      const now = Date.now();
      
      // Update every ~250ms for smooth animation without excessive updates
      // This prevents progress bar from jumping and feels natural
      if (now - lastUpdateTime >= 250) {
        const newProgress = calculateProgress();
        
        // Always update on first calculation or if progress changed by at least 0.1%
        const shouldUpdate = lastProgressValue === 0 || Math.abs(newProgress - lastProgressValue) > 0.1;
        
        if (shouldUpdate) {
          setTimerProgress(newProgress);
          lastProgressValue = newProgress;
          
          // Log only significant progress changes to avoid spam
          if (Math.floor(newProgress) % 10 === 0 || newProgress >= 100) {
            ('[TaskTimerContext] 📊 Progress update:', Math.round(newProgress) + '%');
          }
        }
        
        lastUpdateTime = now;
        
        // Check if task has ended
        const end = new Date(activeTask.endTime).getTime();
        
        if (now >= end) {
          setIsTaskActive(false);
          setTimerProgress(100);
          ('[TaskTimerContext] ✅ Task timer completed at 100%');
          return; // Stop animation
        }
      }
      
      // Continue animation loop - request next frame
      animationFrameId = requestAnimationFrame(updateProgress);
    };

    // Start animation loop
    animationFrameId = requestAnimationFrame(updateProgress);

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [activeTask, calculateProgress]);

  // Persist active task to both sessionStorage AND localStorage for cross-session persistence
  useEffect(() => {
    if (activeTask) {
      try {
        const userId = localStorage.getItem('userId');
        const now = new Date();
        const start = new Date(activeTask.startTime);
        const end = new Date(activeTask.endTime);
        
        // Persist if task hasn't ended yet (includes future and in-progress tasks)
        if (now < end) {
          const timerData = {
            task: activeTask,
            timestamp: Date.now(),
            userId: userId, // Associate with user
            isActive: isTaskActive, // Track whether timer is currently running
            currentProgress: timerProgress, // Store current progress
            isFuture: now < start, // Flag if task is scheduled for future
            isInProgress: now >= start && now < end // Flag if task is actively running
          };
          
          // SessionStorage for quick cross-route access
          sessionStorage.setItem('activeTaskTimer', JSON.stringify(timerData));
          
          // LocalStorage for cross-session persistence (survives browser refresh & logout/login)
          if (userId) {
            localStorage.setItem(`activeTaskTimer_${userId}`, JSON.stringify(timerData));
            // Also store with generic key for backward compatibility
            localStorage.setItem('activeTaskTimer', JSON.stringify(timerData));
          }
        } else {
          // Task has ended, clean up storage
          sessionStorage.removeItem('activeTaskTimer');
          if (userId) {
            localStorage.removeItem(`activeTaskTimer_${userId}`);
            localStorage.removeItem('activeTaskTimer');
          }
        }
      } catch (e) {
        console.warn('[TaskTimerContext] ⚠️ Failed to persist task timer', e);
      }
    } else {
      // No active task, clean up storage
      try {
        const userId = localStorage.getItem('userId');
        sessionStorage.removeItem('activeTaskTimer');
        if (userId) {
          localStorage.removeItem(`activeTaskTimer_${userId}`);
          localStorage.removeItem('activeTaskTimer');
        }
      } catch (e) {}
    }
  }, [activeTask, isTaskActive, timerProgress]);

  // Periodic task checking to automatically load upcoming tasks
  useEffect(() => {
    const checkForTasks = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      // If no active task, look for next scheduled task
      if (!activeTask) {
        const nextTask = await findNextScheduledTask();
        if (nextTask) {
          const now = new Date();
          const startTime = new Date(nextTask.startTime);
          const endTime = new Date(nextTask.endTime);
          
          // Only set as active if task is current or upcoming (not past)
          if (endTime > now) {
            ('[TaskTimerContext] 🎯 Auto-detected scheduled task:', {
              taskId: nextTask.taskId || nextTask._id,
              startTime: startTime.toLocaleString(),
              isCurrent: now >= startTime && now < endTime,
              isUpcoming: now < startTime
            });
            setActiveTask(nextTask);
          }
        }
      }
    };
    
    // Check immediately
    checkForTasks();
    
    // Check every 30 seconds for new tasks
    const interval = setInterval(checkForTasks, 30000);
    setTaskCheckInterval(interval);
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [activeTask, findNextScheduledTask]);

  // Restore task on mount (from localStorage or sessionStorage)
  useEffect(() => {
    const restoreTimer = () => {
      try {
        const userId = localStorage.getItem('userId');
        const token = localStorage.getItem('token');
        
        // Don't restore if user is not logged in
        if (!token || !userId) {
          return;
        }
        
        // Try multiple storage locations in order of preference
        let stored = null;
        
        // 1. User-specific localStorage (highest priority)
        if (userId) {
          const localStored = localStorage.getItem(`activeTaskTimer_${userId}`);
          if (localStored) {
            stored = JSON.parse(localStored);
          }
        }
        
        // 2. Generic localStorage (backward compatibility)
        if (!stored) {
          const genericStored = localStorage.getItem('activeTaskTimer');
          if (genericStored) {
            stored = JSON.parse(genericStored);
          }
        }
        
        // 3. SessionStorage (for quick cross-route access)
        if (!stored) {
          const sessionStored = sessionStorage.getItem('activeTaskTimer');
          if (sessionStored) {
            stored = JSON.parse(sessionStored);
          }
        }
        
        if (stored && stored.task) {
          const { task, timestamp, userId: storedUserId, currentProgress } = stored;
          
          // Verify the stored timer belongs to current user
          if (userId && storedUserId && userId !== storedUserId) {
            localStorage.removeItem(`activeTaskTimer_${storedUserId}`);
            localStorage.removeItem('activeTaskTimer');
            sessionStorage.removeItem('activeTaskTimer');
            return;
          }
          
          const now = new Date();
          const start = new Date(task.startTime);
          const end = new Date(task.endTime);
          
          // Check if task is still valid (hasn't ended yet - includes future and in-progress)
          if (now < end) {
            // Restore the task and let the timer recalculate progress
            ('[TaskTimerContext] ✅ Restoring task from storage:', {
              taskId: task.taskId || task._id,
              startTime: task.startTime,
              endTime: task.endTime,
              isFuture: now < start,
              isActive: now >= start && now < end
            });
            setActiveTask(task);
          } else {
            // Task has ended, clean up
            ('[TaskTimerContext] 🗑️ Cleaning up expired task from storage');
            sessionStorage.removeItem('activeTaskTimer');
            localStorage.removeItem('activeTaskTimer');
            if (userId) {
              localStorage.removeItem(`activeTaskTimer_${userId}`);
            }
          }
        }
      } catch (e) {
        // Silent fail for restore errors
      }
    };
    
    // Restore immediately on mount
    restoreTimer();
    
    // Listen for storage events (for multi-tab synchronization)
    const handleStorageChange = (e) => {
      if (e.key?.includes('activeTaskTimer')) {
        setTimeout(() => restoreTimer(), 100);
      }
    };
    
  // Listen for user login events (restore timer after login)
  const handleUserLogin = (e) => {
    setTimeout(() => restoreTimer(), 500);
  };

  // Listen for user stats updates (when backend returns currentTaskInProgress)
  const handleUserStatsUpdated = (e) => {
    if (e.detail && e.detail.currentTaskInProgress) {
      ('[TaskTimerContext] 📊 User stats updated with active task:', e.detail.currentTaskInProgress.taskId);
      setActiveTask(e.detail.currentTaskInProgress);
    }
  };  // Listen for task creation events (start timer immediately)
  const handleTaskCreated = (e) => {
    ('[TaskTimerContext] 🆕 Task created event received:', e.detail);
    ('[TaskTimerContext] 🆕 e.detail.task EXISTS?:', !!e.detail?.task);
    ('[TaskTimerContext] 🆕 FULL e.detail object:', JSON.stringify(e.detail, null, 2));
    // Try to get the task from the event detail first
    if (e.detail && e.detail.task) {
      const newTask = e.detail.task;
      ('[TaskTimerContext] ✅ Got task object, taskId:', newTask.taskId, '_id:', newTask._id);
      ('[TaskTimerContext] ✅ Task startTime:', newTask.startTime, 'endTime:', newTask.endTime);
      
      const now = new Date();
      const start = new Date(newTask.startTime);
      const end = new Date(newTask.endTime);
      
      // Only set as active task if it's current or upcoming (not ended)
      if (end > now) {
        ('[TaskTimerContext] 📋 Task timing:', {
          now: now.toLocaleString(),
          start: start.toLocaleString(),
          end: end.toLocaleString(),
          isFuture: now < start,
          isActive: now >= start && now < end
        });
        
        // Set the task directly without requestAnimationFrame delay
        ('[TaskTimerContext] 🎯 SETTING ACTIVE TASK NOW:', newTask);
        setActiveTask(newTask);
        
        // Log task timing information
        ('[TaskTimerContext] 📊 New task activated:', {
          taskId: newTask.taskId || newTask._id,
          currentTime: now.toLocaleString(),
          startTime: start.toLocaleString(),
          endTime: end.toLocaleString(),
          isFuture: now < start,
          isActive: now >= start && now < end,
          timeUntilStart: now < start ? Math.round((start - now) / 60000) + ' minutes' : 'Started',
          duration: Math.round((end - start) / 60000) + ' minutes'
        });
        
        // Also refresh upcoming tasks list
        findNextScheduledTask();
      } else {
        ('[TaskTimerContext] ⏰ Task already ended, not setting as active');
      }
      
    } else {
      // Fallback to restore from storage or check for scheduled tasks
      ('[TaskTimerContext] ⚠️ No task in event detail, trying storage or scheduled tasks');
      setTimeout(async () => {
        try {
          const userId = localStorage.getItem('userId');
          const storedData = localStorage.getItem('activeTaskTimer');
          ('[TaskTimerContext] 📦 Checking localStorage:', { hasStoredData: !!storedData, userId });
          
          if (storedData) {
            const parsed = JSON.parse(storedData);
            if (parsed.task) {
              ('[TaskTimerContext] 🔄 Restoring task from storage:', parsed.task);
              setActiveTask(parsed.task);
              return;
            }
          }
        } catch (e) {
          console.warn('[TaskTimerContext] ⚠️ Storage restore failed:', e);
        }
        
        const nextTask = await findNextScheduledTask();
        if (nextTask) {
          ('[TaskTimerContext] 📅 Setting next scheduled task:', nextTask);
          setActiveTask(nextTask);
        } else {
          ('[TaskTimerContext] ❌ No task found, restoring timer');
          restoreTimer();
        }
      }, 200);
    }
  };    // Listen for route changes (restore timer when navigating)
    const handleRouteChange = (e) => {
      setTimeout(() => restoreTimer(), 100);
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('userLoggedIn', handleUserLogin);
    window.addEventListener('taskCreated', handleTaskCreated);
    window.addEventListener('userStatsUpdated', handleUserStatsUpdated);
    window.addEventListener('routeChanged', handleRouteChange);
    window.addEventListener('popstate', handleRouteChange);
    
    // BACKUP: Poll for task creation in localStorage (in case events don't fire)
    let lastCheckTime = Date.now();
    const pollInterval = setInterval(() => {
      try {
        const storedData = localStorage.getItem('activeTaskTimer');
        if (storedData) {
          const parsed = JSON.parse(storedData);
          if (parsed.task && parsed.timestamp && parsed.timestamp > lastCheckTime) {
            ('[TaskTimerContext] 🔄 DETECTED NEW TASK IN STORAGE, setting activeTask:', parsed.task);
            setActiveTask(parsed.task);
            lastCheckTime = Date.now();
          }
        }
      } catch (e) {
        // Silent fail
      }
    }, 500);
    
    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('userLoggedIn', handleUserLogin);
      window.removeEventListener('taskCreated', handleTaskCreated);
      window.removeEventListener('userStatsUpdated', handleUserStatsUpdated);
      window.removeEventListener('routeChanged', handleRouteChange);
      window.removeEventListener('popstate', handleRouteChange);
    };
  }, []);

  const value = {
    activeTask,
    setActiveTask,
    timerProgress,
    isTaskActive,
    elapsedMs,
    remainingMs,
    totalDurationMs,
    formatTime,
    upcomingTasks,
    findNextScheduledTask,
    markTaskAsCompleted,
  };

  return (
    <TaskTimerContext.Provider value={value}>
      {children}
    </TaskTimerContext.Provider>
  );
};

export const useTaskTimer = () => {
  const context = useContext(TaskTimerContext);
  if (!context) {
    throw new Error('useTaskTimer must be used within a TaskTimerProvider');
  }
  return context;
};
