"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDB = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const connectDB = async () => {
    try {
        const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/linkedin-clone';
        // Production-optimized connection options
        const options = {
            maxPoolSize: 10, // Maintain up to 10 socket connections
            serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
            socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
            bufferCommands: false, // Disable mongoose buffering
            ...(process.env.NODE_ENV === 'production' && {
                retryWrites: true,
                w: 'majority',
                ssl: true,
                authSource: 'admin'
            })
        };
        const conn = await mongoose_1.default.connect(mongoURI, options);
        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
        // Handle connection events
        mongoose_1.default.connection.on('error', (err) => {
            console.error('❌ MongoDB connection error:', err);
        });
        mongoose_1.default.connection.on('disconnected', () => {
            console.log('⚠️ MongoDB disconnected');
            // Attempt to reconnect in production
            if (process.env.NODE_ENV === 'production') {
                setTimeout(() => {
                    mongoose_1.default.connect(mongoURI, options);
                }, 5000);
            }
        });
        mongoose_1.default.connection.on('reconnected', () => {
            console.log('✅ MongoDB reconnected');
        });
        // Graceful shutdown
        const gracefulShutdown = async (signal) => {
            console.log(`🔌 Received ${signal}. Closing MongoDB connection...`);
            await mongoose_1.default.connection.close();
            console.log('🔌 MongoDB connection closed through app termination');
            process.exit(0);
        };
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    }
    catch (error) {
        console.error('❌ Error connecting to MongoDB:', error);
        process.exit(1);
    }
};
exports.connectDB = connectDB;
