/**
 * OneRoster API Client
 *
 * Axios-based API client for OneRoster Japan Profile API.
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import type {
  CsvImportJob,
  CsvImportRequest,
  CsvExportParams,
  ApiError,
} from '@/types/oneroster';

/**
 * API Configuration
 */
const API_BASE_URL = import.meta.env.VITE_API_URL || '/ims/oneroster/v1p2';
const API_KEY = import.meta.env.VITE_API_KEY || '';

/**
 * Create Axios instance with default configuration
 */
const createApiClient = (): AxiosInstance => {
  const client = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
    },
    timeout: 30000, // 30 seconds
  });

  // Request interceptor - add API key
  client.interceptors.request.use(
    (config) => {
      if (API_KEY) {
        config.headers['Authorization'] = `Bearer ${API_KEY}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Response interceptor - handle errors
  client.interceptors.response.use(
    (response) => response,
    (error: AxiosError<ApiError>) => {
      if (error.response) {
        // Server responded with error status
        const apiError: ApiError = {
          statusCode: error.response.status,
          message: error.response.data?.message || error.message,
          error: error.response.data?.error,
          details: error.response.data?.details,
        };
        return Promise.reject(apiError);
      } else if (error.request) {
        // Request made but no response
        const apiError: ApiError = {
          statusCode: 0,
          message: 'No response from server. Please check your connection.',
        };
        return Promise.reject(apiError);
      } else {
        // Error in request setup
        const apiError: ApiError = {
          statusCode: 0,
          message: error.message,
        };
        return Promise.reject(apiError);
      }
    }
  );

  return client;
};

/**
 * API client instance
 */
export const apiClient = createApiClient();

/**
 * CSV Import/Export API
 */
export const csvApi = {
  /**
   * Import CSV file
   */
  async importCsv(request: CsvImportRequest): Promise<CsvImportJob> {
    const formData = new FormData();
    formData.append('file', request.file);
    formData.append('entityType', request.entityType);

    const response = await apiClient.post<CsvImportJob>('/csv/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  },

  /**
   * Get import job status
   */
  async getJobStatus(jobId: string): Promise<CsvImportJob> {
    const response = await apiClient.get<CsvImportJob>(`/csv/jobs/${jobId}`);
    return response.data;
  },

  /**
   * List import jobs
   */
  async listJobs(params?: {
    entityType?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<CsvImportJob[]> {
    const response = await apiClient.get<CsvImportJob[]>('/csv/jobs', {
      params,
    });
    return response.data;
  },

  /**
   * Export CSV
   */
  async exportCsv(params: CsvExportParams): Promise<Blob> {
    const { entityType, filter, delta } = params;

    const response = await apiClient.get(`/csv/export/${entityType}`, {
      params: { filter, delta },
      responseType: 'blob',
      headers: {
        'Accept': 'text/csv',
      },
    });

    return response.data;
  },

  /**
   * Download CSV export
   */
  downloadCsv(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },
};

/**
 * Health Check API
 */
export const healthApi = {
  /**
   * Basic health check
   */
  async getHealth(): Promise<{
    status: string;
    timestamp: string;
    uptime: number;
    service: string;
    version: string;
  }> {
    const response = await axios.get('/health');
    return response.data;
  },

  /**
   * Readiness check
   */
  async getReadiness(): Promise<{
    status: string;
    timestamp: string;
    checks: Record<string, any>;
  }> {
    const response = await axios.get('/health/ready');
    return response.data;
  },
};

/**
 * Utility: Format file size
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

/**
 * Utility: Format date
 */
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};
