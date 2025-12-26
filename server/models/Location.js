import mongoose from "mongoose";

const LocationSchema = new mongoose.Schema({
  lat: { type: Number, required: true },
  lon: { type: Number, required: true },
  altitude: Number,
  velocity: Number,
  timestamp: { type: Date, default: Date.now }
});

// Index for fast latest lookup
LocationSchema.index({ timestamp: -1 });

export default mongoose.model("Location", LocationSchema);
