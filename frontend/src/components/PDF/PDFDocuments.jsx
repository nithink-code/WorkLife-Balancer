import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

// React PDF Styles
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: 30,
    fontSize: 11,
    lineHeight: 1.6,
  },
  header: {
    fontSize: 24,
    marginBottom: 20,
    textAlign: 'center',
    color: '#2c3e50',
    fontWeight: 'bold',
  },
  subheader: {
    fontSize: 18,
    marginBottom: 15,
    marginTop: 20,
    color: '#34495e',
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 15,
  },
  text: {
    marginBottom: 8,
    color: '#2c3e50',
  },
  table: {
    display: 'table',
    width: 'auto',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#bdc3c7',
    borderRightWidth: 0,
    borderBottomWidth: 0,
    marginBottom: 15,
  },
  tableRow: {
    margin: 'auto',
    flexDirection: 'row',
  },
  tableCol: {
    width: '50%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#bdc3c7',
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  tableCell: {
    margin: 'auto',
    marginTop: 8,
    marginBottom: 8,
    fontSize: 10,
  },
  tableCellHeader: {
    margin: 'auto',
    marginTop: 8,
    marginBottom: 8,
    fontSize: 10,
    fontWeight: 'bold',
    backgroundColor: '#ecf0f1',
  },
  highlight: {
    backgroundColor: '#e8f4fd',
    padding: 10,
    marginBottom: 10,
    borderRadius: 3,
  },
  improvement: {
    backgroundColor: '#f8f9fa',
    padding: 8,
    marginBottom: 8,
    borderLeft: '3px solid #3498db',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: 'center',
    fontSize: 9,
    color: '#7f8c8d',
  },
});

// Welcome Report Document Component
export const WelcomeReportDocument = () => (
  <Document>
    <Page size="A4" style={styles.page}>
      <Text style={styles.header}>Welcome to WorkLife Balancer!</Text>
      <View style={styles.highlight}>
        <Text style={styles.text}>
          Thank you for joining our work-life balance journey! This report will help you track your progress and build healthier habits.
        </Text>
      </View>
      
      <Text style={styles.subheader}>Getting Started</Text>
      <Text style={styles.text}>• Complete your first task to start tracking productivity</Text>
      <Text style={styles.text}>• Take regular breaks to maintain energy levels</Text>
      <Text style={styles.text}>• Log your mood to identify patterns</Text>
      <Text style={styles.text}>• Check back weekly to see your progress</Text>
      
      <Text style={styles.subheader}>Benefits of Work-Life Balance</Text>
      <Text style={styles.text}>✓ Improved productivity and focus</Text>
      <Text style={styles.text}>✓ Better physical and mental health</Text>
      <Text style={styles.text}>✓ Enhanced job satisfaction</Text>
      <Text style={styles.text}>✓ Stronger personal relationships</Text>
      
      <Text style={styles.footer}>
        Start your journey today • WorkLife Balancer Analytics
      </Text>
    </Page>
  </Document>
);

// Analytics Report Document Component
export const AnalyticsReportDocument = ({ stats, improvements, reportData }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <Text style={styles.header}>Work-Life Balance Analytics Report</Text>
      <Text style={styles.text}>Generated on {new Date().toLocaleDateString()}</Text>
      
      {/* Executive Summary */}
      <Text style={styles.subheader}>Executive Summary</Text>
      <View style={styles.highlight}>
        <Text style={styles.text}>
          Total Tasks Completed: {stats.totalTasks || 0}
        </Text>
        <Text style={styles.text}>
          Total Breaks Taken: {stats.totalBreaks || 0}
        </Text>
        <Text style={styles.text}>
          Mood Check-ins: {stats.moodEntries || 0}
        </Text>
        <Text style={styles.text}>
          Completion Rate: {stats.completionRate || '0%'}
        </Text>
        <Text style={styles.text}>
          Active Days: {stats.totalActiveDays || 0}
        </Text>
      </View>

      {/* Key Statistics Table */}
      <Text style={styles.subheader}>Key Statistics</Text>
      <View style={styles.table}>
        <View style={styles.tableRow}>
          <View style={styles.tableCol}>
            <Text style={styles.tableCellHeader}>Metric</Text>
          </View>
          <View style={styles.tableCol}>
            <Text style={styles.tableCellHeader}>Value</Text>
          </View>
        </View>
        <View style={styles.tableRow}>
          <View style={styles.tableCol}>
            <Text style={styles.tableCell}>Average Work Sessions</Text>
          </View>
          <View style={styles.tableCol}>
            <Text style={styles.tableCell}>{stats.avgWorkSessions || '0.0'} per day</Text>
          </View>
        </View>
        <View style={styles.tableRow}>
          <View style={styles.tableCol}>
            <Text style={styles.tableCell}>Average Break Duration</Text>
          </View>
          <View style={styles.tableCol}>
            <Text style={styles.tableCell}>{stats.avgBreakDuration || '0'} minutes</Text>
          </View>
        </View>
        <View style={styles.tableRow}>
          <View style={styles.tableCol}>
            <Text style={styles.tableCell}>Weekly Consistency</Text>
          </View>
          <View style={styles.tableCol}>
            <Text style={styles.tableCell}>{stats.weeklyConsistency || '0'}%</Text>
          </View>
        </View>
      </View>

      {/* Improvement Recommendations */}
      <Text style={styles.subheader}>Priority Improvements</Text>
      {improvements.priority && improvements.priority.length > 0 ? improvements.priority.map((item, index) => (
        <View key={index} style={styles.improvement}>
          <Text style={styles.text}>
            • {typeof item === 'object' ? 
              `${item.title}: ${item.message}` : 
              item}
          </Text>
          {typeof item === 'object' && item.suggestion && (
            <Text style={[styles.text, { marginLeft: 10, fontStyle: 'italic', color: '#666' }]}>
              Suggestion: {item.suggestion}
            </Text>
          )}
          {typeof item === 'object' && item.impact && (
            <Text style={[styles.text, { marginLeft: 10, fontWeight: 'bold', color: item.impact === 'Critical' ? '#e74c3c' : item.impact === 'High' ? '#e67e22' : '#3498db' }]}>
              Impact: {item.impact}
            </Text>
          )}
        </View>
      )) : (
        <View style={styles.improvement}>
          <Text style={styles.text}>• Great work! You're maintaining a healthy work-life balance. Keep up the excellent habits!</Text>
        </View>
      )}

      {/* Footer */}
      <Text style={styles.footer}>
        Generated by WorkLife Balancer Analytics • Keep building healthy work habits!
      </Text>
    </Page>

    {/* Second Page - Detailed Analytics */}
    <Page size="A4" style={styles.page}>
      <Text style={styles.header}>Detailed Analytics</Text>
      
      {/* Work Pattern Analysis */}
      <Text style={styles.subheader}>Work Pattern Analysis</Text>
      <View style={styles.section}>
        <Text style={styles.text}>
          Peak Productivity Hours: {stats.peakHours || 'Not enough data'}
        </Text>
        <Text style={styles.text}>
          Average Focus Duration: {stats.avgFocusTime || 0} minutes
        </Text>
        <Text style={styles.text}>
          Most Productive Day: {stats.bestDay || 'Not determined'}
        </Text>
        <Text style={styles.text}>
          Total Work Time: {stats.totalWorkHours ? stats.totalWorkHours.toFixed(1) : '0.0'} hours
        </Text>
        <Text style={styles.text}>
          Productivity Efficiency: {stats.productivityEfficiency ? stats.productivityEfficiency.toFixed(1) : '0'}%
        </Text>
      </View>

      {/* Time Management Insights */}
      <Text style={styles.subheader}>Time Management Insights</Text>
      {improvements.timeManagement && improvements.timeManagement.length > 0 ? improvements.timeManagement.map((item, index) => (
        <View key={index} style={styles.improvement}>
          <Text style={styles.text}>
            • {typeof item === 'object' ? 
              `${item.title}: ${item.message}` : 
              item}
          </Text>
          {typeof item === 'object' && item.suggestion && (
            <Text style={[styles.text, { marginLeft: 10, fontStyle: 'italic', color: '#666' }]}>
              Suggestion: {item.suggestion}
            </Text>
          )}
        </View>
      )) : (
        <View style={styles.improvement}>
          <Text style={styles.text}>• Your time management is on track. Continue monitoring your productivity patterns.</Text>
        </View>
      )}

      {/* Wellness Recommendations */}
      <Text style={styles.subheader}>Wellness Recommendations</Text>
      {improvements.wellness && improvements.wellness.length > 0 ? improvements.wellness.map((item, index) => (
        <View key={index} style={styles.improvement}>
          <Text style={styles.text}>
            • {typeof item === 'object' ? 
              `${item.title}: ${item.message}` : 
              item}
          </Text>
          {typeof item === 'object' && item.suggestion && (
            <Text style={[styles.text, { marginLeft: 10, fontStyle: 'italic', color: '#666' }]}>
              Suggestion: {item.suggestion}
            </Text>
          )}
        </View>
      )) : (
        <View style={styles.improvement}>
          <Text style={styles.text}>• Excellent wellness balance! Your mood tracking shows positive patterns. Keep prioritizing self-care.</Text>
        </View>
      )}

      {/* Consistency Progress */}
      <Text style={styles.subheader}>Consistency Progress</Text>
      {improvements.consistency && improvements.consistency.length > 0 ? improvements.consistency.map((item, index) => (
        <View key={index} style={styles.improvement}>
          <Text style={styles.text}>
            • {typeof item === 'object' ? 
              `${item.title}: ${item.message}` : 
              item}
          </Text>
          {typeof item === 'object' && item.suggestion && (
            <Text style={[styles.text, { marginLeft: 10, fontStyle: 'italic', color: '#666' }]}>
              Suggestion: {item.suggestion}
            </Text>
          )}
        </View>
      )) : (
        <View style={styles.improvement}>
          <Text style={styles.text}>• Your consistency is solid. Keep showing up daily to build lasting habits.</Text>
        </View>
      )}
    </Page>
  </Document>
);

// Test Document Component
export const TestDocument = () => (
  <Document>
    <Page size="A4" style={styles.page}>
      <Text style={styles.header}>PDF Library Test</Text>
      <Text style={styles.text}>If you can see this, React PDF is working!</Text>
      <Text style={styles.text}>Test time: {new Date().toLocaleString()}</Text>
    </Page>
  </Document>
);

// Simple Test Document
export const SimpleTestDocument = () => (
  <Document>
    <Page size="A4" style={styles.page}>
      <Text style={styles.header}>Test PDF Report</Text>
      <Text style={styles.text}>This is a test to verify PDF generation is working.</Text>
      <Text style={styles.text}>Generated at: {new Date().toLocaleString()}</Text>
    </Page>
  </Document>
);