const express =
  require("express");

const router =
  express.Router();

const auth =
  require("../middleware/auth");

const {
  retryJob
} = require(
  "../controllers/retryController"
);

router.post(
  "/:id",
  auth,
  retryJob
);

module.exports = router;