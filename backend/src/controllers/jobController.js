const Job = require("../models/Job");
const imageQueue = require(
  "../queue/imageQueue"
);
const uploadImage = async (
  req,
  res
) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: "No file uploaded"
      });
    }

    const job = await Job.create({
      userId: req.user.id,

      imageUrl: req.file.path,

      status: "pending"
    });

    await imageQueue.add(
      "process-image",
      {
        jobId: job._id.toString(),

        userId: req.user.id,

        imagePath: req.file.path
      },
      {
        attempts: 3,

        backoff: {
          type: "exponential",
          delay: 3000
        }
      }
    );

    return res.status(201).json({
      message:
        "Image uploaded and queued",

      jobId: job._id,

      status: job.status
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Server Error"
    });
  }
};

const getJobs = async (
  req,
  res
) => {
  try {
    const jobs = await Job.find({
      userId: req.user.id
    }).sort({
      createdAt: -1
    });

    res.json(jobs);
  } catch (error) {
    res.status(500).json({
      message: "Server Error"
    });
  }
};

const getJobById = async (
  req,
  res
) => {
  try {
    const job = await Job.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!job) {
      return res.status(404).json({
        message: "Job not found"
      });
    }

    res.json(job);
  } catch (error) {
    res.status(500).json({
      message: "Server Error"
    });
  }
};

module.exports = {
  uploadImage,
  getJobs,
  getJobById
};