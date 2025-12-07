import React, { useEffect, useState } from 'react';
import { useTaskTimer } from '../../contexts/TaskTimerContext';
import { toast } from 'react-toastify';
import reportService from '../../services/reportService.jsx';
import AuthUtils from '../../utils/authUtils';
import API_BASE_URL from '../../config/apiConfig';

const CircularTaskTimer = () => {
  const {
    activeTask,
    timerProgress,
    isTaskActive,
    elapsedMs,
    remainingMs,
    totalDurationMs,
    formatTime,
    upcomingTasks,
    findNextScheduledTask,
    setActiveTask
  } = useTaskTimer();

  const [currentTime, setCurrentTime] = useState(new Date());
  const [nextTask, setNextTask] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isEmailing, setIsEmailing] = useState(false);
  const [hasRecentlyCreatedTask, setHasRecentlyCreatedTask] = useState(false);

  // Track if we've already dispatched task completion for current active task
  const completionFiredRef = React.useRef(null);
  const recentTaskTimeoutRef = React.useRef(null);

  // BACKUP: Directly check localStorage for task data in case context doesn't have it
  useEffect(() => {
    const checkAndLoadTask = () => {
      try {
        // Only check if activeTask is null/undefined
        if (!activeTask) {
          const storedData = localStorage.getItem('activeTaskTimer');
          ('[CircularTaskTimer] 🔍 Checking localStorage, activeTask is empty. Stored data:', storedData);
          if (storedData) {
            const parsed = JSON.parse(storedData);
            ('[CircularTaskTimer] 📦 PARSED STORAGE DATA:', JSON.stringify(parsed, null, 2));
            if (parsed.task && parsed.task.startTime && parsed.task.endTime) {
              ('[CircularTaskTimer] 📦 LOADING TASK FROM STORAGE (activeTask was null):', {
                taskId: parsed.task.taskId || parsed.task._id,
                startTime: parsed.task.startTime,
                endTime: parsed.task.endTime
              });
              // Set it in the context
              ('[CircularTaskTimer] 🎯 CALLING setActiveTask with:', parsed.task);
              setActiveTask(parsed.task);
            } else {
              ('[CircularTaskTimer] ⚠️ Task data missing required fields:', parsed.task);
            }
          }
        }
      } catch (e) {
        console.warn('[CircularTaskTimer] ⚠️ Failed to load task from storage:', e);
      }
    };

    // Check on mount and whenever activeTask changes
    checkAndLoadTask();
  }, [activeTask, setActiveTask]);

  // Polling: Sync activeTask with storage (Load if missing, Clear if deleted)
  useEffect(() => {
    const pollInterval = setInterval(() => {
      try {
        const storedData = localStorage.getItem('activeTaskTimer');

        if (!activeTask) {
          if (storedData) {
            const parsed = JSON.parse(storedData);
            // ('[CircularTaskTimer] 🔄 POLL: Checking storage. ActiveTask empty. Data found:', parsed.task?._id);
            if (parsed.task && parsed.task.startTime && parsed.task.endTime) {
              ('[CircularTaskTimer] 🔄 POLL: Found task in storage, setting context:', parsed.task.taskId || parsed.task._id);
              setActiveTask(parsed.task);
            }
          }
        } else {
          // If we have an activeTask, verify it still exists in storage
          if (!storedData) {
            // Storage was cleared (likely deleted), so clear UI
            ('[CircularTaskTimer] 🧹 POLL: Storage empty but task active. Clearing UI.');
            setActiveTask(null);
          } else {
            // Verify ID consistency to detect external swaps
            const parsed = JSON.parse(storedData);
            const storedId = parsed.task?.taskId || parsed.task?._id;
            const currentId = activeTask.taskId || activeTask._id;
            if (storedId && currentId && storedId !== currentId) {
              ('[CircularTaskTimer] 🔄 POLL: ID mismatch (Storage has new task). Syncing.');
              setActiveTask(parsed.task);
            }
          }
        }
      } catch (e) {
        console.warn('[CircularTaskTimer] ⚠️ Poll error:', e);
      }
    }, 500);

    return () => clearInterval(pollInterval);
  }, [activeTask, setActiveTask]);

  // NEW: Listen for taskCreated events directly in CircularTaskTimer and force update
  useEffect(() => {
    const handleTaskCreatedDirectly = (e) => {
      ('[CircularTaskTimer] 🎯 Direct taskCreated listener fired with event:', e.detail);
      if (e.detail && e.detail.task) {
        ('[CircularTaskTimer] ✅ Got task directly from event, forcing update:', {
          taskId: e.detail.task.taskId || e.detail.task._id,
          startTime: e.detail.task.startTime,
          endTime: e.detail.task.endTime
        });
        // Force set the task immediately without waiting for context
        setActiveTask(e.detail.task);
        // Force re-render by updating current time
        setCurrentTime(new Date());
      }
    };

    window.addEventListener('taskCreated', handleTaskCreatedDirectly);
    return () => window.removeEventListener('taskCreated', handleTaskCreatedDirectly);
  }, [setActiveTask]);

  // Debug: Check render state
  useEffect(() => {
    if (activeTask) {
      const start = new Date(activeTask.startTime);
      const now = currentTime;
      ('[CircularTaskTimer] 🎯 RENDER STATE:', {
        hasActiveTask: !!activeTask,
        taskId: activeTask.taskId || activeTask._id,
        startTime: start.toLocaleString(),
        currentTime: now.toLocaleString(),
        hasStarted: now >= start,
        timeUntilStart: Math.round((start - now) / 1000) + 's'
      });
    }
  }, [activeTask, currentTime]);

  // Handle PDF report download
  const handleDownloadReport = async () => {
    ('📥 Download report button clicked');
    ('📦 reportService available:', !!reportService);
    ('🔍 generateAnalyticsReport function:', typeof reportService?.generateAnalyticsReport);

    // Prevent multiple simultaneous downloads
    if (isDownloading) {
      ('⚠️ Download already in progress');
      toast.warning('Please wait, report is being generated...', { autoClose: 2000 });
      return;
    }

    // Set loading state immediately
    setIsDownloading(true);

    try {
      // Show loading feedback
      toast.info("🔄 Analyzing your activity data and generating detailed report...", { autoClose: 3000 });

      ('📞 Calling generateAnalyticsReport for detailed analytics...');
      ('🌐 Current URL:', window.location.href);
      ('🔐 Token exists:', !!localStorage.getItem('token'));

      // Add timeout to prevent hanging (increased to 45 seconds for larger reports)
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Report generation timed out. Please try again.')), 45000);
      });

      // Generate and download the detailed analytics PDF report with timeout
      const result = await Promise.race([
        reportService.generateAnalyticsReport(),
        timeoutPromise
      ]);

      ('📦 Result received:', result);

      if (result?.success) {
        toast.success(`✅ Report downloaded successfully! Check your Downloads folder for "${result.fileName}".`, { autoClose: 5000 });
        ('✅ Report downloaded successfully:', result.fileName);
        ('📊 Report statistics:', {
          tasks: result.stats?.totalTasks || 0,
          breaks: result.stats?.totalBreaks || 0,
          moods: result.stats?.moodEntries || 0,
          activeDays: result.stats?.totalActiveDays || 0
        });
      } else {
        console.warn('⚠️ Result missing success flag:', result);
        throw new Error('Report generation failed - invalid response');
      }

    } catch (error) {
      console.error('❌ Report download error:', error);
      console.error('❌ Error details:', {
        name: error?.name,
        message: error?.message,
        stack: error?.stack?.slice(0, 300)
      });

      // User-friendly error messages
      let errorMsg = 'Failed to download your report';

      if (error.message.includes('timeout') || error.message.includes('timed out')) {
        errorMsg = 'Report generation took too long. Please try again.';
      } else if (error.message.includes('jsPDF') || error.message.includes('PDF')) {
        errorMsg = 'PDF generation error. Please refresh the page and try again.';
      } else if (error.message.includes('token') || error.message.includes('authentication')) {
        errorMsg = 'Please sign in to download your report.';
      } else if (error.message.includes('fetch') || error.message.includes('network')) {
        errorMsg = 'Network error. Please check your connection and try again.';
      } else if (error.message.includes('browser') || error.message.includes('download')) {
        errorMsg = 'Download blocked. Please check your browser settings.';
      } else if (error.message) {
        errorMsg = error.message;
      }

      toast.error(`❌ ${errorMsg}`, { autoClose: 5000 });
    } finally {
      // Always reset the loading state - this is critical!
      ('🔄 Resetting download button state...');
      // Use a small delay to ensure state updates properly
      setTimeout(() => {
        setIsDownloading(false);
        ('✅ Download button state reset complete');
      }, 100);
    }
  };



  // Handle sending email with report
  const handleSendEmail = async () => {
    ('📧 Send email button clicked');

    // Check if user is logged in FIRST before doing anything
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('userId');
    let userEmail = localStorage.getItem('userEmail');
    const userName = localStorage.getItem('userName');

    ('🔍 Auth check:', {
      hasToken: !!token,
      hasUserId: !!userId,
      email: userEmail,
      name: userName
    });

    if (!token || !userId) {
      console.warn('❌ User not logged in, cannot send email');
      toast.error('🔐 Please sign in to send email reports!\n\nClick the "Sign Up" button in the top right corner to log in.', {
        autoClose: 6000,
        position: "top-center",
        style: { whiteSpace: 'pre-line' }
      });
      return;
    }

    // Always verify email from backend to ensure it's correct
    if (!userEmail || userEmail === 'undefined' || userEmail === 'null') {
      ('⚠️ Email missing or invalid, fetching from backend...');
      try {
        const verifyResponse = await fetch(`${API_BASE_URL}/auth/verify`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (verifyResponse.ok) {
          const userData = await verifyResponse.json();
          ('✅ User data from backend:', userData);

          if (userData.user && userData.user.email) {
            userEmail = userData.user.email;
            localStorage.setItem('userEmail', userEmail);
            localStorage.setItem('userId', userData.user.id);
            if (userData.user.name) {
              localStorage.setItem('userName', userData.user.name);
            }
            ('✅ Retrieved and stored email from backend:', userEmail);
          } else {
            throw new Error('No email in user data');
          }
        } else {
          throw new Error('Verification failed with status: ' + verifyResponse.status);
        }
      } catch (error) {
        console.error('❌ Failed to verify user:', error);
        toast.error('Unable to determine your email address. Please log out and log in again.', {
          autoClose: 5000
        });
        return;
      }
    }

    ('📧 Using email for sending:', userEmail);

    // Prevent multiple simultaneous email sending
    if (isEmailing) {
      ('⚠️ Email sending already in progress');
      toast.warning('Please wait, email is being sent...', { autoClose: 2000 });
      return;
    }

    // Set loading state immediately
    setIsEmailing(true);

    try {
      ('✅ User authenticated, proceeding with email send');
      ('📧 Sending email to:', userEmail);

      // Show feedback that we're generating the report
      toast.info("📊 Generating your detailed report...", { autoClose: 3000 });

      ('📊 Generating PDF report with analytics...');

      let reportBuffer = null;
      let reportFileName = `WorkLife-Report-${new Date().toISOString().split('T')[0]}.pdf`;

      // Try to generate the full analytics report with PDF
      try {
        const reportResult = await reportService.generateAnalyticsReportBuffer();

        if (reportResult && reportResult.success && reportResult.buffer) {
          reportBuffer = reportResult.buffer;
          reportFileName = reportResult.fileName || reportFileName;
          ('✅ PDF report generated successfully');
          ('📄 Report size:', reportBuffer.length, 'characters');
        } else {
          console.warn('⚠️ Report generation returned no buffer, will send without attachment');
        }
      } catch (reportError) {
        console.error('❌ Report generation failed:', reportError);
        ('⚠️ Continuing to send email without PDF attachment');
        // Don't throw - continue to send email without attachment
      }

      // Show feedback that we're sending the email
      toast.info("📧 Sending your report via email...", { autoClose: 3000 });

      // Send email request with the generated PDF
      ('📤 Making email API request...');

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000); // 45 second timeout for larger PDFs

      let response;
      try {
        response = await fetch(`${API_BASE_URL}/email/send-report`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            reportBuffer: reportBuffer,
            reportFileName: reportFileName
          }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          console.error('❌ Email request timed out after 45 seconds');
          throw new Error('Request timed out. The report may be too large or the server is slow.');
        }
        console.error('❌ Network error:', fetchError);
        throw new Error('Network error. Please check if the backend is running on port 8080.');
      }

      ('📧 Email API response received');
      ('📧 Response status:', response.status);
      ('📧 Response ok?:', response.ok);

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error('AUTHENTICATION_FAILED');
        }

        const errorText = await response.text().catch(() => 'Unable to read error response');
        console.error('📧 Email API error response:', errorText);
        try {
          const errorData = JSON.parse(errorText);
          throw new Error(errorData.message || `Email sending failed: ${response.status}`);
        } catch (parseError) {
          throw new Error(`Email sending failed: ${response.status} - ${errorText}`);
        }
      }

      const result = await response.json();
      ('📧 Email API result:', result);

      if (result.success) {
        // Check if it's demo mode
        if (result.isDemoMode) {
          toast.info(`🎭 ${result.message}`, {
            autoClose: 8000,
            position: "top-center"
          });
          ('🎭 Demo mode:', result.message);
        } else {
          toast.success(`✅ Email sent successfully to ${userEmail}! Check your inbox.`, {
            autoClose: 5000,
            position: "top-center"
          });
          ('✅ Email sent successfully');
        }
      } else {
        throw new Error(result.message || 'Email sending failed');
      }

    } catch (error) {
      console.error('❌ Email sending error:', error);

      // Check if it's an authentication error
      if (error.message === 'AUTHENTICATION_REQUIRED' ||
        error.message === 'AUTHENTICATION_FAILED') {
        toast.error('🔐 Authentication failed. Please log out and log in again.', {
          autoClose: 5000,
          position: "top-center"
        });
        // Clear invalid tokens
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('userName');
        return;
      }

      // Simple error messages
      let errorMsg = 'Unable to send email at the moment';

      if (error.message.includes('token') || error.message.includes('sign in')) {
        errorMsg = 'Please sign in again to send your report.';
      } else if (error.message.includes('network') || error.message.includes('connection')) {
        errorMsg = 'Network error. Please check your internet connection.';
      } else if (error.message) {
        errorMsg = error.message;
      }

      toast.error(`❌ ${errorMsg}`, { autoClose: 5000 });
    } finally {
      // Always reset the loading state
      ('🔄 Resetting email button state...');
      setTimeout(() => {
        setIsEmailing(false);
        ('✅ Email button state reset complete');
      }, 100);
    }
  };

  // Debug: Monitor activeTask changes and calculate immediate progress
  useEffect(() => {
    ('[CircularTaskTimer] 🔄 Active task changed:', {
      hasActiveTask: !!activeTask,
      taskId: activeTask?.taskId || activeTask?._id,
      startTime: activeTask?.startTime,
      endTime: activeTask?.endTime,
      timerProgress,
      isTaskActive
    });

    // Quick start: Immediately calculate progress based on actual task times
    if (activeTask && activeTask.startTime && activeTask.endTime) {
      const now = new Date();
      const start = new Date(activeTask.startTime);
      const end = new Date(activeTask.endTime);

      // Only for tasks that have started or are currently active
      if (now >= start && now < end) {
        const totalDuration = end.getTime() - start.getTime();
        const elapsed = now.getTime() - start.getTime();
        const immediateProgress = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));

        ('[CircularTaskTimer] ⚡ QUICK START - Immediate progress calculation:', {
          taskId: activeTask.taskId || activeTask._id,
          immediateProgress: Math.round(immediateProgress) + '%',
          elapsed: Math.round(elapsed / 1000) + 's',
          total: Math.round(totalDuration / 1000) + 's'
        });
      }
    }
  }, [activeTask, timerProgress, isTaskActive]);

  // Track next upcoming task when there's no active task
  useEffect(() => {
    if (!activeTask && upcomingTasks && upcomingTasks.length > 0) {
      const now = currentTime;
      const nextUpcoming = upcomingTasks.find(task => {
        const taskStart = new Date(task.startTime);
        const taskEnd = new Date(task.endTime);

        // Only show tasks that:
        // 1. Haven't started yet (taskStart > now)
        // 2. Haven't ended yet (taskEnd > now)
        // 3. Are starting within the next 7 days
        const timeUntilStart = taskStart.getTime() - now.getTime();
        const isInFuture = timeUntilStart > 0; // Must start in the future
        const isWithinWindow = timeUntilStart <= 7 * 24 * 60 * 60 * 1000; // Within next 7 days
        const hasNotEnded = taskEnd > now; // Task hasn't already ended

        return isInFuture && isWithinWindow && hasNotEnded;
      });

      if (nextUpcoming && hasRecentlyCreatedTask) {
        ('[CircularTaskTimer] 📅 Setting next task (task was recently created):', {
          taskId: nextUpcoming._id,
          startTime: nextUpcoming.startTime,
          type: nextUpcoming.type
        });
        setNextTask(nextUpcoming);
      } else if (!hasRecentlyCreatedTask) {
        ('[CircularTaskTimer] 📭 Clearing next task display (no recent task creation)');
        setNextTask(null);
      }
    } else if (!activeTask && !hasRecentlyCreatedTask) {
      setNextTask(null);
    }
  }, [activeTask, upcomingTasks, currentTime, hasRecentlyCreatedTask]);

  // Listen for task creation events to ensure UI updates
  useEffect(() => {
    const handleTaskCreated = (e) => {
      ('[CircularTaskTimer] 🆕 Task creation event received:', {
        hasDetail: !!e.detail,
        hasTask: !!(e.detail?.task),
        taskId: e.detail?.task?.taskId || e.detail?.task?._id
      });

      // Mark that a task was recently created
      setHasRecentlyCreatedTask(true);

      // Clear any existing timeout
      if (recentTaskTimeoutRef.current) {
        clearTimeout(recentTaskTimeoutRef.current);
      }

      // Reset the flag after 8 seconds (allow time to view the upcoming task info)
      recentTaskTimeoutRef.current = setTimeout(() => {
        ('[CircularTaskTimer] ⏱️ Task creation timeout - clearing upcoming task display');
        setHasRecentlyCreatedTask(false);
      }, 8000);

      // Force re-render to ensure timer updates immediately
      setCurrentTime(new Date());

      // Refresh upcoming tasks
      if (findNextScheduledTask) {
        findNextScheduledTask();
      }
    };

    window.addEventListener('taskCreated', handleTaskCreated);

    return () => {
      window.removeEventListener('taskCreated', handleTaskCreated);
      if (recentTaskTimeoutRef.current) {
        clearTimeout(recentTaskTimeoutRef.current);
      }
    };
  }, [findNextScheduledTask]);

  // Listen for task deletion events to reset timer when active task is deleted
  useEffect(() => {
    const handleTaskDeleted = (e) => {
      ('[CircularTaskTimer] 🗑️ Task deleted event received:', e.detail);

      if (e.detail && e.detail.taskId) {
        const deletedTaskId = e.detail.taskId;

        // Check if the deleted task is the currently active task
        if (activeTask && (activeTask._id === deletedTaskId || activeTask.taskId === deletedTaskId)) {
          ('[CircularTaskTimer] 🛑 Active task was deleted! Resetting timer to zero immediately...');
          ('[CircularTaskTimer] Active task ID:', activeTask._id || activeTask.taskId);
          ('[CircularTaskTimer] Deleted task ID:', deletedTaskId);

          // Get the current timer data to clear
          try {
            const timerData = JSON.parse(localStorage.getItem('activeTaskTimer') || '{}');
            const userId = localStorage.getItem('userId');

            // Only clear if it matches the deleted task
            if (timerData.task && (timerData.task._id === deletedTaskId || timerData.task.taskId === deletedTaskId)) {
              ('[CircularTaskTimer] 📦 Clearing localStorage for deleted task');
              // Clear timer storage
              sessionStorage.removeItem('activeTaskTimer');
              if (userId) {
                localStorage.removeItem(`activeTaskTimer_${userId}`);
              }
              localStorage.removeItem('activeTaskTimer');
            }
          } catch (e) {
            console.warn('[CircularTaskTimer] ⚠️ Failed to clear localStorage:', e);
          }

          // Reset the active task to null
          setActiveTask(null);

          // Clear the completion fired ref for this task
          completionFiredRef.current = null;

          // Force immediate re-render
          setCurrentTime(new Date());

          // Show toast notification
          toast.warning('⚠️ The active task was deleted. Timer reset.', {
            autoClose: 3000,
            position: "top-center"
          });

          ('[CircularTaskTimer] ✅ Timer reset successfully - progress now 0%');
        } else {
          ('[CircularTaskTimer] ℹ️ Deleted task is not the active task:', {
            activeTaskId: activeTask?._id || activeTask?.taskId,
            deletedTaskId,
            isMatch: activeTask && (activeTask._id === deletedTaskId || activeTask.taskId === deletedTaskId)
          });
        }
      }
    };

    window.addEventListener('taskDeleted', handleTaskDeleted);

    return () => {
      window.removeEventListener('taskDeleted', handleTaskDeleted);
    };
  }, [activeTask, setActiveTask]);

  // Real-time clock update for live progress calculation
  useEffect(() => {
    let intervalId;
    // Update every 500ms for smooth progress display (both active and upcoming tasks)
    intervalId = setInterval(() => {
      setCurrentTime(new Date());
    }, 500);

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, []);

  // Track task completion and dispatch event when timer finishes
  useEffect(() => {
    if (activeTask) {
      const end = new Date(activeTask.endTime);
      const now = currentTime;
      const hasEnded = now >= end;

      // Check if task just completed (and we haven't already fired the event for this task)
      if (hasEnded && timerProgress >= 100 && completionFiredRef.current !== activeTask._id) {
        // Mark that we've fired completion for this task
        completionFiredRef.current = activeTask._id;

        // Get task details
        const taskId = activeTask._id || activeTask.taskId;
        const token = localStorage.getItem('token');
        const completedAt = new Date().toISOString();

        ('🎉 [CircularTaskTimer] ⏰ Task timer completed! Marking task as done...');
        ('[CircularTaskTimer] 📋 Task completion details:', {
          taskId,
          startTime: activeTask.startTime,
          endTime: activeTask.endTime,
          type: activeTask.type,
          completedAt
        });

        // IMMEDIATELY dispatch event to update UI (don't wait for API call)
        ('[CircularTaskTimer] 🚀 Dispatching taskMarkedCompleted event for immediate UI update');
        const immediateEvent = new CustomEvent('taskMarkedCompleted', {
          detail: {
            taskId: taskId,
            task: { ...activeTask, completed: true, completedAt },
            completedAt: completedAt,
            source: 'CircularTaskTimer'
          }
        });
        window.dispatchEvent(immediateEvent);

        // Show completion toast notification immediately
        toast.success(`✅ Task "${activeTask.taskName || activeTask.type}" completed!`, {
          autoClose: 3000,
          position: "top-center"
        });

        // Then update backend in background
        if (token && taskId) {
          (async () => {
            try {
              ('📤 [CircularTaskTimer] Updating task completion status on backend:', taskId);

              const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                credentials: 'include',
                body: JSON.stringify({
                  completed: true,
                  completedAt: completedAt
                })
              });

              if (response.ok) {
                const updatedTask = await response.json();
                ('✅ [CircularTaskTimer] Backend confirmed task completion:', {
                  taskId: updatedTask._id,
                  completed: updatedTask.completed,
                  completedAt: updatedTask.completedAt
                });

                // Dispatch another event with confirmed backend data
                const confirmedEvent = new CustomEvent('taskMarkedCompleted', {
                  detail: {
                    taskId: taskId,
                    task: updatedTask,
                    completedAt: updatedTask.completedAt || completedAt,
                    source: 'CircularTaskTimer',
                    confirmed: true
                  }
                });
                window.dispatchEvent(confirmedEvent);
                ('[CircularTaskTimer] 🚀 Backend-confirmed taskMarkedCompleted event dispatched');
              } else {
                const errorText = await response.text();
                console.error('❌ [CircularTaskTimer] Failed to mark task as completed on backend:', response.status, errorText);
                toast.warning('⚠️ Task marked complete locally, but server update failed. Will retry on refresh.', {
                  autoClose: 4000
                });
              }
            } catch (err) {
              console.error('❌ [CircularTaskTimer] Error marking task as completed on backend:', err);
              toast.warning('⚠️ Task marked complete locally, but server update failed. Check your connection.', {
                autoClose: 4000
              });
            }
          })();
        }

        // Dispatch task completion event to update weekly stats
        ('[CircularTaskTimer] 📊 Dispatching taskCompleted event for stats update');
        const completionEvent = new CustomEvent('taskCompleted', {
          detail: {
            taskId: taskId,
            task: { ...activeTask, completed: true, completedAt },
            completionDate: new Date(),
            taskType: activeTask.type,
            source: 'CircularTaskTimer'
          }
        });
        window.dispatchEvent(completionEvent);
      }
    } else {
      // Reset the completion fired ref when there's no active task
      completionFiredRef.current = null;
    }
  }, [activeTask, timerProgress, currentTime]);

  // Calculate activeTask values if present (before conditional returns)
  // Initialize these variables for use in conditions
  let start = null, end = null, now = null, hasStarted = false, hasEnded = false;
  let radius, circumference, progressRatio, dashOffset, remainingLabel, statusText, currentElapsedMs = 0;

  if (activeTask) {
    start = new Date(activeTask.startTime);
    end = new Date(activeTask.endTime);
    now = currentTime;
    hasStarted = now >= start;
    hasEnded = now >= end;

    // SVG circle metrics for the timer
    radius = 95;
    circumference = 2 * Math.PI * radius;

    // Calculate progress locally for immediate responsiveness
    const totalDurationVal = end.getTime() - start.getTime();
    const elapsedVal = now.getTime() - start.getTime();
    // Ensure 0-1 range
    const localProgressRatio = totalDurationVal > 0 ? Math.min(1, Math.max(0, elapsedVal / totalDurationVal)) : 0;

    // Use local progress if started; if ended, 100%; if future, 0%
    progressRatio = hasStarted && !hasEnded ? localProgressRatio : (hasEnded ? 1 : 0);
    dashOffset = circumference * (1 - progressRatio);

    // Calculate elapsed time locally for display
    currentElapsedMs = hasStarted ?
      (hasEnded ? totalDurationVal : elapsedVal) : 0;

    // Status and timing calculations
    remainingLabel = hasEnded
      ? 'Completed'
      : hasStarted
        ? `${formatTime(remainingMs)} left`
        : `Starts in ${formatTime(start.getTime() - now.getTime())}`;

    statusText = hasEnded ? 'Finished' : hasStarted ? 'In Progress' : 'Scheduled';
  }

  // If activeTask exists but hasn't started yet, show it as "Upcoming Task" instead of "Active Task Timer"
  if (activeTask && start && end && now && !hasStarted) {
    const timeUntilStart = start.getTime() - now.getTime();
    const hoursUntil = Math.floor(timeUntilStart / (1000 * 60 * 60));
    const minutesUntil = Math.floor((timeUntilStart % (1000 * 60 * 60)) / (1000 * 60));
    const secondsUntil = Math.floor((timeUntilStart % (1000 * 60)) / 1000);
    const taskDuration = end.getTime() - start.getTime();

    // For upcoming tasks that haven't started yet, show 0% progress
    // No countdown animation - just display 0% until the task actually starts
    const countdownProgress = 0;

    // Calculate SVG metrics for countdown progress (all at 0%)
    const upcomingRadius = 95;
    const upcomingCircumference = 2 * Math.PI * upcomingRadius;
    const countdownRatio = 0; // Always 0 until task starts
    const countdownDashOffset = upcomingCircumference * (1 - countdownRatio);

    ('[CircularTaskTimer] 📅 RENDERING scheduled task as upcoming:', {
      activeTaskExists: !!activeTask,
      startDefined: !!start,
      endDefined: !!end,
      nowDefined: !!now,
      hasNotStarted: !hasStarted,
      taskId: activeTask.taskId || activeTask._id,
      hoursUntil,
      minutesUntil,
      secondsUntil,
      duration: Math.round(taskDuration / 60000) + ' minutes',
      countdownProgress: Math.round(countdownProgress) + '%',
      status: 'Showing 0% - waiting for start time'
    });

    return (
      <div className="circular-timer-container">
        <div className="timer-header">
          <h3 className="timer-title">Upcoming Task</h3>
          <span className={`task-type-badge ${activeTask.type}`}>
            {activeTask.type}
          </span>
        </div>

        <div className="circular-timer-wrapper">
          <svg
            className="timer-svg"
            width="240"
            height="240"
            viewBox="0 0 240 240"
          >
            {/* Background circle */}
            <circle
              className="timer-bg-circle"
              cx="120"
              cy="120"
              r="95"
              strokeWidth="14"
              fill="none"
            />
            {/* Countdown progress circle - shows progress to task start */}
            <circle
              className="timer-progress-circle scheduled"
              cx="120"
              cy="120"
              r={upcomingRadius}
              strokeWidth="10"
              fill="none"
              strokeDasharray={upcomingCircumference}
              strokeDashoffset={countdownDashOffset}
              transform="rotate(-90 120 120)"
            />
            {/* Avatar image */}
            <clipPath id="circle-clip-upcoming">
              <circle cx="120" cy="120" r="85" />
            </clipPath>
            <image
              href="/avatar.png"
              x="35"
              y="35"
              width="170"
              height="170"
              clipPath="url(#circle-clip-upcoming)"
              className="timer-avatar"
            />
          </svg>
          {/* Progress percentage badge overlay */}
          <div className="progress-badge">
            <span className="progress-percentage">{Math.round(countdownProgress)}%</span>
          </div>
        </div>

        <div className="timer-details">
          <div className="timer-times">
            <div className="time-info">
              <span className="time-label">Start:</span>
              <span className="time-value">{start.toLocaleTimeString()}</span>
            </div>
            <div className="time-info">
              <span className="time-label">End:</span>
              <span className="time-value">{end.toLocaleTimeString()}</span>
            </div>
            <div className="time-info">
              <span className="time-label">Duration:</span>
              <span className="time-value">{formatTime(taskDuration)}</span>
            </div>
          </div>

          <div className="timer-status-row">
            <div className="status-indicator scheduled">
              <div className="status-dot"></div>
              <span className="status-text">Scheduled</span>
            </div>
            <div className="remaining-info">
              {hoursUntil > 0 ? `Starts in ${hoursUntil}h ${minutesUntil}m ${secondsUntil}s` : minutesUntil > 0 ? `Starts in ${minutesUntil}m ${secondsUntil}s` : `Starts in ${secondsUntil}s`}
            </div>
          </div>
        </div>

        {/* Report Action Buttons */}
        <div className="report-buttons-container">
          <button
            className="download-report-btn"
            onClick={handleDownloadReport}
            disabled={isDownloading || isEmailing}
            title="Download your WorkLife Balance report as PDF"
          >
            {isDownloading ? '⏳ Generating...' : '📥 Download Report'}
          </button>
          <button
            className="send-email-btn"
            onClick={handleSendEmail}
            disabled={isEmailing}
            title="Send your WorkLife Balance report to your registered email address"
          >
            {isEmailing ? '📧 Sending to Email...' : '📧 Send to My Email'}
          </button>
        </div>
      </div>
    );
  }

  // Early returns for when there's no active task
  if (!activeTask) {
    // Validate nextTask is still in the future before showing it
    const isNextTaskValid = nextTask && nextTask.startTime && nextTask.endTime && (() => {
      const now = currentTime;
      const taskStart = new Date(nextTask.startTime);
      const taskEnd = new Date(nextTask.endTime);
      const timeUntilStart = taskStart.getTime() - now.getTime();

      // Check if task is still valid (in future, within 7 days, hasn't ended)
      const isInFuture = timeUntilStart > 0;
      const isWithinWindow = timeUntilStart <= 7 * 24 * 60 * 60 * 1000;
      const hasNotEnded = taskEnd > now;

      const isValid = isInFuture && isWithinWindow && hasNotEnded;

      if (!isValid) {
        ('[CircularTaskTimer] 🚫 Next task is no longer valid:', {
          taskId: nextTask._id,
          isInFuture,
          isWithinWindow,
          hasNotEnded,
          timeUntilStart
        });
      }

      return isValid;
    })();

    // Show next upcoming task if available AND task start time is valid (not showing stale/dummy data)
    if (isNextTaskValid) {
      const now = currentTime;
      const start = new Date(nextTask.startTime);
      const end = new Date(nextTask.endTime);
      const timeUntilStart = start.getTime() - now.getTime();
      const hoursUntil = Math.floor(timeUntilStart / (1000 * 60 * 60));
      const minutesUntil = Math.floor((timeUntilStart % (1000 * 60 * 60)) / (1000 * 60));

      return (
        <div className="circular-timer-container">
          <div className="timer-header">
            <h3 className="timer-title">Upcoming Task</h3>
            <span className={`task-type-badge ${nextTask.type}`}>
              {nextTask.type}
            </span>
          </div>

          <div className="circular-timer-wrapper">
            <svg
              className="timer-svg"
              width="240"
              height="240"
              viewBox="0 0 240 240"
            >
              {/* Background circle */}
              <circle
                className="timer-bg-circle"
                cx="120"
                cy="120"
                r="95"
                strokeWidth="14"
                fill="none"
              />
              {/* Avatar image */}
              <clipPath id="circle-clip">
                <circle cx="120" cy="120" r="85" />
              </clipPath>
              <image
                href="/avatar.png"
                x="35"
                y="35"
                width="170"
                height="170"
                clipPath="url(#circle-clip)"
                className="timer-avatar"
              />
            </svg>
            {/* Progress percentage badge overlay */}
            <div className="progress-badge">
              <span className="progress-percentage">0%</span>
            </div>
          </div>

          <div className="timer-details">
            <div className="timer-status-row">
              <div className="status-indicator scheduled">
                <div className="status-dot"></div>
                <span className="status-text">Scheduled</span>
              </div>
              <div className="remaining-info">
                Starts in {hoursUntil > 0 ? `${hoursUntil}h ${minutesUntil}m` : `${minutesUntil}m`}
              </div>
            </div>
          </div>

          {/* Report Action Buttons */}
          <div className="report-buttons-container">
            <button
              className="download-report-btn"
              onClick={handleDownloadReport}
              disabled={isDownloading || isEmailing}
              title="Download your WorkLife Balance report as PDF"
            >
              {isDownloading ? '⏳ Generating...' : '📥 Download Report'}
            </button>
            <button
              className="send-email-btn"
              onClick={handleSendEmail}
              disabled={isEmailing}
              title="Send your WorkLife Balance report to your registered email address"
            >
              {isEmailing ? '📧 Sending to Email...' : '📧 Send to My Email'}
            </button>
          </div>
        </div>
      );
    }

    // No active task and no upcoming task - show empty timer with 0%
    return (
      <div className="circular-timer-container">
        <div className="circular-timer-wrapper">
          <svg
            className="timer-svg"
            width="240"
            height="240"
            viewBox="0 0 240 240"
          >
            {/* Background circle */}
            <circle
              className="timer-bg-circle"
              cx="120"
              cy="120"
              r="95"
              strokeWidth="14"
              fill="none"
            />
            {/* Avatar image */}
            <clipPath id="circle-clip-default">
              <circle cx="120" cy="120" r="85" />
            </clipPath>
            <image
              href="/avatar.png"
              x="35"
              y="35"
              width="170"
              height="170"
              clipPath="url(#circle-clip-default)"
              className="timer-avatar"
            />
          </svg>
          {/* Progress percentage badge overlay */}
          <div className="progress-badge">
            <span className="progress-percentage">0%</span>
          </div>
        </div>

        {/* Report Action Buttons */}
        <div className="report-buttons-container">
          <button
            className="download-report-btn"
            onClick={handleDownloadReport}
            disabled={isDownloading}
            title="Download your WorkLife Balance report as PDF"
          >
            {isDownloading ? '⏳ Generating...' : '📥 Download Report'}
          </button>
          <button
            className="send-email-btn"
            onClick={handleSendEmail}
            disabled={isEmailing}
            title="Send your WorkLife Balance report to your registered email address"
          >
            {isEmailing ? '📧 Sending to Email...' : '📧 Send to My Email'}
          </button>
        </div>
      </div>
    );
  }

  // Main active task display (activeTask is present)
  // Safety guard - if activeTask somehow became null, show empty state
  if (!activeTask) {
    return (
      <div className="circular-timer-container">
        <div className="circular-timer-wrapper">
          <svg
            className="timer-svg"
            width="240"
            height="240"
            viewBox="0 0 240 240"
          >
            {/* Background circle */}
            <circle
              className="timer-bg-circle"
              cx="120"
              cy="120"
              r="95"
              strokeWidth="14"
              fill="none"
            />
            {/* Avatar image */}
            <clipPath id="circle-clip-safety">
              <circle cx="120" cy="120" r="85" />
            </clipPath>
            <image
              href="/avatar.png"
              x="35"
              y="35"
              width="170"
              height="170"
              clipPath="url(#circle-clip-safety)"
              className="timer-avatar"
            />
          </svg>
          {/* Progress percentage badge overlay */}
          <div className="progress-badge">
            <span className="progress-percentage">0%</span>
          </div>
        </div>

        {/* Report Action Buttons */}
        <div className="report-buttons-container">
          <button
            className="download-report-btn"
            onClick={handleDownloadReport}
            disabled={isDownloading}
            title="Download your WorkLife Balance report as PDF"
          >
            {isDownloading ? '⏳ Generating...' : '📥 Download Report'}
          </button>
          <button
            className="send-email-btn"
            onClick={handleSendEmail}
            disabled={isEmailing}
            title="Send your WorkLife Balance report to your registered email address"
          >
            {isEmailing ? '📧 Sending to Email...' : '📧 Send to My Email'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="circular-timer-container">
      <div className="timer-header">
        <h3 className="timer-title">Active Task Timer</h3>
        <span className={`task-type-badge ${activeTask.type}`}>
          {activeTask.type}
        </span>
      </div>

      <div className="circular-timer-wrapper">
        <svg
          className="timer-svg"
          width="240"
          height="240"
          viewBox="0 0 240 240"
        >
          {/* Background circle */}
          <circle
            className="timer-bg-circle"
            cx="120"
            cy="120"
            r={radius}
            strokeWidth="16"
            fill="none"
          />
          {/* Progress circle */}
          <circle
            className={`timer-progress-circle ${statusText.toLowerCase().replace(' ', '-')}`}
            cx="120"
            cy="120"
            r={radius}
            strokeWidth="10"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            transform="rotate(-90 120 120)"
          />
          {/* Avatar image */}
          <clipPath id="circle-clip-active">
            <circle cx="120" cy="120" r="85" />
          </clipPath>
          <image
            href="/avatar.png"
            x="35"
            y="35"
            width="170"
            height="170"
            clipPath="url(#circle-clip-active)"
            className="timer-avatar"
          />
        </svg>
        {/* Progress percentage badge overlay */}
        <div className="progress-badge">
          <span className="progress-percentage">{Math.round(progressRatio * 100)}%</span>
        </div>
      </div>

      <div className="timer-details">
        <div className="timer-times">
          <div className="time-info">
            <span className="time-label">Start:</span>
            <span className="time-value">{start.toLocaleTimeString()}</span>
          </div>
          <div className="time-info">
            <span className="time-label">End:</span>
            <span className="time-value">{end.toLocaleTimeString()}</span>
          </div>
          <div className="time-info">
            <span className="time-label">Duration:</span>
            <span className="time-value">{formatTime(totalDurationMs)}</span>
          </div>
          {hasStarted && !hasEnded && (
            <div className="time-info active">
              <span className="time-label">Elapsed:</span>
              <span className="time-value">{formatTime(currentElapsedMs)}</span>
            </div>
          )}
        </div>

        <div className="timer-status-row">
          <div className={`status-indicator ${statusText.toLowerCase().replace(' ', '-')}`}>
            <div className="status-dot"></div>
            <span className="status-text">{statusText}</span>
          </div>
          <div className="remaining-info">
            {remainingLabel}
          </div>
        </div>
      </div>

      {/* Report Action Buttons */}
      <div className="report-buttons-container">
        <button
          className="download-report-btn"
          onClick={handleDownloadReport}
          disabled={isDownloading}
          title="Download your WorkLife Balance report as PDF"
        >
          {isDownloading ? '⏳ Generating...' : '📥 Download Report'}
        </button>
        <button
          className="send-email-btn"
          onClick={handleSendEmail}
          disabled={isEmailing}
          title="Send your WorkLife Balance report to your registered email address"
        >
          {isEmailing ? '📧 Sending to Email...' : '📧 Send to My Email'}
        </button>
      </div>
    </div>
  );
};

export default CircularTaskTimer;