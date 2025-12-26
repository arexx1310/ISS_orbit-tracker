import mongoose from "mongoose";

const locationSchema = new mongoose.Schema(
  {
    lat: { type: Number, required: true },
    lon: { type: Number, required: true },
    altitude: { type: Number, required: true },
    velocity: { type: Number, required: true },
    timestamp: { type: Date, default: Date.now },
  },
  { 
    // Capped at ~10MB or 20,000 documents
    capped: { size: 10485760, max: 20000 } 
  }
);

// Indexing the timestamp makes history queries lightning fast
locationSchema.index({ timestamp: -1 });

export default mongoose.model("Location", locationSchema);
