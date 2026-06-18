require("dotenv").config();

const { Worker } =
  require("bullmq");

const connectDB =
  require("./config/db");

const redisConnection =
  require("./config/redis");

const Job =
  require("./models/Job");

const handleJob =
  require("./workers/imageWorker");

connectDB();

const worker =
  new Worker(
    "image-processing",
    handleJob,
    {
      connection:
        redisConnection
    }
  );

worker.on(
  "completed",
  (job) => {

    console.log(
      `Job ${job.id} completed`
    );
  }
);

worker.on(
  "failed",

  async (
    queueJob,
    error
  ) => {

    console.log(
      `Job ${queueJob.id} failed`
    );

    const dbJob =
      await Job.findById(
        queueJob.data.jobId
      );

    if (dbJob) {

      const attemptsMade =
        queueJob.attemptsMade;

      const maxAttempts =
        queueJob.opts.attempts;

      if (
        attemptsMade >=
        maxAttempts
      ) {

        dbJob.status =
          "failed";

        dbJob.errorMessage =
          error.message;

        await dbJob.save();

        console.log(
          "Marked Failed"
        );

      } else {

        console.log(
          `Retry ${attemptsMade}/${maxAttempts}`
        );
      }
    }
  }
);

console.log(
  "Worker Service Started"
);