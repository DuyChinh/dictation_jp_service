import mongoose, { Schema } from "mongoose";

/** One counter per hour. No IP addresses, URLs or visitor identifiers are stored. */
const trafficHourSchema = new Schema<{ _id: Date; views: number }>({
  _id: { type: Date, required: true },
  views: { type: Number, required: true, default: 0 },
}, { versionKey: false });

export const TrafficHour = mongoose.model("TrafficHour", trafficHourSchema);
