/**
 * Job Store
 *
 * Zustand store for managing CSV import job state.
 */

import { create } from 'zustand';
import type { CsvImportJob } from '@/types/oneroster';

interface JobStore {
  jobs: CsvImportJob[];
  selectedJob: CsvImportJob | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setJobs: (jobs: CsvImportJob[]) => void;
  addJob: (job: CsvImportJob) => void;
  updateJob: (jobId: string, updates: Partial<CsvImportJob>) => void;
  selectJob: (job: CsvImportJob | null) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  clearJobs: () => void;
}

export const useJobStore = create<JobStore>((set) => ({
  jobs: [],
  selectedJob: null,
  isLoading: false,
  error: null,

  setJobs: (jobs) => set({ jobs }),

  addJob: (job) => set((state) => ({
    jobs: [job, ...state.jobs],
  })),

  updateJob: (jobId, updates) => set((state) => ({
    jobs: state.jobs.map((job) =>
      job.jobId === jobId ? { ...job, ...updates } : job
    ),
    selectedJob:
      state.selectedJob?.jobId === jobId
        ? { ...state.selectedJob, ...updates }
        : state.selectedJob,
  })),

  selectJob: (job) => set({ selectedJob: job }),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),

  clearJobs: () => set({ jobs: [], selectedJob: null, error: null }),
}));
