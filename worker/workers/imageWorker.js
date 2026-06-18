const path =
  require("path");

const JobRepository =
  require("../repositories/jobRepository");

const processImage =
  require("../services/imagePipelineService");

const notifyJobCompleted =
  require("../services/socketNotifier");

const handleJob =
  async (queueJob) => {

    const {
      jobId,
      imagePath
    } = queueJob.data;

    console.log(
      "Processing:",
      jobId
    );

    const job =
      await JobRepository.findById(
        jobId
      );

    if (!job) {
      throw new Error(
        "Job not found"
      );
    }

    job.status =
      "processing";

    await JobRepository.save(
      job
    );

    const uploadsRoot =
      process.env.UPLOADS_DIR ||
      path.join(
        __dirname,
        "../../backend"
      );

    const fullImagePath =
      path.isAbsolute(imagePath)
        ? imagePath
        : path.join(
            uploadsRoot,
            imagePath
          );

    console.log(
      "Image Path:",
      fullImagePath
    );

    const result =
      await processImage(
        fullImagePath
      );

    job.caption =
      result.caption;

    job.labels =
      result.labels;

    job.flagged =
      result.flagged;

    job.flaggedCategory =
      result.flaggedCategory;

    job.status =
      "completed";

    await JobRepository.save(
      job
    );

    try {

      await notifyJobCompleted(
        job
      );

      console.log(
        "Socket notification sent"
      );

    } catch (error) {

      console.error(
        "Socket notification failed:",
        error.message
      );
    }

    console.log(
      "Completed:",
      jobId
    );

    return true;
};

module.exports =
  handleJob;