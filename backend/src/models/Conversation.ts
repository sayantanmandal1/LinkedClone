import mongoose, { Document, Schema } from 'mongoose';

// Last message subdocument interface
interface LastMessageSubdocument {
  content: string;
  sender: mongoose.Types.ObjectId;
  createdAt: Date;
}

// Conversation document interface
export interface ConversationDocument extends Document {
  _id: mongoose.Types.ObjectId;
  participants: [mongoose.Types.ObjectId, mongoose.Types.ObjectId];
  lastMessage?: LastMessageSubdocument;
  unreadCount: Map<string, number>;
  createdAt: Date;
  updatedAt: Date;
}

// Last message subdocument schema
const lastMessageSchema = new Schema(
  {
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    createdAt: {
      type: Date,
      required: true,
    },
  },
  {
    _id: false, // Don't create _id for subdocument
  }
);

const conversationSchema = new Schema<ConversationDocument>(
  {
    participants: {
      type: [
        {
          type: Schema.Types.ObjectId,
          ref: 'User',
        },
      ],
      required: [true, 'Participants are required'],
      validate: {
        validator: function (v: mongoose.Types.ObjectId[]) {
          return v.length === 2;
        },
        message: 'A conversation must have exactly 2 participants',
      },
    },
    lastMessage: {
      type: lastMessageSchema,
      required: false,
    },
    unreadCount: {
      type: Map,
      of: Number,
      default: () => new Map<string, number>(),
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (_doc, ret) {
        // Convert Map to object for JSON serialization
        if (ret.unreadCount instanceof Map) {
          ret.unreadCount = Object.fromEntries(ret.unreadCount) as any;
        }
        const { __v, ...cleanRet } = ret;
        return cleanRet;
      },
    },
  }
);

// Unique compound index to ensure only one conversation between two users
// Sort participants to ensure consistent ordering
conversationSchema.index({ participants: 1 }, { unique: true });

// Compound index for fetching user's conversations ordered by most recent
conversationSchema.index({ participants: 1, updatedAt: -1 });

// Pre-save hook to ensure participants are sorted for consistent indexing
conversationSchema.pre('save', function (next) {
  if (this.isModified('participants')) {
    // Sort participants by their string representation to ensure consistency
    this.participants.sort((a, b) => a.toString().localeCompare(b.toString()));
  }
  next();
});

// Static method to find or create a conversation between two users
conversationSchema.statics.findOrCreate = async function (
  user1Id: mongoose.Types.ObjectId,
  user2Id: mongoose.Types.ObjectId
) {
  // Sort user IDs to ensure consistent ordering
  const participants = [user1Id, user2Id].sort((a, b) =>
    a.toString().localeCompare(b.toString())
  ) as [mongoose.Types.ObjectId, mongoose.Types.ObjectId];

  let conversation = await this.findOne({ participants });

  if (!conversation) {
    const unreadCountMap = new Map<string, number>();
    unreadCountMap.set(user1Id.toString(), 0);
    unreadCountMap.set(user2Id.toString(), 0);
    
    conversation = await this.create({
      participants,
      unreadCount: unreadCountMap,
    });
  }

  return conversation;
};

// Static method to find conversations with populated participant data
conversationSchema.statics.findWithPopulatedData = function (filter = {}, options = {}) {
  return this.find(filter, null, options)
    .populate('participants', 'name email profilePicture')
    .populate('lastMessage.sender', 'name email profilePicture');
};

export const Conversation = mongoose.model<ConversationDocument>(
  'Conversation',
  conversationSchema
);
