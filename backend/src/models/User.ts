import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import { User as IUser } from '@linkedin-clone/shared';

// Extend the User interface to include password and document methods
export interface UserDocument extends Omit<IUser, '_id'>, Document {
  _id: mongoose.Types.ObjectId;
  password: string;
  profilePicture?: string;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<UserDocument>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters long'],
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        'Please provide a valid email address',
      ],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters long'],
      select: false, // Don't include password in queries by default
    },
    profilePicture: {
      type: String,
      trim: true,
      validate: {
        validator: function(v: string) {
          if (!v) return true; // Optional field
          // Basic URL validation
          return /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i.test(v);
        },
        message: 'Profile picture must be a valid HTTP/HTTPS URL ending with jpg, jpeg, png, gif, or webp',
      },
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (_doc, ret) {
        // Remove password from JSON output
        const { password, __v, ...cleanRet } = ret;
        return cleanRet;
      },
    },
  }
);

// Create unique index for email
userSchema.index({ email: 1 }, { unique: true });

// Hash password before saving
userSchema.pre<UserDocument>('save', async function (next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next();

  try {
    // Hash password with cost of 12
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Instance method to compare password
userSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// Static method to find user by email with password
userSchema.statics.findByEmailWithPassword = function (email: string) {
  return this.findOne({ email }).select('+password');
};

export const User = mongoose.model<UserDocument>('User', userSchema);