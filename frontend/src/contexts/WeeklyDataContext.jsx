import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import API_BASE_URL from "../config/apiConfig";

const API_URL = API_BASE_URL;

const WeeklyDataContext = createContext(null);

export const WeeklyDataProvider = ({ children }) => {
  // Track tasks for each half-hour block (8pm-10pm) for today: 4 slots
  // Slot 0: 8:00-8:30pm, Slot 1: 8:30-9:00pm, Slot 2: 9:00-9:30pm, Slot 3: 9:30-10:00pm
  const [tasksPerHourToday, setTasksPerHourToday] = useState(() => {
    try {
      const saved = sessionStorage.getItem('tasksPerHourToday');
      if (saved) {
        const parsed = JSON.parse(saved);
        ('[WeeklyDataContext] Restored from sessionStorage:', parsed);
        return parsed;
      }
    } catch (e) { }
    return Array(4).fill(false);
  });

  // Track streaks for half-hour slots
  const [hourCurrentStreak, setHourCurrentStreak] = useState(0);
  const [hourLongestStreak, setHourLongestStreak] = useState(() => {
    try {
      const saved = localStorage.getItem('hourLongestStreak');
      return saved ? parseInt(saved) : 0;
    } catch (e) {
      return 0;
    }
  });

  // Helper to update half-hour blocks for today (8pm-10pm)
  const updateTasksPerHourToday = useCallback((tasksList) => {
    // Only consider tasks for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const halfHourBlocks = Array(4).fill(false);

    (`[updateTasksPerHourToday] Processing ${tasksList.length} tasks for today`);

    tasksList.forEach((t, idx) => {
      if (t.type !== 'work') {
        if (idx < 3) (`[updateTasksPerHourToday] Task ${idx}: Skipping non-work type:`, t.type);
        return;
      }

      // Check multiple possible timestamp fields
      const taskTime = t.startTime || t.createdAt || t.updatedAt;
      if (!taskTime) {
        (`[updateTasksPerHourToday] Task ${idx}: No timestamp found`, t);
        return;
      }

      const start = new Date(taskTime);
      const taskDateStr = start.toDateString();
      const todayStr = today.toDateString();

      if (idx < 3) {
        (`[updateTasksPerHourToday] Task ${idx}:`, {
          time: start.toLocaleString(),
          hour: start.getHours(),
          minutes: start.getMinutes(),
          isToday: taskDateStr === todayStr,
          type: t.type
        });
      }

      if (taskDateStr !== todayStr) return;

      const hour = start.getHours();
      const minutes = start.getMinutes();

      // 8pm to 10pm in half-hour intervals
      // Slot 0: 20:00-20:29, Slot 1: 20:30-20:59, Slot 2: 21:00-21:29, Slot 3: 21:30-21:59
      if (hour === 20) {
        if (minutes < 30) {
          halfHourBlocks[0] = true; // 8:00-8:30pm
          (`[updateTasksPerHourToday] ✅ Slot 0 (8:00-8:30pm) marked`);
        } else {
          halfHourBlocks[1] = true; // 8:30-9:00pm
          (`[updateTasksPerHourToday] ✅ Slot 1 (8:30-9:00pm) marked`);
        }
      } else if (hour === 21) {
        if (minutes < 30) {
          halfHourBlocks[2] = true; // 9:00-9:30pm
          (`[updateTasksPerHourToday] ✅ Slot 2 (9:00-9:30pm) marked`);
        } else {
          halfHourBlocks[3] = true; // 9:30-10:00pm
          (`[updateTasksPerHourToday] ✅ Slot 3 (9:30-10:00pm) marked`);
        }
      }
    });

    // Set all slots that have tasks (keep all green, never reset)
    setTasksPerHourToday(halfHourBlocks);

    // Calculate streaks: find longest consecutive and current from end
    let calcLongestStreak = 0;
    let tempStreak = 0;
    for (let i = 0; i < 4; i++) {
      if (halfHourBlocks[i]) {
        tempStreak++;
        calcLongestStreak = Math.max(calcLongestStreak, tempStreak);
      } else {
        tempStreak = 0;
      }
    }

    // Current streak from the end
    let calcCurrentStreak = 0;
    for (let i = 3; i >= 0; i--) {
      if (halfHourBlocks[i]) calcCurrentStreak++;
      else break;
    }

    // If no streak from end, use the longest consecutive as current
    const activeStreak = calcCurrentStreak > 0 ? calcCurrentStreak : calcLongestStreak;

    // Update streak states
    setHourCurrentStreak(activeStreak);
    setHourLongestStreak(prevLongest => {
      const newLongest = Math.max(prevLongest, calcLongestStreak);
      if (newLongest > prevLongest) {
        localStorage.setItem('hourLongestStreak', newLongest.toString());
        (`[WeeklyDataContext] 🏆 New longest hour streak: ${newLongest}`);
      }
      return newLongest;
    });

    ('[WeeklyDataContext] ========= FINAL HALF-HOUR BLOCKS =========');
    ('[WeeklyDataContext] Blocks:', halfHourBlocks);
    ('[WeeklyDataContext] Slot 0 (8:00-8:30pm):', halfHourBlocks[0]);
    ('[WeeklyDataContext] Slot 1 (8:30-9:00pm):', halfHourBlocks[1]);
    ('[WeeklyDataContext] Slot 2 (9:00-9:30pm):', halfHourBlocks[2]);
    ('[WeeklyDataContext] Slot 3 (9:30-10:00pm):', halfHourBlocks[3]);
    ('[WeeklyDataContext] Current streak:', calcCurrentStreak);
    ('[WeeklyDataContext] Longest streak:', calcLongestStreak);
    ('[WeeklyDataContext] ==========================================');

    // Save to sessionStorage
    try {
      sessionStorage.setItem('tasksPerHourToday', JSON.stringify(halfHourBlocks));
    } catch (e) { }
  }, []);

  // helper to compute dayKey used by backend (YYYY-MM-DD in local timezone)
  const dayKey = (d) => {
    const dt = new Date(d);
    const year = dt.getFullYear();
    const month = String(dt.getMonth() + 1).padStart(2, '0');
    const day = String(dt.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Helper: build labels for the last 7 days ending today in local timezone with dates
  const buildLast7DayLabels = () => {
    try {
      const todayLocal = new Date();
      todayLocal.setHours(0, 0, 0, 0);
      const startLocal = new Date(todayLocal);
      startLocal.setDate(startLocal.getDate() - 6);
      const localLabels = [];
      const dateInfo = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(startLocal);
        d.setDate(d.getDate() + i); // Fixed: use d.getDate() instead of startLocal.getDate()
        const weekday = d.toLocaleDateString(undefined, { weekday: 'short' });
        const date = d.getDate();
        const month = d.getMonth() + 1;
        // Format: Only day name for cleaner x-axis labels
        const label = weekday;
        localLabels.push(label);
        dateInfo.push({
          index: i,
          label: label,
          date: d.toLocaleDateString(),
          dayKey: dayKey(d)
        });
      }
      ('[WeeklyDataContext] 📅 Last 7 days:', dateInfo);
      return localLabels;
    } catch (e) {
      // Fallback: generate simple labels if locale formatting fails
      console.error('[WeeklyDataContext] Error generating labels:', e);
      const todayLocal = new Date();
      todayLocal.setHours(0, 0, 0, 0);
      const startLocal = new Date(todayLocal);
      startLocal.setDate(startLocal.getDate() - 6);
      const fallbackLabels = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(startLocal);
        d.setDate(d.getDate() + i);
        fallbackLabels.push(d.toDateString().split(' ')[0]); // Mon, Tue, etc from actual dates (already day only)
      }
      return fallbackLabels;
    }
  };

  const [labels, setLabels] = useState(buildLast7DayLabels());

  // Initialize from localStorage to restore persisted data on page reload
  const [tasksPerDay, setTasksPerDay] = useState(() => {
    try {
      const userId = localStorage.getItem('userId');
      const stored = JSON.parse(localStorage.getItem(`weeklyData_${userId}`) || '{}');
      if (stored.tasks && Array.isArray(stored.tasks) && stored.tasks.length === 7) {
        ('[WeeklyDataContext] 📊 Restored tasksPerDay from localStorage:', stored.tasks);
        return stored.tasks;
      }
    } catch (e) { console.warn('Failed to restore tasksPerDay', e); }
    return [];
  });

  const [breaksPerDay, setBreaksPerDay] = useState(() => {
    try {
      const userId = localStorage.getItem('userId');
      const stored = JSON.parse(localStorage.getItem(`weeklyData_${userId}`) || '{}');
      if (stored.breaks && Array.isArray(stored.breaks) && stored.breaks.length === 7) {
        ('[WeeklyDataContext] 📊 Restored breaksPerDay from localStorage:', stored.breaks);
        return stored.breaks;
      }
    } catch (e) { console.warn('Failed to restore breaksPerDay', e); }
    return [];
  });

  const [moodAvgPerDay, setMoodAvgPerDay] = useState([]);

  const [moodCountsPerDay, setMoodCountsPerDay] = useState(() => {
    try {
      const userId = localStorage.getItem('userId');
      const stored = JSON.parse(localStorage.getItem(`weeklyData_${userId}`) || '{}');
      if (stored.moodCounts && Array.isArray(stored.moodCounts) && stored.moodCounts.length === 7) {
        ('[WeeklyDataContext] 📊 Restored moodCountsPerDay from localStorage:', stored.moodCounts);
        return stored.moodCounts;
      }
    } catch (e) { console.warn('Failed to restore moodCountsPerDay', e); }
    return Array(7).fill(0);
  });
  const [currentStreak, setCurrentStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [streakData, setStreakData] = useState([]);
  const [lastOptimistic, setLastOptimistic] = useState(null);
  const [savedLongestStreak, setSavedLongestStreak] = useState(0); // Persisted longest streak

  // User stats for ProfileProgressCard
  const [userStats, setUserStats] = useState({
    progress: 0,
    moodScore: 0,
    longestStreak: 0,
    weeklyGoal: 40,
    hoursWorked: 0,
    currentTaskInProgress: null,
    tasksCompleted: 0,
    totalTasks: 0,
  });

  const computeStreaksFromArray = (arr) => {
    // Calculate current streak from the end (most recent day)
    let cur = 0;
    for (let i = arr.length - 1; i >= 0; i--) {
      if (arr[i]) cur++;
      else break;
    }

    // Calculate longest streak in current week
    let longest = 0;
    let run = 0;
    for (let i = 0; i < arr.length; i++) {
      if (arr[i]) {
        run++;
        longest = Math.max(longest, run);
      } else {
        run = 0;
      }
    }

    // Check against saved all-time longest streak from localStorage and database
    const saved = parseInt(localStorage.getItem('savedLongestStreak') || '0');
    const allTimeLongest = Math.max(longest, saved);

    // Update saved longest streak if we have a new record
    if (longest > saved) {
      localStorage.setItem('savedLongestStreak', longest.toString());
      (`New longest streak record: ${longest} days (previous: ${saved})`);
    }

    // If current streak broke (=0) but we had a longest streak, preserve it
    if (cur === 0 && longest > 0 && longest >= saved) {
      localStorage.setItem('savedLongestStreak', longest.toString());
      (`Preserved longest streak after break: ${longest} days`);
    }

    return { current: cur, longest: allTimeLongest };
  };

  const fetchWeeklyData = useCallback(async () => {
    try {
      const headers = {};
      const token = localStorage.getItem("token");
      if (token) headers["Authorization"] = `Bearer ${token}`;

      // Add cache-busting timestamp to ensure fresh data
      const res = await fetch(`${API_URL}/api/dashboard/weekly-data?t=${Date.now()}`, {
        method: "GET",
        credentials: "include",
        headers,
      });
      if (!res.ok) {
        // ignore silently
        return;
      }
      const json = await res.json();
      // Use labels from backend (includes dates) or build local as fallback
      setLabels(json.labels && json.labels.length === 7 ? json.labels : buildLast7DayLabels());

      // Merge optimistic task data with backend data
      setTasksPerDay((prevTasks) => {
        const backendTasks = json.tasksPerDay || [];
        try {
          const stored = sessionStorage.getItem('weeklyDataOptimistic');
          if (stored) {
            const data = JSON.parse(stored);
            if (data.tasks && Array.isArray(data.tasks) && data.timestamp) {
              const age = Date.now() - data.timestamp;
              // If optimistic data is less than 5 seconds old, use it instead of backend
              if (age < 5000) {
                ('[WeeklyDataContext] 📊 Using recent optimistic task counts:', data.tasks, '(age: ' + age + 'ms)');
                return data.tasks;
              }
            }
          }
        } catch (e) {
          console.warn('Failed to check optimistic task counts', e);
        }
        ('[WeeklyDataContext] 📊 Task counts received from backend:', backendTasks);
        return backendTasks;
      });

      // Merge optimistic break data with backend data
      setBreaksPerDay((prevBreaks) => {
        const backendBreaks = json.breaksPerDay || [];
        try {
          const stored = sessionStorage.getItem('weeklyDataOptimistic');
          if (stored) {
            const data = JSON.parse(stored);
            if (data.breaks && Array.isArray(data.breaks) && data.timestamp) {
              const age = Date.now() - data.timestamp;
              // If optimistic data is less than 5 seconds old, use it instead of backend
              if (age < 5000) {
                ('[WeeklyDataContext] 📊 Using recent optimistic break counts:', data.breaks, '(age: ' + age + 'ms)');
                return data.breaks;
              }
            }
          }
        } catch (e) {
          console.warn('Failed to check optimistic break counts', e);
        }
        ('[WeeklyDataContext] 📊 Break counts received from backend:', backendBreaks);
        return backendBreaks;
      });
      // ensure numbers or nulls
      setMoodAvgPerDay((json.moodAvgPerDay || []).map((m) => (m === null ? null : Number(m))));
      // Ensure moodCountsPerDay is properly set with numeric values
      const safeMoodCounts = Array.isArray(json.moodCountsPerDay)
        ? json.moodCountsPerDay.map(v => typeof v === 'number' ? v : 0)
        : Array(7).fill(0);

      // Merge optimistic mood counts with backend data
      // Always use backend as source of truth for mood counts (unlike tasks/breaks)
      // since moods are managed from MoodCheckIns which may delete them
      setMoodCountsPerDay((prevCounts) => {
        ('[WeeklyDataContext] 📊 Mood counts received from backend:', json.moodCountsPerDay, 'normalized to:', safeMoodCounts);
        return safeMoodCounts;
      });

      // Use backend data directly - backend is the source of truth
      const serverCurrent = typeof json.currentStreak === "number" ? json.currentStreak : 0;
      const serverLongest = typeof json.longestStreak === "number" ? json.longestStreak : 0;
      const serverStreakData = Array.isArray(json.streakData) ? json.streakData : [];

      ('[WeeklyDataContext] Received from backend:', {
        currentStreak: serverCurrent,
        longestStreak: serverLongest,
        streakData: serverStreakData,
        tasksPerDay: json.tasksPerDay,
        moodCountsPerDay: safeMoodCounts
      });

      setCurrentStreak(serverCurrent);
      setLongestStreak(serverLongest);
      setSavedLongestStreak(serverLongest);
      setStreakData(serverStreakData);
      // additionally fetch raw items to compute accurate per-day counts (especially for mood counts)
      try {
        const [tasksRes, breaksRes, moodsRes] = await Promise.all([
          fetch(`${API_URL}/tasks`, { credentials: 'include', headers }),
          fetch(`${API_URL}/break`, { credentials: 'include', headers }),
          fetch(`${API_URL}/mood`, { credentials: 'include', headers }),
        ]);
        if (tasksRes.ok && breaksRes.ok && moodsRes.ok) {
          const [tasksList, breaksList, moodsList] = await Promise.all([tasksRes.json(), breaksRes.json(), moodsRes.json()]);

          (`[WeeklyDataContext] 📋 Fetched raw data: ${tasksList.length} tasks, ${breaksList.length} breaks, ${moodsList.length} moods`);

          // Update hour blocks for today (merge with existing optimistic updates)
          setTasksPerHourToday(prev => {
            // Calculate from fetched tasks
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const halfHourBlocks = Array(4).fill(false);

            tasksList.forEach(t => {
              if (t.type !== 'work') return;
              const taskTime = t.startTime || t.createdAt || t.updatedAt;
              if (!taskTime) return;

              const start = new Date(taskTime);
              if (start.toDateString() !== today.toDateString()) return;

              const hour = start.getHours();
              const minutes = start.getMinutes();

              if (hour === 20) {
                halfHourBlocks[minutes < 30 ? 0 : 1] = true;
              } else if (hour === 21) {
                halfHourBlocks[minutes < 30 ? 2 : 3] = true;
              }
            });

            // Merge with any optimistic updates (keep true values)
            const merged = prev.map((val, idx) => val || halfHourBlocks[idx]);
            ('[WeeklyDataContext] Merging hour blocks - prev:', prev, 'fetched:', halfHourBlocks, 'merged:', merged);

            return merged;
          });
          ('[WeeklyDataContext] Sample tasks:', tasksList.slice(0, 3).map(t => ({
            type: t.type,
            endTime: t.endTime,
            date: new Date(t.endTime || t.createdAt).toLocaleDateString()
          })));
          // ...existing code...
          breaksList.forEach(b => {
            const idx = indexForDateLocal(b.timestamp || b.timeStamp || b.createdAt);
            if (idx >= 0) {
              // Count each break as 1 (not weighted by duration)
              bCounts[idx]++;
            }
          });
          moodsList.forEach(m => {
            const idx = indexForDateLocal(m.timeStamp || m.timestamp || m.createdAt);
            if (idx >= 0) {
              mCounts[idx]++;
              if (typeof m.mood === 'number' && !isNaN(m.mood)) {
                moodSum[idx] += Number(m.mood);
                moodCnt[idx] += 1;
              }
            }
          });

          // CRITICAL FIX: Use backend data as source of truth, don't recompute locally
          // Backend already handles timezone and date mapping correctly
          ('[WeeklyDataContext] ✅ Using backend data (NOT recomputing locally)');
          ('[WeeklyDataContext] Backend tasksPerDay:', json.tasksPerDay);
          ('[WeeklyDataContext] Backend breaksPerDay:', json.breaksPerDay);
          ('[WeeklyDataContext] Backend moodCountsPerDay:', json.moodCountsPerDay);

          // Keep the backend data that was already set earlier in fetchWeeklyData
          // Don't override with local computation
          // Note: Backend data was already set at lines 288-291 with setTasksPerDay, setBreaksPerDay, etc.
          ('[WeeklyDataContext] ✅ Using backend data as source of truth');

          // Save complete data to localStorage for persistence (USER-SPECIFIC)
          try {
            const userId = localStorage.getItem('userId');
            const weeklyData = {
              tasks: json.tasksPerDay || [],
              breaks: json.breaksPerDay || [],
              moods: json.moodAvgPerDay || [],
              moodCounts: json.moodCountsPerDay || [],
              streakData: json.streakData || [],
              currentStreak: json.currentStreak || 0,
              longestStreak: json.longestStreak || 0,
              labels: json.labels || buildLast7DayLabels(),
              timestamp: Date.now(),
              dateKey: dayKey(new Date()),
              userId: userId // Associate with user
            };

            // Store user-specific weekly data (survives logout/login)
            if (userId) {
              localStorage.setItem(`weeklyData_${userId}`, JSON.stringify(weeklyData));
              ('[WeeklyData] Persisted graph data for user:', userId);
            }

            // Also store in generic key for backward compatibility
            localStorage.setItem('weeklyDataPersisted', JSON.stringify(weeklyData));
          } catch (e) {
            console.warn('Failed to persist weekly data', e);
          }

          // Clear optimistic data from sessionStorage once we have real data
          try {
            // Keep only tasks and breaks optimistic data, clear mood counts since backend is source of truth
            const stored = sessionStorage.getItem('weeklyDataOptimistic');
            if (stored) {
              const data = JSON.parse(stored);
              // Remove mood counts from optimistic cache - let backend be the source of truth
              data.moodCounts = undefined;
              if (Object.keys(data).length === 0 || (!data.tasks && !data.breaks)) {
                sessionStorage.removeItem('weeklyDataOptimistic');
              } else {
                sessionStorage.setItem('weeklyDataOptimistic', JSON.stringify(data));
              }
            }
          } catch (e) {
            // If any error, just remove the whole optimistic cache
            try { sessionStorage.removeItem('weeklyDataOptimistic'); } catch (e2) { }
          }
        }
      } catch (e) {
        // non-fatal
        console.warn('Failed to fetch raw lists for counts', e);
      }
    } catch (err) {
      // Soft-fail network errors to avoid noisy console output when offline or backend is down.
      try {
        const last = lastFetchFailedAt.current || 0;
        const now = Date.now();
        const isNetworkError = err && err.name === 'TypeError';
        // If offline, show a concise warn once per 30s. For other errors, log once per 5s.
        const minInterval = isNetworkError ? 30_000 : 5_000;
        if (now - last > minInterval) {
          if (!navigator.onLine) {
            console.warn('WeeklyDataContext: offline or cannot reach backend (fetch failed)');
          } else if (isNetworkError) {
            console.warn('WeeklyDataContext: network error while fetching weekly data');
          } else {
            console.error('WeeklyDataContext: failed to fetch weekly data', err);
          }
          lastFetchFailedAt.current = now;
        } else {
          // quiet no-op to avoid spamming
        }
      } catch (e) {
        // swallow any logging errors
      }
      // keep state as-is (do not clear) so optimistic updates still show
    }
  }, []);

  // Fetch user stats for profile card
  const fetchUserStats = useCallback(async () => {
    try {
      const headers = {};
      const token = localStorage.getItem("token");
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${API_URL}/api/dashboard/user-stats`, {
        method: "GET",
        credentials: "include",
        headers,
      });

      if (!res.ok) {
        return; // Silently fail
      }

      const data = await res.json();
      setUserStats(data);

      // Notify TaskTimerContext if there's an active task
      if (data.currentTaskInProgress) {
        ('[WeeklyData] 📊 Dispatching userStatsUpdated with active task:', data.currentTaskInProgress.taskId);
        try {
          window.dispatchEvent(new CustomEvent('userStatsUpdated', {
            detail: { currentTaskInProgress: data.currentTaskInProgress }
          }));
        } catch (e) {
          console.warn('Failed to dispatch userStatsUpdated event', e);
        }
      }

      // Persist user stats to localStorage (USER-SPECIFIC)
      try {
        const userId = localStorage.getItem('userId');
        if (userId) {
          localStorage.setItem(`userStats_${userId}`, JSON.stringify({
            ...data,
            timestamp: Date.now(),
            userId: userId
          }));
          ('[WeeklyData] Persisted user stats for user:', userId);
        }

        // Backward compatibility
        localStorage.setItem('userStatsPersisted', JSON.stringify({
          ...data,
          timestamp: Date.now()
        }));
      } catch (e) {
        console.warn('Failed to persist user stats', e);
      }
    } catch (err) {
      // Silently fail to avoid console spam
      console.warn('Failed to fetch user stats', err);
    }
  }, []);

  // ref used to rate-limit error logs in fetchWeeklyData
  const lastFetchFailedAt = useRef(0);

  // optimistic helpers: update local arrays quickly while refresh() syncs with server
  const optimisticAddTask = useCallback((date) => {
    try {
      const taskDate = date || new Date();
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      ('[optimisticAddTask] Task added at:', taskDate.toLocaleString());
      ('[optimisticAddTask] Hour:', taskDate.getHours(), 'Minutes:', taskDate.getMinutes());

      // If task is for today, update half-hour blocks (8pm-10pm)
      if (taskDate.toDateString() === today.toDateString()) {
        const hour = taskDate.getHours();
        const minutes = taskDate.getMinutes();

        ('[optimisticAddTask] Task is for today, checking time slot...');

        // 8pm to 10pm in half-hour intervals
        if (hour === 20 || hour === 21) {
          ('[optimisticAddTask] Task is in 8pm-10pm window!');

          setTasksPerHourToday(prev => {
            const updated = [...prev];
            let slotIndex = -1;
            let slotLabel = '';

            if (hour === 20 && minutes < 30) {
              slotIndex = 0;
              slotLabel = '8:00-8:30pm';
            } else if (hour === 20 && minutes >= 30) {
              slotIndex = 1;
              slotLabel = '8:30-9:00pm';
            } else if (hour === 21 && minutes < 30) {
              slotIndex = 2;
              slotLabel = '9:00-9:30pm';
            } else if (hour === 21 && minutes >= 30) {
              slotIndex = 3;
              slotLabel = '9:30-10:00pm';
            }

            if (slotIndex >= 0) {
              updated[slotIndex] = true;

              // Calculate current streak (from end backwards)
              let currentStreak = 0;
              for (let i = 3; i >= 0; i--) {
                if (updated[i]) currentStreak++;
                else break;
              }

              // Calculate longest consecutive sequence
              let longestStreak = 0;
              let tempStreak = 0;
              for (let i = 0; i < 4; i++) {
                if (updated[i]) {
                  tempStreak++;
                  longestStreak = Math.max(longestStreak, tempStreak);
                } else {
                  tempStreak = 0;
                }
              }

              (`[WeeklyDataContext] ✅ Half-hour slot ${slotLabel} marked (index ${slotIndex})`);
              (`[WeeklyDataContext] Previous blocks:`, prev);
              (`[WeeklyDataContext] Updated blocks:`, updated);
              (`[WeeklyDataContext] Current streak: ${currentStreak}, Longest: ${longestStreak}`);

              // Update streak states immediately (outside of setState to avoid stale closure)
              setTimeout(() => {
                setHourCurrentStreak(currentStreak);
                setHourLongestStreak(prevLongest => {
                  const newLongest = Math.max(prevLongest, longestStreak);
                  if (newLongest > prevLongest) {
                    localStorage.setItem('hourLongestStreak', newLongest.toString());
                    (`[WeeklyDataContext] 🏆 New longest hour streak: ${newLongest}`);
                  }
                  return newLongest;
                });
              }, 0);

              // Save to sessionStorage for immediate persistence
              try {
                sessionStorage.setItem('tasksPerHourToday', JSON.stringify(updated));
                ('[WeeklyDataContext] Saved to sessionStorage:', updated);
              } catch (e) {
                console.error('Failed to save to sessionStorage', e);
              }

              // Trigger optimistic UI update
              try {
                setLastOptimistic({ type: 'task', idx: slotIndex, ts: Date.now() });
                setTimeout(() => setLastOptimistic(null), 1200);
              } catch (e) {
                console.error('Failed to set lastOptimistic', e);
              }

              return updated;
            }

            ('[WeeklyDataContext] ⚠️ No valid slot index found');
            return updated;
          });
        } else {
          (`[optimisticAddTask] Task at ${hour}:${minutes} is outside 8pm-10pm window`);
        }
      } else {
        ('[optimisticAddTask] Task is not for today');
      }

      const start = new Date();
      start.setHours(0, 0, 0, 0);
      start.setDate(start.getDate() - 6);
      const key = dayKey(taskDate);
      let idx = -1;
      for (let i = 0; i < 7; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        if (dayKey(d) === key) {
          idx = i;
          break;
        }
      }
      if (idx < 0) return;

      // Increment task count when a new task is added (immediate feedback)
      // Tasks are counted on creation now, separate from completion tracking
      setTasksPerDay((prev) => {
        const arr = prev ? [...prev] : Array(7).fill(0);
        while (arr.length < 7) arr.push(0);
        arr[idx] = (arr[idx] || 0) + 1;

        // Save to sessionStorage for persistence across navigation
        try {
          const stored = sessionStorage.getItem('weeklyDataOptimistic') || '{}';
          const data = JSON.parse(stored);
          const currentMoodCounts = moodCountsPerDay && moodCountsPerDay.length === 7 ? moodCountsPerDay : Array(7).fill(0);
          sessionStorage.setItem('weeklyDataOptimistic', JSON.stringify({
            ...data,
            tasks: arr,
            moodCounts: currentMoodCounts,
            timestamp: Date.now()
          }));
        } catch (e) { console.warn('Failed to save optimistic task addition', e); }

        // Also save to persistent localStorage with all graph data (USER-SPECIFIC)
        try {
          const userId = localStorage.getItem('userId');
          const currentBreaks = breaksPerDay && breaksPerDay.length === 7 ? breaksPerDay : Array(7).fill(0);
          const currentMoods = moodAvgPerDay && moodAvgPerDay.length === 7 ? moodAvgPerDay : Array(7).fill(null);
          const weeklyData = {
            tasks: arr,
            breaks: currentBreaks,
            moods: currentMoods,
            moodCounts: moodCountsPerDay || Array(7).fill(0),
            labels: buildLast7DayLabels(),
            timestamp: Date.now(),
            dateKey: dayKey(new Date()),
            userId: userId
          };

          // User-specific storage
          if (userId) {
            localStorage.setItem(`weeklyData_${userId}`, JSON.stringify(weeklyData));
          }

          // Backward compatibility
          localStorage.setItem('weeklyDataPersisted', JSON.stringify(weeklyData));
        } catch (e) { console.warn('Failed to persist task addition', e); }

        ('[WeeklyDataContext] ✅ Task added - incremented count at index', idx, '- New counts:', arr);
        return arr;
      });

      try { setLastOptimistic({ type: 'task', idx, ts: Date.now() }); setTimeout(() => setLastOptimistic(null), 1200); } catch (e) { }
      return;
    } catch (e) {
      console.error('optimisticAddTask error', e);
    }
  }, [fetchUserStats]);

  const optimisticAddBreak = useCallback((date, opts) => {
    try {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      start.setDate(start.getDate() - 6);
      const key = dayKey(date || new Date());
      let idx = -1;
      for (let i = 0; i < 7; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        if (dayKey(d) === key) {
          idx = i;
          break;
        }
      }
      if (idx < 0) return;
      // Count each break as 1 (not weighted)
      setBreaksPerDay((prev) => {
        const arr = prev ? [...prev] : Array(7).fill(0);
        while (arr.length < 7) arr.push(0);
        arr[idx] = (arr[idx] || 0) + 1;
        // Save to sessionStorage for persistence across navigation
        try {
          const stored = sessionStorage.getItem('weeklyDataOptimistic') || '{}';
          const data = JSON.parse(stored);
          const currentMoodCounts = moodCountsPerDay && moodCountsPerDay.length === 7 ? moodCountsPerDay : Array(7).fill(0);
          sessionStorage.setItem('weeklyDataOptimistic', JSON.stringify({
            ...data,
            breaks: arr,
            moodCounts: currentMoodCounts,
            timestamp: Date.now()
          }));
        } catch (e) { console.warn('Failed to save optimistic break data', e); }

        // Also update persisted localStorage (USER-SPECIFIC)
        try {
          const userId = localStorage.getItem('userId');
          const currentTasks = tasksPerDay && tasksPerDay.length === 7 ? tasksPerDay : Array(7).fill(0);
          const currentMoods = moodAvgPerDay && moodAvgPerDay.length === 7 ? moodAvgPerDay : Array(7).fill(null);
          const weeklyData = {
            tasks: currentTasks,
            breaks: arr,
            moods: currentMoods,
            moodCounts: moodCountsPerDay || Array(7).fill(0),
            labels: buildLast7DayLabels(),
            timestamp: Date.now(),
            dateKey: dayKey(new Date()),
            userId: userId
          };

          // User-specific storage
          if (userId) {
            localStorage.setItem(`weeklyData_${userId}`, JSON.stringify(weeklyData));
          }

          // Backward compatibility
          localStorage.setItem('weeklyDataPersisted', JSON.stringify(weeklyData));
        } catch (e) { console.warn('Failed to save persisted break data', e); }

        return arr;
      });
      // Breaks no longer affect streaks (streaks are task-based only)
      try { setLastOptimistic({ type: 'break', idx, ts: Date.now() }); setTimeout(() => setLastOptimistic(null), 1200); } catch (e) { }
      // Trigger user stats refresh immediately
      fetchUserStats();
    } catch (e) {
      console.error('optimisticAddBreak error', e);
    }
  }, [fetchUserStats]);

  // Task completion tracking (no longer increments count since tasks are counted on creation)
  const optimisticCompleteTask = useCallback((completionDate) => {
    try {
      // Task completion now just refreshes stats - counting is done on task creation
      ('[WeeklyDataContext] ✅ Task completed - refreshing stats (task was already counted on creation)');

      try { setLastOptimistic({ type: 'task', ts: Date.now() }); setTimeout(() => setLastOptimistic(null), 1200); } catch (e) { }

      // Trigger user stats refresh immediately to update completion tracking
      fetchUserStats();
    } catch (e) {
      console.error('optimisticCompleteTask error', e);
    }
  }, [fetchUserStats]);

  const optimisticAddMood = useCallback((moodValue, date) => {
    try {
      // Simply sync with backend after a mood is added
      // The backend will have the new mood, so we just need to fetch and update counts
      ('[WeeklyDataContext] 📝 Mood added - scheduling sync with backend');

      // Schedule sync after a short delay to allow backend to process the new mood
      setTimeout(() => {
        fetchWeeklyData();
      }, 300);
    } catch (e) {
      console.error('optimisticAddMood error', e);
    }
  }, [fetchWeeklyData]);

  // Decrement mood count when a mood is deleted
  // Sync mood counts from actual moods fetched from backend
  // This recalculates moodCountsPerDay based on real moods available in the database
  const syncMoodCountsFromBackend = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const res = await fetch(`${API_URL}/mood`, {
        credentials: 'include',
        headers
      });

      if (!res.ok) {
        console.warn('[WeeklyDataContext] Failed to fetch moods for sync:', res.status);
        return;
      }

      const moods = await res.json();
      ('[WeeklyDataContext] 📊 Fetched', moods.length, 'moods for count sync');

      // Recalculate mood counts for last 7 days
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      start.setDate(start.getDate() - 6);

      const newMoodCounts = Array(7).fill(0);

      moods.forEach((mood) => {
        const moodDate = new Date(mood.timeStamp || mood.timestamp || mood.createdAt);
        const key = dayKey(moodDate);

        // Find which day index this mood belongs to
        for (let i = 0; i < 7; i++) {
          const d = new Date(start);
          d.setDate(start.getDate() + i);
          if (dayKey(d) === key) {
            newMoodCounts[i]++;
            break;
          }
        }
      });

      ('[WeeklyDataContext] 📊 Synced mood counts from backend:', newMoodCounts);
      setMoodCountsPerDay(newMoodCounts);

      // Also save to localStorage for persistence
      try {
        const userId = localStorage.getItem('userId');
        const existingData = JSON.parse(localStorage.getItem(`weeklyData_${userId}`) || '{}');
        localStorage.setItem(`weeklyData_${userId}`, JSON.stringify({
          ...existingData,
          moodCounts: newMoodCounts,
          timestamp: Date.now()
        }));
      } catch (e) {
        console.warn('Failed to save synced mood counts to localStorage', e);
      }
    } catch (e) {
      console.error('Error syncing mood counts from backend:', e);
    }
  }, []);

  useEffect(() => {
    ('[WeeklyDataContext] tasksPerHourToday updated:', tasksPerHourToday);
  }, [tasksPerHourToday]);

  useEffect(() => {
    // Initialize longest streak from user-specific localStorage on mount
    try {
      const userId = localStorage.getItem('userId');
      const userSpecificKey = userId ? `savedLongestStreak_${userId}` : 'savedLongestStreak';
      const saved = parseInt(localStorage.getItem(userSpecificKey) || '0');

      if (saved > 0) {
        setLongestStreak(saved);
        setSavedLongestStreak(saved);
        (`[WeeklyData] 🏆 Initialized longest streak: ${saved} days (user: ${userId || 'unknown'})`);
      }
    } catch (e) {
      console.warn('[WeeklyData] Failed to initialize longest streak', e);
    }

    // IMMEDIATE restoration on page load (before API calls)
    try {
      const userId = localStorage.getItem('userId');
      const token = localStorage.getItem('token');

      // Clear old cached data - force fresh fetch with new date labels
      const CACHE_VERSION = 'v4_2025-12-05_fixed';
      const currentVersion = localStorage.getItem('weeklyDataCacheVersion');

      if (currentVersion !== CACHE_VERSION) {
        ('[WeeklyData] 🔄 Clearing old cached data, version changed to include dates');
        // Clear all user-specific weekly data and session storage
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('weeklyData_') || key === 'weeklyDataPersisted') {
            localStorage.removeItem(key);
          }
        });
        sessionStorage.removeItem('weeklyDataOptimistic');
        localStorage.setItem('weeklyDataCacheVersion', CACHE_VERSION);
        ('[WeeklyData] ✅ Cache cleared - will fetch fresh data with proper date labels');
      }

      if (userId && token) {
        ('[WeeklyData] 🔄 Will fetch fresh data for user:', userId);

        // Restore user-specific stats (including active task)
        const userStatsData = localStorage.getItem(`userStats_${userId}`);
        if (userStatsData) {
          const stats = JSON.parse(userStatsData);
          const age = Date.now() - (stats.timestamp || 0);

          // Apply if less than 24 hours old
          if (age < 86400000) {
            ('[WeeklyData] ✅ Restoring user stats from localStorage (age: ' + Math.round(age / 60000) + ' min)');

            // Remove timestamp before setting
            const { timestamp, userId: storedUserId, ...cleanStats } = stats;
            setUserStats(cleanStats);

            // Log if there's an active task
            if (cleanStats.currentTaskInProgress) {
              ('[WeeklyData] 📋 Active task restored:', cleanStats.currentTaskInProgress.taskId);
            }
          } else {
            ('[WeeklyData] Stats too old, will fetch fresh');
            localStorage.removeItem(`userStats_${userId}`);
          }
        }
      } else {
        ('[WeeklyData] User not logged in, skipping restoration');
      }
    } catch (e) {
      console.warn('[WeeklyData] Failed to restore data on mount:', e);
    }

    // Load optimistic updates from sessionStorage on mount (short-term cache)
    try {
      const stored = sessionStorage.getItem('weeklyDataOptimistic');
      if (stored) {
        const { tasks, breaks, moods, moodCounts, timestamp } = JSON.parse(stored);
        const age = Date.now() - timestamp;
        // Only apply if less than 30 seconds old
        if (age < 30000) {
          if (tasks && Array.isArray(tasks)) setTasksPerDay(tasks);
          if (breaks && Array.isArray(breaks)) setBreaksPerDay(breaks);
          if (moods && Array.isArray(moods)) setMoodAvgPerDay(moods);
          if (moodCounts && Array.isArray(moodCounts)) {
            setMoodCountsPerDay(moodCounts);
            ('[WeeklyDataContext] Restored mood counts from sessionStorage:', moodCounts);
          }
          ('Restored optimistic updates from sessionStorage');
        } else {
          sessionStorage.removeItem('weeklyDataOptimistic');
        }
      }
    } catch (e) {
      console.warn('Failed to restore optimistic data', e);
    }

    // Note: Data restoration moved to the top of this useEffect for immediate loading

    fetchWeeklyData();
    fetchUserStats(); // Also fetch user stats on mount

    // Set up polling - poll more frequently when task is in progress
    const pollIntervalId = setInterval(() => {
      fetchWeeklyData();
      fetchUserStats(); // Poll user stats for real-time task progress
    }, 5000); // Poll every 5 seconds for responsive updates

    const handler = (ev) => {
      // If event has detail, use optimistic helpers; otherwise do a refresh (legacy)
      try {
        const d = ev && ev.detail;
        if (!d) {
          fetchWeeklyData();
          fetchUserStats();
          return;
        }
        // ignore events emitted by components that already applied optimistic updates
        if (d.source === 'ctx') {
          // Do not immediately reconcile; the originating component will call refresh on success,
          // and periodic polling will catch up otherwise. This prevents overriding optimistic UI.
          return;
        }
        if (d.type === 'task') optimisticAddTask(d.date);
        else if (d.type === 'break') optimisticAddBreak(d.date, { duration: d.duration });
        else if (d.type === 'mood') optimisticAddMood(d.moodValue, d.date);
        // Also trigger a background fetch to reconcile
        setTimeout(() => {
          fetchWeeklyData();
          fetchUserStats();
        }, 500); // Faster refresh after user action
      } catch (e) {
        console.warn('weeklyDataUpdated handler error', e);
        fetchWeeklyData();
        fetchUserStats();
      }
    };
    window.addEventListener("weeklyDataUpdated", handler);

    // Listen for user login events to restore graph data and active tasks
    const handleUserLogin = (ev) => {
      ('[WeeklyData] 🔑 User logged in, restoring data');

      // Immediately try to restore from localStorage
      try {
        const userId = localStorage.getItem('userId');
        if (userId) {
          // Try to restore user-specific data
          const userWeeklyData = localStorage.getItem(`weeklyData_${userId}`);
          const userStats = localStorage.getItem(`userStats_${userId}`);

          if (userWeeklyData) {
            const data = JSON.parse(userWeeklyData);
            ('[WeeklyData] ✅ Restored weekly data for user:', userId);

            // Apply restored data immediately
            if (data.tasks && Array.isArray(data.tasks)) setTasksPerDay(data.tasks);
            if (data.breaks && Array.isArray(data.breaks)) setBreaksPerDay(data.breaks);
            if (data.moods && Array.isArray(data.moods)) setMoodAvgPerDay(data.moods);
            // Restore mood counts - CRITICAL for mood chart display
            if (data.moodCounts && Array.isArray(data.moodCounts)) {
              setMoodCountsPerDay(data.moodCounts);
              ('[WeeklyData] ✅ Restored mood counts:', data.moodCounts);
            }
            // Restore streak data - this shows ALL days with tasks (not just consecutive)
            if (data.streakData && Array.isArray(data.streakData)) setStreakData(data.streakData);
            if (typeof data.currentStreak === 'number') setCurrentStreak(data.currentStreak);
            if (typeof data.longestStreak === 'number') {
              setLongestStreak(data.longestStreak);
              setSavedLongestStreak(data.longestStreak);
            }
          }

          if (userStats) {
            const stats = JSON.parse(userStats);
            ('[WeeklyData] ✅ Restored user stats for user:', userId);
            setUserStats(stats);
          }
        }
      } catch (e) {
        console.warn('[WeeklyData] Failed to restore data on login:', e);
      }

      // Then fetch fresh data from server
      setTimeout(() => {
        fetchWeeklyData();
        fetchUserStats();
      }, 300); // Reduced delay for faster updates
    };
    window.addEventListener("userLoggedIn", handleUserLogin);

    // Listen for task creation events to immediately refresh and start timer
    const handleTaskCreated = (ev) => {
      ('[WeeklyData] 🆕 Task created - Triggering IMMEDIATE refresh');
      // Refresh immediately to pick up the new task and start timer
      fetchUserStats(); // Most important - starts the timer
      fetchWeeklyData(); // Updates graphs
    };
    window.addEventListener("taskCreated", handleTaskCreated);

    // Listen for task completion events to increment weekly task count
    const handleTaskCompleted = (ev) => {
      try {
        const { completionDate } = ev.detail;
        ('[WeeklyData] ✅ Task completed - Incrementing weekly count');
        optimisticCompleteTask(completionDate);
        // Schedule a refresh to confirm the server update
        setTimeout(() => {
          fetchWeeklyData();
          fetchUserStats();
        }, 1000);
      } catch (e) {
        console.warn('[WeeklyData] Failed to handle task completion', e);
      }
    };
    window.addEventListener("taskCompleted", handleTaskCompleted);

    // expose a manual refresh helper for debugging (call from console)
    try {
      window.refreshWeeklyData = fetchWeeklyData;
      window.refreshUserStats = fetchUserStats;
    } catch (e) { }

    return () => {
      if (pollIntervalId) clearInterval(pollIntervalId);
      window.removeEventListener("weeklyDataUpdated", handler);
      window.removeEventListener("userLoggedIn", handleUserLogin);
      window.removeEventListener("taskCreated", handleTaskCreated);
      window.removeEventListener("taskCompleted", handleTaskCompleted);
      try {
        if (window.refreshWeeklyData === fetchWeeklyData) delete window.refreshWeeklyData;
        if (window.refreshUserStats === fetchUserStats) delete window.refreshUserStats;
      } catch (e) { }
    };
  }, [fetchWeeklyData, fetchUserStats, optimisticAddTask, optimisticAddBreak, optimisticCompleteTask, optimisticAddMood]);

  return (
    <WeeklyDataContext.Provider
      value={{
        labels,
        tasksPerDay,
        breaksPerDay,
        moodAvgPerDay,
        currentStreak,
        longestStreak,
        streakData,
        refresh: fetchWeeklyData,
        refreshUserStats: fetchUserStats,
        optimisticAddTask,
        optimisticAddBreak,
        optimisticCompleteTask,
        optimisticAddMood,
        syncMoodCountsFromBackend,
        moodCountsPerDay,
        lastOptimistic,
        savedLongestStreak,
        userStats,
        tasksPerHourToday,
        hourCurrentStreak,
        hourLongestStreak,
      }}
    >
      {children}
    </WeeklyDataContext.Provider>
  );
};

export const useWeeklyData = () => {
  const ctx = useContext(WeeklyDataContext);
  if (!ctx) throw new Error("useWeeklyData must be used within WeeklyDataProvider");
  return ctx;
};

export default WeeklyDataContext;
