/**
 * Job Monitor Component
 *
 * Dashboard for monitoring CSV import job status and history.
 */

import React, { useEffect, useState } from 'react';
import { csvApi, formatDate, formatFileSize } from '@/services/api';
import { useJobStore } from '@/stores/useJobStore';
import type { CsvImportJob, JobStatus } from '@/types/oneroster';

const STATUS_COLORS: Record<JobStatus, string> = {
  pending: '#FFA500',    // Orange
  processing: '#2196F3', // Blue
  completed: '#4CAF50',  // Green
  failed: '#F44336',     // Red
};

const STATUS_LABELS: Record<JobStatus, string> = {
  pending: '待機中',
  processing: '処理中',
  completed: '完了',
  failed: '失敗',
};

export const JobMonitor: React.FC = () => {
  const { jobs, selectedJob, selectJob, setJobs, updateJob, setError } = useJobStore();
  const [isLoading, setIsLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  /**
   * Load jobs from API
   */
  const loadJobs = async () => {
    setIsLoading(true);
    try {
      const jobList = await csvApi.listJobs();
      setJobs(jobList);
    } catch (error: any) {
      setError(error.message || 'Failed to load jobs');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Refresh specific job status
   */
  const refreshJob = async (jobId: string) => {
    try {
      const job = await csvApi.getJobStatus(jobId);
      updateJob(jobId, job);
    } catch (error: any) {
      console.error(`Failed to refresh job ${jobId}:`, error);
    }
  };

  /**
   * Auto-refresh jobs every 5 seconds
   */
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      // Refresh jobs that are still processing
      jobs
        .filter((job) => job.status === 'pending' || job.status === 'processing')
        .forEach((job) => refreshJob(job.jobId));
    }, 5000);

    return () => clearInterval(interval);
  }, [jobs, autoRefresh]);

  /**
   * Initial load
   */
  useEffect(() => {
    loadJobs();
  }, []);

  /**
   * Calculate progress percentage
   */
  const getProgress = (job: CsvImportJob): number => {
    if (!job.totalRecords || job.totalRecords === 0) return 0;
    return Math.round((job.processedRecords || 0) / job.totalRecords * 100);
  };

  return (
    <div className="job-monitor">
      <div className="monitor-header">
        <h2>Import Job Monitor</h2>
        <div className="header-actions">
          <label className="auto-refresh-toggle">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            Auto-refresh (5s)
          </label>
          <button onClick={loadJobs} disabled={isLoading} className="btn-refresh">
            {isLoading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Job List */}
      <div className="job-list">
        {jobs.length === 0 ? (
          <div className="empty-state">
            <p>No import jobs found.</p>
            <p className="hint">Upload a CSV file to start an import job.</p>
          </div>
        ) : (
          <table className="job-table">
            <thead>
              <tr>
                <th>Job ID</th>
                <th>Entity Type</th>
                <th>File Name</th>
                <th>Status</th>
                <th>Progress</th>
                <th>Uploaded At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr
                  key={job.jobId}
                  className={selectedJob?.jobId === job.jobId ? 'selected' : ''}
                  onClick={() => selectJob(job)}
                >
                  <td className="job-id">{job.jobId.substring(0, 8)}...</td>
                  <td className="entity-type">{job.entityType}</td>
                  <td className="file-name">
                    {job.fileName}
                    <span className="file-size">({formatFileSize(job.fileSize)})</span>
                  </td>
                  <td className="status">
                    <span
                      className="status-badge"
                      style={{ backgroundColor: STATUS_COLORS[job.status] }}
                    >
                      {STATUS_LABELS[job.status]}
                    </span>
                  </td>
                  <td className="progress">
                    {job.status === 'processing' || job.status === 'completed' ? (
                      <div className="progress-container">
                        <div className="progress-bar">
                          <div
                            className="progress-fill"
                            style={{
                              width: `${getProgress(job)}%`,
                              backgroundColor: STATUS_COLORS[job.status],
                            }}
                          />
                        </div>
                        <span className="progress-text">
                          {job.processedRecords || 0} / {job.totalRecords || 0} ({getProgress(job)}%)
                        </span>
                      </div>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="uploaded-at">{formatDate(job.uploadedAt)}</td>
                  <td className="actions">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        refreshJob(job.jobId);
                      }}
                      className="btn-action"
                      title="Refresh"
                    >
                      ↻
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Job Details */}
      {selectedJob && (
        <div className="job-details">
          <h3>Job Details</h3>
          <div className="details-grid">
            <div className="detail-item">
              <label>Job ID:</label>
              <span>{selectedJob.jobId}</span>
            </div>
            <div className="detail-item">
              <label>Entity Type:</label>
              <span>{selectedJob.entityType}</span>
            </div>
            <div className="detail-item">
              <label>File Name:</label>
              <span>{selectedJob.fileName}</span>
            </div>
            <div className="detail-item">
              <label>File Size:</label>
              <span>{formatFileSize(selectedJob.fileSize)}</span>
            </div>
            <div className="detail-item">
              <label>Status:</label>
              <span
                className="status-badge"
                style={{ backgroundColor: STATUS_COLORS[selectedJob.status] }}
              >
                {STATUS_LABELS[selectedJob.status]}
              </span>
            </div>
            <div className="detail-item">
              <label>Uploaded At:</label>
              <span>{formatDate(selectedJob.uploadedAt)}</span>
            </div>
            {selectedJob.startedAt && (
              <div className="detail-item">
                <label>Started At:</label>
                <span>{formatDate(selectedJob.startedAt)}</span>
              </div>
            )}
            {selectedJob.completedAt && (
              <div className="detail-item">
                <label>Completed At:</label>
                <span>{formatDate(selectedJob.completedAt)}</span>
              </div>
            )}
            {selectedJob.totalRecords !== undefined && (
              <>
                <div className="detail-item">
                  <label>Total Records:</label>
                  <span>{selectedJob.totalRecords}</span>
                </div>
                <div className="detail-item">
                  <label>Processed:</label>
                  <span>{selectedJob.processedRecords || 0}</span>
                </div>
                <div className="detail-item">
                  <label>Success:</label>
                  <span className="success-count">{selectedJob.successRecords || 0}</span>
                </div>
                <div className="detail-item">
                  <label>Failed:</label>
                  <span className="failed-count">{selectedJob.failedRecords || 0}</span>
                </div>
              </>
            )}
          </div>

          {/* Error Details */}
          {selectedJob.errors && selectedJob.errors.length > 0 && (
            <div className="error-details">
              <h4>Errors ({selectedJob.errors.length})</h4>
              <div className="error-list">
                {selectedJob.errors.slice(0, 10).map((error, index) => (
                  <div key={index} className="error-item">
                    <span className="error-row">Row {error.row}</span>
                    {error.field && <span className="error-field">Field: {error.field}</span>}
                    <span className="error-message">{error.message}</span>
                  </div>
                ))}
                {selectedJob.errors.length > 10 && (
                  <p className="more-errors">
                    ... and {selectedJob.errors.length - 10} more errors
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
