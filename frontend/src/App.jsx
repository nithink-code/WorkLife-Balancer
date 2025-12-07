import { useState, useEffect } from 'react'
import {BrowserRouter as Router, Route, Routes, Navigate, useLocation} from 'react-router-dom';
import './App.css';
import WorkLifeBalancerPreloader from './components/PreLoader/preloader.jsx';
import LandingPage from './components/LandingPage/LandingPage';
import SignUp from './components/SignUp/SignUp';
import Dashboard from './components/WeeklyDashboard/Dashboard';
import TaskDashboard from './components/Task/TaskDashboard';
import MoodCheckIns from './components/MoodCheckIns/MoodCheckIns';
import { TaskTimerProvider } from './contexts/TaskTimerContext';
import Footer from './components/Footer/Footer';
import About from './components/About/About';

// Route change detector to trigger timer state restoration and auth checks
function RouteChangeDetector() {
  const location = useLocation();
  
  useEffect(() => {
    // Dispatch route change event for timer restoration and auth re-check
    window.dispatchEvent(new CustomEvent('routeChanged', { 
      detail: { path: location.pathname } 
    }));
    
    // Note: OAuth callback handling is done in Dashboard component
    // This prevents double processing and loops
  }, [location]);
  
  return null;
}

function App() {
  const [isLoading, setIsLoading] = useState(true);

  const handlePreloaderEnd = () => {
    setIsLoading(false);
  };

  if (isLoading) {
    return <WorkLifeBalancerPreloader onAnimationEnd={handlePreloaderEnd} />;
  }

  return (
    <>
      <Router>
        <TaskTimerProvider>
          <RouteChangeDetector />
          <Routes>
            <Route path='/' element={<LandingPage />} />
            <Route path='/signup' element={<SignUp />} />
            <Route path='/dashboard' element={<Dashboard />} />
            <Route path='/tasks' element={<TaskDashboard />} />
            <Route path='/mood-check' element={<MoodCheckIns />} />
            <Route path='/about' element={<About />} />
            <Route path='*' element={<Navigate to='/' replace />} />
          </Routes>
          <Footer />
        </TaskTimerProvider>
      </Router>
    </>
  );
}

export default App
