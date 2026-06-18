const express = require("express");

const router = express.Router();

const imageQueue = require(
  "../queue/imageQueue"
);

router.get(
  "/queue-count",
  async (req, res) => {
    const waiting =
      await imageQueue.getWaitingCount();

    const active =
      await imageQueue.getActiveCount();

    const completed =
      await imageQueue.getCompletedCount();

    res.json({
      waiting,
      active,
      completed
    });
  }
);

module.exports = router;