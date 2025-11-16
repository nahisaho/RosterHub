# RosterHub CSV Manager - Web UI

Web-based user interface for managing OneRoster CSV import/export operations.

## Features

- **CSV Import**: Upload CSV files with drag-and-drop support for all OneRoster entity types
- **Job Monitoring**: Real-time tracking of import jobs with auto-refresh and detailed status
- **CSV Export**: Export data with multiple filtering modes including delta/incremental export
- **OneRoster Japan Profile 1.2.2**: Full support for Japan-specific metadata extensions

## Technology Stack

- **React 18.2.0** - UI framework
- **TypeScript 5.3.3** - Type safety
- **Vite 5.0.8** - Build tool and dev server
- **React Router 6.21.0** - Client-side routing
- **Axios 1.6.2** - HTTP client
- **Zustand 4.4.7** - State management

## Prerequisites

- Node.js 18.x or higher
- npm 9.x or higher
- RosterHub API server running on `http://localhost:3000`

## Quick Start

### 1. Install Dependencies

```bash
cd apps/web
npm install
```

### 2. Configure Environment

Create `.env` file from template:

```bash
cp .env.example .env
```

Edit `.env` and set your API key:

```
VITE_API_URL=/ims/oneroster/v1p2
VITE_API_KEY=your-actual-api-key
```

### 3. Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3002`

### 4. Build for Production

```bash
npm run build
```

Production files will be output to `dist/` directory.

### 5. Preview Production Build

```bash
npm run preview
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server on port 3002 |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
| `npm run format` | Format code with Prettier |

## Application Structure

```
apps/web/
├── public/              # Static assets
├── src/
│   ├── components/      # React components
│   │   ├── CsvUpload.tsx    # CSV import interface
│   │   ├── JobMonitor.tsx   # Job monitoring dashboard
│   │   └── CsvExport.tsx    # CSV export interface
│   ├── services/        # API services
│   │   └── api.ts           # Axios-based API client
│   ├── stores/          # State management
│   │   └── useJobStore.ts   # Job state (Zustand)
│   ├── types/           # TypeScript types
│   │   └── oneroster.ts     # OneRoster entity types
│   ├── styles/          # CSS styles
│   │   └── app.css          # Application styles
│   ├── App.tsx          # Main app component
│   └── main.tsx         # Entry point
├── index.html           # HTML template
├── vite.config.ts       # Vite configuration
├── tsconfig.json        # TypeScript configuration
└── package.json         # Dependencies
```

## Usage Guide

### CSV Import

1. Navigate to **Import** tab
2. Select entity type from dropdown:
   - Users (ユーザー)
   - Organizations (組織)
   - Classes (クラス)
   - Courses (コース)
   - Enrollments (在籍)
   - Demographics (人口統計)
   - Academic Sessions (学期)
3. Drag and drop CSV file or click **Browse** to select file
4. Click **Upload CSV** button
5. Monitor progress in **Job Monitor** tab

**CSV Format Requirements:**
- File must have `.csv` extension
- First row must contain column headers
- Required fields vary by entity type (see OneRoster specification)

### Job Monitoring

1. Navigate to **Job Monitor** tab
2. View list of import jobs with:
   - Entity type
   - Status (待機中/処理中/完了/失敗)
   - Progress percentage
   - File name and size
   - Upload timestamp
3. Enable **Auto-refresh** for real-time updates (5-second interval)
4. Click on a job to view detailed information
5. For failed jobs, view error messages and affected rows

**Job Statuses:**
- **待機中 (Pending)**: Job queued, waiting to start
- **処理中 (Processing)**: Job currently processing records
- **完了 (Completed)**: Job finished successfully
- **失敗 (Failed)**: Job encountered errors

### CSV Export

1. Navigate to **Export** tab
2. Select entity type from dropdown
3. Choose filter mode:
   - **No filter**: Export all records
   - **Predefined filter**: Use common filters (active only, by role, by type)
   - **Custom filter**: Enter OneRoster filter syntax
   - **Delta export**: Export only records modified after a specific date
4. Click **Export CSV** button
5. File will download automatically with timestamped filename

**Filter Examples:**
- Active users only: `status='active'`
- Teachers only: `role='teacher'`
- Modified after date: Use delta export mode

## API Integration

The web UI communicates with the RosterHub API server via the following endpoints:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/ims/oneroster/v1p2/csv/import` | POST | Upload CSV file |
| `/ims/oneroster/v1p2/csv/jobs` | GET | List import jobs |
| `/ims/oneroster/v1p2/csv/jobs/:jobId` | GET | Get job status |
| `/ims/oneroster/v1p2/csv/export/:entityType` | GET | Export CSV |
| `/health` | GET | Health check |
| `/health/ready` | GET | Readiness check |

**Authentication:**
All API requests include Bearer token authentication via `Authorization` header.

## Development Proxy

During development, Vite proxies API requests to avoid CORS issues:

```typescript
// vite.config.ts
server: {
  proxy: {
    '/ims/oneroster': { target: 'http://localhost:3000' },
    '/metrics': { target: 'http://localhost:3000' },
    '/health': { target: 'http://localhost:3000' },
  }
}
```

## State Management

The application uses Zustand for lightweight state management:

```typescript
// Job store
interface JobStore {
  jobs: CsvImportJob[];
  selectedJob: CsvImportJob | null;
  isLoading: boolean;
  error: string | null;

  setJobs: (jobs: CsvImportJob[]) => void;
  addJob: (job: CsvImportJob) => void;
  updateJob: (jobId: string, updates: Partial<CsvImportJob>) => void;
  selectJob: (job: CsvImportJob | null) => void;
}
```

## TypeScript Types

All OneRoster entities are fully typed:

```typescript
// Base entity
interface BaseEntity {
  sourcedId: string;
  status: 'active' | 'tobedeleted';
  dateLastModified: string;
  metadata?: { jp?: Record<string, any> };
}

// User entity
interface User extends BaseEntity {
  enabledUser: 'true' | 'false';
  username: string;
  givenName: string;
  familyName: string;
  role: 'student' | 'teacher' | 'administrator';
  // ... additional fields
}
```

## Troubleshooting

### API Connection Issues

**Problem**: Cannot connect to API server
**Solution**:
- Verify API server is running on `http://localhost:3000`
- Check `.env` file has correct `VITE_API_URL`
- Verify API key in `.env` is correct

### Authentication Errors

**Problem**: 401 Unauthorized responses
**Solution**:
- Check `VITE_API_KEY` in `.env` matches server API key
- Ensure API key is not expired

### Build Errors

**Problem**: TypeScript compilation errors
**Solution**:
- Run `npm install` to ensure all dependencies are installed
- Check Node.js version is 18.x or higher
- Delete `node_modules` and run `npm install` again

### Auto-refresh Not Working

**Problem**: Job status not updating automatically
**Solution**:
- Check **Auto-refresh** toggle is enabled in Job Monitor
- Verify browser console for errors
- Check network tab for failed API requests

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

## Performance Considerations

- **Auto-refresh**: Only polls jobs with status 'pending' or 'processing'
- **File size**: Large CSV uploads (>10MB) may take time to process
- **Job list**: Displays up to 100 most recent jobs

## Security

- **API Key**: Stored in environment variables, never committed to git
- **HTTPS**: Use HTTPS in production for API communication
- **CORS**: Configured on API server to allow web UI origin
- **Input Validation**: Client-side validation for file types and entity types

## License

Copyright (c) 2025 RosterHub. All rights reserved.
