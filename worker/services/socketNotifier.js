const axios =
  require("axios");

const getApiUrl =
  () => {
    let apiUrl =
      process.env.API_URL ||
      "http://localhost:5000";

    if (
      !apiUrl.startsWith("http")
    ) {
      apiUrl =
        `https://${apiUrl}`;
    }

    return apiUrl;
  };

const notifyJobCompleted =
  async (job) => {

    await axios.post(
      `${getApiUrl()}/api/socket/job-completed`,
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
