import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import axios from "axios";

import Location from "./models/Location.js";

import dotenv from "dotenv";
dotenv.config();

const PORT = process.env.PORT || 5000;
const mongoURL = process.env.MONGO_URL;


const app = express();
app.use(cors());
app.use(express.json());

/* DATABASE CONNECTION*/
mongoose
  .connect(mongoURL)
  .then(() => {
    console.log("✅ MongoDB Connected");
    app.listen(PORT, () =>
      console.log(`🚀 Server running on port ${PORT}`)
    );
  })
  .catch(err => {
    console.error("❌ MongoDB Error:", err.message);
  });

/* BACKGROUND ISS FETCHER */
const ISS_API = "https://api.wheretheiss.at/v1/satellites/25544";
const FETCH_INTERVAL = 5000;
const MAX_POINTS = 20000;

setInterval(async () => {
  try {
    const { data } = await axios.get(ISS_API);

    await Location.create({
      lat: data.latitude,
      lon: data.longitude,
      altitude: data.altitude,
      velocity: data.velocity,
      timestamp: new Date()
    });

    // Prevent unlimited DB growth
    const count = await Location.countDocuments();
    if (count > MAX_POINTS) {
      const excess = count - MAX_POINTS;
      const old = await Location.find()
        .sort({ timestamp: 1 })
        .limit(excess)
        .select("_id");

      await Location.deleteMany({
        _id: { $in: old.map(d => d._id) }
      });
    }

    console.log(
      `📡 ISS saved → ${data.latitude.toFixed(2)}, ${data.longitude.toFixed(2)}`
    );
  } catch (err) {
    console.error("❌ ISS API Error:", err.message);
  }
}, FETCH_INTERVAL);

/* API: LATEST POINT (LIVE)*/
app.get("/api/iss-latest", async (req, res) => {
  try {
    const latest = await Location.findOne()
      .sort({ timestamp: -1 })
      .lean();

    if (!latest) {
      return res.status(404).json({ message: "No ISS data yet" });
    }

    res.json({
      lat: latest.lat,
      lon: latest.lon,
      altitude: latest.altitude,
      velocity: latest.velocity,
      timestamp: latest.timestamp
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* API: HISTORY (OPTIONAL)*/
app.get("/api/iss-history", async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 500;

    const history = await Location.find()
      .sort({ timestamp: 1 })
      .limit(limit)
      .lean();

    res.json(history);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
