# LinkedIn Clone - Monorepo

A full-stack social media application similar to LinkedIn, built with Next.js, Express.js, and MongoDB.

## Project Structure

```
linkedin-clone-monorepo/
├── frontend/          # Next.js frontend application
├── backend/           # Express.js backend API
├── shared/            # Shared types, utilities, and constants
├── package.json       # Root package.json with workspace configuration
└── tsconfig.json      # Root TypeScript configuration
```

## Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- MongoDB (local or Atlas)

## Getting Started

### 1. Install Dependencies

```bash
# Install root dependencies
npm install

# Install all workspace dependencies
npm run install:all
```

### 2. Environment Setup

Create environment files for each workspace:

**Backend (.env in backend/ directory):**
```
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/linkedin-clone
JWT_SECRET=your-jwt-secret-key
```

**Frontend (.env.local in frontend/ directory):**
```
NEXT_PUBLIC_API_URL=http://localhost:5000
```

### 3. Development

```bash
# Start both frontend and backend in development mode
npm run dev

# Or start individually
npm run dev:frontend  # Starts Next.js on port 3000
npm run dev:backend   # Starts Express on port 5000
```

### 4. Building

```bash
# Build all workspaces
npm run build

# Or build individually
npm run build:shared
npm run build:frontend
npm run build:backend
```

### 5. Production

```bash
# Start in production mode (after building)
npm run start
```

## Available Scripts

### Root Level Scripts

- `npm run dev` - Start both frontend and backend in development
- `npm run build` - Build all workspaces
- `npm run start` - Start both frontend and backend in production
- `npm run lint` - Lint all workspaces
- `npm run type-check` - Type check all workspaces
- `npm run clean` - Remove all node_modules
- `npm run install:all` - Install dependencies for all workspaces

### Workspace Scripts

Each workspace (frontend, backend, shared) has its own package.json with specific scripts.

## Shared Package

The `shared` package contains:

- **Types**: Common TypeScript interfaces and types
- **Utils**: Shared utility functions (validation, etc.)
- **Constants**: API endpoints, validation limits, HTTP status codes

Import shared code in other workspaces:

```typescript
import { User, Post, validateEmail } from '@shared/types';
import { API_ENDPOINTS } from '@shared/constants';
```

## Development Workflow

1. Make changes to shared types/utils in the `shared/` directory
2. Build the shared package: `cd shared && npm run build`
3. The frontend and backend will automatically use the updated shared code
4. Use TypeScript path mapping to import shared code easily

## Architecture

- **Frontend**: Next.js with TypeScript and Tailwind CSS
- **Backend**: Express.js with TypeScript and MongoDB
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT tokens
- **File Upload**: Multer for image handling

## Contributing

1. Follow the existing code structure and naming conventions
2. Update shared types when adding new features
3. Ensure all TypeScript checks pass: `npm run type-check`
4. Run linting: `npm run lint`
5. Test your changes in both frontend and backend