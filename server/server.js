import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import axios from "axios";
import dotenv from "dotenv";
import Location from "./models/Location.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const mongoURL = process.env.MONGO_URL;

app.use(cors());
app.use(express.json());

const ISS_API = "https://api.wheretheiss.at/v1/satellites/25544";
const FETCH_INTERVAL = 5000;

/**
 * BACKGROUND ISS FETCHER
 * Logic: Fetches data every 5s. 
 * Note: Cleanup is handled automatically by the Capped Collection in the Model.
 */
const startISSFetcher = () => {
  console.log("🛰️ ISS Background Fetcher Started");
  
  setInterval(async () => {
    try {
      // 1. Fetch data from API
      const { data } = await axios.get(ISS_API);

      // 2. Save to MongoDB
      await Location.create({
        lat: data.latitude,
        lon: data.longitude,
        altitude: data.altitude,
        velocity: data.velocity,
        timestamp: new Date()
      });

      console.log(`📡 Logged ISS: ${data.latitude.toFixed(2)}, ${data.longitude.toFixed(2)}`);
    } catch (err) {
      console.error("❌ ISS Fetcher Error:", err.message);
    }
  }, FETCH_INTERVAL);
};

/* --- API ROUTES --- */

// GET: The single most recent position
app.get("/api/iss-latest", async (req, res) => {
  try {
    const latest = await Location.findOne().sort({ timestamp: -1 }).lean();

    if (!latest) {
      return res.status(404).json({ message: "No ISS data available yet" });
    }
    res.json(latest);
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

// GET: Historical path (with safety limit)
app.get("/api/iss-history", async (req, res) => {
  try {
    // Convert query to number and set a hard cap of 2000 for safety
    let limit = Math.min(parseInt(req.query.limit) || 500, 2000);

    const history = await Location.find()
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();

    res.json(history);
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

/* --- DATABASE & SERVER START --- */
mongoose
  .connect(mongoURL)
  .then(() => {
    console.log("✅ MongoDB Connected");
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      // Start the fetcher only after the DB is connected
      startISSFetcher();
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB Connection Failed:", err.message);
    process.exit(1);
  });
