/**
 * Main App Component
 *
 * Root component with routing and layout.
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import { CsvUpload } from '@/components/CsvUpload';
import { JobMonitor } from '@/components/JobMonitor';
import { CsvExport } from '@/components/CsvExport';
import '@/styles/app.css';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <div className="app">
        {/* Header */}
        <header className="app-header">
          <div className="header-content">
            <h1>RosterHub CSV Manager</h1>
            <p className="subtitle">OneRoster Japan Profile 1.2.2</p>
          </div>
        </header>

        {/* Navigation */}
        <nav className="app-nav">
          <Link to="/upload" className="nav-link">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            Import
          </Link>
          <Link to="/jobs" className="nav-link">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
            Job Monitor
          </Link>
          <Link to="/export" className="nav-link">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export
          </Link>
        </nav>

        {/* Main Content */}
        <main className="app-main">
          <Routes>
            <Route path="/" element={<Navigate to="/upload" replace />} />
            <Route path="/upload" element={<CsvUpload />} />
            <Route path="/jobs" element={<JobMonitor />} />
            <Route path="/export" element={<CsvExport />} />
          </Routes>
        </main>

        {/* Footer */}
        <footer className="app-footer">
          <p>&copy; 2025 RosterHub. OneRoster v1.2 Japan Profile 1.2.2</p>
        </footer>
      </div>
    </BrowserRouter>
  );
};

export default App;
