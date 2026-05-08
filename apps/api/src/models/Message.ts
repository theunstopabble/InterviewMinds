import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    roomId: {
      type: String,
      required: true,
      index: true,
    },
    senderId: {
      type: String,
      required: true,
      index: true,
    },
    senderName: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
      maxlength: 10000,
    },
    type: {
      type: String,
      enum: ["text", "system", "code"],
      default: "text",
    },
    // For edit history / soft delete
    editedAt: {
      type: Date,
      default: null,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// Compound index for fast room-based pagination queries
messageSchema.index({ roomId: 1, createdAt: -1 });

export const MessageModel = mongoose.model("Message", messageSchema);
