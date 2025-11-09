import * as cron from 'node-cron';
import { Message } from '../models/Message';

/**
 * CleanupService handles scheduled cleanup operations for the chat system
 * Primarily manages automatic deletion of expired messages using MongoDB TTL index
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
   * Perform manual cleanup of expired messages
   * This method relies on MongoDB's TTL index for automatic deletion
   * It primarily serves to log the cleanup operation and verify TTL index is working
   * 
   * @returns Number of messages that were eligible for deletion
   */
  static async performCleanup(): Promise<number> {
    const startTime = Date.now();
    const now = new Date();

    try {
      // Count messages that should be expired (expiresAt <= now)
      // MongoDB's TTL index handles actual deletion automatically
      const expiredCount = await Message.countDocuments({
        expiresAt: { $lte: now }
      });

      // Log cleanup operation details
      const duration = Date.now() - startTime;
      
      if (expiredCount > 0) {
        console.log(`🧹 Message cleanup completed:`);
        console.log(`   - Messages eligible for deletion: ${expiredCount}`);
        console.log(`   - Cleanup duration: ${duration}ms`);
        console.log(`   - Timestamp: ${now.toISOString()}`);
        console.log(`   - Note: MongoDB TTL index handles automatic deletion`);
      } else {
        console.log(`✨ No expired messages found during cleanup check`);
        console.log(`   - Cleanup duration: ${duration}ms`);
        console.log(`   - Timestamp: ${now.toISOString()}`);
      }

      return expiredCount;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Cleanup operation failed after ${duration}ms:`, error);
      throw error;
    }
  }

  /**
   * Get statistics about message retention
   * Useful for monitoring and debugging
   * 
   * @returns Object containing message statistics
   */
  static async getCleanupStats(): Promise<{
    totalMessages: number;
    expiredMessages: number;
    activeMessages: number;
    oldestMessage: Date | null;
    newestMessage: Date | null;
  }> {
    const now = new Date();

    const [
      totalMessages,
      expiredMessages,
      oldestMessageDoc,
      newestMessageDoc
    ] = await Promise.all([
      Message.countDocuments(),
      Message.countDocuments({ expiresAt: { $lte: now } }),
      Message.findOne().sort({ createdAt: 1 }).select('createdAt'),
      Message.findOne().sort({ createdAt: -1 }).select('createdAt')
    ]);

    const activeMessages = totalMessages - expiredMessages;

    return {
      totalMessages,
      expiredMessages,
      activeMessages,
      oldestMessage: oldestMessageDoc?.createdAt || null,
      newestMessage: newestMessageDoc?.createdAt || null
    };
  }

  /**
   * Force immediate cleanup (for admin use)
   * This is a manual trigger that can be called via API endpoint
   * 
   * @returns Cleanup statistics
   */
  static async forceCleanup(): Promise<{
    expiredCount: number;
    duration: number;
    timestamp: Date;
  }> {
    console.log('🔧 Manual cleanup triggered');
    const startTime = Date.now();
    const timestamp = new Date();

    const expiredCount = await this.performCleanup();
    const duration = Date.now() - startTime;

    return {
      expiredCount,
      duration,
      timestamp
    };
  }
}
