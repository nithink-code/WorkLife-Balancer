const express = require("express");
const router = express.Router();
const MoodCheckin = require("../models/moodCheckin");
const authenticateToken = require("../middleware/authenticateJWT");

// Create a mood check-in
router.post("/", authenticateToken, async (req, res) => {
  try {
    const { mood, stress, timestamp } = req.body;
    ('[MoodRoute] 📝 Creating mood check-in:', { mood, stress, timestamp });
    
    // Ensure we have a valid timestamp
    let timeStampValue = timestamp ? new Date(timestamp) : new Date();
    ('[MoodRoute] ⏰ Timestamp being saved:', {
      original: timestamp,
      parsed: timeStampValue.toISOString(),
      unix: timeStampValue.getTime()
    });
    
    const checkin = new MoodCheckin({
      userId: req.user.id,
      mood,
      stress,
      timeStamp: timeStampValue,
    });

    const savedCheckin = await checkin.save();
    ('[MoodRoute] ✅ Mood check-in saved:', {
      _id: savedCheckin._id,
      timeStamp: savedCheckin.timeStamp,
      createdAt: savedCheckin.createdAt
    });
    res.status(201).json(savedCheckin);
  } catch (err) {
    console.error('[MoodRoute] ❌ Error saving mood check-in:', err);
    res.status(400).json({ message: err.message });
  }
});

// Get all mood check-ins for logged in user with optional date filter
router.get("/", authenticateToken, async (req, res) => {
  try {
    const query = { userId: req.user.id };

    if (req.query.startDate || req.query.endDate) {
      query.timeStamp = {};
      if (req.query.startDate) query.timeStamp.$gte = new Date(req.query.startDate);
      if (req.query.endDate) query.timeStamp.$lte = new Date(req.query.endDate);
    }

    const checkins = await MoodCheckin.find(query).sort({ timeStamp: -1 });
    res.json(checkins);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get a single mood check-in by ID
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const checkin = await MoodCheckin.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });
    if (!checkin) {
      return res.status(404).json({ message: "Check-in not found" });
    }
    res.json(checkin);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update a mood check-in by ID
router.put("/:id", authenticateToken, async (req, res) => {
  try {
    const updates = req.body;
    const updatedCheckin = await MoodCheckin.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      updates,
      { new: true, runValidators: true }
    );
    if (!updatedCheckin) {
      return res.status(404).json({ message: "Check-in not found" });
    }
    res.json(updatedCheckin);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete a mood check-in by ID
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const deletedCheckin = await MoodCheckin.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });
    if (!deletedCheckin) {
      return res.status(404).json({ message: "Check-in not found" });
    }
    res.json({ message: "Check-in deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;