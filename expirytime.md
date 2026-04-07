const Session = require("../../models/Session");

exports.createSession = async (req, res) => {
  try {
    const { theaterId, hallId, seatId, seatNumber } = req.body;

    if (!theaterId || !hallId || !seatId || !seatNumber) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const expiryTime = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours

    const session = await Session.create({
      theaterId,
      hallId,
      seatId,
      seatNumber,
      expiresAt: expiryTime,
    });

    res.status(201).json({
      success: true,
      sessionId: session._id,
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const Session = require("../models/Session");

const validateSession = async (req, res, next) => {
  try {
    const sessionId = req.headers["session-id"];

    if (!sessionId) {
      return res.status(401).json({ message: "Session missing" });
    }

    const session = await Session.findById(sessionId);

    if (!session) {
      return res.status(401).json({ message: "Invalid session" });
    }

    if (new Date(session.expiresAt) < new Date()) {
      return res.status(401).json({ message: "Session expired" });
    }

    req.session = session;
    next();

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = validateSession;