import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import "./Navbar.css";
import SignUp from "./../components/SignUp/SignUp";
import BalanceLogo from "./BalanceLogo";
import {useNavigate, useLocation} from "react-router-dom";
import Loader from "./Shared/Loader";
import API_BASE_URL from "../config/apiConfig";
const Navbar = () => {
  const [user, setUser] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  const redirectWithLoader = (path) => {
    if (!path) return;
    
    // Check if user is logged in
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('userId');
    const isLoggedIn = token && userId;
    
    // Protected routes that require login
    const protectedRoutes = ['/tasks', '/mood-check', '/dashboard'];
    
    // If trying to access protected route without login, show signup modal
    if (!isLoggedIn && protectedRoutes.includes(path)) {
      ('🔐 [Navbar] Protected route accessed without auth, showing signup');
      toast.info('Please sign up or log in to access this feature');
      setShowSignup(true);
      setMenuOpen(false);
      return;
    }
    
    // If already on the same route, avoid showing loader
    if (location.pathname === path) {
      navigate(path);
      setMenuOpen(false);
      return;
    }
    
    setIsLoading(true);
    setMenuOpen(false);
    
    // For home link, pass state to indicate explicit navigation
    const navigationState = path === '/' ? { fromHomeLink: true } : undefined;
    
    setTimeout(() => {
      navigate(path, { state: navigationState });
    }, 300);
  };

  const checkAuth = async () => {
    try {
      // First check localStorage for token-based auth
      const token = localStorage.getItem('token');
      const userId = localStorage.getItem('userId');
      const userEmail = localStorage.getItem('userEmail');
      const userName = localStorage.getItem('userName');
      
      ('🔍 [Navbar] Checking auth:', { hasToken: !!token, hasUserId: !!userId });
      
      // Only proceed if we have BOTH token and userId
      if (token && userId) {
        // Immediately set user from localStorage for instant UI update
        setUser({
          id: userId,
          email: userEmail,
          name: userName
        });
        ('✅ [Navbar] User state set from localStorage immediately');
        
        // Then verify token with backend in the background
        try {
          const res = await axios.get(`${API_BASE_URL}/auth/verify`, {
            headers: {
              'Authorization': `Bearer ${token}`
            },
            withCredentials: true,
          });
          
          if (res.data.registered && res.data.user) {
            ('✅ [Navbar] Token verified successfully with backend');
            // Update user state with fresh data from backend
            setUser({
              id: res.data.user.id,
              email: res.data.user.email,
              name: res.data.user.name
            });
            // Update token in localStorage if refreshed
            if (res.data.token) {
              localStorage.setItem('token', res.data.token);
            }
            // Update user info in localStorage
            if (res.data.user.email) localStorage.setItem('userEmail', res.data.user.email);
            if (res.data.user.name) localStorage.setItem('userName', res.data.user.name);
          } else {
            ('❌ [Navbar] Backend verification failed, clearing auth');
            localStorage.removeItem('token');
            localStorage.removeItem('userId');
            localStorage.removeItem('userEmail');
            localStorage.removeItem('userName');
            setUser(null);
          }
        } catch (verifyError) {
          ('❌ [Navbar] Token verification failed:', verifyError.message);
          // Token is invalid, clear it
          localStorage.removeItem('token');
          localStorage.removeItem('userId');
          localStorage.removeItem('userEmail');
          localStorage.removeItem('userName');
          setUser(null);
        }
      } else {
        ('🔍 [Navbar] No valid localStorage auth found, user not logged in');
        setUser(null);
      }
    } catch (error) {
      ('❌ [Navbar] Auth check failed:', error.message);
      setUser(null);
    } finally {
      setAuthChecked(true);
    }
  };

  useEffect(() => {
    // Check auth immediately on mount and on every page load
    checkAuth();
    
    // Listen for login events
    const handleUserLoggedIn = () => {
      ('🔄 [Navbar] User logged in event received, refreshing auth state');
      checkAuth();
    };
    
    // Listen for storage changes (for cross-tab sync)
    const handleStorageChange = (e) => {
      if (e.key === 'token' || e.key === 'userId') {
        ('🔄 [Navbar] Storage changed, rechecking auth');
        checkAuth();
      }
    };
    
    // Listen for route changes to re-check auth
    const handleRouteChange = () => {
      ('🔄 [Navbar] Route changed, rechecking auth');
      checkAuth();
    };
    
    window.addEventListener('userLoggedIn', handleUserLoggedIn);
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('routeChanged', handleRouteChange);
    
    return () => {
      window.removeEventListener('userLoggedIn', handleUserLoggedIn);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('routeChanged', handleRouteChange);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await axios.get(`${API_BASE_URL}/auth/logout`, {
        withCredentials: true,
      });
      
      // Clear ALL user-specific data on logout
      const userId = localStorage.getItem('userId');
      if (userId) {
        // Clear timer
        localStorage.removeItem(`activeTaskTimer_${userId}`);
        // Clear graph data
        localStorage.removeItem(`weeklyData_${userId}`);
        // Clear user stats
        localStorage.removeItem(`userStats_${userId}`);
        ('[Navbar] Cleared all user data on logout:', userId);
      }
      sessionStorage.removeItem('activeTaskTimer');
      
      // Clear authentication data
      localStorage.removeItem('token');
      localStorage.removeItem('userId');
      localStorage.removeItem('userEmail');
      localStorage.removeItem('userName');
      ('[Navbar] Cleared authentication tokens');
      
      // Clear user data
      setUser(null);
      setDropdownOpen(false);
      navigate("/", { state: { showSignOutToast: true } });
    } catch(error){
      console.error("Logout failed");
    }
  };

  return (
    <>
      <nav className="navbar-custom">
        <a className="brand-name" href="/" onClick={(e) => { e.preventDefault(); redirectWithLoader('/'); }} title="Go to Home / Landing Page">
          <BalanceLogo />
          Work Life Balancer
        </a>
        
        <button 
          className={`hamburger-menu ${menuOpen ? 'active' : ''}`}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        <div className={`nav-items ${menuOpen ? 'active' : ''}`}>
          <a className="nav-link-custom" href="/" onClick={(e) => { e.preventDefault(); redirectWithLoader('/'); }}>
            🏠 Home
          </a>
          <a className="nav-link-custom" href="/tasks" onClick={(e) => { e.preventDefault(); redirectWithLoader('/tasks'); }}>
            Tasks
          </a>
          <a className="nav-link-custom" href="/mood-check" onClick={(e) => { e.preventDefault(); redirectWithLoader('/mood-check'); }}>
            Mood Check
          </a>
          <a className="nav-link-custom" href="/dashboard" onClick={(e) => { e.preventDefault(); redirectWithLoader('/dashboard'); }}>
            Dashboard
          </a>

          {!user ? (
            <button
              className="signup-button"
              onClick={() => setShowSignup(true)}
            >
              Sign Up
            </button>
          ) : (
            <div style={{ position: "relative" }}>
              <div
                className="avatar-btn"
                onClick={() => setDropdownOpen(!dropdownOpen)}
              >
                {user.name ? user.name.charAt(0).toUpperCase() : "U"}
              </div>

              {dropdownOpen && (
                <div className="profile-signout-card">
                  <button
                    className="close-cross"
                    onClick={() => setDropdownOpen(false)}
                    aria-label="Close dropdown"
                  >
                    &times;
                  </button>

                  <div className="profile-avatar-circle">
                    {user.name ? user.name.charAt(0).toUpperCase() : "U"}
                  </div>

                  <button className="signout-row" onClick={handleLogout}>
                    <svg
                      className="signout-icon"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                      aria-hidden="true"
                      focusable="false"
                    >
                      <path
                        d="M17 16.59V15h-4v-2h4V9.41L20.59 13 17 16.59zM5 19a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v3h-2V7H5v10h7v-3h2v3a2 2 0 0 1-2 2H5z"
                        fill="currentColor"
                      />
                    </svg>
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </nav>
      {isLoading && <Loader />}

      {showSignup && (
        <SignUp
          onClose={() => {
            setShowSignup(false);
          }}
          onSuccess={() => {
            ('🎉 [Navbar] SignUp successful, refreshing auth state');
            setShowSignup(false);
            // Refresh user state immediately to show profile icon
            checkAuth();
          }}
        />
      )}
    </>
  );
};

export default Navbar;
