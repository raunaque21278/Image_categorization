const express =
  require("express");

const router =
  express.Router();

const {
  getIO
} = require(
  "../sockets/socket"
);

router.post(
  "/job-completed",
  async (req, res) => {

    const {
      userId,
      jobId,
      status,
      caption,
      labels,
      flagged,
      flaggedCategory
    } = req.body;

    const io =
      getIO();

    io.to(String(userId)).emit(
      "job-completed",
      {
        jobId,
        status,
        caption,
        labels,
        flagged,
        flaggedCategory
      }
    );

    return res.json({
      success: true
    });
  }
);

module.exports = router;