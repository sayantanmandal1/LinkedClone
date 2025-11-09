import mongoose, { Document, Schema } from 'mongoose';

// Message status type
export type MessageStatus = 'sent' | 'delivered' | 'seen';

// Message document interface
export interface MessageDocument extends Document {
  _id: mongoose.Types.ObjectId;
  conversationId: mongoose.Types.ObjectId;
  sender: mongoose.Types.ObjectId;
  content: string;
  status: MessageStatus;
  deliveredAt?: Date;
  seenAt?: Date;
  createdAt: Date;
  expiresAt: Date;
}

const messageSchema = new Schema<MessageDocument>(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
      required: [true, 'Conversation ID is required'],
      index: true,
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Sender is required'],
      index: true,
    },
    content: {
      type: String,
      required: [true, 'Message content is required'],
      trim: true,
      maxlength: [2000, 'Message cannot exceed 2000 characters'],
      minlength: [1, 'Message must have at least 1 character'],
    },
    status: {
      type: String,
      enum: ['sent', 'delivered', 'seen'],
      default: 'sent',
      required: true,
    },
    deliveredAt: {
      type: Date,
    },
    seenAt: {
      type: Date,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: {
      transform: function (_doc, ret) {
        const { __v, ...cleanRet } = ret;
        return cleanRet;
      },
    },
  }
);

// Compound index for fetching conversation messages ordered by creation time
messageSchema.index({ conversationId: 1, createdAt: -1 });

// Index for message status updates
messageSchema.index({ sender: 1, status: 1 });

// TTL index for automatic deletion after 30 days
// MongoDB will automatically delete documents when expiresAt date is reached
messageSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Pre-save hook to set expiresAt if not already set
messageSchema.pre('save', function (next) {
  if (!this.expiresAt) {
    // Set expiration to 30 days from creation
    const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
    this.expiresAt = new Date(Date.now() + thirtyDaysInMs);
  }
  next();
});

export const Message = mongoose.model<MessageDocument>('Message', messageSchema);
