import mongoose, { Document, Schema } from "mongoose";

/** One user's flashcard decks and cards, kept as a single document and merged by id on every sync. */
export interface IFlashcardSet extends Document {
  userId: mongoose.Types.ObjectId;
  decks: unknown[];
  cards: unknown[];
  updatedAt: Date;
}

const flashcardSetSchema = new Schema<IFlashcardSet>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    decks: { type: [Schema.Types.Mixed], default: [] },
    cards: { type: [Schema.Types.Mixed], default: [] },
  },
  { timestamps: true, minimize: false },
);

export const FlashcardSet = mongoose.model<IFlashcardSet>("FlashcardSet", flashcardSetSchema);
