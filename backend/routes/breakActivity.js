const express = require("express");
const router = express.Router();
const BreakActivity = require("../models/breakActivity");
const authenticateToken = require("../middleware/authenticateJWT");

// Create a new break activity
router.post("/", authenticateToken, async (req, res) => {
  ("Received body:", req.body);
  try {
    const { type, feedback, timestamp, duration } = req.body;
    const userId = req.user.id;

    const newActivity = new BreakActivity({
      userId,
      type,
      feedback,
      timestamp,
      duration,
    });

    const savedActivity = await newActivity.save();
    res.status(201).json(savedActivity);
  } catch (err) {
    console.error("Error creating break activity:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get all break activities for a user (optional date filter)
router.get("/", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate } = req.query;
    const filter = { userId };

    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) filter.timestamp.$lte = new Date(endDate);
    }

    const breaks = await BreakActivity.find(filter).sort({ timestamp: -1 });
    res.status(200).json(breaks);
  } catch (err) {
    console.error("Error fetching break activities:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get a specific break activity by ID
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const activityId = req.params.id;

    const activity = await BreakActivity.findOne({ _id: activityId, userId });
    if (!activity) {
      return res.status(404).json({ error: "Break activity not found" });
    }

    res.status(200).json(activity);
  } catch (err) {
    console.error("Error fetching break activity:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update a break activity by ID
router.put("/:id", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const activityId = req.params.id;
    const { type, feedback, timestamp, duration } = req.body;

    const updatedActivity = await BreakActivity.findOneAndUpdate(
      { _id: activityId, userId },
      { type, feedback, timestamp, duration },
      { new: true, runValidators: true }
    );

    if (!updatedActivity) {
      return res.status(404).json({ error: "Break activity not found" });
    }

    res.status(200).json(updatedActivity);
  } catch (err) {
    console.error("Error updating break activity:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete a break activity by ID
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const activityId = req.params.id;

    const deletedActivity = await BreakActivity.findOneAndDelete({
      _id: activityId,
      userId,
    });

    if (!deletedActivity) {
      return res.status(404).json({ error: "Break activity not found" });
    }

    res.status(200).json({ message: "Break activity deleted successfully" });
  } catch (err) {
    console.error("Error deleting break activity:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
