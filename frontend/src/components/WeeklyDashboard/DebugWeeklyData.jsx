import React, { useState } from 'react';
import { useWeeklyData } from '../../contexts/WeeklyDataContext';
import WorkLifeBalancerPreloader from '../PreLoader/preloader';

const DebugWeeklyData = () => {
  const { labels, tasksPerDay, breaksPerDay, moodAvgPerDay, streakData, currentStreak, longestStreak, refresh } = useWeeklyData();
  const [showPreloader, setShowPreloader] = useState(false);

  const handleRefresh = async () => {
    setShowPreloader(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 100)); // Small delay to show preloader
      refresh && refresh();
    } catch(e) {
      console.error('Refresh error:', e);
    } finally {
      // Preloader will auto-hide after its animation (3s + 0.8s fade)
    }
  };

  return (
    <>
      {showPreloader && <WorkLifeBalancerPreloader onAnimationEnd={() => setShowPreloader(false)} />}
      <div style={{
        background: '#0b0b0b',
        color: '#d1d5db',
        border: '1px solid #374151',
        borderRadius: 8,
        padding: 12,
        marginTop: 12,
        fontSize: 12,
        maxHeight: 220,
        overflow: 'auto'
      }}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8}}>
          <strong>Weekly Data Debug</strong>
          <button onClick={handleRefresh} style={{background:'#111827', color:'#d1d5db', border:'1px solid #374151', borderRadius:6, padding:'4px 8px'}}>Refresh</button>
        </div>
        <div><strong>labels:</strong> {JSON.stringify(labels)}</div>
        <div><strong>tasksPerDay:</strong> {JSON.stringify(tasksPerDay)}</div>
        <div><strong>breaksPerDay:</strong> {JSON.stringify(breaksPerDay)}</div>
        <div><strong>moodAvgPerDay:</strong> {JSON.stringify(moodAvgPerDay)}</div>
        <div><strong>streakData:</strong> {JSON.stringify(streakData)}</div>
        <div style={{marginTop:6}}><strong>currentStreak:</strong> {String(currentStreak)} &nbsp; <strong>longestStreak:</strong> {String(longestStreak)}</div>
      </div>
    </>
  );
};

export default DebugWeeklyData;
