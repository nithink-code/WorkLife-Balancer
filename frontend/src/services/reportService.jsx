// Import React PDF components for PDF generation
import React from 'react';
import { pdf } from '@react-pdf/renderer';
import {
  WelcomeReportDocument,
  AnalyticsReportDocument,
  TestDocument,
  SimpleTestDocument
} from '../components/PDF/PDFDocuments.jsx';
import AuthUtils from '../utils/authUtils';
import API_BASE_URL from '../config/apiConfig';

// Verify React PDF is loaded
let isPDFLibraryLoaded = false;

try {
  if (typeof WelcomeReportDocument === 'function' && typeof pdf === 'function') {
    isPDFLibraryLoaded = true;
  } else {
    console.error('❌ React PDF library failed to load');
  }
} catch (error) {
  console.error('❌ Error testing React PDF:', error);
}

class ReportService {
  constructor() {
    this.API_URL = API_BASE_URL;
  }

  // Quick test to verify React PDF works
  async testDownload() {
    try {
      // Check if React PDF is available
      if (!isPDFLibraryLoaded) {
        console.error('❌ React PDF not available');
        return false;
      }

      // Generate PDF blob using imported TestDocument component
      const blob = await pdf(React.createElement(TestDocument)).toBlob();

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'react-pdf-test.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Test PDF execution completed
      return true;
    } catch (error) {
      console.error('❌ Test PDF failed:', error);
      console.error('❌ Error details:', {
        name: error.name,
        message: error.message
      });
      return false;
    }
  }

  // Reliable PDF download method using React PDF
  async downloadPDF(documentComponent, fileName) {

    if (!documentComponent) {
      console.error('❌ PDF document component is null');
      throw new Error('PDF document component is null or undefined');
    }

    if (!fileName) {
      console.error('❌ Filename is missing');
      throw new Error('File name is required');
    }

    try {
      // Generate PDF blob using React PDF
      const blob = await pdf(documentComponent).toBlob();

      // Validate PDF has content
      if (blob.size === 0) {
        throw new Error('PDF blob is empty - no content generated');
      }

      // Try multiple download methods for maximum compatibility
      let downloadSuccess = false;
      let lastError = null;

      // Method 1: Blob download with link click
      try {
        // Create download link
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.style.display = 'none';

        // Add to document temporarily
        document.body.appendChild(link);

        // Trigger download
        link.click();

        // Cleanup after short delay
        setTimeout(() => {
          try {
            if (document.body.contains(link)) {
              document.body.removeChild(link);
            }
            URL.revokeObjectURL(url);
          } catch (cleanupErr) {
            console.warn('⚠️ Cleanup error (non-critical):', cleanupErr.message);
          }
        }, 1500);

        downloadSuccess = true;
      } catch (blobErr) {
        console.error('❌ Blob download failed:', blobErr.message);
        lastError = blobErr;
      }

      // Method 2: Open blob URL in new window as fallback
      if (!downloadSuccess) {
        try {
          const url = URL.createObjectURL(blob);
          const newWindow = window.open(url, '_blank');

          if (newWindow) {
            ('✅ PDF opened in new window - user can save from there');
            downloadSuccess = true;
            // Clean up URL after delay
            setTimeout(() => URL.revokeObjectURL(url), 5000);
          } else {
            throw new Error('Pop-up blocked - please allow pop-ups for this site');
          }
        } catch (openErr) {
          console.error('❌ Window open failed:', openErr.message);
          lastError = openErr;
        }
      }

      if (!downloadSuccess) {
        const errorMsg = lastError ? lastError.message : 'Unknown download error';
        throw new Error(`All download methods failed: ${errorMsg}. Check browser settings.`);
      }

      return true;

    } catch (error) {
      console.error('❌ Critical download error:', error);
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack?.slice(0, 300)
      });
      throw error;
    }
  }

  // Test method to verify React PDF is working
  async testPDF() {
    try {
      if (!isPDFLibraryLoaded) {
        throw new Error('React PDF is not properly imported');
      }

      const fileName = `test-pdf-${Date.now()}.pdf`;

      // Use enhanced download helper with imported TestDocument component
      const success = await this.downloadPDF(React.createElement(TestDocument), fileName);

      return { success, fileName };
    } catch (error) {
      console.error('❌ PDF test failed:', error);
      throw error;
    }
  }

  // Get user name from localStorage or decode from token
  getUserName() {
    try {
      // Try to get from localStorage first
      const userName = localStorage.getItem('userName');
      if (userName) return userName;

      // Try to decode from token
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          return payload.name || payload.username || 'User';
        } catch (e) {
          console.warn('Could not decode token:', e);
        }
      }

      return 'User'; // Default fallback
    } catch (error) {
      console.warn('Error getting user name:', error);
      return 'User';
    }
  }

  // Generate personalized greeting based on time of day and user performance
  generateGreeting(userName, stats) {
    const hour = new Date().getHours();
    let timeGreeting = '';

    if (hour < 12) {
      timeGreeting = 'Good Morning';
    } else if (hour < 18) {
      timeGreeting = 'Good Afternoon';
    } else {
      timeGreeting = 'Good Evening';
    }

    // Add personalized performance message
    let performanceMsg = '';
    if (stats.totalTasks === 0 && stats.totalBreaks === 0) {
      performanceMsg = "Welcome to your work-life balance journey! We're excited to help you track your progress.";
    } else if (stats.completionRate > 80 && stats.weeklyConsistency > 70) {
      performanceMsg = "You're doing an outstanding job maintaining balance and productivity! Keep up the excellent work.";
    } else if (stats.completionRate > 60 || stats.weeklyConsistency > 50) {
      performanceMsg = "You're making great progress on your work-life balance journey. Keep building those healthy habits!";
    } else {
      performanceMsg = "Every step counts on your journey to better work-life balance. Let's work together to improve!";
    }

    return {
      greeting: `${timeGreeting}, ${userName}!`,
      message: performanceMsg
    };
  }

  // Helper method to refresh token if expired
  async refreshTokenIfNeeded() {
    try {
      const token = localStorage.getItem('token');
      if (!token) return null;

      const response = await fetch(`${this.API_URL}/auth/verify`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.token) {
          localStorage.setItem('token', data.token);
          ('🔄 Token refreshed successfully');
          return data.token;
        }
      } else if (response.status === 401 || response.status === 403) {
        console.warn('🚨 Token expired, user needs to sign in again');
        localStorage.removeItem('token');
        // Redirect to login or show sign-in prompt
        window.location.href = '/';
        return null;
      }
      return token;
    } catch (error) {
      console.error('❌ Token refresh failed:', error);
      return localStorage.getItem('token');
    }
  }

  // Fetch comprehensive report data from backend
  async fetchReportData() {
    try {
      // Try to refresh token first
      const token = await this.refreshTokenIfNeeded();
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Create fetch with timeout wrapper
      const fetchWithTimeout = async (url, options, timeout = 10000) => {
        try {
          const response = await Promise.race([
            fetch(url, options),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error(`Request timeout after ${timeout}ms for ${url}`)), timeout)
            )
          ]);
          (`📡 ${url} -> Status: ${response.status}`);
          return response;
        } catch (error) {
          console.error(`❌ ${url} -> Error:`, error.message);
          throw error;
        }
      };

      // Fetch all necessary data for the report with timeout protection
      // Quick test to see if backend is reachable
      try {
        const testResponse = await fetch(`${this.API_URL}/`, { method: 'HEAD' }).catch(() => null);
      } catch (e) {
        // Backend connectivity check failed, continue anyway
      }

      let responses;
      try {
        responses = await Promise.all([
          fetchWithTimeout(`${this.API_URL}/api/dashboard/weekly-data`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }).catch(err => {
            console.warn('⚠️ Weekly data fetch failed:', err.message);
            return { ok: false, status: 0 };
          }),
          fetchWithTimeout(`${this.API_URL}/api/dashboard/user-stats`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }).catch(err => {
            console.warn('⚠️ User stats fetch failed:', err.message);
            return { ok: false, status: 0 };
          }),
          fetchWithTimeout(`${this.API_URL}/tasks`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }).catch(err => {
            console.warn('⚠️ Tasks fetch failed:', err.message);
            return { ok: false, status: 0 };
          }),
          fetchWithTimeout(`${this.API_URL}/break`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }).catch(err => {
            console.warn('⚠️ Breaks fetch failed:', err.message);
            return { ok: false, status: 0 };
          }),
          fetchWithTimeout(`${this.API_URL}/mood`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }).catch(err => {
            console.warn('⚠️ Moods fetch failed:', err.message);
            return { ok: false, status: 0 };
          })
        ]);
        // All API requests completed
      } catch (error) {
        console.error('❌ API requests failed:', error);
        // Continue with empty data rather than failing completely
        responses = [
          { ok: false, status: 0 },
          { ok: false, status: 0 },
          { ok: false, status: 0 },
          { ok: false, status: 0 },
          { ok: false, status: 0 }
        ];
      }

      const [weeklyDataRes, userStatsRes, allTasksRes, allBreaksRes, allMoodsRes] = responses;

      // Check for failed requests - but don't fail entirely if some endpoints return errors
      ('🌐 API Response Status:', {
        weeklyData: weeklyDataRes.status,
        userStats: userStatsRes.status,
        tasks: allTasksRes.status,
        breaks: allBreaksRes.status,
        moods: allMoodsRes.status
      });

      // Parse responses, using empty arrays/objects as fallbacks
      let weeklyData = {};
      let userStats = {};
      let allTasks = [];
      let allBreaks = [];
      let allMoods = [];

      if (weeklyDataRes.ok) {
        try {
          weeklyData = await weeklyDataRes.json();
        } catch (e) {
          console.warn('⚠️ Failed to parse weekly data:', e);
        }
      } else {
        console.warn(`⚠️ Weekly data API returned ${weeklyDataRes.status}`);
      }

      if (userStatsRes.ok) {
        try {
          userStats = await userStatsRes.json();
        } catch (e) {
          console.warn('⚠️ Failed to parse user stats:', e);
        }
      } else {
        console.warn(`⚠️ User stats API returned ${userStatsRes.status}`);
      }

      if (allTasksRes.ok) {
        try {
          const tasksData = await allTasksRes.json();
          allTasks = tasksData.tasks || tasksData || [];
        } catch (e) {
          console.warn('⚠️ Failed to parse tasks:', e);
        }
      } else {
        console.warn(`⚠️ Tasks API returned ${allTasksRes.status}`);
      }

      if (allBreaksRes.ok) {
        try {
          const breaksData = await allBreaksRes.json();
          allBreaks = breaksData.breaks || breaksData || [];
        } catch (e) {
          console.warn('⚠️ Failed to parse breaks:', e);
        }
      } else {
        console.warn(`⚠️ Breaks API returned ${allBreaksRes.status}`);
      }

      if (allMoodsRes.ok) {
        try {
          const moodsData = await allMoodsRes.json();
          allMoods = moodsData.moods || moodsData || [];
        } catch (e) {
          console.warn('⚠️ Failed to parse moods:', e);
        }
      } else {
        console.warn(`⚠️ Moods API returned ${allMoodsRes.status}`);
      }

      ('📊 Fetched Data Summary:', {
        weeklyData: !!weeklyData,
        userStats: !!userStats,
        tasksCount: Array.isArray(allTasks) ? allTasks.length : 0,
        breaksCount: Array.isArray(allBreaks) ? allBreaks.length : 0,
        moodsCount: Array.isArray(allMoods) ? allMoods.length : 0
      });

      const result = {
        weeklyData: weeklyData || {},
        userStats: userStats || {},
        allTasks: Array.isArray(allTasks) ? allTasks : [],
        allBreaks: Array.isArray(allBreaks) ? allBreaks : [],
        allMoods: Array.isArray(allMoods) ? allMoods : []
      };

      ('✅ fetchReportData completed successfully');
      return result;

    } catch (error) {
      console.error('❌ Error fetching report data:', error);
      console.error('Error details:', {
        name: error.name,
        message: error.message
      });

      // Return empty data instead of throwing to allow partial report generation
      ('⚠️ Returning empty data due to fetch error');
      return {
        weeklyData: {},
        userStats: {},
        allTasks: [],
        allBreaks: [],
        allMoods: []
      };
    }
  }

  // Calculate comprehensive statistics
  calculateStats(data) {
    const { allTasks = [], allBreaks = [], allMoods = [], userStats = {} } = data;

    // Calculate total active days and task analysis
    const taskDates = new Set();
    let totalTaskDuration = 0;
    let completedTasks = 0;
    let pendingTasks = 0;

    (allTasks || []).forEach(task => {
      if (task.endTime || task.createdAt) {
        const date = new Date(task.endTime || task.createdAt);
        taskDates.add(date.toLocaleDateString());
      }

      // Calculate task duration (in minutes)
      if (task.duration) {
        totalTaskDuration += task.duration;
      } else if (task.startTime && task.endTime) {
        const start = new Date(task.startTime);
        const end = new Date(task.endTime);
        totalTaskDuration += Math.max(0, (end - start) / (1000 * 60));
      }

      if (task.completed || task.status === 'completed') {
        completedTasks++;
      } else {
        pendingTasks++;
      }
    });

    // Calculate break statistics with time analysis
    let totalBreakDuration = 0;
    const breaksByType = {};
    const breakDurationByType = {};

    (allBreaks || []).forEach(breakItem => {
      const type = breakItem.type || 'Other';
      const duration = breakItem.duration || 5; // Default 5 minutes

      breaksByType[type] = (breaksByType[type] || 0) + 1;
      breakDurationByType[type] = (breakDurationByType[type] || 0) + duration;
      totalBreakDuration += duration;
    });

    // Calculate productivity metrics
    const totalWorkMinutes = totalTaskDuration;
    const totalBreakMinutes = totalBreakDuration;
    const netWorkTime = Math.max(0, totalWorkMinutes - totalBreakMinutes);
    const breakToWorkRatio = totalWorkMinutes > 0 ? (totalBreakMinutes / totalWorkMinutes) * 100 : 0;

    // Calculate time periods
    const today = new Date();
    const last7Days = [];
    const last30Days = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      last7Days.push(date.toLocaleDateString());
    }

    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      last30Days.push(date.toLocaleDateString());
    }

    const activeDaysInWeek = last7Days.filter(date => taskDates.has(date)).length;
    const activeDaysInMonth = last30Days.filter(date => taskDates.has(date)).length;

    // Find first and last active days
    const sortedTaskDates = Array.from(taskDates).sort((a, b) => new Date(a) - new Date(b));
    const firstActiveDay = sortedTaskDates.length > 0 ? sortedTaskDates[0] : null;
    const lastActiveDay = sortedTaskDates.length > 0 ? sortedTaskDates[sortedTaskDates.length - 1] : null;

    // Calculate mood statistics
    const moodScores = (allMoods || []).map(mood => mood.rating || mood.score || mood.mood || 0);
    const averageMood = moodScores.length > 0
      ? moodScores.reduce((sum, score) => sum + score, 0) / moodScores.length
      : 0;

    const moodTrend = this.calculateMoodTrend(allMoods || []);
    const consistencyScore = taskDates.size > 0 ? (activeDaysInMonth / 30) * 100 : 0;

    return {
      // Basic metrics
      totalActiveDays: taskDates.size,
      activeDaysInWeek,
      activeDaysInMonth,
      firstActiveDay,
      lastActiveDay,

      // Task analysis
      totalTasks: (allTasks || []).length,
      completedTasks,
      pendingTasks,
      completionRate: (allTasks || []).length > 0 ? (completedTasks / (allTasks || []).length) * 100 : 0,

      // Time analysis
      totalWorkHours: Math.round(totalWorkMinutes / 60 * 100) / 100,
      totalBreakHours: Math.round(totalBreakMinutes / 60 * 100) / 100,
      netWorkHours: Math.round(netWorkTime / 60 * 100) / 100,
      breakToWorkRatio: Math.round(breakToWorkRatio * 100) / 100,

      // Break analysis
      totalBreaks: (allBreaks || []).length,
      breaksByType,
      breakDurationByType,
      averageBreakDuration: (allBreaks || []).length > 0 ? totalBreakDuration / (allBreaks || []).length : 0,

      // Wellness metrics
      averageMood: Math.round(averageMood * 100) / 100,
      moodTrend,
      moodEntries: (allMoods || []).length,

      // Performance metrics
      currentStreak: userStats.currentStreak || 0,
      longestStreak: userStats.longestStreak || 0,
      consistencyScore: Math.round(consistencyScore * 100) / 100
    };
  }

  // Calculate mood trend over time
  calculateMoodTrend(moodData) {
    if (moodData.length < 2) return 'insufficient_data';

    const sortedMoods = moodData.sort((a, b) => {
      const dateA = new Date(a.timeStamp || a.timestamp || a.createdAt);
      const dateB = new Date(b.timeStamp || b.timestamp || b.createdAt);
      return dateA - dateB;
    });

    const recent = sortedMoods.slice(-5);
    const older = sortedMoods.slice(0, Math.min(5, sortedMoods.length - 5));

    if (older.length === 0) return 'stable';

    const recentAvg = recent.reduce((sum, m) => sum + (m.rating || m.score || m.mood || 0), 0) / recent.length;
    const olderAvg = older.reduce((sum, m) => sum + (m.rating || m.score || m.mood || 0), 0) / older.length;

    const difference = recentAvg - olderAvg;

    if (difference > 0.5) return 'improving';
    if (difference < -0.5) return 'declining';
    return 'stable';
  }

  // Calculate peak productivity hours from tasks
  calculatePeakHours(tasks) {
    if (!tasks || tasks.length === 0) return 'Not enough data';

    const hourCounts = {};

    tasks.forEach(task => {
      if (task.startTime) {
        const date = new Date(task.startTime);
        const hour = date.getHours();
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      }
    });

    if (Object.keys(hourCounts).length === 0) return 'Not enough data';

    const sortedHours = Object.entries(hourCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3);

    if (sortedHours.length === 0) return 'Not enough data';

    const peakHoursList = sortedHours.map(([hour]) => {
      const h = parseInt(hour);
      const period = h >= 12 ? 'PM' : 'AM';
      const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
      return `${displayHour}${period}`;
    });

    return peakHoursList.join(', ');
  }

  // Calculate average focus time per task
  calculateAverageFocusTime(tasks) {
    if (!tasks || tasks.length === 0) return 0;

    const completedTasks = tasks.filter(task => task.completed && task.duration);

    if (completedTasks.length === 0) return 0;

    const totalDuration = completedTasks.reduce((sum, task) => sum + (task.duration || 0), 0);

    return Math.round(totalDuration / completedTasks.length);
  }

  // Generate comprehensive improvement suggestions based on stats
  // Calculate enhanced statistics with detailed weekly analysis and break adjustments
  calculateEnhancedStats(data) {
    const { allTasks = [], allBreaks = [], allMoods = [], userStats = {} } = data;

    // Get the base statistics first
    const baseStats = this.calculateStats(data);

    // Calculate detailed weekly activity pattern
    const today = new Date();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const weeklyActivity = {};

    // Initialize weekly activity tracker
    dayNames.forEach(day => {
      weeklyActivity[day] = {
        activeDays: 0,
        totalTasks: 0,
        totalBreaks: 0,
        totalWorkMinutes: 0,
        totalBreakMinutes: 0
      };
    });

    // Analyze tasks by day of week over the last 4 weeks
    const fourWeeksAgo = new Date(today);
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

    allTasks.forEach(task => {
      const taskDate = new Date(task.endTime || task.createdAt || task.startTime);
      if (taskDate >= fourWeeksAgo) {
        const dayName = dayNames[taskDate.getDay()];
        const duration = task.duration || 0;

        if (duration > 0 || task.completed) {
          weeklyActivity[dayName].activeDays++;
          weeklyActivity[dayName].totalTasks++;
          weeklyActivity[dayName].totalWorkMinutes += duration;
        }
      }
    });

    // Analyze breaks by day of week
    allBreaks.forEach(breakItem => {
      const breakDate = new Date(breakItem.timestamp || breakItem.createdAt);
      if (breakDate >= fourWeeksAgo) {
        const dayName = dayNames[breakDate.getDay()];
        const duration = breakItem.duration || 5;

        weeklyActivity[dayName].totalBreaks++;
        weeklyActivity[dayName].totalBreakMinutes += duration;
      }
    });

    // Calculate adjusted work time (total work time - break time)
    let totalAdjustedWorkMinutes = 0;
    let totalBreakDeduction = 0;

    Object.values(weeklyActivity).forEach(day => {
      const adjustedTime = Math.max(0, day.totalWorkMinutes - day.totalBreakMinutes);
      totalAdjustedWorkMinutes += adjustedTime;
      totalBreakDeduction += day.totalBreakMinutes;
    });

    // Calculate productivity efficiency
    const originalWorkMinutes = baseStats.totalWorkHours * 60;
    const breakDeductionPercentage = originalWorkMinutes > 0 ? (totalBreakDeduction / originalWorkMinutes) * 100 : 0;
    const productivityEfficiency = originalWorkMinutes > 0 ? (totalAdjustedWorkMinutes / originalWorkMinutes) * 100 : 0;

    // Find most and least active days
    const sortedDays = Object.entries(weeklyActivity)
      .sort(([, a], [, b]) => b.activeDays - a.activeDays);
    const mostActiveDay = sortedDays[0];
    const leastActiveDay = sortedDays[sortedDays.length - 1];

    // Calculate consistency metrics
    const activeDaysCount = Object.values(weeklyActivity)
      .filter(day => day.activeDays > 0).length;
    const weeklyConsistency = (activeDaysCount / 7) * 100;

    return {
      ...baseStats,
      // Enhanced weekly analysis
      weeklyActivity,
      mostActiveDay: mostActiveDay[0],
      mostActiveDayStats: mostActiveDay[1],
      leastActiveDay: leastActiveDay[0],
      leastActiveDayStats: leastActiveDay[1],
      weeklyConsistency: Math.round(weeklyConsistency * 100) / 100,

      // Adjusted time calculations
      originalWorkHours: Math.round(originalWorkMinutes / 60 * 100) / 100,
      totalBreakDeductionHours: Math.round(totalBreakDeduction / 60 * 100) / 100,
      adjustedWorkHours: Math.round(totalAdjustedWorkMinutes / 60 * 100) / 100,
      breakDeductionPercentage: Math.round(breakDeductionPercentage * 100) / 100,
      productivityEfficiency: Math.round(productivityEfficiency * 100) / 100,

      // Additional insights
      avgTasksPerActiveDay: baseStats.totalActiveDays > 0 ?
        Math.round((baseStats.totalTasks / baseStats.totalActiveDays) * 100) / 100 : 0,
      avgBreaksPerActiveDay: baseStats.totalActiveDays > 0 ?
        Math.round((baseStats.totalBreaks / baseStats.totalActiveDays) * 100) / 100 : 0,

      // PDF-specific metrics for display
      avgWorkSessions: baseStats.totalActiveDays > 0 ?
        Math.round((baseStats.totalTasks / baseStats.totalActiveDays) * 10) / 10 : 0,
      avgBreakDuration: baseStats.averageBreakDuration ?
        Math.round(baseStats.averageBreakDuration) : 0,

      // Additional detailed analytics
      peakHours: this.calculatePeakHours(allTasks),
      avgFocusTime: this.calculateAverageFocusTime(allTasks),
      bestDay: mostActiveDay[0]
    };
  }

  generateSuggestions(stats) {
    const suggestions = {
      workBalance: [],
      healthWellness: [],
      productivity: [],
      general: []
    };

    // Work-Life Balance Analysis
    if (stats.breakToWorkRatio < 10) {
      suggestions.workBalance.push("⚠️ You're taking very few breaks! Aim for at least 10-15% break time to maintain focus.");
      suggestions.workBalance.push("💡 Try the 50/10 rule: work for 50 minutes, then take a 10-minute break.");
    } else if (stats.breakToWorkRatio > 30) {
      suggestions.workBalance.push("⚠️ You might be taking too many breaks. Consider consolidating them for better focus.");
    } else {
      suggestions.workBalance.push("✅ Great break-to-work ratio! You're maintaining good balance.");
    }

    if (stats.totalWorkHours > 8 && stats.activeDaysInWeek > 5) {
      suggestions.workBalance.push("⚠️ You're working long hours consistently. Rest is crucial for productivity.");
      suggestions.workBalance.push("💡 Consider implementing 'no-work' time blocks to recharge.");
    }

    // Health & Wellness Analysis
    if (stats.averageMood < 2.5) {
      suggestions.healthWellness.push("🔴 Your mood scores indicate stress. Prioritize self-care activities.");
      suggestions.healthWellness.push("💚 Consider exercise, meditation, or hobbies that bring you joy.");
    } else if (stats.averageMood > 4) {
      suggestions.healthWellness.push("💚 Excellent mood scores! You're maintaining great mental wellness.");
    }

    if (stats.moodTrend === 'declining') {
      suggestions.healthWellness.push("📉 Your mood trend is declining. Consider recent changes affecting wellbeing.");
    } else if (stats.moodTrend === 'improving') {
      suggestions.healthWellness.push("📈 Your mood is improving! Keep up the positive changes.");
    }

    // Productivity Analysis
    if (stats.completionRate < 60) {
      suggestions.productivity.push("🎯 Try breaking large tasks into smaller, manageable chunks.");
      suggestions.productivity.push("⏰ Consider time-blocking or the Eisenhower Matrix for prioritization.");
    } else if (stats.completionRate > 90) {
      suggestions.productivity.push("🌟 Outstanding task completion rate! Excellently organized.");
    }

    if (stats.consistencyScore < 50) {
      suggestions.productivity.push("📅 Maintain more consistent daily activity. Small actions compound over time.");
    } else if (stats.consistencyScore > 80) {
      suggestions.productivity.push("🔥 Excellent consistency! You've built strong daily habits.");
    }

    // General Recommendations
    suggestions.general.push("🌟 Remember: Work-life balance is a journey, not a destination.");
    suggestions.general.push("📈 Keep tracking your activities for continuous improvement.");

    // Weekly challenge
    if (stats.breakToWorkRatio < 15) {
      suggestions.general.push("🎯 Weekly Challenge: Add one 10-minute mindfulness break daily.");
    } else if (stats.averageMood < 3.5) {
      suggestions.general.push("🎯 Weekly Challenge: Do one thing daily that makes you smile.");
    } else {
      suggestions.general.push("🎯 Weekly Challenge: Mentor someone in work-life balance.");
    }

    return suggestions;
  }

  // Generate detailed improvement messages based on enhanced analytics
  generateDetailedImprovements(stats) {
    const improvements = {
      priority: [],
      workPatterns: [],
      timeManagement: [],
      wellness: [],
      consistency: []
    };

    // Priority improvements (most critical issues)
    if (stats.breakDeductionPercentage > 50) {
      improvements.priority.push({
        title: 'Excessive Break Time Impact',
        message: `Your breaks are consuming ${stats.breakDeductionPercentage.toFixed(1)}% of your work time. Consider optimizing break frequency and duration.`,
        impact: 'High',
        suggestion: 'Implement structured break schedules like Pomodoro technique (25min work, 5min break)'
      });
    }

    if (stats.weeklyConsistency < 40) {
      improvements.priority.push({
        title: 'Low Weekly Consistency',
        message: `You're only active ${stats.weeklyConsistency.toFixed(1)}% of the week. Consistency is key to building sustainable habits.`,
        impact: 'High',
        suggestion: 'Start with just 15 minutes of focused work daily to build momentum'
      });
    }

    if (stats.averageMood < 2.5) {
      improvements.priority.push({
        title: 'Concerning Mood Patterns',
        message: `Your average mood score of ${stats.averageMood.toFixed(1)}/5 indicates potential stress or burnout.`,
        impact: 'Critical',
        suggestion: 'Consider consulting a wellness professional and implementing stress management techniques'
      });
    }

    // Work pattern improvements
    if (stats.mostActiveDay && stats.leastActiveDay) {
      const difference = stats.mostActiveDayStats.activeDays - stats.leastActiveDayStats.activeDays;
      if (difference > 2) {
        improvements.workPatterns.push({
          title: 'Uneven Weekly Distribution',
          message: `${stats.mostActiveDay} is your most active day while ${stats.leastActiveDay} sees minimal activity.`,
          suggestion: `Try to distribute workload more evenly by moving some ${stats.mostActiveDay} tasks to ${stats.leastActiveDay}`
        });
      } else if (stats.totalActiveDays > 0) {
        improvements.workPatterns.push({
          title: 'Balanced Weekly Activity',
          message: `Your work is fairly distributed across the week with ${stats.mostActiveDay} being your most active day.`,
          suggestion: 'Continue maintaining this balanced approach for sustainable productivity'
        });
      }
    }

    if (stats.avgTasksPerActiveDay > 8) {
      improvements.workPatterns.push({
        title: 'Task Overload Per Day',
        message: `You're averaging ${stats.avgTasksPerActiveDay} tasks per active day, which might lead to burnout.`,
        suggestion: 'Consider breaking larger tasks into smaller chunks or reducing daily task count'
      });
    } else if (stats.avgTasksPerActiveDay < 2 && stats.totalActiveDays > 3) {
      improvements.workPatterns.push({
        title: 'Low Task Engagement',
        message: `Only ${stats.avgTasksPerActiveDay} tasks per active day suggests potential underutilization.`,
        suggestion: 'Set daily goals to maintain steady progress and momentum'
      });
    } else if (stats.avgTasksPerActiveDay >= 2 && stats.avgTasksPerActiveDay <= 8) {
      improvements.workPatterns.push({
        title: 'Optimal Task Load',
        message: `Averaging ${stats.avgTasksPerActiveDay} tasks per active day is within a healthy, manageable range.`,
        suggestion: 'Maintain this sustainable pace while focusing on task quality and completion'
      });
    }

    // Add insight on task completion if low
    if (stats.completionRate < 50 && stats.totalTasks > 5) {
      improvements.workPatterns.push({
        title: 'Low Task Completion',
        message: `Only ${stats.completedTasks} of ${stats.totalTasks} tasks completed (${stats.completionRate.toFixed(1)}%).`,
        suggestion: 'Focus on completing existing tasks before adding new ones. Consider using the Pomodoro technique to maintain focus.'
      });
    } else if (stats.completionRate >= 80 && stats.totalTasks > 5) {
      improvements.workPatterns.push({
        title: 'Excellent Task Completion',
        message: `Outstanding! You've completed ${stats.completedTasks} of ${stats.totalTasks} tasks (${stats.completionRate.toFixed(1)}%).`,
        suggestion: 'Your task completion rate is excellent. Share your productivity strategies with others!'
      });
    }

    // Time management improvements
    if (stats.productivityEfficiency < 70) {
      improvements.timeManagement.push({
        title: 'Low Productivity Efficiency',
        message: `Your productivity efficiency is ${stats.productivityEfficiency.toFixed(1)}%, indicating significant time drain.`,
        suggestion: 'Review your break patterns and consider time-blocking techniques'
      });
    }

    if (stats.completionRate < 70) {
      improvements.timeManagement.push({
        title: 'Task Completion Challenges',
        message: `${stats.completionRate.toFixed(1)}% completion rate suggests difficulty finishing tasks.`,
        suggestion: 'Break tasks into smaller, more manageable pieces and set clearer deadlines'
      });
    }

    if (stats.adjustedWorkHours < 20 && stats.totalActiveDays > 10) {
      improvements.timeManagement.push({
        title: 'Low Effective Work Time',
        message: `Only ${stats.adjustedWorkHours} hours of effective work time across ${stats.totalActiveDays} active days.`,
        suggestion: 'Focus on quality over quantity - establish dedicated focus periods'
      });
    }

    // Wellness improvements
    if (stats.moodTrend === 'declining') {
      improvements.wellness.push({
        title: 'Declining Mood Trend',
        message: 'Your mood has been declining recently, which could impact overall performance.',
        suggestion: 'Identify stressors and implement regular wellness check-ins with yourself'
      });
    } else if (stats.moodTrend === 'improving') {
      improvements.wellness.push({
        title: 'Improving Mood Trend',
        message: 'Great news! Your mood has been improving, indicating positive lifestyle changes.',
        suggestion: 'Identify what\'s working well and continue those practices'
      });
    } else if (stats.moodTrend === 'stable' && stats.moodEntries > 5) {
      improvements.wellness.push({
        title: 'Stable Mood Pattern',
        message: `Your mood remains stable at an average of ${stats.averageMood.toFixed(1)}/5.`,
        suggestion: stats.averageMood >= 3.5 ? 'Your consistent positive mood is excellent. Keep up the good work!' : 'Consider implementing stress-reduction techniques to improve overall well-being'
      });
    }

    if (stats.avgBreaksPerActiveDay < 1 && stats.totalActiveDays > 3) {
      improvements.wellness.push({
        title: 'Insufficient Break Taking',
        message: `Only ${stats.avgBreaksPerActiveDay.toFixed(1)} breaks per active day may lead to fatigue and burnout.`,
        suggestion: 'Schedule regular breaks every 90 minutes to maintain energy and focus'
      });
    } else if (stats.avgBreaksPerActiveDay > 5) {
      improvements.wellness.push({
        title: 'Excessive Break Frequency',
        message: `${stats.avgBreaksPerActiveDay.toFixed(1)} breaks per active day might be disrupting deep work sessions.`,
        suggestion: 'Consolidate shorter breaks into fewer, more restorative longer breaks'
      });
    } else if (stats.avgBreaksPerActiveDay >= 1 && stats.avgBreaksPerActiveDay <= 5 && stats.totalActiveDays > 3) {
      improvements.wellness.push({
        title: 'Healthy Break Pattern',
        message: `Taking ${stats.avgBreaksPerActiveDay.toFixed(1)} breaks per active day is within a healthy range.`,
        suggestion: 'Continue this pattern of regular breaks to maintain energy and prevent burnout'
      });
    }

    // Add mood entry tracking encouragement
    if (stats.moodEntries < 7 && stats.totalActiveDays > 7) {
      improvements.wellness.push({
        title: 'Increase Mood Tracking',
        message: `You've logged ${stats.moodEntries} mood entries. More frequent tracking provides better insights.`,
        suggestion: 'Try logging your mood at least once daily to identify patterns and triggers'
      });
    } else if (stats.moodEntries >= stats.totalActiveDays * 0.7) {
      improvements.wellness.push({
        title: 'Consistent Mood Tracking',
        message: `Excellent! You've logged ${stats.moodEntries} mood entries across ${stats.totalActiveDays} active days.`,
        suggestion: 'Your consistent mood tracking is providing valuable insights. Keep it up!'
      });
    }

    // Consistency improvements
    if (stats.currentStreak < 3 && stats.totalActiveDays > 5) {
      improvements.consistency.push({
        title: 'Low Current Streak',
        message: `Current streak of ${stats.currentStreak} days is below your potential.`,
        suggestion: 'Focus on small daily wins to rebuild momentum and extend your streak'
      });
    } else if (stats.currentStreak >= 7) {
      improvements.consistency.push({
        title: 'Strong Active Streak',
        message: `Excellent! You've maintained a ${stats.currentStreak}-day streak.`,
        suggestion: 'You\'re building a powerful habit. Keep this momentum going!'
      });
    }

    const activeDayPercentage = stats.totalActiveDays > 0 ? (stats.totalActiveDays / 30) * 100 : 0;
    if (activeDayPercentage < 60 && stats.totalActiveDays > 5) {
      improvements.consistency.push({
        title: 'Inconsistent Daily Engagement',
        message: `Active only ${activeDayPercentage.toFixed(1)}% of days in the last month.`,
        suggestion: 'Set a minimum viable routine - even 10 minutes daily counts as progress'
      });
    } else if (activeDayPercentage >= 70) {
      improvements.consistency.push({
        title: 'Excellent Engagement',
        message: `You've been active on ${activeDayPercentage.toFixed(1)}% of days - that's outstanding!`,
        suggestion: 'Your commitment is impressive. This level of consistency leads to lasting results'
      });
    }

    // Add positive reinforcements for good performance
    if (stats.productivityEfficiency > 85) {
      improvements.workPatterns.push({
        title: 'Excellent Productivity',
        message: `Outstanding ${stats.productivityEfficiency.toFixed(1)}% efficiency rate!`,
        suggestion: 'Share your successful strategies with others and maintain this excellent balance'
      });
    } else if (stats.productivityEfficiency > 70 && stats.productivityEfficiency <= 85) {
      improvements.workPatterns.push({
        title: 'Strong Productivity',
        message: `Solid ${stats.productivityEfficiency.toFixed(1)}% efficiency rate shows good work habits.`,
        suggestion: 'You\'re on the right track. Fine-tune your routine for even better results'
      });
    }

    if (stats.weeklyConsistency > 80) {
      improvements.consistency.push({
        title: 'Strong Weekly Consistency',
        message: `Impressive ${stats.weeklyConsistency.toFixed(1)}% weekly consistency!`,
        suggestion: 'Your consistent habits are paying off. Consider mentoring others in building routines'
      });
    } else if (stats.weeklyConsistency >= 50 && stats.weeklyConsistency <= 80) {
      improvements.consistency.push({
        title: 'Moderate Weekly Consistency',
        message: `${stats.weeklyConsistency.toFixed(1)}% weekly consistency is a good start.`,
        suggestion: 'Try to increase your active days per week to reach 80%+ consistency for optimal results'
      });
    }

    // Add first-time user encouragement
    if (stats.totalActiveDays <= 3 && stats.totalTasks > 0) {
      improvements.consistency.push({
        title: 'Welcome! Great Start',
        message: 'You\'re just beginning your work-life balance journey. Every expert was once a beginner!',
        suggestion: 'Focus on building the habit of daily check-ins. Start small and build momentum gradually'
      });
    }

    return improvements;
  }

  // Main method to generate comprehensive detailed report
  async generateReport() {
    ('🚀 Starting comprehensive PDF report generation...');
    ('🔍 jsPDF available:', typeof jsPDF);

    try {
      // Check authentication first
      const token = localStorage.getItem('token');
      ('🔑 Token check:', !!token);

      if (!token) {
        ('🔓 No token - generating welcome report');
        return await this.generateWelcomeReport();
      }

      ('🔑 Token found - generating detailed report');

      // Fetch comprehensive data
      ('📡 Fetching data from backend...');
      let data;
      try {
        data = await this.fetchReportData();
        ('✅ Data fetched successfully:', {
          hasTasks: !!data.allTasks,
          tasksCount: data.allTasks?.length || 0,
          hasBreaks: !!data.allBreaks,
          breaksCount: data.allBreaks?.length || 0,
          hasMoods: !!data.allMoods,
          moodsCount: data.allMoods?.length || 0
        });
      } catch (fetchError) {
        console.error('❌ Data fetch failed:', fetchError);
        throw new Error(`Failed to fetch report data: ${fetchError.message}`);
      }

      ('🔢 Calculating statistics...');
      const stats = this.calculateStats(data);
      ('📊 Stats calculated:', {
        totalTasks: stats.totalTasks,
        totalBreaks: stats.totalBreaks,
        moodEntries: stats.moodEntries,
        completionRate: stats.completionRate
      });

      ('💡 Generating personalized suggestions...');
      const suggestions = this.generateSuggestions(stats);
      ('✅ Suggestions generated:', {
        workBalance: suggestions.workBalance?.length || 0,
        healthWellness: suggestions.healthWellness?.length || 0,
        productivity: suggestions.productivity?.length || 0,
        general: suggestions.general?.length || 0
      });

      // Create comprehensive PDF
      ('📄 Creating PDF document...');

      if (typeof jsPDF !== 'function') {
        throw new Error('jsPDF library not loaded. Please refresh the page and try again.');
      }

      const doc = new jsPDF();
      ('✅ PDF document created');

      // Check if autoTable is available
      if (typeof doc.autoTable !== 'function') {
        console.error('❌ autoTable is not available on jsPDF instance');
        throw new Error('jsPDF autoTable plugin not loaded. Please refresh the page.');
      }
      ('✅ autoTable plugin is available');

      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;

      // Header with title and branding
      doc.setFontSize(24);
      doc.setTextColor(31, 81, 255);
      doc.text('Work-Life Balance Report', 20, 25);

      // Decorative line
      doc.setLineWidth(1);
      doc.setDrawColor(31, 81, 255);
      doc.line(20, 30, 190, 30);

      // Date and period info
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      const now = new Date();
      doc.text(`Generated: ${now.toLocaleDateString()} at ${now.toLocaleTimeString()}`, 20, 40);
      doc.text(`Report Period: Last 7 days`, 20, 48);

      let currentY = 65;

      // Add data availability note if needed
      const hasData = stats.totalTasks > 0 || stats.totalBreaks > 0 || stats.moodEntries > 0;

      if (!hasData) {
        doc.setFontSize(12);
        doc.setTextColor(255, 152, 0);
        const noDataMsg = doc.splitTextToSize(
          '⚠️ Note: You haven\'t started tracking activities yet. Complete tasks, take breaks, and log moods to see detailed insights in your next report!',
          pageWidth - 40
        );
        doc.text(noDataMsg, 20, currentY);
        currentY += noDataMsg.length * 6 + 10;
      }

      // SECTION 1: Key Performance Overview
      ('📊 Adding Performance Overview section...');
      doc.setFontSize(16);
      doc.setTextColor(31, 81, 255);
      doc.text('📊 Performance Overview', 20, currentY);
      currentY += 10;

      const performanceData = [
        ['Task Completion Rate', `${stats.completionRate?.toFixed(1) || 0}%`],
        ['Work-Break Balance', `${stats.breakToWorkRatio?.toFixed(1) || 0}% break time`],
        ['Consistency Score', `${stats.consistencyScore?.toFixed(1) || 0}/100`],
        ['Average Mood Rating', `${stats.averageMood?.toFixed(1) || 0}/5.0`],
        ['Mood Trend', stats.moodTrend || 'No data']
      ];

      try {
        doc.autoTable({
          head: [['Metric', 'Your Score']],
          body: performanceData,
          startY: currentY,
          theme: 'grid',
          headStyles: { fillColor: [31, 81, 255], textColor: [255, 255, 255], fontStyle: 'bold' },
          bodyStyles: { fontSize: 10 },
          columnStyles: { 0: { fontStyle: 'bold' } },
          margin: { left: 20, right: 20 }
        });

        currentY = getTableEndY(20);
        ('✅ Performance Overview added');
      } catch (tableError) {
        console.error('❌ Error adding performance table:', tableError);
        currentY += 80; // Skip section if table fails
      }

      // SECTION 2: Detailed Activity Breakdown
      doc.setFontSize(16);
      doc.setTextColor(31, 81, 255);
      doc.text('📈 Activity Breakdown', 20, currentY);
      currentY += 10;

      const activityData = [
        ['Total Tasks Created', (stats.totalTasks || 0).toString()],
        ['Tasks Completed', (stats.completedTasks || 0).toString()],
        ['Tasks Pending', ((stats.totalTasks || 0) - (stats.completedTasks || 0)).toString()],
        ['Break Sessions Taken', (stats.totalBreaks || 0).toString()],
        ['Total Work Time', `${(stats.totalWorkHours || 0).toFixed(1)} hours`],
        ['Total Break Time', `${(stats.totalBreakHours || 0).toFixed(1)} hours`],
        ['Net Productive Time', `${(stats.netWorkHours || 0).toFixed(1)} hours`],
        ['Active Days This Week', `${stats.activeDaysInWeek || 0}/7 days`],
        ['Total Active Days', (stats.totalActiveDays || 0).toString()]
      ];

      doc.autoTable({
        head: [['Activity Type', 'This Period']],
        body: activityData,
        startY: currentY,
        theme: 'striped',
        headStyles: { fillColor: [52, 152, 219], textColor: [255, 255, 255] },
        bodyStyles: { fontSize: 10 },
        margin: { left: 20, right: 20 }
      });

      currentY = getTableEndY(20);

      // SECTION 3: Streak & Consistency Analysis
      doc.setFontSize(16);
      doc.setTextColor(31, 81, 255);
      doc.text('🔥 Consistency Analysis', 20, currentY);
      currentY += 10;

      const streakData = [
        ['Current Active Streak', `${stats.currentStreak || 0} days`],
        ['Longest Streak Achieved', `${stats.longestStreak || 0} days`],
        ['Weekly Consistency', `${stats.consistencyScore?.toFixed(1) || 0}%`],
        ['First Active Day', stats.firstActiveDay || 'Not available'],
        ['Most Recent Activity', stats.lastActiveDay || 'Not available']
      ];

      doc.autoTable({
        head: [['Consistency Metric', 'Status']],
        body: streakData,
        startY: currentY,
        theme: 'grid',
        headStyles: { fillColor: [46, 204, 113], textColor: [255, 255, 255] },
        bodyStyles: { fontSize: 10 },
        margin: { left: 20, right: 20 }
      });

      currentY = getTableEndY(20);

      // SECTION 4: Break Analysis (if available)
      if (stats.breaksByType && Object.keys(stats.breaksByType).length > 0) {
        if (currentY > pageHeight - 80) {
          doc.addPage();
          currentY = 30;
        }

        doc.setFontSize(16);
        doc.setTextColor(31, 81, 255);
        doc.text('☕ Break Analysis', 20, currentY);
        currentY += 10;

        const breakData = Object.entries(stats.breaksByType).map(([type, count]) => [
          type.charAt(0).toUpperCase() + type.slice(1),
          `${count} sessions`
        ]);

        doc.autoTable({
          head: [['Break Type', 'Sessions']],
          body: breakData,
          startY: currentY,
          theme: 'striped',
          headStyles: { fillColor: [231, 76, 60], textColor: [255, 255, 255] },
          bodyStyles: { fontSize: 10 },
          margin: { left: 20, right: 20 }
        });

        currentY = getTableEndY(20);
      }

      // SECTION 5: Personalized Recommendations
      if (currentY > pageHeight - 100) {
        doc.addPage();
        currentY = 30;
      }

      doc.setFontSize(16);
      doc.setTextColor(31, 81, 255);
      doc.text('💡 Personalized Recommendations', 20, currentY);
      currentY += 15;

      // Add categorized suggestions
      const suggestionCategories = [
        { title: '⚖️ Work-Life Balance', suggestions: suggestions.workBalance || [], color: [231, 76, 60] },
        { title: '💚 Health & Wellness', suggestions: suggestions.healthWellness || [], color: [46, 204, 113] },
        { title: '🚀 Productivity', suggestions: suggestions.productivity || [], color: [155, 89, 182] },
        { title: '🌟 General Guidance', suggestions: suggestions.general || [], color: [52, 152, 219] }
      ];

      suggestionCategories.forEach(category => {
        if (category.suggestions.length > 0) {
          if (currentY > pageHeight - 60) {
            doc.addPage();
            currentY = 30;
          }

          doc.setFontSize(14);
          doc.setTextColor(category.color[0], category.color[1], category.color[2]);
          doc.text(category.title, 25, currentY);
          currentY += 8;

          category.suggestions.forEach(suggestion => {
            if (currentY > pageHeight - 20) {
              doc.addPage();
              currentY = 30;
            }

            doc.setFontSize(10);
            doc.setTextColor(0, 0, 0);
            const lines = doc.splitTextToSize(suggestion, 160);
            doc.text(lines, 30, currentY);
            currentY += lines.length * 4 + 6;
          });

          currentY += 5;
        }
      });

      // Add footer with page numbers
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`Work-Life Balance Report - Page ${i} of ${pageCount}`, 20, 285);
        doc.text(`Generated by WorkLife Balancer App`, 140, 285);
      }

      // Save with timestamp
      const fileName = `WorkLife-Balance-Report-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}.pdf`;

      ('🎯 Initiating PDF download:', fileName);
      ('📄 PDF has', doc.internal.getNumberOfPages(), 'pages');
      ('📦 PDF doc object:', doc);
      ('📦 PDF doc.save function:', typeof doc.save);

      // Try download with multiple methods for maximum compatibility
      ('💾 Attempting PDF download...');
      ('📝 Filename:', fileName);
      ('📄 Document ready - pages:', doc.internal.getNumberOfPages());

      let downloadSuccess = false;

      // Method 1: Try doc.save() first (most common)
      try {
        ('🔄 Method 1: Trying doc.save()...');
        doc.save(fileName);
        ('✅ doc.save() executed!');
        downloadSuccess = true;
      } catch (saveError) {
        console.error('❌ doc.save() failed:', saveError);
      }

      // Method 2: Try blob method if doc.save() didn't work
      if (!downloadSuccess) {
        try {
          ('🔄 Method 2: Trying blob method...');
          const pdfBlob = doc.output('blob');
          const blobUrl = URL.createObjectURL(pdfBlob);

          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = fileName;
          link.style.display = 'none';

          document.body.appendChild(link);
          link.click();

          setTimeout(() => {
            document.body.removeChild(link);
            URL.revokeObjectURL(blobUrl);
          }, 100);

          ('✅ Blob download triggered!');
          downloadSuccess = true;
        } catch (blobError) {
          console.error('❌ Blob method failed:', blobError);
        }
      }

      // Method 3: Try data URI as last resort
      if (!downloadSuccess) {
        try {
          ('🔄 Method 3: Trying data URI method...');
          const pdfDataUri = doc.output('dataurlstring');

          const link = document.createElement('a');
          link.href = pdfDataUri;
          link.download = fileName;
          link.style.display = 'none';

          document.body.appendChild(link);
          link.click();

          setTimeout(() => {
            document.body.removeChild(link);
          }, 100);

          ('✅ Data URI download triggered!');
          downloadSuccess = true;
        } catch (uriError) {
          console.error('❌ Data URI method failed:', uriError);
        }
      }

      if (!downloadSuccess) {
        throw new Error('All download methods failed. Please check browser settings and allow downloads.');
      }

      ('✅ PDF download completed successfully!');
      ('🔍 Check your browser downloads folder for:', fileName);

      // Small delay to ensure download starts
      await new Promise(resolve => setTimeout(resolve, 100));

      return { success: true, fileName };

    } catch (error) {
      console.error('❌ Comprehensive PDF generation failed:', error);
      console.error('Error details:', error?.stack);
      console.error('Error name:', error?.name);
      console.error('Error message:', error?.message);
      throw error; // Re-throw the original error instead of wrapping it
    }
  }

  // Generate the comprehensive PDF report for authenticated users
  async generateFullReport() {
    try {
      ('🚀 Starting full PDF report generation...');
      // Fetch all necessary data
      const data = await this.fetchReportData();
      ('✅ Data fetched successfully');
      const stats = this.calculateStats(data);
      ('📈 Stats calculated:', stats);
      const suggestions = this.generateSuggestions(stats);
      ('💡 Suggestions generated:', suggestions.length);

      // Create PDF with enhanced layout
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;

      // Add title with logo effect
      doc.setFontSize(24);
      doc.setTextColor(31, 81, 255); // Blue color
      doc.text('Work-Life Balance Report', 20, 25);

      // Add decorative line
      doc.setLineWidth(1);
      doc.setDrawColor(31, 81, 255);
      doc.line(20, 30, 190, 30);

      // Add date and user info
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, 20, 40);
      doc.text(`Report Period: Last 7 days`, 20, 48);

      let currentY = 65;

      // SECTION 1: Key Performance Metrics
      doc.setFontSize(16);
      doc.setTextColor(31, 81, 255);
      doc.text('📊 Performance Overview', 20, currentY);
      currentY += 10;

      const keyMetrics = [
        ['Task Completion Rate', `${stats.completionRate.toFixed(1)}%`],
        ['Work-Break Balance', `${stats.breakToWorkRatio.toFixed(1)}% break time`],
        ['Consistency Score', `${stats.consistencyScore.toFixed(1)}/100`],
        ['Average Mood Rating', `${stats.averageMood.toFixed(1)}/5.0`],
        ['Mood Trend', stats.moodTrend]
      ];

      doc.autoTable({
        head: [['Key Metric', 'Your Score']],
        body: keyMetrics,
        startY: currentY,
        theme: 'grid',
        headStyles: { fillColor: [31, 81, 255], textColor: [255, 255, 255], fontStyle: 'bold' },
        bodyStyles: { fontSize: 10 },
        columnStyles: { 0: { fontStyle: 'bold' } },
        margin: { left: 20, right: 20 }
      });

      currentY = getTableEndY(20);

      // SECTION 2: Detailed Activity Breakdown
      doc.setFontSize(16);
      doc.setTextColor(31, 81, 255);
      doc.text('📈 Activity Breakdown', 20, currentY);
      currentY += 10;

      const activityData = [
        ['Total Tasks Created', stats.totalTasks.toString()],
        ['Tasks Completed', stats.completedTasks.toString()],
        ['Tasks Pending', (stats.totalTasks - stats.completedTasks).toString()],
        ['Break Sessions', stats.totalBreaks.toString()],
        ['Total Work Time', `${stats.totalWorkHours.toFixed(1)} hours`],
        ['Total Break Time', `${stats.totalBreakHours.toFixed(1)} hours`],
        ['Net Productive Time', `${stats.netWorkHours.toFixed(1)} hours`],
        ['Active Days This Week', `${stats.activeDaysInWeek}/7 days`]
      ];

      doc.autoTable({
        head: [['Activity Type', 'This Week']],
        body: activityData,
        startY: currentY,
        theme: 'striped',
        headStyles: { fillColor: [52, 152, 219], textColor: [255, 255, 255] },
        bodyStyles: { fontSize: 10 },
        margin: { left: 20, right: 20 }
      });

      currentY = getTableEndY(20);

      // SECTION 3: Streak & Consistency Analysis
      doc.setFontSize(16);
      doc.setTextColor(31, 81, 255);
      doc.text('🔥 Consistency Analysis', 20, currentY);
      currentY += 10;

      const consistencyData = [
        ['Current Active Streak', `${stats.currentStreak} days`],
        ['Longest Streak Achieved', `${stats.longestStreak} days`],
        ['Weekly Consistency', `${stats.consistencyScore.toFixed(1)}%`],
        ['Improvement Potential', stats.consistencyScore < 70 ? 'High' : stats.consistencyScore < 85 ? 'Moderate' : 'Excellent']
      ];

      doc.autoTable({
        head: [['Consistency Metric', 'Status']],
        body: consistencyData,
        startY: currentY,
        theme: 'grid',
        headStyles: { fillColor: [46, 204, 113], textColor: [255, 255, 255] },
        bodyStyles: { fontSize: 10 },
        margin: { left: 20, right: 20 }
      });

      currentY = getTableEndY(25);

      // SECTION 4: Break Analysis (if data available)
      if (Object.keys(stats.breaksByType).length > 0) {
        doc.setFontSize(16);
        doc.setTextColor(31, 81, 255);
        doc.text('☕ Break Analysis', 20, currentY);
        currentY += 10;

        const breakData = Object.entries(stats.breaksByType).map(([type, count]) => [
          type.charAt(0).toUpperCase() + type.slice(1),
          `${count} sessions`
        ]);

        doc.autoTable({
          head: [['Break Type', 'Sessions']],
          body: breakData,
          startY: currentY,
          theme: 'striped',
          headStyles: { fillColor: [231, 76, 60], textColor: [255, 255, 255] },
          bodyStyles: { fontSize: 10 },
          margin: { left: 20, right: 20 }
        });

        currentY = getTableEndY(20);
      }

      // Check if we need a new page for recommendations
      if (currentY > pageHeight - 100) {
        doc.addPage();
        currentY = 30;
      }

      // SECTION 5: Personalized Recommendations
      doc.setFontSize(16);
      doc.setTextColor(31, 81, 255);
      doc.text('💡 Personalized Recommendations', 20, currentY);
      currentY += 10;

      // Work-Life Balance
      if (suggestions.workBalance.length > 0) {
        doc.setFontSize(14);
        doc.setTextColor(231, 76, 60); // Red
        doc.text('⚖️ Work-Life Balance', 25, currentY);
        currentY += 8;

        suggestions.workBalance.forEach((suggestion, index) => {
          if (currentY > 270) {
            doc.addPage();
            currentY = 30;
          }
          doc.setFontSize(10);
          doc.setTextColor(0, 0, 0);
          const lines = doc.splitTextToSize(suggestion, 160);
          doc.text(lines, 30, currentY);
          currentY += lines.length * 4 + 6;
        });
        currentY += 5;
      }

      // Health & Wellness
      if (suggestions.healthWellness.length > 0) {
        if (currentY > 250) {
          doc.addPage();
          currentY = 30;
        }
        doc.setFontSize(14);
        doc.setTextColor(46, 204, 113); // Green
        doc.text('💚 Health & Wellness', 25, currentY);
        currentY += 8;

        suggestions.healthWellness.forEach((suggestion, index) => {
          if (currentY > 270) {
            doc.addPage();
            currentY = 30;
          }
          doc.setFontSize(10);
          doc.setTextColor(0, 0, 0);
          const lines = doc.splitTextToSize(suggestion, 160);
          doc.text(lines, 30, currentY);
          currentY += lines.length * 4 + 6;
        });
        currentY += 5;
      }

      // Productivity
      if (suggestions.productivity.length > 0) {
        if (currentY > 250) {
          doc.addPage();
          currentY = 30;
        }
        doc.setFontSize(14);
        doc.setTextColor(155, 89, 182); // Purple
        doc.text('🚀 Productivity', 25, currentY);
        currentY += 8;

        suggestions.productivity.forEach((suggestion, index) => {
          if (currentY > 270) {
            doc.addPage();
            currentY = 30;
          }
          doc.setFontSize(10);
          doc.setTextColor(0, 0, 0);
          const lines = doc.splitTextToSize(suggestion, 160);
          doc.text(lines, 30, currentY);
          currentY += lines.length * 4 + 6;
        });
        currentY += 5;
      }

      // General Recommendations
      if (suggestions.general.length > 0) {
        if (currentY > 250) {
          doc.addPage();
          currentY = 30;
        }
        doc.setFontSize(14);
        doc.setTextColor(52, 152, 219); // Blue
        doc.text('🌟 General Guidance', 25, currentY);
        currentY += 8;

        suggestions.general.forEach((suggestion, index) => {
          if (currentY > 270) {
            doc.addPage();
            currentY = 30;
          }
          doc.setFontSize(10);
          doc.setTextColor(0, 0, 0);
          const lines = doc.splitTextToSize(suggestion, 160);
          doc.text(lines, 30, currentY);
          currentY += lines.length * 4 + 6;
        });
      }

      // Add footer with motivational message
      if (currentY > 250) {
        doc.addPage();
        currentY = 30;
      }

      currentY += 15;
      doc.setFontSize(16);
      doc.setTextColor(31, 81, 255);
      doc.text('🌟 Keep Up the Great Work!', pageWidth / 2, currentY, { align: 'center' });
      currentY += 10;

      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      const motivationalText = `Remember: Work-life balance is a journey, not a destination. Every step you take toward 
better balance contributes to your overall well-being and productivity. Stay consistent, be patient with yourself, 
and celebrate your progress along the way!`;
      const splitMotivational = doc.splitTextToSize(motivationalText, pageWidth - 40);
      doc.text(splitMotivational, pageWidth / 2, currentY, { align: 'center' });

      // Add page numbers and branding
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`Work-Life Balance Report - Page ${i} of ${pageCount}`, 20, 285);
        doc.text(`Generated by WorkLife Balancer App`, 140, 285);
      }

      // Save the PDF with enhanced filename
      const fileName = `WorkLife-Balance-Comprehensive-Report-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}.pdf`;

      ('🎯 Downloading comprehensive report:', fileName);
      ('📄 PDF document ready for download');
      ('📄 Document has', doc.internal.getNumberOfPages(), 'pages');

      // Download the PDF using the helper method
      const downloadSuccess = this.downloadPDF(doc, fileName);

      if (!downloadSuccess) {
        throw new Error('Failed to initiate download');
      }

      ('✅ PDF download initiated successfully!');
      ('📂 Check your Downloads folder for:', fileName);

      return { success: true, fileName };

    } catch (error) {
      console.error('❌ Error generating full PDF report:', error);
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  // Generate detailed analytics summary report
  async generateAnalyticsReport() {
    ('═══════════════════════════════════════════════════');
    ('📊 Starting Analytics Report Generation');
    ('═══════════════════════════════════════════════════');

    try {
      // Check authentication first
      const token = localStorage.getItem('token');
      ('🔐 Auth check:', token ? 'Token found ✓' : 'No token ✗');

      if (!token) {
        ('🔓 No token - generating welcome report instead');
        return await this.generateWelcomeReport();
      }

      // Fetch comprehensive data
      ('📡 Step 1/5: Fetching analytics data from backend...');
      let data;
      try {
        data = await this.fetchReportData();
        ('✅ Analytics data fetched successfully');
        ('📦 Data summary:', {
          tasks: data.allTasks?.length || 0,
          breaks: data.allBreaks?.length || 0,
          moods: data.allMoods?.length || 0,
          hasUserStats: !!data.userStats,
          hasWeeklyData: !!data.weeklyData
        });

        // Validate that we have some user data
        const hasAnyData = (data.allTasks?.length || 0) > 0 ||
          (data.allBreaks?.length || 0) > 0 ||
          (data.allMoods?.length || 0) > 0;

        if (!hasAnyData) {
          ('⚠️ No user activity data found - generating starter report');
        } else {
          ('✅ User has activity data - generating full report');
        }
      } catch (fetchError) {
        console.error('❌ Data fetch failed:', fetchError);
        // Don't throw - continue with empty data
        ('⚠️ Continuing with empty data to generate basic report');
        data = {
          weeklyData: {},
          userStats: {},
          allTasks: [],
          allBreaks: [],
          allMoods: []
        };
      }

      // Calculate enhanced statistics
      ('🔢 Step 2/5: Calculating enhanced analytics...');
      const stats = this.calculateEnhancedStats(data);
      ('✅ Stats calculated successfully');
      ('📊 Stats preview:', {
        totalTasks: stats.totalTasks,
        totalBreaks: stats.totalBreaks,
        moodEntries: stats.moodEntries,
        completionRate: stats.completionRate?.toFixed(1) + '%',
        totalActiveDays: stats.totalActiveDays,
        weeklyConsistency: stats.weeklyConsistency?.toFixed(1) + '%',
        productivityEfficiency: stats.productivityEfficiency?.toFixed(1) + '%'
      });

      // Validate stats object has required properties
      if (!stats || typeof stats !== 'object') {
        throw new Error('Statistics calculation failed - invalid stats object');
      }

      // Set default values for missing properties
      const validatedStats = {
        totalTasks: stats.totalTasks || 0,
        totalBreaks: stats.totalBreaks || 0,
        moodEntries: stats.moodEntries || 0,
        completionRate: stats.completionRate || 0,
        totalActiveDays: stats.totalActiveDays || 0,
        averageMood: stats.averageMood || 0,
        weeklyConsistency: stats.weeklyConsistency || 0,
        productivityEfficiency: stats.productivityEfficiency || 0,
        weeklyActivity: stats.weeklyActivity || {},
        ...stats
      };

      // Generate improvement suggestions
      ('💡 Step 3/5: Generating personalized improvement suggestions...');
      const improvements = this.generateDetailedImprovements(validatedStats);
      ('✅ Improvements generated successfully');
      ('💡 Suggestions summary:', {
        priority: improvements?.priority?.length || 0,
        workPatterns: improvements?.workPatterns?.length || 0,
        timeManagement: improvements?.timeManagement?.length || 0,
        wellness: improvements?.wellness?.length || 0,
        consistency: improvements?.consistency?.length || 0,
        total: (improvements?.priority?.length || 0) + (improvements?.workPatterns?.length || 0) +
          (improvements?.timeManagement?.length || 0) + (improvements?.wellness?.length || 0) +
          (improvements?.consistency?.length || 0)
      });

      // Validate improvements object
      const validatedImprovements = {
        priority: improvements?.priority || [],
        workPatterns: improvements?.workPatterns || [],
        timeManagement: improvements?.timeManagement || [],
        wellness: improvements?.wellness || [],
        consistency: improvements?.consistency || [],
        ...improvements
      };

      // Create PDF report using React PDF
      ('📄 Step 4/5: Creating PDF document...');

      // Verify React PDF is available first
      ('🔍 Checking React PDF availability...');
      if (!isPDFLibraryLoaded) {
        console.error('❌ React PDF not found');
        throw new Error('PDF library not loaded. Please refresh the page and try again.');
      }
      ('✅ React PDF is available');

      ('✅ React PDF core initialized successfully');
      ('📊 Creating report with stats:', {
        totalTasks: validatedStats.totalTasks,
        totalBreaks: validatedStats.totalBreaks,
        totalActiveDays: validatedStats.totalActiveDays,
        hasWeeklyActivity: !!validatedStats.weeklyActivity
      });

      // Create the React PDF document component
      try {
        ('📝 Generating PDF content with React PDF...');
        const reportDocument = React.createElement(AnalyticsReportDocument, {
          stats: validatedStats,
          improvements: validatedImprovements,
          reportData: data
        });
        ('✅ PDF document component created successfully');
      } catch (contentError) {
        console.error('❌ Error generating report content:', contentError);
        console.error('❌ Content error details:', {
          name: contentError.name,
          message: contentError.message,
          stack: contentError.stack?.slice(0, 400)
        });
        throw new Error(`Report content generation failed: ${contentError.message}`);
      }

      // Generate filename with current date
      const currentDate = new Date();
      const dateStr = currentDate.toISOString().split('T')[0];
      const fileName = `WorkLife-Analytics-Report-${dateStr}.pdf`;

      ('💾 Step 5/5: Downloading PDF...');
      ('📁 File name:', fileName);

      // Create the React PDF document component
      const reportDocument = React.createElement(AnalyticsReportDocument, {
        stats: validatedStats,
        improvements: validatedImprovements,
        reportData: data
      });

      // Use the enhanced downloadPDF helper for consistent behavior
      try {
        const downloadSuccess = await this.downloadPDF(reportDocument, fileName);

        if (!downloadSuccess) {
          throw new Error('Download initiation failed - please check browser settings');
        }

        ('✅ Download initiated successfully');
      } catch (downloadError) {
        console.error('❌ Download error:', downloadError);
        throw new Error(`Failed to download PDF: ${downloadError.message}`);
      }

      ('═══════════════════════════════════════════════════');
      ('✅ Report Generation Complete!');
      ('═══════════════════════════════════════════════════');
      ('📊 Report Summary:');
      ('  📁 File:', fileName);
      ('  📄 Pages: 2 (Multi-page report)');
      ('  📊 Tasks:', validatedStats.totalTasks);
      ('  ☕ Breaks:', validatedStats.totalBreaks);
      ('  😊 Moods:', validatedStats.moodEntries);
      ('  📅 Active Days:', validatedStats.totalActiveDays);
      ('  🎯 Consistency:', validatedStats.weeklyConsistency.toFixed(1) + '%');
      ('═══════════════════════════════════════════════════');

      return {
        success: true,
        fileName,
        stats: validatedStats,
        improvements: validatedImprovements
      };
    } catch (error) {
      ('═══════════════════════════════════════════════════');
      console.error('❌ REPORT GENERATION FAILED');
      ('═══════════════════════════════════════════════════');
      console.error('Error type:', error.name);
      console.error('Error message:', error.message);
      console.error('Stack trace:', error.stack?.slice(0, 500));
      ('═══════════════════════════════════════════════════');
      throw error;
    }
  }

  // Generate analytics report buffer for email using React PDF
  async generateAnalyticsReportBuffer() {
    ('═══════════════════════════════════════════════════');
    ('📧 Starting Analytics Report Buffer Generation for Email');
    ('═══════════════════════════════════════════════════');

    try {
      // Check if user is authenticated, but continue with fallback data if not
      const token = localStorage.getItem('token');
      ('🔐 Auth check:', token ? 'Token found ✓' : 'No token, using fallback data');

      let data = null;

      if (token) {
        // Try to fetch real data
        try {
          ('📡 Attempting to fetch real user data...');
          data = await this.fetchReportData();
          ('✅ Real data fetched successfully');
        } catch (error) {
          console.warn('⚠️ Failed to fetch real data, using fallback:', error.message);
          data = null;
        }
      }

      // If no data was fetched, create fallback data
      if (!data) {
        ('📊 Creating fallback report data for demo purposes...');
        data = {
          allTasks: [],
          allBreaks: [],
          allMoods: [],
          weeklyData: { labels: [], datasets: [] },
          userStats: { totalTasks: 0, completedTasks: 0, avgProductivity: 0 }
        };
      }

      ('✅ Analytics data prepared successfully');
      ('📊 Data summary: tasks=%d, breaks=%d, moods=%d',
        data.allTasks?.length || 0,
        data.allBreaks?.length || 0,
        data.allMoods?.length || 0);

      // Check if we have user activity data
      const hasAnyData = (data.allTasks?.length || 0) > 0 ||
        (data.allBreaks?.length || 0) > 0 ||
        (data.allMoods?.length || 0) > 0;

      if (!hasAnyData) {
        ('⚠️ No user activity data found - generating starter report');
      } else {
        ('✅ User has activity data - generating full report');
      }

      // Calculate enhanced statistics
      ('🔢 Step 2/5: Calculating enhanced analytics...');
      const stats = this.calculateEnhancedStats(data);
      ('✅ Stats calculated successfully');

      // Set default values for missing properties
      const validatedStats = {
        totalTasks: stats.totalTasks || 0,
        totalBreaks: stats.totalBreaks || 0,
        moodEntries: stats.moodEntries || 0,
        completionRate: stats.completionRate || 0,
        totalActiveDays: stats.totalActiveDays || 0,
        averageMood: stats.averageMood || 0,
        weeklyConsistency: stats.weeklyConsistency || 0,
        productivityEfficiency: stats.productivityEfficiency || 0,
        weeklyActivity: stats.weeklyActivity || {},
        ...stats
      };

      // Generate improvement suggestions
      ('💡 Step 3/5: Generating personalized improvement suggestions...');
      const improvements = this.generateDetailedImprovements(validatedStats);
      ('✅ Improvements generated successfully');

      // Validate improvements object
      const validatedImprovements = {
        priority: improvements?.priority || [],
        workPatterns: improvements?.workPatterns || [],
        timeManagement: improvements?.timeManagement || [],
        wellness: improvements?.wellness || [],
        consistency: improvements?.consistency || [],
        ...improvements
      };

      // Create PDF report using React PDF
      ('📄 Step 4/5: Creating PDF document...');

      // Verify React PDF is available first
      ('🔍 Checking React PDF availability...');
      if (!isPDFLibraryLoaded) {
        throw new Error('PDF library not loaded. Please refresh the page and try again.');
      }
      ('✅ React PDF is available');

      ('✅ React PDF core initialized successfully');

      // Create the React PDF document component
      try {
        ('📝 Generating PDF content...');
        const reportDocument = React.createElement(AnalyticsReportDocument, {
          stats: validatedStats,
          improvements: validatedImprovements,
          reportData: data
        });
        ('✅ PDF document component created successfully');
      } catch (contentError) {
        console.error('❌ Error generating report content:', contentError);
        throw new Error(`Report content generation failed: ${contentError.message}`);
      }

      // Generate filename with current date
      const currentDate = new Date();
      const dateStr = currentDate.toISOString().split('T')[0];
      const fileName = `WorkLife-Analytics-Report-${dateStr}.pdf`;

      ('📧 Step 5/5: Generating PDF buffer for email...');

      try {
        // Create the React PDF document component
        const reportDocument = React.createElement(AnalyticsReportDocument, {
          stats: validatedStats,
          improvements: validatedImprovements,
          reportData: data
        });

        // Get PDF as base64 string using React PDF
        const blob = await pdf(reportDocument).toBlob();
        const arrayBuffer = await blob.arrayBuffer();
        const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
        const pdfBuffer = `data:application/pdf;base64,${base64}`;

        ('✅ PDF buffer generated successfully');
        ('📊 Buffer size:', pdfBuffer.length, 'characters');

        ('═══════════════════════════════════════════════════');
        ('✅ Report Buffer Generation Complete!');
        ('═══════════════════════════════════════════════════');

        return {
          success: true,
          fileName,
          buffer: pdfBuffer,
          stats: validatedStats,
          improvements: validatedImprovements
        };
      } catch (bufferError) {
        console.error('❌ Buffer generation error:', bufferError);
        throw new Error(`Failed to generate PDF buffer: ${bufferError.message}`);
      }

    } catch (error) {
      ('═══════════════════════════════════════════════════');
      console.error('❌ REPORT BUFFER GENERATION FAILED');
      ('═══════════════════════════════════════════════════');
      console.error('Error type:', error.name);
      console.error('Error message:', error.message);
      ('═══════════════════════════════════════════════════');
      throw error;
    }
  }

  // Generate a simple test report for debugging using React PDF
  async generateTestReport() {
    try {
      ('🧪 Generating simple test PDF with React PDF...');

      const fileName = `Test-Report-${Date.now()}.pdf`;

      ('🎯 Downloading test report:', fileName);

      // Use the enhanced downloadPDF helper for consistent behavior with imported SimpleTestDocument
      const downloadSuccess = await this.downloadPDF(React.createElement(SimpleTestDocument), fileName);

      if (!downloadSuccess) {
        throw new Error('Failed to initiate download');
      }

      ('✅ Test PDF download initiated!');

      return { success: true, fileName };
    } catch (error) {
      console.error('❌ Test PDF generation failed:', error);
      throw error;
    }
  }

  // Create detailed analytics PDF report
  createAnalyticsReport(doc, stats, improvements) {
    try {
      ('🎨 Starting PDF content creation...');
      ('📊 Stats preview:', {
        totalTasks: stats?.totalTasks || 0,
        totalBreaks: stats?.totalBreaks || 0,
        moodEntries: stats?.moodEntries || 0
      });

      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      let yPosition = 30;

      // Helper function to safely get Y position after autoTable
      const getTableEndY = (defaultOffset = 20, currentY = yPosition) => {
        if (doc.lastAutoTable && doc.lastAutoTable.finalY) {
          return doc.lastAutoTable.finalY + defaultOffset;
        }
        // If autoTable didn't work, estimate position based on current Y + some space
        return currentY + 60 + defaultOffset;
      };

      // Validate stats object
      if (!stats) {
        throw new Error('Stats object is missing');
      }

      // Get user name and generate personalized greeting
      const userName = this.getUserName();
      const greetingData = this.generateGreeting(userName, stats);

      // Personalized greeting header
      doc.setFontSize(22);
      doc.setTextColor(31, 81, 255);
      doc.text(greetingData.greeting, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 12;

      // Header with title and date
      doc.setFontSize(26);
      doc.setTextColor(31, 81, 255);
      doc.text('WorkLife Analytics Report', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 8;

      // Subtitle
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text('Your Personalized Work-Life Balance Analysis', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 12;

      // Date and data summary
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      const reportDate = new Date().toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      });
      doc.text(`Generated on ${reportDate}`, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 6;

      doc.setFontSize(9);
      doc.setTextColor(46, 204, 113);
      doc.text(`Analysis based on ${stats.totalTasks + stats.totalBreaks + stats.moodEntries} tracked activities`, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 15;

      // Decorative line
      doc.setLineWidth(0.5);
      doc.setDrawColor(31, 81, 255);
      doc.line(30, yPosition, pageWidth - 30, yPosition);
      yPosition += 12;

      // Personalized welcome message
      doc.setFontSize(11);
      doc.setTextColor(31, 81, 255);
      doc.text('Welcome to Your Personal Report', 20, yPosition);
      yPosition += 8;

      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      const welcomeMsg = doc.splitTextToSize(
        greetingData.message + ' This comprehensive report provides you with detailed insights into your work patterns, ' +
        'wellness metrics, and productivity trends. Use these insights to make informed decisions about your work-life balance ' +
        'and identify areas where small changes can lead to significant improvements in your overall well-being and productivity.',
        pageWidth - 40
      );
      doc.text(welcomeMsg, 20, yPosition);
      yPosition += welcomeMsg.length * 5 + 10;

      // Report purpose section
      doc.setFontSize(11);
      doc.setTextColor(31, 81, 255);
      doc.text('What This Report Covers', 20, yPosition);
      yPosition += 8;

      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      const reportPurpose = [
        '- Executive Summary: Quick overview of your key performance metrics',
        '- Activity Analysis: Detailed breakdown of your daily and weekly patterns',
        '- Break Patterns: Analysis of your rest periods and their impact on productivity',
        '- Time Management: How effectively you utilize your working hours',
        '- Health & Wellness: Mood tracking and overall well-being assessment',
        '- Areas for Improvement: Personalized recommendations based on your data',
        '- Action Items: Practical steps you can take today to improve balance'
      ];

      reportPurpose.forEach(item => {
        doc.text(item, 20, yPosition);
        yPosition += 5;
      });
      yPosition += 10;

      // Key highlights box
      doc.setFillColor(240, 248, 255);
      doc.rect(20, yPosition, pageWidth - 40, 45, 'F');
      doc.setDrawColor(31, 81, 255);
      doc.setLineWidth(0.5);
      doc.rect(20, yPosition, pageWidth - 40, 45, 'S');

      yPosition += 8;
      doc.setFontSize(11);
      doc.setTextColor(31, 81, 255);
      doc.text('Your Quick Stats at a Glance', 25, yPosition);
      yPosition += 7;

      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      const quickStats = [
        `Total Active Days: ${stats.totalActiveDays} days | This Week: ${stats.activeDaysInWeek || 0}/7 days`,
        `Tasks Completed: ${stats.completedTasks} of ${stats.totalTasks} (${stats.completionRate.toFixed(1)}% completion rate)`,
        `Breaks Taken: ${stats.totalBreaks} breaks | Avg: ${(stats.totalActiveDays > 0 ? (stats.totalBreaks / stats.totalActiveDays).toFixed(1) : 0)} per day`,
        `Mood Tracking: ${stats.moodEntries} entries | Average: ${stats.moodEntries > 0 ? stats.averageMood.toFixed(1) : 'N/A'}/5.0`,
        `Consistency Score: ${stats.weeklyConsistency.toFixed(1)}% | Productivity Efficiency: ${stats.productivityEfficiency.toFixed(1)}%`
      ];

      quickStats.forEach(stat => {
        doc.text(stat, 25, yPosition);
        yPosition += 5;
      });
      yPosition += 15;

      // How to use this report
      doc.setFontSize(11);
      doc.setTextColor(31, 81, 255);
      doc.text('How to Use This Report', 20, yPosition);
      yPosition += 8;

      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      const howToUse = doc.splitTextToSize(
        '1. Review the Executive Summary to understand your overall performance\n' +
        '2. Examine detailed sections to identify specific patterns in your work habits\n' +
        '3. Pay special attention to the "Areas Needing Attention" section\n' +
        '4. Focus on the "Quick Win" suggestions for immediate improvements\n' +
        '5. Set 2-3 actionable goals based on the recommendations\n' +
        '6. Review your progress by generating this report weekly',
        pageWidth - 40
      );
      doc.text(howToUse, 20, yPosition);
      yPosition += howToUse.length * 5 + 15;

      // Data Validation Notice
      const hasUserData = stats.totalTasks > 0 || stats.totalBreaks > 0 || stats.moodEntries > 0;
      if (!hasUserData) {
        doc.setFontSize(14);
        doc.setTextColor(255, 152, 0);
        doc.text('Getting Started Notice', 20, yPosition);
        yPosition += 10;

        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        const startupMsg = doc.splitTextToSize(
          'Welcome to WorkLife Balance Analytics! This report shows your current status. ' +
          'Start creating tasks, taking breaks, and logging moods to see detailed insights in your next report.',
          pageWidth - 40
        );
        doc.text(startupMsg, 20, yPosition);
        yPosition += startupMsg.length * 5 + 15;
      }

      // Executive Summary Section
      doc.setFontSize(16);
      doc.setTextColor(0, 0, 0);
      doc.text('Executive Summary', 20, yPosition);
      yPosition += 5;

      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(`Comprehensive analysis of ${stats.totalTasks} tasks, ${stats.totalBreaks} breaks, and ${stats.moodEntries} mood entries`, 20, yPosition);
      yPosition += 10;

      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      const summaryData = [
        ['Metric', 'Value', 'Status'],
        ['Total Active Days Throughout Week', `${stats.totalActiveDays} days`, stats.totalActiveDays > 15 ? 'Excellent' : stats.totalActiveDays > 5 ? 'Growing' : 'Getting Started'],
        ['Days Active This Week', `${stats.activeDaysInWeek || 0}/7 days`, (stats.activeDaysInWeek || 0) >= 5 ? 'Consistent' : (stats.activeDaysInWeek || 0) >= 3 ? 'Moderate' : 'Low Activity'],
        ['Weekly Consistency', `${stats.weeklyConsistency.toFixed(1)}%`, stats.weeklyConsistency > 70 ? 'Excellent' : stats.weeklyConsistency > 50 ? 'Fair' : stats.weeklyConsistency > 0 ? 'Needs Work' : 'Getting Started'],
        ['Number of Breaks Taken', `${stats.totalBreaks} breaks`, stats.totalBreaks > 20 ? 'Well-Rested' : stats.totalBreaks > 10 ? 'Moderate' : stats.totalBreaks > 0 ? 'Need More Breaks' : 'Start Taking Breaks'],
        ['Task Completion Rate', `${stats.completionRate.toFixed(1)}%`, stats.totalTasks === 0 ? 'No Tasks Yet' : stats.completionRate > 80 ? 'Excellent' : stats.completionRate > 60 ? 'Fair' : 'Needs Focus'],
        ['Productivity Efficiency', `${stats.productivityEfficiency.toFixed(1)}%`, stats.productivityEfficiency > 80 ? 'Great' : stats.productivityEfficiency > 60 ? 'Fair' : stats.productivityEfficiency > 0 ? 'Needs Work' : 'No Data'],
        ['Health Progress (Mood)', stats.moodEntries > 0 ? `${stats.averageMood.toFixed(1)}/5` : 'No entries', stats.moodEntries === 0 ? 'Start Logging' : stats.averageMood > 4 ? 'Excellent' : stats.averageMood > 3 ? 'Fair' : 'Concerning'],
        ['Mood Trend', stats.moodTrend === 'improving' ? 'Improving' : stats.moodTrend === 'declining' ? 'Declining' : stats.moodTrend === 'stable' ? 'Stable' : 'Tracking', stats.moodTrend === 'improving' ? 'Great!' : stats.moodTrend === 'declining' ? 'Needs Attention' : stats.moodTrend === 'stable' ? 'Monitor' : 'No Data']
      ];

      try {
        ('📊 Adding summary table...');
        doc.autoTable({
          startY: yPosition,
          head: [summaryData[0]],
          body: summaryData.slice(1),
          theme: 'striped',
          headStyles: { fillColor: [31, 81, 255], textColor: [255, 255, 255] },
          margin: { left: 20, right: 20 }
        });
        ('✅ Summary table added');
      } catch (tableError) {
        console.error('❌ Error adding summary table:', tableError);
        // Continue without the table
        yPosition += 100;
      }

      yPosition = getTableEndY(15, yPosition);

      // Active Days Insights Section
      if (yPosition > pageHeight - 60) {
        doc.addPage();
        yPosition = 30;
      }

      doc.setFontSize(16);
      doc.setTextColor(46, 204, 113);
      doc.text('Active Days Breakdown', 20, yPosition);
      yPosition += 10;

      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      const activeDaysInfo = doc.splitTextToSize(
        `You've been active for ${stats.totalActiveDays} total days, with ${stats.activeDaysInWeek || 0} days of activity in the current week. ` +
        `Your consistency rate is ${stats.weeklyConsistency.toFixed(1)}%, showing your commitment to maintaining work-life balance.`,
        pageWidth - 40
      );
      doc.text(activeDaysInfo, 20, yPosition);
      yPosition += activeDaysInfo.length * 5 + 10;

      // Break Activity Summary - Enhanced with detailed insights
      doc.setFontSize(14);
      doc.setTextColor(231, 126, 34);
      doc.text('Break Activity Summary & Insights', 20, yPosition);
      yPosition += 8;

      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      const avgBreaksPerDay = stats.totalActiveDays > 0 ? (stats.totalBreaks / stats.totalActiveDays).toFixed(1) : 0;
      const totalBreakHours = (stats.totalBreakHours || 0).toFixed(1);
      const breakEfficiency = stats.breakToWorkRatio || 0;

      let breakInsight = '';
      if (avgBreaksPerDay < 2) {
        breakInsight = 'You may benefit from taking more frequent breaks. Research shows regular breaks improve focus and prevent burnout. Aim for a 5-10 minute break every 60-90 minutes of work.';
      } else if (avgBreaksPerDay > 6) {
        breakInsight = 'You\'re taking breaks frequently. While breaks are important, too many can disrupt deep work. Try consolidating into longer, more restorative breaks (15-20 minutes) every 2-3 hours.';
      } else {
        breakInsight = 'Excellent break pattern! You\'re maintaining a healthy balance between focused work and rest periods. This rhythm supports sustained productivity and well-being.';
      }

      const breakSummary = doc.splitTextToSize(
        `Break Statistics:\n` +
        `- Total breaks taken: ${stats.totalBreaks} breaks\n` +
        `- Active days: ${stats.totalActiveDays} days\n` +
        `- Average breaks per day: ${avgBreaksPerDay} breaks\n` +
        `- Total break time: ${totalBreakHours} hours\n` +
        `- Break-to-work ratio: ${breakEfficiency.toFixed(1)}%\n\n` +
        `Insight: ${breakInsight}`,
        pageWidth - 40
      );
      doc.text(breakSummary, 20, yPosition);
      yPosition += breakSummary.length * 5 + 15;

      // Weekly Activity Breakdown
      if (yPosition > pageHeight - 80) {
        doc.addPage();
        yPosition = 30;
      }

      doc.setFontSize(16);
      doc.setTextColor(52, 152, 219);
      doc.text('Weekly Activity Pattern', 20, yPosition);
      yPosition += 8;

      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text('Day-by-day breakdown of your activity over the last 4 weeks', 20, yPosition);
      yPosition += 10;

      // Safely handle weekly activity data
      const weeklyActivity = stats.weeklyActivity || {};
      const weeklyData = Object.entries(weeklyActivity).map(([day, data]) => {
        const dayData = data || {};
        return [
          day,
          (dayData.activeDays || 0).toString(),
          (dayData.totalTasks || 0).toString(),
          (dayData.totalBreaks || 0).toString(),
          `${((dayData.totalWorkMinutes || 0) / 60).toFixed(1)}h`,
          `${((dayData.totalBreakMinutes || 0) / 60).toFixed(1)}h`
        ];
      });

      // If no weekly data, create default entries
      if (weeklyData.length === 0) {
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        weeklyData.push(...dayNames.map(day => [day, '0', '0', '0', '0.0h', '0.0h']));
      }

      try {
        ('📅 Adding weekly activity table...');
        doc.autoTable({
          startY: yPosition,
          head: [['Day', 'Active Days', 'Tasks', 'Breaks', 'Work Time', 'Break Time']],
          body: weeklyData,
          theme: 'grid',
          headStyles: { fillColor: [52, 152, 219], textColor: [255, 255, 255] },
          bodyStyles: { fontSize: 9 },
          margin: { left: 20, right: 20 }
        });
        ('✅ Weekly activity table added');
      } catch (tableError) {
        console.error('❌ Error adding weekly activity table:', tableError);
        yPosition += 100;
      }

      yPosition = getTableEndY(15, yPosition);

      // Time Analysis Section
      if (yPosition > pageHeight - 100) {
        doc.addPage();
        yPosition = 30;
      }

      doc.setFontSize(16);
      doc.text('Time Analysis & Break Impact', 20, yPosition);
      yPosition += 15;

      const timeAnalysisData = [
        ['Metric', 'Original', 'After Breaks', 'Difference'],
        ['Total Work Time', `${(stats.originalWorkHours || 0).toFixed(1)}h`, `${(stats.adjustedWorkHours || 0).toFixed(1)}h`, `${(stats.totalBreakDeductionHours || 0).toFixed(1)}h deducted`],
        ['Productivity Efficiency', '100%', `${(stats.productivityEfficiency || 0).toFixed(1)}%`, `${(100 - (stats.productivityEfficiency || 0)).toFixed(1)}% impact`],
        ['Break Time Ratio', '-', `${(stats.breakDeductionPercentage || 0).toFixed(1)}%`, (stats.breakDeductionPercentage || 0) > 25 ? 'High Impact' : 'Balanced']
      ];

      try {
        ('⏰ Adding time analysis table...');
        doc.autoTable({
          startY: yPosition,
          head: [timeAnalysisData[0]],
          body: timeAnalysisData.slice(1),
          theme: 'striped',
          headStyles: { fillColor: [231, 76, 60] },
          margin: { left: 20, right: 20 }
        });
        ('✅ Time analysis table added');
      } catch (tableError) {
        console.error('❌ Error adding time analysis table:', tableError);
        yPosition += 100;
      }

      yPosition = getTableEndY(15, yPosition);

      // Health Progress Section - New detailed section
      if (yPosition > pageHeight - 100) {
        doc.addPage();
        yPosition = 30;
      }

      doc.setFontSize(16);
      doc.setTextColor(46, 204, 113);
      doc.text('Health Progress Throughout the Week', 20, yPosition);
      yPosition += 10;

      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);

      // Calculate health metrics
      const moodScore = stats.averageMood || 0;
      const moodEntries = stats.moodEntries || 0;
      const moodTrend = stats.moodTrend || 'insufficient_data';
      const breakQuality = stats.totalBreaks > 0 && stats.totalActiveDays > 0 ?
        (stats.totalBreaks / stats.totalActiveDays) : 0;
      const workLifeBalance = stats.breakToWorkRatio || 0;

      // Calculate overall health score (0-100)
      let healthScore = 0;
      let scoringFactors = [];

      if (moodEntries > 0) {
        const moodContribution = (moodScore / 5) * 30; // 30% weight
        healthScore += moodContribution;
        scoringFactors.push(`Mood Quality: ${moodContribution.toFixed(0)}/30 points`);
      }

      if (stats.totalBreaks > 0) {
        const breakContribution = Math.min((breakQuality / 4) * 25, 25); // 25% weight, optimal is 4 breaks/day
        healthScore += breakContribution;
        scoringFactors.push(`Break Frequency: ${breakContribution.toFixed(0)}/25 points`);
      }

      if (stats.totalActiveDays > 0) {
        const consistencyContribution = (stats.weeklyConsistency / 100) * 25; // 25% weight
        healthScore += consistencyContribution;
        scoringFactors.push(`Consistency: ${consistencyContribution.toFixed(0)}/25 points`);
      }

      if (workLifeBalance > 0) {
        // Optimal balance is 10-20%
        const balanceScore = workLifeBalance < 10 ? workLifeBalance :
          workLifeBalance > 20 ? Math.max(0, 20 - (workLifeBalance - 20)) : 20;
        healthScore += balanceScore;
        scoringFactors.push(`Work-Life Balance: ${balanceScore.toFixed(0)}/20 points`);
      }

      const healthGrade = healthScore >= 80 ? 'A - Excellent' :
        healthScore >= 60 ? 'B - Good' :
          healthScore >= 40 ? 'C - Fair' :
            healthScore >= 20 ? 'D - Needs Improvement' : 'F - Critical';

      const healthStatus = healthScore >= 80 ? 'Outstanding health and balance!' :
        healthScore >= 60 ? 'Good progress, some areas need attention' :
          healthScore >= 40 ? 'Moderate concerns, focus on improvements' :
            healthScore > 0 ? 'Significant concerns, prioritize wellness' :
              'Start tracking to measure health progress';

      const healthSummary = doc.splitTextToSize(
        `Overall Health Score: ${healthScore.toFixed(0)}/100 (Grade: ${healthGrade})\n` +
        `Status: ${healthStatus}\n\n` +
        `Health Metrics Breakdown:\n` +
        `- Mood Entries This Week: ${moodEntries} entries\n` +
        `- Average Mood Score: ${moodScore.toFixed(1)}/5.0 ${moodScore >= 4 ? '[Great]' : moodScore >= 3 ? '[Fair]' : moodScore > 0 ? '[Low]' : '[No data]'}\n` +
        `- Mood Trend: ${moodTrend === 'improving' ? '[Improving] Keep it up!' : moodTrend === 'declining' ? '[Declining] Pay attention' : moodTrend === 'stable' ? '[Stable] Good' : '[Insufficient data]'}\n` +
        `- Break Quality Index: ${breakQuality.toFixed(1)} breaks/day ${breakQuality >= 3 ? '[Excellent]' : breakQuality >= 2 ? '[Good]' : breakQuality > 0 ? '[Low]' : '[No breaks]'}\n` +
        `- Work-Life Balance: ${workLifeBalance.toFixed(1)}% ${workLifeBalance >= 10 && workLifeBalance <= 20 ? '[Optimal]' : workLifeBalance < 10 ? '[Need more breaks]' : '[Too many breaks]'}\n` +
        `- Weekly Consistency: ${stats.weeklyConsistency.toFixed(1)}% ${stats.weeklyConsistency >= 70 ? '[Excellent]' : stats.weeklyConsistency >= 50 ? '[Fair]' : stats.weeklyConsistency > 0 ? '[Low]' : '[Just starting]'}\n\n` +
        (scoringFactors.length > 0 ? `Score Breakdown:\n${scoringFactors.map(f => '  - ' + f).join('\n')}` : ''),
        pageWidth - 40
      );
      doc.text(healthSummary, 20, yPosition);
      yPosition += healthSummary.length * 5 + 15;

      // Weak Areas Analysis Section - New comprehensive section
      if (yPosition > pageHeight - 80) {
        doc.addPage();
        yPosition = 30;
      }

      doc.setFontSize(18);
      doc.setTextColor(231, 76, 60);
      doc.text('Areas Needing Attention & Improvement Plan', 20, yPosition);
      yPosition += 10;

      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text('Personalized analysis of weak areas with actionable improvement strategies', 20, yPosition);
      yPosition += 15;

      // Identify all weak areas
      const weakAreas = [];

      // Check consistency
      if (stats.weeklyConsistency < 60) {
        weakAreas.push({
          area: 'Weekly Consistency',
          score: stats.weeklyConsistency.toFixed(1) + '%',
          severity: stats.weeklyConsistency < 30 ? 'Critical' : stats.weeklyConsistency < 50 ? 'High' : 'Moderate',
          issue: `You're only active ${stats.weeklyConsistency.toFixed(1)}% of the week. Inconsistent activity makes it hard to build lasting habits.`,
          solution: 'Start small: commit to just 15 minutes daily. Use calendar reminders and track your streak to build momentum.',
          quickWin: 'Set a daily phone alarm at the same time each day as your "balance check-in"'
        });
      }

      // Check break frequency
      const avgBreakPerDay = stats.totalActiveDays > 0 ? stats.totalBreaks / stats.totalActiveDays : 0;
      if (avgBreakPerDay < 2 && stats.totalActiveDays > 0) {
        weakAreas.push({
          area: 'Break Frequency',
          score: avgBreakPerDay.toFixed(1) + ' breaks/day',
          severity: avgBreakPerDay < 1 ? 'Critical' : 'High',
          issue: `Only ${avgBreakPerDay.toFixed(1)} breaks per active day. Working without adequate breaks leads to fatigue and reduced productivity.`,
          solution: 'Implement the 50/10 rule: 50 minutes of focused work followed by a 10-minute break. Use timer apps or browser extensions.',
          quickWin: 'Schedule 3 breaks in your calendar tomorrow: mid-morning, lunch, and mid-afternoon'
        });
      }

      // Check task completion
      if (stats.completionRate < 70 && stats.totalTasks > 5) {
        weakAreas.push({
          area: 'Task Completion',
          score: stats.completionRate.toFixed(1) + '%',
          severity: stats.completionRate < 40 ? 'Critical' : stats.completionRate < 60 ? 'High' : 'Moderate',
          issue: `Your ${stats.completionRate.toFixed(1)}% completion rate suggests difficulty finishing tasks. This can impact confidence and productivity.`,
          solution: 'Break large tasks into smaller chunks (2-4 hour max). Prioritize using ABCDE method: A=must do, B=should do, C=nice to do.',
          quickWin: 'Tonight, choose your top 3 tasks for tomorrow and break each into 30-minute subtasks'
        });
      }

      // Check mood health
      if (stats.moodEntries > 3 && stats.averageMood < 3) {
        weakAreas.push({
          area: 'Mental Wellbeing',
          score: stats.averageMood.toFixed(1) + '/5.0',
          severity: stats.averageMood < 2 ? 'Critical' : 'High',
          issue: `Average mood of ${stats.averageMood.toFixed(1)}/5 indicates ongoing stress or dissatisfaction. Mental health is the foundation of productivity.`,
          solution: 'Consider professional support. Daily: 10min meditation, 30min exercise, 8hr sleep. Weekly: hobbies, social time, nature exposure.',
          quickWin: 'Download a meditation app (Headspace, Calm) and do one 5-minute session today'
        });
      }

      // Check productivity efficiency
      if (stats.productivityEfficiency < 60 && stats.productivityEfficiency > 0) {
        weakAreas.push({
          area: 'Productivity Efficiency',
          score: stats.productivityEfficiency.toFixed(1) + '%',
          severity: stats.productivityEfficiency < 40 ? 'Critical' : 'High',
          issue: `${stats.productivityEfficiency.toFixed(1)}% efficiency means significant time isn't translating to output. Could indicate distractions or poor planning.`,
          solution: 'Use time-blocking: assign specific tasks to time slots. Eliminate distractions: turn off notifications, use focus apps, create "deep work" hours.',
          quickWin: 'Tomorrow, block 2 hours for focused work: close email, silence phone, single-task only'
        });
      }

      // Check mood tracking engagement
      if (stats.moodEntries === 0 && stats.totalActiveDays > 5) {
        weakAreas.push({
          area: 'Wellness Tracking',
          score: '0 mood entries',
          severity: 'Moderate',
          issue: 'You haven\'t tracked your mood yet. Mood awareness is crucial for identifying patterns and preventing burnout.',
          solution: 'Log your mood 2x daily: morning (energy level) and evening (satisfaction level). Look for patterns after 2 weeks.',
          quickWin: 'Right now, log how you feel on a 1-5 scale and write one word describing why'
        });
      }

      // Check work-life balance
      if (stats.breakToWorkRatio < 8 && stats.totalWorkHours > 0) {
        weakAreas.push({
          area: 'Work-Life Balance',
          score: stats.breakToWorkRatio.toFixed(1) + '% break time',
          severity: 'High',
          issue: `Only ${stats.breakToWorkRatio.toFixed(1)}% of time is break time. Inadequate rest periods increase burnout risk and reduce long-term productivity.`,
          solution: 'Aim for 10-15% break ratio. Schedule breaks as non-negotiable appointments. Include: stretch, walk, hydrate, socialize.',
          quickWin: 'Set 4 recurring daily alarms labeled "Break Time" and honor them for one week'
        });
      }

      if (weakAreas.length === 0) {
        doc.setFontSize(12);
        doc.setTextColor(46, 204, 113);
        const noWeakAreasMsg = doc.splitTextToSize(
          'Excellent Performance! No critical weak areas identified. You\'re maintaining a great balance across all metrics. ' +
          'Continue your current practices and consider challenging yourself with new wellness goals.',
          pageWidth - 40
        );
        doc.text(noWeakAreasMsg, 20, yPosition);
        yPosition += noWeakAreasMsg.length * 5 + 15;
      } else {
        // Sort by severity
        const severityOrder = { 'Critical': 0, 'High': 1, 'Moderate': 2 };
        weakAreas.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

        doc.setFontSize(11);
        doc.setTextColor(231, 76, 60);
        doc.text(`${weakAreas.length} area${weakAreas.length > 1 ? 's' : ''} identified for improvement (ordered by priority):`, 20, yPosition);
        yPosition += 12;

        weakAreas.forEach((area, index) => {
          if (yPosition > pageHeight - 70) {
            doc.addPage();
            yPosition = 30;
          }

          // Severity badge color
          const severityColor = area.severity === 'Critical' ? [211, 47, 47] :
            area.severity === 'High' ? [245, 124, 0] : [251, 192, 45];

          doc.setFontSize(12);
          doc.setTextColor(31, 81, 255);
          doc.text(`${index + 1}. ${area.area}`, 22, yPosition);

          doc.setFontSize(9);
          doc.setTextColor(...severityColor);
          doc.text(`[${area.severity} Priority]`, 120, yPosition);

          doc.setFontSize(10);
          doc.setTextColor(0, 0, 0);
          doc.text(`Current: ${area.score}`, 165, yPosition);
          yPosition += 7;

          // Issue
          doc.setFontSize(9);
          doc.setTextColor(100, 100, 100);
          doc.text('Issue:', 27, yPosition);
          yPosition += 5;

          doc.setFontSize(9);
          doc.setTextColor(0, 0, 0);
          const issueLines = doc.splitTextToSize(area.issue, pageWidth - 55);
          doc.text(issueLines, 27, yPosition);
          yPosition += issueLines.length * 4 + 5;

          // Solution
          doc.setFontSize(9);
          doc.setTextColor(46, 204, 113);
          doc.text('Solution:', 27, yPosition);
          yPosition += 5;

          doc.setFontSize(9);
          doc.setTextColor(0, 0, 0);
          const solutionLines = doc.splitTextToSize(area.solution, pageWidth - 55);
          doc.text(solutionLines, 27, yPosition);
          yPosition += solutionLines.length * 4 + 5;

          // Quick Win
          doc.setFontSize(9);
          doc.setTextColor(155, 89, 182);
          doc.text('Quick Win (Start Today):', 27, yPosition);
          yPosition += 5;

          doc.setFontSize(9);
          doc.setTextColor(0, 0, 0);
          const quickWinLines = doc.splitTextToSize(area.quickWin, pageWidth - 55);
          doc.text(quickWinLines, 27, yPosition);
          yPosition += quickWinLines.length * 4 + 10;
        });
      }

      // Priority Improvements Section
      if (improvements.priority.length > 0) {
        if (yPosition > pageHeight - 80) {
          doc.addPage();
          yPosition = 30;
        }

        doc.setFontSize(16);
        doc.setTextColor(231, 76, 60);
        doc.text('Additional Priority Improvements', 20, yPosition);
        yPosition += 15;

        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);

        improvements.priority.forEach((item, index) => {
          if (yPosition > pageHeight - 40) {
            doc.addPage();
            yPosition = 30;
          }

          doc.setFontSize(12);
          doc.setTextColor(231, 76, 60);
          doc.text(`- ${item.title} (${item.impact} Impact)`, 20, yPosition);
          yPosition += 8;

          doc.setFontSize(10);
          doc.setTextColor(0, 0, 0);
          const messageLines = doc.splitTextToSize(item.message, pageWidth - 40);
          doc.text(messageLines, 25, yPosition);
          yPosition += messageLines.length * 5 + 3;

          doc.setTextColor(46, 204, 113);
          const suggestionLines = doc.splitTextToSize(`Suggestion: ${item.suggestion}`, pageWidth - 40);
          doc.text(suggestionLines, 25, yPosition);
          yPosition += suggestionLines.length * 5 + 10;
        });
      }

      // Additional Improvement Categories
      const categories = [
        { key: 'workPatterns', title: 'Work Pattern Insights', color: [52, 152, 219] },
        { key: 'timeManagement', title: 'Time Management Tips', color: [155, 89, 182] },
        { key: 'wellness', title: 'Wellness Recommendations', color: [46, 204, 113] },
        { key: 'consistency', title: 'Consistency Building', color: [230, 126, 34] }
      ];

      categories.forEach(category => {
        if (improvements[category.key].length > 0) {
          if (yPosition > pageHeight - 60) {
            doc.addPage();
            yPosition = 30;
          }

          doc.setFontSize(14);
          doc.setTextColor(...category.color);
          doc.text(category.title, 20, yPosition);
          yPosition += 12;

          doc.setFontSize(10);
          doc.setTextColor(0, 0, 0);

          improvements[category.key].forEach(item => {
            if (yPosition > pageHeight - 30) {
              doc.addPage();
              yPosition = 30;
            }

            doc.setFontSize(11);
            doc.text(`- ${item.title}`, 25, yPosition);
            yPosition += 6;

            const messageLines = doc.splitTextToSize(item.message, pageWidth - 50);
            doc.text(messageLines, 30, yPosition);
            yPosition += messageLines.length * 4 + 2;

            if (item.suggestion) {
              doc.setTextColor(46, 204, 113);
              const suggestionLines = doc.splitTextToSize(`Suggestion: ${item.suggestion}`, pageWidth - 50);
              doc.text(suggestionLines, 30, yPosition);
              yPosition += suggestionLines.length * 4 + 8;
              doc.setTextColor(0, 0, 0);
            }
          });

          yPosition += 5;
        }
      });

      // Key Insights & Action Items Section
      if (yPosition > pageHeight - 80) {
        doc.addPage();
        yPosition = 30;
      }

      doc.setFontSize(16);
      doc.setTextColor(155, 89, 182);
      doc.text('Key Takeaways & Action Items', 20, yPosition);
      yPosition += 15;

      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);

      // Generate actionable insights
      const actionItems = [];

      if (stats.totalActiveDays < 10) {
        actionItems.push('Build consistency: Aim to be active at least 5 days per week to establish sustainable habits.');
      }

      if (stats.totalBreaks < stats.totalTasks * 0.5 && stats.totalTasks > 0) {
        actionItems.push('Increase break frequency: Take at least one break for every two tasks to maintain energy and focus.');
      }

      if (stats.weeklyConsistency < 60) {
        actionItems.push('Improve consistency: Try setting a daily reminder to log at least one activity per day.');
      }

      if (stats.completionRate < 70 && stats.totalTasks > 0) {
        actionItems.push('Focus on completion: Review your task planning - consider breaking larger tasks into smaller, achievable chunks.');
      }

      if (stats.productivityEfficiency < 70 && stats.productivityEfficiency > 0) {
        actionItems.push('Optimize efficiency: Your break-to-work ratio suggests room for improvement in time management.');
      }

      if (stats.moodEntries > 0 && stats.averageMood < 3) {
        actionItems.push('Prioritize wellbeing: Your mood scores indicate stress. Consider wellness activities or consult a professional.');
      }

      // Add positive reinforcement
      if (stats.weeklyConsistency > 80) {
        actionItems.push('Excellent consistency! You\'re building strong habits - keep up the great work!');
      }

      if (stats.completionRate > 85 && stats.totalTasks > 0) {
        actionItems.push('Outstanding completion rate! Your task management skills are exemplary.');
      }

      if (actionItems.length === 0) {
        actionItems.push('Keep tracking your activities to unlock personalized insights and recommendations!');
      }

      actionItems.forEach((item, index) => {
        if (yPosition > pageHeight - 25) {
          doc.addPage();
          yPosition = 30;
        }

        const itemLines = doc.splitTextToSize(`${index + 1}. ${item}`, pageWidth - 40);
        doc.text(itemLines, 20, yPosition);
        yPosition += itemLines.length * 5 + 6;
      });

      // Final motivational message
      if (yPosition > pageHeight - 60) {
        doc.addPage();
        yPosition = 30;
      }

      yPosition += 10;
      doc.setFontSize(14);
      doc.setTextColor(31, 81, 255);
      doc.text('Keep Growing!', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 10;

      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      const motivationalMsg = doc.splitTextToSize(
        'Remember: Every step toward better work-life balance is progress. Consistency beats perfection. ' +
        'Small daily improvements lead to remarkable long-term results. Keep tracking, stay mindful, and celebrate your wins!',
        pageWidth - 40
      );
      doc.text(motivationalMsg, pageWidth / 2, yPosition, { align: 'center' });

      // Footer with report summary
      yPosition = pageHeight - 40;
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(`COMPLETE ANALYSIS: ${stats.totalTasks} tasks | ${stats.totalBreaks} breaks | ${stats.moodEntries} moods | ${stats.totalActiveDays} active days`, 20, yPosition);
      doc.text(`Consistency Score: ${stats.weeklyConsistency.toFixed(1)}% | Completion Rate: ${stats.completionRate.toFixed(1)}%`, 20, yPosition + 5);
      doc.text(`Generated: ${new Date().toLocaleString()} | WorkLife Balancer Analytics`, pageWidth / 2, yPosition + 15, { align: 'center' });

      ('✅ PDF content creation completed successfully');

    } catch (error) {
      console.error('❌ Error in createAnalyticsReport:', error);

      // Create a simple error report instead of failing completely
      doc.setFontSize(16);
      doc.setTextColor(255, 0, 0);
      doc.text('Report Generation Error', 20, 50);

      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text(`Error: ${error.message}`, 20, 70);
      doc.text('Please try again or contact support if the issue persists.', 20, 90);

      ('📄 Created error report instead');
    }
  }

  // Generate a welcome PDF report when user is not authenticated
  async generateWelcomeReport() {
    try {
      ('📄 Creating welcome PDF with React PDF...');

      if (!isPDFLibraryLoaded) {
        throw new Error('React PDF library not loaded. Please refresh the page and try again.');
      }

      ('✅ React PDF ready for welcome report');

      // Create the welcome document
      const welcomeDocument = React.createElement(WelcomeReportDocument);

      // Generate filename with current date
      const fileName = `WorkLife-Balance-Welcome-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}.pdf`;

      ('🎯 Downloading welcome report:', fileName);

      // Use the enhanced downloadPDF helper for reliable download
      const downloadSuccess = await this.downloadPDF(welcomeDocument, fileName);

      if (!downloadSuccess) {
        throw new Error('Failed to initiate download');
      }

      ('✅ Welcome PDF download initiated!');

      return { success: true, fileName };

    } catch (error) {
      console.error('❌ Error in generateWelcomeReport:', error);
      console.error('Error stack:', error?.stack);
      throw error;
    }
  }
}

export default new ReportService();