const axios =
  require("axios");

const notifyJobCompleted =
  async (job) => {

    await axios.post(
      "http://localhost:5000/api/socket/job-completed",
      {
        userId:
          job.userId.toString(),

        jobId:
          job._id.toString(),

        status:
          job.status,

        caption:
          job.caption,

        labels:
          job.labels,

        flagged:
          job.flagged,

        flaggedCategory:
          job.flaggedCategory
      }
    );
};

module.exports =
  notifyJobCompleted;