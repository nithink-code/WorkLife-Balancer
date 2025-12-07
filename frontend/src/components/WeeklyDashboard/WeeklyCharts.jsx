import React from "react";
import { Bar, Line } from "react-chartjs-2";
import { useWeeklyData } from "../../contexts/WeeklyDataContext";

import{
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Filler,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Filler,
  Title,
  Tooltip,
  Legend
);

import API_BASE_URL from "../../config/apiConfig";

const API_URL = API_BASE_URL;

const WeeklyCharts = () => {
  const { labels, tasksPerDay, breaksPerDay, moodAvgPerDay, moodCountsPerDay, lastOptimistic } = useWeeklyData();
  
  // Helper function to transform counts into normalized chart values with labels
  const normalizeCountData = (countData) => {
    return countData.map(count => {
      if (count < 5) return 0.25; // Display at "< 5" position
      if (count >= 10) return 0.75; // Display at ">= 10" position
      // For 5-9: normalize to 0.5 range
      return 0.5;
    });
  };

  // Helper function to normalize task data with 1-10 scale
  const normalizeTaskData = (countData) => {
    return countData.map(count => {
      if (count === 0) return 0;
      if (count >= 10) return 10; // Cap at 10
      return Math.min(count, 10); // Scale 1-10
    });
  };

  // Generate custom labels based on actual counts
  const generateCustomLabels = (countData) => {
    return countData.map(count => {
      if (count < 5) return `< 5 (${count})`;
      if (count >= 10) return `> 10 (${count})`;
      return `${count}`;
    });
  };
  
  // Build a dynamic fallback of last 7 days ending today in local timezone with dates
  const buildLast7DayLabels = () => {
    try {
      const todayLocal = new Date();
      todayLocal.setHours(0, 0, 0, 0);
      const startLocal = new Date(todayLocal);
      startLocal.setDate(startLocal.getDate() - 6);
      const localLabels = [];
      const debugDates = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(startLocal);
        d.setDate(startLocal.getDate() + i);
        const weekday = d.toLocaleDateString(undefined, { weekday: 'short' });
        const date = d.getDate();
        const month = d.getMonth() + 1;
        // Format: "Mon 12/1" (weekday + month/day)
        const label = `${weekday} ${month}/${date}`;
        localLabels.push(label);
        debugDates.push(`${label} (full: ${d.toLocaleDateString()})`);
      }
      ('[WeeklyCharts] Generated labels for last 7 days:', debugDates);
      return localLabels;
    } catch (e) {
      // Fallback: generate date-based labels even if formatting fails
      console.error('[WeeklyCharts] Error generating labels:', e);
      const todayLocal = new Date();
      todayLocal.setHours(0, 0, 0, 0);
      const startLocal = new Date(todayLocal);
      startLocal.setDate(startLocal.getDate() - 6);
      const fallbackLabels = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(startLocal);
        d.setDate(d.getDate() + i);
        const month = d.getMonth() + 1;
        const date = d.getDate();
        fallbackLabels.push(`${d.toDateString().split(' ')[0]} ${month}/${date}`);
      }
      return fallbackLabels;
    }
  };
  // Ensure we always pass arrays of length 7 to charts so optimistic updates render
  const safeLabels = Array.isArray(labels) && labels.length === 7 ? labels : buildLast7DayLabels();
  
  const safeTasks = Array.isArray(tasksPerDay) ? (() => { const a = [...tasksPerDay]; while(a.length < 7) a.push(0); return a.slice(0,7); })() : Array(7).fill(0);
  const safeBreaks = Array.isArray(breaksPerDay) ? (() => { const a = [...breaksPerDay]; while(a.length < 7) a.push(0); return a.slice(0,7).map(v => typeof v === 'number' ? Number(v) : 0); })() : Array(7).fill(0);
  const safeMoodAvg = Array.isArray(moodAvgPerDay) ? (() => { const a = [...moodAvgPerDay]; while(a.length < 7) a.push(null); return a.slice(0,7).map(v => v === null ? null : Number(v)); })() : Array(7).fill(null);
  const safeMoodCounts = Array.isArray(moodCountsPerDay) ? (() => { const a = [...moodCountsPerDay]; while(a.length < 7) a.push(0); return a.slice(0,7).map(v => typeof v === 'number' ? Number(v) : 0); })() : Array(7).fill(0);
  
  // Normalize task data with 1-10 scale
  const normalizedTasks = normalizeTaskData(safeTasks);
  
  // Normalize break and mood count data for chart display
  const normalizedBreaks = normalizeCountData(safeBreaks);
  const normalizedMoodCounts = normalizeCountData(safeMoodCounts);
  
  // Generate custom labels
  const taskLabels = safeTasks.map(count => count >= 10 ? `>= 10 (${count})` : `${count}`);
  const breakLabels = generateCustomLabels(safeBreaks);
  const moodCountLabels = generateCustomLabels(safeMoodCounts);
  
  // Debug: Log the actual data being displayed with detailed mapping
  ('[WeeklyCharts] 📊 Raw tasksPerDay from context:', tasksPerDay);
  ('[WeeklyCharts] 📊 Raw moodCountsPerDay from context:', moodCountsPerDay);
  ('[WeeklyCharts] 📊 Rendered safeTasks:', safeTasks);
  ('[WeeklyCharts] 📊 Rendered safeMoodCounts:', safeMoodCounts);
  ('[WeeklyCharts] 📊 Rendering graphs with data:', {
    today: new Date().toLocaleDateString(undefined, { weekday: 'short' }) + ' ' + new Date().toLocaleDateString(),
    labels: safeLabels,
    dataMapping: safeLabels.map((label, i) => ({
      label,
      tasks: safeTasks[i],
      breaks: `${safeBreaks[i]} → normalized: ${normalizedBreaks[i].toFixed(2)}`,
      moods: safeMoodAvg[i],
      moodCounts: `${safeMoodCounts[i]} → normalized: ${normalizedMoodCounts[i].toFixed(2)}`
    }))
  });
  // Chart options
  const taskChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 800,
      easing: 'easeOutQuart',
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: true,
        callbacks: {
          label: function(context) {
            // Return actual task count values in tooltip using safeTasks index
            const idx = context.dataIndex;
            return `Tasks: ${safeTasks[idx] || 0}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 10,
        grid: { color: "rgba(255, 255, 255, 0.1)" },
        ticks: { 
          color: "#9ca3af",
          stepSize: 2,
          callback: function(value) {
            if (value === 10) return '>= 10';
            if (value === 0) return '0';
            return value;
          }
        },
      },
      x: {
        grid: { display: false },
        ticks: { color: "#9ca3af" },
      },
    },
  };

  const smallChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 800,
      easing: 'easeOutQuart',
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: true,
        callbacks: {
          label: function(context) {
            // Return actual count values in tooltip
            return context.raw;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 1,
        grid: { color: "rgba(255, 255, 255, 0.1)" },
        ticks: { 
          color: "#9ca3af", 
          stepSize: 0.25,
          callback: function(value) {
            if (value === 0.25) return '< 5';
            if (value === 0.5) return '5-9';
            if (value === 0.75) return '> 10';
            return '';
          }
        },
      },
      x: {
        grid: { display: false },
        ticks: { color: "#9ca3af" },
      },
    },
  };

  // Options for mood average line chart (scale 0..5)
  const moodChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 800,
      easing: 'easeOutQuart',
    },
    plugins: {
      legend: { display: false },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 5.5,
        grid: { color: "rgba(255, 255, 255, 0.1)" },
        ticks: { 
          color: "#9ca3af", 
          stepSize: 1,
          callback: function(value) {
            // Only show integer values from 0 to 5
            return value <= 5 && Number.isInteger(value) ? value : '';
          }
        },
      },
      x: {
        grid: { display: false },
        ticks: { color: "#9ca3af" },
      },
    },
    layout: {
      padding: {
        top: 15
      }
    }
  };

  // Create a key that changes when data changes to force chart re-mount and play entry animation
  const tasksKey = `${safeTasks.join(',')}-${lastOptimistic?.type === 'task' ? lastOptimistic.ts : ''}`;
  const breaksKey = `${safeBreaks.join(',')}-${lastOptimistic?.type === 'break' ? lastOptimistic.ts : ''}`;
  const moodKey = `${safeMoodCounts.join(',')}-${lastOptimistic?.type === 'mood' ? lastOptimistic.ts : ''}`;

  // data comes from WeeklyDataContext; it already handles polling and events

  return (
    <div className="weekly-charts">
      {/* Track Your Progress Section */}
      <div className="track-progress-section">
        <div className="section-header">
          <h3 className="section-title">Track Your Task Progress {lastOptimistic && lastOptimistic.type === 'task' && (<span className="optimistic-badge">+1</span>)}</h3>
        </div>
        <p className="section-subtitle">
          Showing Tasks Added for the last 7 days (Scale: 1-10)
        </p>

        {/* Main Progress Chart */}
          <div className="main-chart-container">
          <Line
            key={tasksKey}
            data={{
              labels: safeLabels,
              datasets: [
                {
                  label: "Tasks Added",
                  data: normalizedTasks,
                  borderColor: "#10b981",
                  backgroundColor: "rgba(16, 185, 129, 0.12)",
                  fill: true,
                  tension: 0.4,
                  pointRadius: normalizedTasks.map(v => v > 0 ? 5 : 0),
                  pointBackgroundColor: "#10b981",
                  pointBorderColor: "#ffffff",
                  pointBorderWidth: 2,
                  borderWidth: 2,
                },
              ],
            }}
            options={taskChartOptions}
          />
        </div>
      </div>

      {/* Bottom Charts Row */}
      <div className="bottom-charts-row">
        <div className="chart-box">
          <h4 className="chart-title">Break Progress {lastOptimistic && lastOptimistic.type === 'break' && (<span className="optimistic-badge small">+1</span>)}
          </h4>
          <div className="chart-wrapper">
            <Bar
              key={breaksKey}
              data={{
                labels: safeLabels,
                datasets: [
                  {
                   label: "Breaks",
                   data: normalizedBreaks,
                   backgroundColor: "#3b82f6",
                   borderRadius: 4,
                  },
                ],
              }}
              options={smallChartOptions}
            />
          </div>
          <div className="chart-footer">
            <span className="footer-label">Scale</span>
            <span className="footer-value">{`< 5 • 5-9 • > 10`}</span>
          </div>
        </div>

        <div className="chart-box">
          <h4 className="chart-title">Mood Progress {lastOptimistic && lastOptimistic.type === 'mood' && (<span className="optimistic-badge small">+1</span>)}</h4>
          <div className="chart-wrapper">
            <Bar
              key={moodKey}
              data={{
                labels: safeLabels,
                datasets: [
                  {
                    label: "Mood Check-ins",
                    data: normalizedMoodCounts,
                    backgroundColor: "#ec4899",
                    borderRadius: 4,
                  },
                ],
              }}
              options={smallChartOptions}
            />
          </div>
          <div className="chart-footer">
            <span className="footer-label">Scale</span>
            <span className="footer-value">{`< 5 • 5-9 • > 10`}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeeklyCharts;