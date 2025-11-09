"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.socketService = exports.io = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const database_1 = require("./config/database");
const errorHandler_1 = require("./middleware/errorHandler");
const notFound_1 = require("./middleware/notFound");
// Load environment variables
dotenv_1.default.config();
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
const PORT = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === 'production';
// Connect to MongoDB
(0, database_1.connectDB)();
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
    origin: function (origin, callback) {
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
app.use((0, cors_1.default)(corsOptions));
// Socket.io configuration with CORS matching Express
const io = new socket_io_1.Server(httpServer, {
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
exports.io = io;
// Initialize SocketService for real-time communication
const socketService_1 = require("./services/socketService");
const socketService = new socketService_1.SocketService(io);
exports.socketService = socketService;
// Initialize CleanupService for scheduled message cleanup
const cleanupService_1 = require("./services/cleanupService");
cleanupService_1.CleanupService.startScheduledCleanup();
// Body parsing middleware with size limits
app.use(express_1.default.json({
    limit: isProduction ? '5mb' : '10mb',
    verify: (_req, _res, buf) => {
        // Verify JSON payload in production
        if (isProduction && buf.length > 5 * 1024 * 1024) {
            throw new Error('Request entity too large');
        }
    }
}));
app.use(express_1.default.urlencoded({
    extended: true,
    limit: isProduction ? '5mb' : '10mb'
}));
// Serve static files from uploads directory with proper headers
app.use('/uploads', express_1.default.static(path_1.default.join(process.cwd(), 'uploads'), {
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
        message: 'LinkedIn Clone API is running',
        timestamp: new Date().toISOString()
    });
});
// Import routes
const auth_1 = __importDefault(require("./routes/auth"));
const posts_1 = __importDefault(require("./routes/posts"));
const users_1 = __importDefault(require("./routes/users"));
const upload_1 = __importDefault(require("./routes/upload"));
const chat_1 = __importDefault(require("./routes/chat"));
// API Routes
app.use('/api/auth', auth_1.default);
app.use('/api/posts', posts_1.default);
app.use('/api/users', users_1.default);
app.use('/api/upload', upload_1.default);
app.use('/api/conversations', chat_1.default);
// Error handling middleware
app.use(notFound_1.notFound);
app.use(errorHandler_1.errorHandler);
httpServer.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔌 Socket.io server ready`);
});
exports.default = app;
