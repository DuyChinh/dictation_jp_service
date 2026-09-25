import mongoose, { Document, Schema } from "mongoose";

/** First answer a user gave to a listening (multiple-choice) question; later answers don't replace it. */
export interface IListeningAnswer extends Document {
  userId: mongoose.Types.ObjectId;
  lessonId: string;
  questionId: string;
  choiceId: string;
  correct: boolean;
  correctChoiceId: string | null;
  answeredAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const listeningAnswerSchema = new Schema<IListeningAnswer>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    lessonId: {
      type: String,
      required: true,
    },
    questionId: {
      type: String,
      required: true,
    },
    choiceId: {
      type: String,
      required: true,
    },
    correct: {
      type: Boolean,
      required: true,
    },
    correctChoiceId: {
      type: String,
      default: null,
    },
    answeredAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

listeningAnswerSchema.index({ userId: 1, lessonId: 1, questionId: 1 }, { unique: true });

export const ListeningAnswer = mongoose.model<IListeningAnswer>("ListeningAnswer", listeningAnswerSchema);
