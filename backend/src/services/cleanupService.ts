import * as cron from 'node-cron';
import { Message } from '../models/Message';
import { Call } from '../models/Call';

/**
 * CleanupService handles scheduled cleanup operations for the system
 * Manages automatic deletion of expired messages and call logs using MongoDB TTL indexes
 */
export class CleanupService {
  private static scheduledTask: cron.ScheduledTask | null = null;

  /**
   * Start the scheduled cleanup job
   * Runs daily at 3 AM server time
   */
  static startScheduledCleanup(): void {
    // Validate that we don't start multiple instances
    if (this.scheduledTask) {
      console.log('⚠️  Cleanup job already running');
      return;
    }

    // Schedule job to run at 3 AM every day (cron format: minute hour * * *)
    // '0 3 * * *' means: at minute 0, hour 3, every day
    this.scheduledTask = cron.schedule('0 3 * * *', async () => {
      console.log('🧹 Starting scheduled message cleanup job...');
      try {
        await this.performCleanup();
      } catch (error) {
        console.error('❌ Scheduled cleanup job failed:', error);
      }
    }, {
      timezone: 'UTC' // Use UTC timezone for consistency across deployments
    });

    console.log('✅ Message cleanup job scheduled to run daily at 3 AM UTC');
  }

  /**
   * Stop the scheduled cleanup job
   * Useful for graceful shutdown or testing
   */
  static stopScheduledCleanup(): void {
    if (this.scheduledTask) {
      this.scheduledTask.stop();
      this.scheduledTask = null;
      console.log('🛑 Cleanup job stopped');
    }
  }

  /**
   * Perform manual cleanup of expired messages and call logs
   * This method relies on MongoDB's TTL indexes for automatic deletion
   * It primarily serves to log the cleanup operation and verify TTL indexes are working
   * 
   * @returns Object containing counts of expired messages and calls
   */
  static async performCleanup(): Promise<{ messages: number; calls: number }> {
    const startTime = Date.now();
    const now = new Date();

    try {
      // Count messages that should be expired (expiresAt <= now)
      // MongoDB's TTL index handles actual deletion automatically
      const expiredMessagesCount = await Message.countDocuments({
        expiresAt: { $lte: now }
      });

      // Count call logs older than 24 hours
      // MongoDB's TTL index handles actual deletion automatically
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const expiredCallsCount = await Call.countDocuments({
        createdAt: { $lte: twentyFourHoursAgo }
      });

      // Log cleanup operation details
      const duration = Date.now() - startTime;
      
      if (expiredMessagesCount > 0 || expiredCallsCount > 0) {
        console.log(`🧹 Cleanup completed:`);
        console.log(`   - Messages eligible for deletion: ${expiredMessagesCount}`);
        console.log(`   - Call logs eligible for deletion: ${expiredCallsCount}`);
        console.log(`   - Cleanup duration: ${duration}ms`);
        console.log(`   - Timestamp: ${now.toISOString()}`);
        console.log(`   - Note: MongoDB TTL indexes handle automatic deletion`);
      } else {
        console.log(`✨ No expired data found during cleanup check`);
        console.log(`   - Cleanup duration: ${duration}ms`);
        console.log(`   - Timestamp: ${now.toISOString()}`);
      }

      return { messages: expiredMessagesCount, calls: expiredCallsCount };
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Cleanup operation failed after ${duration}ms:`, error);
      throw error;
    }
  }

  /**
   * Get statistics about message and call log retention
   * Useful for monitoring and debugging
   * 
   * @returns Object containing message and call statistics
   */
  static async getCleanupStats(): Promise<{
    messages: {
      totalMessages: number;
      expiredMessages: number;
      activeMessages: number;
      oldestMessage: Date | null;
      newestMessage: Date | null;
    };
    calls: {
      totalCalls: number;
      expiredCalls: number;
      activeCalls: number;
      oldestCall: Date | null;
      newestCall: Date | null;
    };
  }> {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [
      totalMessages,
      expiredMessages,
      oldestMessageDoc,
      newestMessageDoc,
      totalCalls,
      expiredCalls,
      oldestCallDoc,
      newestCallDoc
    ] = await Promise.all([
      Message.countDocuments(),
      Message.countDocuments({ expiresAt: { $lte: now } }),
      Message.findOne().sort({ createdAt: 1 }).select('createdAt'),
      Message.findOne().sort({ createdAt: -1 }).select('createdAt'),
      Call.countDocuments(),
      Call.countDocuments({ createdAt: { $lte: twentyFourHoursAgo } }),
      Call.findOne().sort({ createdAt: 1 }).select('createdAt'),
      Call.findOne().sort({ createdAt: -1 }).select('createdAt')
    ]);

    const activeMessages = totalMessages - expiredMessages;
    const activeCalls = totalCalls - expiredCalls;

    return {
      messages: {
        totalMessages,
        expiredMessages,
        activeMessages,
        oldestMessage: oldestMessageDoc?.createdAt || null,
        newestMessage: newestMessageDoc?.createdAt || null
      },
      calls: {
        totalCalls,
        expiredCalls,
        activeCalls,
        oldestCall: oldestCallDoc?.createdAt || null,
        newestCall: newestCallDoc?.createdAt || null
      }
    };
  }

  /**
   * Force immediate cleanup (for admin use)
   * This is a manual trigger that can be called via API endpoint
   * 
   * @returns Cleanup statistics
   */
  static async forceCleanup(): Promise<{
    expiredMessages: number;
    expiredCalls: number;
    duration: number;
    timestamp: Date;
  }> {
    console.log('🔧 Manual cleanup triggered');
    const startTime = Date.now();
    const timestamp = new Date();

    const { messages, calls } = await this.performCleanup();
    const duration = Date.now() - startTime;

    return {
      expiredMessages: messages,
      expiredCalls: calls,
      duration,
      timestamp
    };
  }
}
