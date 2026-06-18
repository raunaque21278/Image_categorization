const Job =
  require("../models/Job");

const imageQueue =
  require("../queue/imageQueue");

const retryJob =
  async (req, res) => {

    try {

      const job =
        await Job.findOne({
          _id: req.params.id,
          userId: req.user.id
        });

      if (!job) {

        return res.status(404)
          .json({
            message:
              "Job not found"
          });
      }

      job.status =
        "pending";

      job.retryCount =
        0;

      await job.save();

      await imageQueue.add(
        "process-image",
        {
          jobId:
            job._id.toString(),

          userId:
            job.userId.toString(),

          imagePath:
            job.imageUrl
        }
      );

      res.json({
        message:
          "Job requeued"
      });

    } catch (error) {

      res.status(500)
        .json({
          message:
            "Server Error"
        });
    }
};

module.exports = {
  retryJob
};