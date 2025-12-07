import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import "./LandingPage.css";
import Navbar from "../Navbar";
import Loader from "../Shared/Loader";
import SignUp from "../SignUp/SignUp";
// Removed side animation for a centered welcome experience

const LandingPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [currentQuote, setCurrentQuote] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);

  // Check if user is already logged in and redirect
  // But skip if coming from navbar home link (indicated by state)
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('userId');
    
    // Only auto-redirect if user is logged in AND didn't explicitly click home link
    if (token && userId && !location.state?.fromHomeLink) {
      ('🔄 [LandingPage] User already logged in, redirecting to dashboard');
      navigate('/dashboard');
    } else if (location.state?.fromHomeLink) {
      ('🏠 [LandingPage] User clicked home link, staying on landing page');
    }
  }, [navigate, location]);

  const quotes = [
    {
      text: "Balance is not something you find, it's something you create.",
      author: "Jana Kingsford"
    },
    {
      text: "Your health is your wealth. Invest in yourself daily.",
      author: "Unknown"
    },
    {
      text: "Work-life balance isn't a luxury—it's a necessity.",
      author: "Anonymous"
    }
  ];

  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [hoveredCard, setHoveredCard] = useState(null);
  const [heroMousePosition, setHeroMousePosition] = useState({ x: 0, y: 0, mx: 50, my: 50 });
  const [isHeroHovered, setIsHeroHovered] = useState(false);

  const features = [
    {
      icon: "📊",
      title: "Task Management",
      description: "Organize and prioritize your work efficiently with intelligent task tracking. Create, manage, and categorize tasks with ease using our intuitive interface. Set deadlines, add tags, and track progress with real-time updates. Our smart prioritization system helps you focus on what matters most, ensuring you never miss important deadlines while maintaining a healthy work-life balance.",
      color: "rgba(147, 51, 234, 0.6)", // violet
      colorLight: "rgba(147, 51, 234, 0.15)",
      gradientFrom: "rgba(147, 51, 234, 0.3)",
      gradientTo: "rgba(147, 51, 234, 0.05)",
      path: "/tasks"
    },
    {
      icon: "😊",
      title: "Mood Tracking",
      description: "Monitor your emotional well-being and identify patterns affecting productivity. Log your daily moods and emotions to gain insights into how your mental state impacts your work performance. Our advanced analytics help you understand triggers, patterns, and correlations between your mood and productivity levels, enabling you to make informed decisions about your well-being.",
      color: "rgba(249, 115, 22, 0.6)", // orange
      colorLight: "rgba(249, 115, 22, 0.15)",
      gradientFrom: "rgba(249, 115, 22, 0.3)",
      gradientTo: "rgba(249, 115, 22, 0.05)",
      path: "/mood-check"
    },
    {
      icon: "📈",
      title: "Analytics Dashboard",
      description: "Visualize your work-life balance with detailed insights and reports. Access comprehensive analytics that showcase your productivity trends, work patterns, and time allocation. Beautiful charts and graphs help you understand where your time goes, identify areas for improvement, and celebrate your achievements. Make data-driven decisions to optimize your work schedule and personal time.",
      color: "rgba(34, 197, 94, 0.6)", // green
      colorLight: "rgba(34, 197, 94, 0.15)",
      gradientFrom: "rgba(34, 197, 94, 0.3)",
      gradientTo: "rgba(34, 197, 94, 0.05)",
      path: "/dashboard"
    },
    {
      icon: "🎯",
      title: "Goal Setting",
      description: "Set and achieve personal and professional goals with milestone tracking. Define clear objectives, break them down into manageable milestones, and track your progress every step of the way. Our goal-setting framework helps you stay motivated and accountable, with visual progress indicators and achievement celebrations that keep you engaged on your journey to success.",
      color: "rgba(147, 51, 234, 0.6)", // violet
      colorLight: "rgba(147, 51, 234, 0.15)",
      gradientFrom: "rgba(147, 51, 234, 0.3)",
      gradientTo: "rgba(147, 51, 234, 0.05)"
    },
    {
      icon: "⏰",
      title: "Smart Reminders",
      description: "Get timely notifications to maintain healthy work habits and breaks. Our intelligent reminder system learns your work patterns and suggests optimal break times to prevent burnout. Receive personalized notifications for tasks, meetings, and well-being check-ins. Customize reminder frequencies and preferences to match your unique work style while ensuring you maintain a sustainable pace throughout your day.",
      color: "rgba(249, 115, 22, 0.6)", // orange
      colorLight: "rgba(249, 115, 22, 0.15)",
      gradientFrom: "rgba(249, 115, 22, 0.3)",
      gradientTo: "rgba(249, 115, 22, 0.05)"
    }
  ];

  const handleMouseMove = (e, index) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    // Subtle rotation - max 5 degrees
    const rotateX = ((y - centerY) / centerY) * -5;
    const rotateY = ((x - centerX) / centerX) * 5;

    // Calculate mouse position percentage
    const mouseXPercent = (x / rect.width) * 100;
    const mouseYPercent = (y / rect.height) * 100;

    setMousePosition({ x: rotateX, y: rotateY, mx: mouseXPercent, my: mouseYPercent });
    setHoveredCard(index);
  };

  const handleMouseLeave = () => {
    setMousePosition({ x: 0, y: 0, mx: 50, my: 50 });
    setHoveredCard(null);
  };

  const handleHeroMouseMove = (e) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const rotateX = ((y - centerY) / centerY) * -5;
    const rotateY = ((x - centerX) / centerX) * 5;

    const mouseXPercent = (x / rect.width) * 100;
    const mouseYPercent = (y / rect.height) * 100;

    setHeroMousePosition({ x: rotateX, y: rotateY, mx: mouseXPercent, my: mouseYPercent });
    setIsHeroHovered(true);
  };

  const handleHeroMouseLeave = () => {
    setHeroMousePosition({ x: 0, y: 0, mx: 50, my: 50 });
    setIsHeroHovered(false);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentQuote((prev) => (prev + 1) % quotes.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (location.state?.showSignOutToast) {
      toast.success("Signed out successfully!");
      // Clear the state to prevent showing the toast again on refresh
      window.history.replaceState({}, document.title, location.pathname);
    }
    
    // Handle OAuth error from URL
    const params = new URLSearchParams(location.search);
    const oauthError = params.get('error');
    if (oauthError === 'oauth_failed') {
      const errorMessage = params.get('message') || 'Google authentication failed. Please try again.';
      toast.error(errorMessage, {
        position: "top-center",
        autoClose: 5000
      });
      // Clean up URL
      window.history.replaceState({}, document.title, location.pathname);
    }
  }, [location.state, location.search]);

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
      ('🔐 [LandingPage] Protected route accessed without auth, showing signup');
      toast.info('Please sign up or log in to access this feature');
      setShowSignupModal(true);
      return;
    }
    
    // If already on the same route, avoid showing loader
    if (location.pathname === path) {
      navigate(path);
      return;
    }
    setIsLoading(true);
    // Small delay to ensure the loader paints before navigation
    setTimeout(() => {
      navigate(path);
    }, 300);
  };

  return (
    <>
    <Navbar />
    {isLoading && <Loader />}
    <div className="landing-container">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-text">
            <h1 className="hero-title">
              Welcome to Work Life Balancer
            </h1>
            <p className="hero-subtitle">
              Discover the power of balancing your professional tasks with your
              mood and well-being. A healthy work-life balance leads to increased
              productivity, happiness, and long-term success.
            </p>
            <div className="cta-buttons">
              <button className="btn btn-primary" onClick={() => setShowSignupModal(true)}>Sign Up Now</button>
              <button
                className="btn btn-secondary"
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Learn More
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Quote Section */}
      <section className="quote-section">
        <div className="quote-container">
          <p className="quote-text" key={currentQuote}>
            "{quotes[currentQuote].text}"
          </p>
          <p className="quote-author">— {quotes[currentQuote].author}</p>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section" id="features">
        <h2 className="section-title">Powerful Features for Your Well-being</h2>
        <div className="features-grid">
          {features.map((feature, index) => (
            <div 
              key={index} 
              className="feature-card"
              onClick={() => redirectWithLoader(feature.path)}
              style={{
                '--card-color': feature.color,
                '--card-color-light': feature.colorLight,
                '--gradient-from': feature.gradientFrom,
                '--gradient-to': feature.gradientTo,
                '--mouse-x': `${mousePosition.mx || 50}%`,
                '--mouse-y': `${mousePosition.my || 50}%`,
                transform: hoveredCard === index 
                  ? `perspective(1000px) rotateX(${mousePosition.x}deg) rotateY(${mousePosition.y}deg) scale(1.02)` 
                  : 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)',
                cursor: feature.path ? 'pointer' : 'default'
              }}
              onMouseMove={(e) => handleMouseMove(e, index)}
              onMouseLeave={handleMouseLeave}
            >
              <div className="feature-icon">{feature.icon}</div>
              <h3 className="feature-title">{feature.title}</h3>
              <p className="feature-description">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats-section">
        <div className="stats-container">
          <div className="stat-item">
            <div className="stat-number">10k+</div>
            <div className="stat-label">Active Users</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">95%</div>
            <div className="stat-label">Satisfaction Rate</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">50k+</div>
            <div className="stat-label">Tasks Completed</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">24/7</div>
            <div className="stat-label">Support Available</div>
          </div>
        </div>
      </section>
    </div>
    {showSignupModal && <SignUp onClose={() => setShowSignupModal(false)} />}
    </>
  );
};

export default LandingPage;
