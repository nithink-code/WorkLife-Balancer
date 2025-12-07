import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import "./SignUp.css";
import {useNavigate} from "react-router-dom";
import Loader from "../Shared/Loader";
import API_BASE_URL from "../../config/apiConfig";

const SignUp = ({ onClose, onSuccess }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isLoginMode, setIsLoginMode] = useState(false);
  const [showLoader, setShowLoader] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);


  // Form Validation
  const validateForm = () =>{
        if(!email.trim() || !password.trim()){
            toast.error("Email and Password are required.");
            return false;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if(!emailRegex.test(email)){
            toast.error("Please enter a valid email address.");
            return false;
        }
        if(password.length < 6){
          toast.error("Password must be at least 6 characters long.");
          return false;
        }
        return true;
  }

  const handleFormSubmit = async (e) => {
    e.preventDefault();

    if(!validateForm()) return;
    
    setShowLoader(true);
    const endpoint = isLoginMode ? "/auth/login" : "/auth/signup";
    const payload = isLoginMode 
      ? { email, password }
      : { fullName: email.split("@")[0], email, password };
    
    try {
      const res = await axios.post(
        `${API_BASE_URL}${endpoint}`,
        payload,
        { withCredentials: true }
      );
      
      if (res.status >= 200 && res.status < 300) {
        if (isLoginMode) {
          // Login successful - store token and redirect to dashboard
          ('✅ [SignUp] Login successful!');
          ('📦 Full response data:', res.data);
          ('🔍 Response breakdown:', {
            hasToken: !!res.data.token,
            hasUser: !!res.data.user,
            userId: res.data.user?.id,
            tokenPreview: res.data.token ? res.data.token.substring(0, 20) + '...' : 'NO TOKEN',
            userObject: res.data.user
          });
          
          if (res.data.token) {
            localStorage.setItem("token", res.data.token);
            ('💾 Token stored in localStorage');
            ('✓ Token length:', res.data.token.length);
            ('✓ Token starts with:', res.data.token.substring(0, 30));
          } else {
            console.error('❌ CRITICAL: No token in login response!');
            console.error('❌ Backend did not return a token');
            toast.error('Login failed: No authentication token received');
            return;
          }
          
          if (res.data.user) {
            localStorage.setItem("userId", res.data.user.id);
            localStorage.setItem("userEmail", res.data.user.email);
            localStorage.setItem("userName", res.data.user.name);
            ('💾 User data stored:', {
              userId: res.data.user.id,
              email: res.data.user.email,
              name: res.data.user.name
            });
            
            // Trigger timer restoration event for this user
            ('[SignUp] User logged in, triggering timer restoration');
            window.dispatchEvent(new CustomEvent('userLoggedIn', { 
              detail: { userId: res.data.user.id } 
            }));
          } else {
            console.error('❌ No user data in login response!');
          }
          
          navigate("/dashboard",{ state: { showToast: true } });
          // Close modal if onClose callback is provided
          if (onClose) {
            setTimeout(() => onClose(), 100);
          }
          // Trigger success callback
          if (onSuccess) {
            setTimeout(() => onSuccess(), 100);
          }
        } else {
          // Signup successful - switch to login mode and auto-login
          setIsLoginMode(true);
          
          // Auto-login after successful signup
          const loginRes = await axios.post(
            `${API_BASE_URL}/auth/login`,
            { email, password },
            { withCredentials: true }
          );
          
          ('✅ [SignUp] Auto-login after signup successful:', {
            hasToken: !!loginRes.data.token,
            hasUser: !!loginRes.data.user,
            userId: loginRes.data.user?.id
          });
          
          if (loginRes.data.token) {
            localStorage.setItem("token", loginRes.data.token);
            ('💾 Token stored in localStorage, length:', loginRes.data.token.length);
          } else {
            console.error('❌ No token in auto-login response!');
          }
          
          if (loginRes.data.user) {
            localStorage.setItem("userId", loginRes.data.user.id);
            localStorage.setItem("userEmail", loginRes.data.user.email);
            localStorage.setItem("userName", loginRes.data.user.name);
            ('💾 User data stored:', {
              userId: loginRes.data.user.id,
              email: loginRes.data.user.email,
              name: loginRes.data.user.name
            });
            
            // Trigger timer restoration event for this user
            ('[SignUp] User signed up and logged in, triggering timer restoration');
            window.dispatchEvent(new CustomEvent('userLoggedIn', { 
              detail: { userId: loginRes.data.user.id } 
            }));
          } else {
            console.error('❌ No user data in auto-login response!');
          }
          
          navigate("/dashboard",{ state: { showToast: true } });
          // Close modal if onClose callback is provided
          if (onClose) {
            setTimeout(() => onClose(), 100);
          }
          // Trigger success callback
          if (onSuccess) {
            setTimeout(() => onSuccess(), 100);
          }
        }
      }
    } catch (error) {
      console.error("❌ Auth error:", error);
      console.error("❌ Error response:", error.response);
      console.error("❌ Error data:", error.response?.data);
      
      let errorMessage = "An error occurred. Please try again.";
      
      if (error.response) {
        // Server responded with error
        errorMessage = error.response.data?.message || 
          (isLoginMode ? "Login failed. Check your credentials." : "Signup failed. Try again.");
        console.error("Server response:", error.response.data);
        console.error("Status:", error.response.status);
      } else if (error.request) {
        // Request made but no response
        errorMessage = "Cannot connect to server. Is the backend running on port 8080?";
        console.error("❌ Backend server not responding!");
      } else {
        // Something else went wrong
        errorMessage = error.message || "Request failed";
      }
      
      toast.error(errorMessage, { autoClose: 5000 });
    } finally {
      setShowLoader(false);
    }
  };

  const handleGoogleSignUp = () => {
    setShowLoader(true);
    // Show loader before redirecting to Google OAuth
    setTimeout(() => {
      window.location.href = `${API_BASE_URL}/auth/google`;
    }, 100);
  };

  const handleSignOut = async () => {
    setShowLoader(true);
    try {
      await axios.get(
        `${API_BASE_URL}/auth/logout`,
        {},
        { withCredentials: true }
      );
      
      // Clear ALL user-specific data on logout
      const userId = localStorage.getItem('userId');
      if (userId) {
        // Clear timer
        localStorage.removeItem(`activeTaskTimer_${userId}`);
        // Clear graph data
        localStorage.removeItem(`weeklyData_${userId}`);
        // Clear user stats
        localStorage.removeItem(`userStats_${userId}`);
        ('[SignUp] Cleared all user data on logout:', userId);
      }
      sessionStorage.removeItem('activeTaskTimer');
      
      // Clear localStorage
      localStorage.removeItem("token");
      localStorage.removeItem("userId");
      localStorage.removeItem("userEmail");
      localStorage.removeItem("userName");
      
      navigate("/", { state: { showSignOutToast: true}});
    } catch (error) {
      toast.error("Sign out failed. Please try again.");
      setShowLoader(false);
    }
  };

  return (
    <>
      {showLoader && <Loader />}
      <div
        className="overlay"
        role="dialog"
        aria-modal="true"
        aria-labelledby="signup-title"
      >
        <div className="signup-card">
        <button
          className="close-btn"
          aria-label="Close Sign Up form"
          onClick={onClose}
        >
          ✕
        </button>
        <h2 id="signup-title">Welcome to Work Life Balancer</h2>
        <p className="sub-text">
          {isSignedIn
            ? "You are signed in"
            : isLoginMode 
              ? "Login to continue your journey"
              : "Sign up to start your journey with us"}
        </p>

        {!isSignedIn ? (
          <>
            {/* Toggle between Login and Sign Up */}
            <div className="auth-toggle">
              <button
                type="button"
                className={`toggle-btn ${!isLoginMode ? "active" : ""}`}
                onClick={() => setIsLoginMode(false)}
              >
                Sign Up
              </button>
              <button
                type="button"
                className={`toggle-btn ${isLoginMode ? "active" : ""}`}
                onClick={() => setIsLoginMode(true)}
              >
                Login
              </button>
            </div>

            <form
              className="signup-form"
              onSubmit={handleFormSubmit}
              noValidate
            >
              <label htmlFor="signup-email">Email</label>
              <input
                id="signup-email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
              <label htmlFor="signup-password">Password</label>
              <input
                id="signup-password"
                type="password"
                placeholder="Enter your password (min 6 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete={isLoginMode ? "current-password" : "new-password"}
              />
              {isLoginMode && (
                <span className="forgot-link" tabIndex={0}>
                  Forgot Password?
                </span>
              )}
              <button type="submit" className="btn-primary-custom">
                {isLoginMode ? "Login" : "Create Account"}
              </button>
            </form>

            <div className="or-divider">Or</div>

            <button
              onClick={handleGoogleSignUp}
              className="google-btn"
              type="button"
            >
              <img
                src="https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png"
                alt="Google logo"
                className="google-logo"
                aria-hidden="true"
              />
              {isLoginMode ? "Login" : "Sign up"} with Google
            </button>
          </>
        ) : (
          <button onClick={handleSignOut} className="btn-primary-custom">
            Sign Out
          </button>
        )}
        </div>
      </div>
    </>
  );
};

export default SignUp;