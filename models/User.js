import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: false, unique: true },
    password: { type: String, required: false},
    isBlocked: { type: Boolean, default: false },
    authMethod: {
      type: String,
      enum: ['local', 'google'],
      default: 'local',
    },
    role: { type: String, default: 'user' },
    isVerified: { type: Boolean, default: false },
    googleId: { type: String, default: null }, 
    wallet: { type: Number, default: 0 },
    otp: { type: String, default: null }, 
    otpExpiry: { type: Date, default: null }, 
    resetPasswordToken: {type: String,default:null},
    resetPasswordExpiry: {type:Number,default:null},
    tempEmail: { type: String },
    emailOtp: { type: String }
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
      next();
  } catch (error) {
      next(error);
  }
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model("User", userSchema);
export default User;

