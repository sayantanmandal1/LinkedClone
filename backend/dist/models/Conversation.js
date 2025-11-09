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
exports.Conversation = void 0;
const mongoose_1 = __importStar(require("mongoose"));
// Last message subdocument schema
const lastMessageSchema = new mongoose_1.Schema({
    content: {
        type: String,
        required: true,
        trim: true,
        maxlength: 2000,
    },
    sender: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    createdAt: {
        type: Date,
        required: true,
    },
}, {
    _id: false, // Don't create _id for subdocument
});
const conversationSchema = new mongoose_1.Schema({
    participants: {
        type: [
            {
                type: mongoose_1.Schema.Types.ObjectId,
                ref: 'User',
            },
        ],
        required: [true, 'Participants are required'],
        validate: {
            validator: function (v) {
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
        default: () => new Map(),
    },
}, {
    timestamps: true,
    toJSON: {
        transform: function (_doc, ret) {
            // Convert Map to object for JSON serialization
            if (ret.unreadCount instanceof Map) {
                ret.unreadCount = Object.fromEntries(ret.unreadCount);
            }
            const { __v, ...cleanRet } = ret;
            return cleanRet;
        },
    },
});
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
conversationSchema.statics.findOrCreate = async function (user1Id, user2Id) {
    // Sort user IDs to ensure consistent ordering
    const participants = [user1Id, user2Id].sort((a, b) => a.toString().localeCompare(b.toString()));
    let conversation = await this.findOne({ participants });
    if (!conversation) {
        const unreadCountMap = new Map();
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
exports.Conversation = mongoose_1.default.model('Conversation', conversationSchema);
