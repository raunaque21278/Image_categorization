const express = require("express");

const router = express.Router();

const auth = require(
  "../middleware/auth"
);

const upload = require(
  "../middleware/upload"
);

const {
  uploadImage,
  getJobs,
  getJobById
} = require(
  "../controllers/jobController"
);

router.post(
  "/upload",
  auth,
  upload.single("image"),
  uploadImage
);

router.get(
  "/",
  auth,
  getJobs
);

router.get(
  "/:id",
  auth,
  getJobById
);

module.exports = router;