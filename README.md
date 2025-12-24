# VibeNet

A full-stack social media platform with real-time messaging and calling features, built with Next.js, Express.js, and MongoDB.

## Features


- **Social Media Core**: User profiles, posts with images, likes, comments, and feeds
- **Real-Time Chat**: Private messaging with delivery status, typing indicators, and online presence
- **Voice & Video Calls**: WhatsApp-style calling with notifications, ringtones, and WebRTC
- **Authentication**: JWT-based user registration and login
- **File Uploads**: Image support for posts and profile pictures

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, Socket.IO client
- **Backend**: Express.js, TypeScript, MongoDB, Socket.IO, WebRTC signaling
- **Database**: MongoDB with Mongoose ODM
- **Real-time**: WebSocket connections for chat and call signaling

## Quick Start

```bash
# Install dependencies
npm run install:all

# Set up environment files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local

# Start development servers
npm run dev
```

The app will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## Environment Setup

**Backend (.env):**
```
MONGODB_URI=mongodb://localhost:27017/vibenet
JWT_SECRET=your-secret-key
PORT=5000
```

**Frontend (.env.local):**
```
NEXT_PUBLIC_API_URL=http://localhost:5000
```

## Project Structure

```
├── frontend/     # Next.js app with chat and calling UI
├── backend/      # Express API with Socket.IO server
├── shared/       # Shared TypeScript types and utilities
└── scripts/      # Development and deployment scripts
```