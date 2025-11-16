/**
 * CSV Upload Component
 *
 * File upload interface for CSV import with drag-and-drop support.
 */

import React, { useState, useCallback } from 'react';
import { csvApi, formatFileSize } from '@/services/api';
import { useJobStore } from '@/stores/useJobStore';
import type { CsvImportRequest } from '@/types/oneroster';

const ENTITY_TYPES = [
  { value: 'users', label: 'Users (ユーザー)' },
  { value: 'orgs', label: 'Organizations (組織)' },
  { value: 'classes', label: 'Classes (クラス)' },
  { value: 'courses', label: 'Courses (コース)' },
  { value: 'enrollments', label: 'Enrollments (登録)' },
  { value: 'demographics', label: 'Demographics (人口統計)' },
  { value: 'academicSessions', label: 'Academic Sessions (学年・学期)' },
] as const;

export const CsvUpload: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [entityType, setEntityType] = useState<string>('users');
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const { addJob } = useJobStore();

  /**
   * Handle file selection
   */
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        setSelectedFile(file);
        setUploadError(null);
      } else {
        setUploadError('Please select a CSV file.');
      }
    }
  };

  /**
   * Handle drag events
   */
  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(false);

    const file = event.dataTransfer.files[0];
    if (file) {
      if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        setSelectedFile(file);
        setUploadError(null);
      } else {
        setUploadError('Please drop a CSV file.');
      }
    }
  }, []);

  /**
   * Handle file upload
   */
  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadError('Please select a file.');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const request: CsvImportRequest = {
        entityType: entityType as any,
        file: selectedFile,
      };

      const job = await csvApi.importCsv(request);
      addJob(job);

      // Reset form
      setSelectedFile(null);
      setEntityType('users');

      alert(`CSV import started. Job ID: ${job.jobId}`);
    } catch (error: any) {
      setUploadError(error.message || 'Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="csv-upload">
      <h2>CSV Import</h2>

      {/* Entity Type Selection */}
      <div className="form-group">
        <label htmlFor="entityType">Entity Type:</label>
        <select
          id="entityType"
          value={entityType}
          onChange={(e) => setEntityType(e.target.value)}
          disabled={isUploading}
        >
          {ENTITY_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>

      {/* File Upload Area */}
      <div
        className={`upload-area ${isDragging ? 'dragging' : ''} ${
          selectedFile ? 'has-file' : ''
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {selectedFile ? (
          <div className="file-info">
            <svg className="icon-file" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
              <polyline points="13 2 13 9 20 9" />
            </svg>
            <p className="file-name">{selectedFile.name}</p>
            <p className="file-size">{formatFileSize(selectedFile.size)}</p>
            <button
              type="button"
              onClick={() => setSelectedFile(null)}
              className="btn-remove"
              disabled={isUploading}
            >
              Remove
            </button>
          </div>
        ) : (
          <div className="upload-prompt">
            <svg className="icon-upload" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <p>Drag and drop CSV file here</p>
            <p className="or-text">or</p>
            <label htmlFor="fileInput" className="btn-browse">
              Browse File
            </label>
            <input
              id="fileInput"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              disabled={isUploading}
              style={{ display: 'none' }}
            />
          </div>
        )}
      </div>

      {/* Error Message */}
      {uploadError && (
        <div className="error-message">
          <svg className="icon-error" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {uploadError}
        </div>
      )}

      {/* Upload Button */}
      <button
        onClick={handleUpload}
        disabled={!selectedFile || isUploading}
        className="btn-upload"
      >
        {isUploading ? 'Uploading...' : 'Upload CSV'}
      </button>

      {/* Help Text */}
      <div className="help-text">
        <h3>CSV Format Requirements:</h3>
        <ul>
          <li>File must be in CSV format (.csv)</li>
          <li>First row must contain column headers</li>
          <li>Required fields must be present for each entity type</li>
          <li>Dates should be in ISO 8601 format (YYYY-MM-DD)</li>
          <li>Japan Profile metadata fields supported</li>
        </ul>
      </div>
    </div>
  );
};
