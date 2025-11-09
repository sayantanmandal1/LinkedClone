"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Message = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const messageSchema = new mongoose_1.Schema({
    conversationId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Conversation',
        required: [true, 'Conversation ID is required'],
        index: true,
    },
    sender: {
        type: mongoose_1.Schema.Types.ObjectId,
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
}, {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: {
        transform: function (_doc, ret) {
            const { __v, ...cleanRet } = ret;
            return cleanRet;
        },
    },
});
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
exports.Message = mongoose_1.default.model('Message', messageSchema);
