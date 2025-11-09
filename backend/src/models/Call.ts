import mongoose, { Document, Schema } from 'mongoose';

// Call status type
export type CallStatus = 'initiated' | 'ringing' | 'connected' | 'ended' | 'declined' | 'missed';

// Call type
export type CallType = 'voice' | 'video';

// Call document interface
export interface CallDocument extends Document {
  _id: mongoose.Types.ObjectId;
  callId: string;
  caller: mongoose.Types.ObjectId;
  recipient: mongoose.Types.ObjectId;
  callType: CallType;
  status: CallStatus;
  startedAt?: Date;
  endedAt?: Date;
  duration: number; // in seconds
  createdAt: Date;
  updatedAt: Date;
}

const callSchema = new Schema<CallDocument>(
  {
    callId: {
      type: String,
      required: [true, 'Call ID is required'],
      unique: true,
      index: true,
    },
    caller: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Caller is required'],
      index: true,
    },
    recipient: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Recipient is required'],
      index: true,
    },
    callType: {
      type: String,
      enum: ['voice', 'video'],
      required: [true, 'Call type is required'],
    },
    status: {
      type: String,
      enum: ['initiated', 'ringing', 'connected', 'ended', 'declined', 'missed'],
      default: 'initiated',
      required: true,
      index: true,
    },
    startedAt: {
      type: Date,
    },
    endedAt: {
      type: Date,
    },
    duration: {
      type: Number,
      default: 0,
      min: [0, 'Duration cannot be negative'],
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (_doc, ret) {
        const { __v, ...cleanRet } = ret;
        return cleanRet;
      },
    },
  }
);

// Compound index for fetching user's call history
callSchema.index({ caller: 1, createdAt: -1 });
callSchema.index({ recipient: 1, createdAt: -1 });

// Compound index for call status queries
callSchema.index({ status: 1, createdAt: -1 });

// Pre-save hook to calculate duration when call ends
callSchema.pre('save', function (next) {
  if (this.isModified('endedAt') && this.startedAt && this.endedAt) {
    // Calculate duration in seconds
    this.duration = Math.floor((this.endedAt.getTime() - this.startedAt.getTime()) / 1000);
  }
  next();
});

export const Call = mongoose.model<CallDocument>('Call', callSchema);
