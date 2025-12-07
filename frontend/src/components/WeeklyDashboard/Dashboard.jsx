import React, { useEffect, useState, useRef } from "react";
import { toast } from "react-toastify";
import { useLocation, useNavigate } from "react-router-dom";
import WeeklyCharts from "./WeeklyCharts";
import CircularTaskTimer from "./CircularTaskTimer";
import WeeklyStats from "./WeeklyStats";
import { useWeeklyData } from "../../contexts/WeeklyDataContext";
import "./Dashboard.css";
import Navbar from "../Navbar";
import Loader from "../Shared/Loader";
import API_BASE_URL from "../../config/apiConfig";

const DashboardContainer = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentStreak, longestStreak, refresh, refreshUserStats, syncMoodCountsFromBackend } = useWeeklyData();

  // Check for OAuth callback immediately to set initial state
  const searchParams = new URLSearchParams(location.search);
  const isOAuthCallback = searchParams.get("oauth") === "success";


  // Don't show loader during OAuth - processing is instant
  const [showLoader, setShowLoader] = useState(false);

  // Initialize state by checking localStorage immediately
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    // If we're in the middle of OAuth, assume logged in to prevent redirects/flashing
    if (isOAuthCallback) return true;

    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('userId');
    const isValid = token && userId && token !== 'undefined' && userId !== 'undefined' && userId !== '';
    ('🔍 [Dashboard] Initial state check:', { hasToken: !!token, userId, isValid });
    return !!isValid;
  });

  // Check and update login status
  const checkLoginStatus = () => {
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('userId');
    const loggedIn = !!(token && userId);
    setIsLoggedIn(loggedIn);
    ('🔍 [Dashboard] Login status updated:', {
      isLoggedIn: loggedIn,
      hasToken: !!token,
      hasUserId: !!userId
    });
    return loggedIn;
  };

  // Verify and restore session on mount - runs FIRST
  useEffect(() => {
    let isMounted = true;

    const verifySession = async () => {
      const token = localStorage.getItem('token');
      const userId = localStorage.getItem('userId');

      ('🔍 [Dashboard] Session check:', {
        hasToken: !!token,
        userId: userId,
        hasUserId: !!(userId && userId !== 'undefined' && userId !== '')
      });

      if (!token || !userId || userId === 'undefined' || userId === '') {
        ('ℹ️ [Dashboard] No existing session found or invalid data');
        // Clear invalid data
        if (token && (!userId || userId === 'undefined' || userId === '')) {
          ('⚠️ [Dashboard] Found token but no valid userId, clearing storage');
          localStorage.removeItem('token');
          localStorage.removeItem('userId');
          localStorage.removeItem('userEmail');
          localStorage.removeItem('userName');
        }
        if (isMounted) setIsLoggedIn(false);
        return;
      }

      ('🔍 [Dashboard] Found existing session, verifying with backend...');

      try {
        const response = await fetch(`${API_BASE_URL}/auth/verify`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });

        if (!isMounted) return;

        if (response.ok) {
          const data = await response.json();
          ('✅ [Dashboard] Session verified successfully:', data);

          // Update localStorage with fresh verified data
          if (data.user) {
            localStorage.setItem('userId', data.user.id);
            localStorage.setItem('userEmail', data.user.email);
            localStorage.setItem('userName', data.user.name);

            if (data.token) {
              localStorage.setItem('token', data.token);
            }
          }

          setIsLoggedIn(true);

          // Trigger event to update Navbar and other components
          window.dispatchEvent(new CustomEvent('userLoggedIn', {
            detail: { userId: data.user.id }
          }));

          ('✅ [Dashboard] Session restored, user is logged in');
        } else {
          ('❌ [Dashboard] Session invalid (status:', response.status, '), clearing storage');
          localStorage.removeItem('token');
          localStorage.removeItem('userId');
          localStorage.removeItem('userEmail');
          localStorage.removeItem('userName');
          setIsLoggedIn(false);
        }
      } catch (error) {
        console.error('❌ [Dashboard] Session verification failed with error:', error);
        if (isMounted) {
          // Don't clear storage on network error, keep user logged in locally
          ('⚠️ [Dashboard] Keeping local session despite verification error');
        }
      }
    };

    verifySession();

    return () => {
      isMounted = false;
    };
  }, []);

  // Use ref to track OAuth processing to prevent loops
  const oauthProcessingRef = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const oauthStatus = params.get("oauth");
    const oauthData = params.get("data");
    const oauthMessage = params.get("message");

    // Handle OAuth login callback - this runs when redirected from Google OAuth
    if (oauthStatus === "success" && oauthData) {
      if (oauthProcessingRef.current) {
        ('⚠️ [Dashboard] OAuth already processing, skipping...');
        return;
      }

      ('🔐 [Dashboard] Processing OAuth login callback...');
      oauthProcessingRef.current = true;

      try {
        const userData = JSON.parse(decodeURIComponent(oauthData));
        ('📦 [Dashboard] Parsed OAuth data:', { hasToken: !!userData.token, hasUser: !!userData.user });

        if (userData.token && userData.user && userData.user.id) {
          // 1. Store OAuth data in localStorage
          localStorage.setItem("token", userData.token);
          localStorage.setItem("userId", userData.user.id);
          localStorage.setItem("userEmail", userData.user.email || '');
          localStorage.setItem("userName", userData.user.name || '');

          ('✅ [Dashboard] OAuth data stored successfully');

          // 2. Update login state immediately
          setIsLoggedIn(true);

          // 3. Trigger event for other components (Navbar, etc.)
          window.dispatchEvent(new CustomEvent('userLoggedIn', {
            detail: { userId: userData.user.id }
          }));

          // 4. Clean URL immediately using history API (doesn't trigger re-render)
          ('🧹 [Dashboard] Cleaning URL parameters...');
          window.history.replaceState({}, document.title, '/dashboard');

          // 5. Show success toast
          const successMessage = decodeURIComponent(oauthMessage || "Login successful!");
          ('✅ [Dashboard] Showing success toast:', successMessage);
          toast.success(successMessage, {
            position: "top-center",
            autoClose: 3000
          });

          // 6. Reset processing flag after a short delay
          setTimeout(() => {
            oauthProcessingRef.current = false;
            ('✅ [Dashboard] OAuth processing complete');
          }, 100);

          return; // Stop execution

        } else {
          throw new Error('Invalid user data structure');
        }
      } catch (error) {
        console.error('❌ [Dashboard] OAuth error:', error);
        toast.error('Login failed. Please try again.', { position: "top-center" });
        oauthProcessingRef.current = false;
      }
      return;
    }

    // Reset processing flag if no OAuth params (normal navigation)
    if (!oauthStatus && !oauthData) {
      oauthProcessingRef.current = false;
      // Ensure loader is off if not processing OAuth
      if (showLoader && !isOAuthCallback && !location.state?.showToast) {
        setShowLoader(false);
      }
    }

    // Handle regular login toast (from email/password login)
    const manualState = location.state?.showToast;
    const loggedIn = checkLoginStatus();

    if (manualState) {
      // This block handles the toast message immediately after a manual login.
      if (loggedIn) {
        toast.success("Login successful!", {
          position: "top-center",
          autoClose: 3000
        });
        ('✅ [Dashboard] User logged in successfully');
      } else {
        console.error('❌ [Dashboard] showToast=true but NO TOKEN found!');
        toast.error('Login failed! No authentication token found. Please try logging in again.', {
          autoClose: 6000,
          position: "top-center"
        });
      }
      // Clean up the location state to prevent the toast from re-appearing on refresh.
      window.history.replaceState({}, document.title, "/dashboard");
    } else if (!loggedIn) {
      // This block handles showing an informational toast if the user is not logged in.
      const hasShownWarning = sessionStorage.getItem('dashboardLoginWarningShown');
      if (!hasShownWarning) {
        console.warn('⚠️ [Dashboard] User is viewing dashboard without being logged in');
        toast.info('💡 Sign in to unlock full features like email reports and data sync!', {
          autoClose: 6000,
          position: "top-center"
        });
        sessionStorage.setItem('dashboardLoginWarningShown', 'true');
      }
    } else {
      // If the user is logged in, we clear the session flag for the warning toast.
      ('✅ [Dashboard] User is logged in');
      sessionStorage.removeItem('dashboardLoginWarningShown');
    }

    // Listen for login events
    const handleUserLoggedIn = () => {
      ('🔄 [Dashboard] User logged in event received');
      checkLoginStatus();
    };

    window.addEventListener('userLoggedIn', handleUserLoggedIn);

    return () => {
      window.removeEventListener('userLoggedIn', handleUserLoggedIn);
    };
  }, [location, navigate]);

  // Trigger a refresh when dashboard is mounted to get latest data
  useEffect(() => {
    ('[Dashboard] 🔄 Mounted - Refreshing data and checking for active timers');
    if (refresh && refreshUserStats) {
      // Refresh both weekly data and user stats immediately
      // This will restore any active timers from localStorage
      refreshUserStats(); // Priority: restore active timer
      refresh(); // Then update graphs

      // Sync mood counts to ensure mood chart displays correctly
      if (syncMoodCountsFromBackend) {
        syncMoodCountsFromBackend();
      }
    }
  }, [refresh, refreshUserStats, syncMoodCountsFromBackend]);

  // Listen for task creation to immediately update dashboard
  useEffect(() => {
    const handleTaskCreated = (e) => {
      ('[Dashboard] 🆕 Task created event received:', {
        hasDetail: !!e.detail,
        hasTask: !!(e.detail?.task),
        taskId: e.detail?.task?.taskId || e.detail?.task?._id,
        source: e.detail?.source
      });
      if (refresh && refreshUserStats) {
        refreshUserStats(); // Update progress and timer
        refresh(); // Update graphs
      }
    };

    window.addEventListener('taskCreated', handleTaskCreated);

    return () => {
      window.removeEventListener('taskCreated', handleTaskCreated);
    };
  }, [refresh, refreshUserStats]);



  return (
    <>
      {showLoader && <Loader />}
      <div className="dashboard-container">
        <div className="dashboard-main">
          <Navbar />

          <WeeklyStats />
          <WeeklyCharts />
        </div>
        <div className="dashboard-sidebar">
          <CircularTaskTimer />
        </div>
      </div>
    </>
  );
};

export default DashboardContainer;