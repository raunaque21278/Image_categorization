const axios =
  require("axios");

const API_URL =
  process.env.API_URL ||
  "http://localhost:5000";

const notifyJobCompleted =
  async (job) => {

    await axios.post(
      `${API_URL}/api/socket/job-completed`,
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
