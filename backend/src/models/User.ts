import mongoose, { type InferSchemaType } from 'mongoose'

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    passwordHash: { type: String, default: null },
    googleId: { type: String, unique: true, sparse: true },
    avatarUrl: { type: String, default: null },
  },
  { timestamps: true },
)

export type UserDocument = InferSchemaType<typeof userSchema> & {
  _id: mongoose.Types.ObjectId
  createdAt: Date
}

export const User = mongoose.model('User', userSchema)
