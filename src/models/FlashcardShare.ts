import mongoose, { Document, Schema } from "mongoose";

/**
 * A deck its owner has made public. Anyone with the share id can read the deck's current cards; the cards
 * themselves stay in the owner's FlashcardSet, so edits show up for everyone straight away.
 */
export interface IFlashcardShare extends Document {
  shareId: string;
  userId: mongoose.Types.ObjectId;
  deckId: string;
  createdAt: Date;
}

const flashcardShareSchema = new Schema<IFlashcardShare>(
  {
    shareId: { type: String, required: true, unique: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    deckId: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

// one public link per deck
flashcardShareSchema.index({ userId: 1, deckId: 1 }, { unique: true });

export const FlashcardShare = mongoose.model<IFlashcardShare>("FlashcardShare", flashcardShareSchema);
