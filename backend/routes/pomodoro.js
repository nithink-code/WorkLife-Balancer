const express = require("express");
const router = express.Router();
const Session = require("../models/Session");
const authenticateToken = require("../middleware/authenticateJWT");

// Start a Pomodoro Session
router.post("/start", authenticateToken, async (req, res) => {
  try {
    const { taskId, workType } = req.body;
    if (!taskId || !workType) {
      return res.status(400).json({ message: "taskId and workType are required" });
    }
    const session = new Session({
      userId: req.user.id,
      taskId,
      workType,
      startTime: Date.now(),
      endTime: null,
    });
    const savedSession = await session.save();
    res.status(201).json(savedSession);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Pause a Session
router.put("/pause/:id", authenticateToken, async (req, res) => {
  try {
    const session = await Session.findOne({ _id: req.params.id, userId: req.user.id });
    if (!session) return res.status(404).json({ message: "Not Found" });
    session.pauseResumeLog.push({ pauseTime: Date.now() });
    await session.save();
    res.json(session);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Resume a Session
router.put("/resume/:id", authenticateToken, async (req, res) => {
  try {
    const session = await Session.findOne({ _id: req.params.id, userId: req.user.id });
    if (!session) return res.status(404).json({ message: "Not Found" });
    const log = session.pauseResumeLog[session.pauseResumeLog.length - 1];
    if (log && !log.resumeTime) {
      log.resumeTime = Date.now();
    }
    await session.save();
    res.json(session);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Stop a Session (with mood and stress levels)
router.put("/stop/:id", authenticateToken, async (req, res) => {
  try {
    const { moodRating, stressLevel } = req.body;
    if (
      typeof moodRating !== "number" ||
      moodRating < 1 ||
      moodRating > 5 ||
      typeof stressLevel !== "number" ||
      stressLevel < 1 ||
      stressLevel > 5
    ) {
      return res.status(400).json({ message: "Mood rating and stress level must be integers between 1 and 5" });
    }

    const session = await Session.findOne({ _id: req.params.id, userId: req.user.id });
    if (!session) return res.status(404).json({ message: "Not Found" });

    session.endTime = Date.now();

    let pauseDuration = 0;
    session.pauseResumeLog.forEach((log) => {
      if (log.pauseTime && log.resumeTime) pauseDuration += log.resumeTime - log.pauseTime;
    });

    session.duration = session.endTime - session.startTime - pauseDuration;
    session.moodRating = moodRating;
    session.stressLevel = stressLevel;

    await session.save();
    res.json(session);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
