const express = require("express");
const router = express.Router();
const authenticateJWT = require("../middleware/authenticateJWT");
const { body, validationResult } = require("express-validator");
const UserAuth = require("../models/Auth");

// Middleware for validation
const validatePreferences = [
  body("theme")
    .optional()
    .isIn(["light", "dark"])
    .withMessage("Theme must be either light or dark"),
  body("notifications.email")
    .optional()
    .isBoolean()
    .withMessage("Email notification must be a boolean"),
  body("notifications.push")
    .optional()
    .isBoolean()
    .withMessage("Push notification must be a boolean"),
  body("pomodoroSettings.workDuration")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Work duration must be a positive integer"),
  body("pomodoroSettings.shortBreakDuration")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Short break duration must be a positive integer"),
  body("pomodoroSettings.longBreakDuration")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Long break duration must be a positive integer"),
];

// Function Validation
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
}

// Get preferences
router.get("/preferences", authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await UserAuth.findById(userId).select("preferences");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user.preferences);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Put preferences
router.put(
  "/preferences",
  authenticateJWT,
  validatePreferences,
  validate,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const updatedPreference = req.body;
      const user = await UserAuth.findById(userId);
      if (!user) return res.status(404).json({ message: "User not found" });
      user.preferences = { ...user.preferences, ...updatedPreference };
      await user.save();
      res.json(user.preferences);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

module.exports = router;
