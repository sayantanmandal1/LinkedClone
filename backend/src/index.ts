import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { connectDB } from './config/database';
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';

// Load environment variables
dotenv.config();

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === 'production';

// Connect to MongoDB
connectDB();

// Security middleware for production
if (isProduction) {
  // Trust proxy for production deployments
  app.set('trust proxy', 1);

  // Security headers
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
  });
}

// CORS configuration
const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) {
      console.log('[CORS] Allowing request with no origin');
      return callback(null, true);
    }

    // In development, allow localhost with any port
    if (!isProduction && origin?.includes('localhost')) {
      console.log(`[CORS] Allowing localhost origin: ${origin}`);
      return callback(null, true);
    }

    // Allow all Vercel deployments (production and preview)
    if (origin?.includes('vercel.app')) {
      console.log(`[CORS] Allowing Vercel origin: ${origin}`);
      return callback(null, true);
    }

    // Check environment variable for additional allowed origins
    const allowedOrigins = process.env.FRONTEND_URL?.split(',') || [];
    if (allowedOrigins.includes(origin)) {
      console.log(`[CORS] Allowing configured origin: ${origin}`);
      return callback(null, true);
    }

    console.log(`[CORS] Blocked origin: ${origin}`);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  maxAge: isProduction ? 86400 : 0 // Cache preflight for 24 hours in production
};

app.use(cors(corsOptions));

// Socket.io configuration with CORS matching Express
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: function (origin, callback) {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) {
        console.log('[Socket.io] Allowing request with no origin');
        return callback(null, true);
      }

      // In development, allow localhost with any port
      if (!isProduction && origin?.includes('localhost')) {
        console.log(`[Socket.io] Allowing localhost origin: ${origin}`);
        return callback(null, true);
      }

      // Allow all Vercel deployments (production and preview)
      if (origin?.includes('vercel.app')) {
        console.log(`[Socket.io] Allowing Vercel origin: ${origin}`);
        return callback(null, true);
      }

      // Check environment variable for additional allowed origins
      const allowedOrigins = process.env.FRONTEND_URL?.split(',') || [];
      if (allowedOrigins.includes(origin)) {
        console.log(`[Socket.io] Allowing configured origin: ${origin}`);
        return callback(null, true);
      }

      console.log(`[Socket.io] CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST']
  },
  transports: ['websocket', 'polling'], // WebSocket with polling fallback
  allowEIO3: true, // Enable compatibility with Socket.IO v2 clients
  pingTimeout: 60000,
  pingInterval: 25000
});

// Initialize SocketService for real-time communication
import { SocketService } from './services/socketService';
const socketService = new SocketService(io);

// Initialize CleanupService for scheduled message cleanup
import { CleanupService } from './services/cleanupService';
CleanupService.startScheduledCleanup();

// Export io instance and socketService for use in other modules
export { io, socketService };

// Body parsing middleware with size limits
app.use(express.json({
  limit: isProduction ? '5mb' : '10mb',
  verify: (_req, _res, buf) => {
    // Verify JSON payload in production
    if (isProduction && buf.length > 5 * 1024 * 1024) {
      throw new Error('Request entity too large');
    }
  }
}));

app.use(express.urlencoded({
  extended: true,
  limit: isProduction ? '5mb' : '10mb'
}));

// Serve static files from uploads directory with proper headers
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads'), {
  setHeaders: (res, path) => {
    // Set cache headers for images
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year cache
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  }
}));

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    message: 'VibeNet API is running',
    timestamp: new Date().toISOString()
  });
});

// Import routes
import authRoutes from './routes/auth';
import postRoutes from './routes/posts';
import userRoutes from './routes/users';
import uploadRoutes from './routes/upload';
import chatRoutes from './routes/chat';
import callRoutes from './routes/calls';

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/users', userRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/conversations', chatRoutes);
app.use('/api/calls', callRoutes);

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔌 Socket.io server ready`);
});

export default app;