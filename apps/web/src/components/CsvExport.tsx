/**
 * CSV Export Component
 *
 * Interface for exporting OneRoster data to CSV with filtering options.
 */

import React, { useState } from 'react';
import { csvApi } from '@/services/api';
import type { CsvExportParams } from '@/types/oneroster';

const ENTITY_TYPES = [
  { value: 'users', label: 'Users (ユーザー)' },
  { value: 'orgs', label: 'Organizations (組織)' },
  { value: 'classes', label: 'Classes (クラス)' },
  { value: 'courses', label: 'Courses (コース)' },
  { value: 'enrollments', label: 'Enrollments (登録)' },
  { value: 'demographics', label: 'Demographics (人口統計)' },
  { value: 'academicSessions', label: 'Academic Sessions (学年・学期)' },
] as const;

const COMMON_FILTERS = {
  users: [
    { label: 'Active only', value: "status='active'" },
    { label: 'Students only', value: "role='student'" },
    { label: 'Teachers only', value: "role='teacher'" },
  ],
  orgs: [
    { label: 'Active only', value: "status='active'" },
    { label: 'Schools only', value: "type='school'" },
    { label: 'Districts only', value: "type='district'" },
  ],
  classes: [
    { label: 'Active only', value: "status='active'" },
    { label: 'Scheduled only', value: "classType='scheduled'" },
    { label: 'Homeroom only', value: "classType='homeroom'" },
  ],
  enrollments: [
    { label: 'Active only', value: "status='active'" },
    { label: 'Student enrollments', value: "role='student'" },
    { label: 'Teacher enrollments', value: "role='teacher'" },
  ],
  default: [
    { label: 'Active only', value: "status='active'" },
  ],
};

export const CsvExport: React.FC = () => {
  const [entityType, setEntityType] = useState<string>('users');
  const [filterType, setFilterType] = useState<'none' | 'predefined' | 'custom' | 'delta'>('none');
  const [predefinedFilter, setPredefinedFilter] = useState<string>('');
  const [customFilter, setCustomFilter] = useState<string>('');
  const [deltaDate, setDeltaDate] = useState<string>('');
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  /**
   * Get available filters for selected entity type
   */
  const getAvailableFilters = () => {
    return COMMON_FILTERS[entityType as keyof typeof COMMON_FILTERS] || COMMON_FILTERS.default;
  };

  /**
   * Handle export
   */
  const handleExport = async () => {
    setIsExporting(true);
    setExportError(null);

    try {
      let filter: string | undefined;
      let delta: string | undefined;

      if (filterType === 'predefined' && predefinedFilter) {
        filter = predefinedFilter;
      } else if (filterType === 'custom' && customFilter) {
        filter = customFilter;
      } else if (filterType === 'delta' && deltaDate) {
        delta = new Date(deltaDate).toISOString();
      }

      const params: CsvExportParams = {
        entityType: entityType as any,
        filter,
        delta,
      };

      const blob = await csvApi.exportCsv(params);

      // Generate filename
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `${entityType}-${timestamp}${delta ? '-delta' : ''}.csv`;

      csvApi.downloadCsv(blob, filename);

      alert(`CSV export successful: ${filename}`);
    } catch (error: any) {
      setExportError(error.message || 'Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="csv-export">
      <h2>CSV Export</h2>

      {/* Entity Type Selection */}
      <div className="form-group">
        <label htmlFor="entityType">Entity Type:</label>
        <select
          id="entityType"
          value={entityType}
          onChange={(e) => {
            setEntityType(e.target.value);
            setPredefinedFilter('');
          }}
          disabled={isExporting}
        >
          {ENTITY_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>

      {/* Filter Type Selection */}
      <div className="form-group">
        <label>Filter Options:</label>
        <div className="radio-group">
          <label>
            <input
              type="radio"
              name="filterType"
              value="none"
              checked={filterType === 'none'}
              onChange={() => setFilterType('none')}
              disabled={isExporting}
            />
            No filter (export all)
          </label>
          <label>
            <input
              type="radio"
              name="filterType"
              value="predefined"
              checked={filterType === 'predefined'}
              onChange={() => setFilterType('predefined')}
              disabled={isExporting}
            />
            Predefined filter
          </label>
          <label>
            <input
              type="radio"
              name="filterType"
              value="custom"
              checked={filterType === 'custom'}
              onChange={() => setFilterType('custom')}
              disabled={isExporting}
            />
            Custom filter
          </label>
          <label>
            <input
              type="radio"
              name="filterType"
              value="delta"
              checked={filterType === 'delta'}
              onChange={() => setFilterType('delta')}
              disabled={isExporting}
            />
            Delta export (incremental)
          </label>
        </div>
      </div>

      {/* Predefined Filter Selection */}
      {filterType === 'predefined' && (
        <div className="form-group">
          <label htmlFor="predefinedFilter">Select Filter:</label>
          <select
            id="predefinedFilter"
            value={predefinedFilter}
            onChange={(e) => setPredefinedFilter(e.target.value)}
            disabled={isExporting}
          >
            <option value="">Select a filter...</option>
            {getAvailableFilters().map((filter, index) => (
              <option key={index} value={filter.value}>
                {filter.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Custom Filter Input */}
      {filterType === 'custom' && (
        <div className="form-group">
          <label htmlFor="customFilter">Custom Filter:</label>
          <input
            id="customFilter"
            type="text"
            value={customFilter}
            onChange={(e) => setCustomFilter(e.target.value)}
            placeholder="e.g., status='active' AND role='student'"
            disabled={isExporting}
          />
          <p className="help-text">
            Use OneRoster filter syntax. Example: status='active' AND role='student'
          </p>
        </div>
      )}

      {/* Delta Date Selection */}
      {filterType === 'delta' && (
        <div className="form-group">
          <label htmlFor="deltaDate">Modified Since:</label>
          <input
            id="deltaDate"
            type="datetime-local"
            value={deltaDate}
            onChange={(e) => setDeltaDate(e.target.value)}
            disabled={isExporting}
          />
          <p className="help-text">
            Export only records modified after this date/time (incremental export)
          </p>
        </div>
      )}

      {/* Error Message */}
      {exportError && (
        <div className="error-message">
          <svg className="icon-error" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {exportError}
        </div>
      )}

      {/* Export Button */}
      <button
        onClick={handleExport}
        disabled={isExporting || (filterType === 'predefined' && !predefinedFilter) || (filterType === 'custom' && !customFilter) || (filterType === 'delta' && !deltaDate)}
        className="btn-export"
      >
        {isExporting ? 'Exporting...' : 'Export CSV'}
      </button>

      {/* Info Box */}
      <div className="info-box">
        <h3>Export Information:</h3>
        <ul>
          <li><strong>All Records:</strong> Exports all entities of the selected type</li>
          <li><strong>Filtered:</strong> Exports only entities matching the filter criteria</li>
          <li><strong>Delta/Incremental:</strong> Exports only entities modified since the specified date</li>
          <li>Downloaded file will be named: <code>{entityType}-YYYY-MM-DD.csv</code></li>
          <li>All exports include Japan Profile metadata fields</li>
        </ul>
      </div>
    </div>
  );
};
