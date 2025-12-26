/* server.js */
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import axios from "axios";
import dotenv from "dotenv";
import Location from "./models/Location.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const mongoURL = process.env.MONGO_URL;

/* DATABASE CONNECTION & RESET */
mongoose.connect(mongoURL)
  .then(async () => {
    console.log("✅ MongoDB Connected");
    // FRESH START: Wipe collection on server start
    await Location.deleteMany({});
    console.log("🧹 Database cleared for fresh session");
    
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch(err => console.error("❌ MongoDB Error:", err.message));

/* BACKGROUND ISS FETCHER */
const ISS_API = "https://api.wheretheiss.at/v1/satellites/25544";
const MAX_POINTS = 200; // Reduced for performance

setInterval(async () => {
  try {
    const { data } = await axios.get(ISS_API);
    
    // Create new point
    await Location.create({
      lat: data.latitude,
      lon: data.longitude,
      altitude: data.altitude,
      velocity: data.velocity,
      timestamp: new Date()
    });

    // Efficiently trim old points (Keep only last MAX_POINTS)
    const count = await Location.countDocuments();
    if (count > MAX_POINTS) {
      const oldest = await Location.findOne().sort({ timestamp: 1 });
      await Location.deleteOne({ _id: oldest._id });
    }

    console.log(`📡 Logged: ${data.latitude.toFixed(2)}, ${data.longitude.toFixed(2)}`);
  } catch (err) {
    console.error("❌ ISS API Error:", err.message);
  }
}, 5000);

/* API ENDPOINTS */
app.get("/api/iss-latest", async (req, res) => {
  try {
    const latest = await Location.findOne().sort({ timestamp: -1 }).lean();
    if (!latest) return res.status(404).json({ message: "No data" });
    res.json(latest);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/iss-history", async (req, res) => {
  try {
    const history = await Location.find().sort({ timestamp: 1 }).lean();
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
