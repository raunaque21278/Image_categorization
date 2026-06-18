const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema(
  {
    userId: mongoose.Schema.Types.ObjectId,
    queueJobId: {
      type: String
    },

    imageUrl: String,

    status: String,

    caption: String,

    labels: [String],

    flagged: Boolean,

    flaggedCategory: String,

    retryCount: Number
  },
  {
    timestamps: true
  }
);

module.exports =
  mongoose.model(
    "Job",
    jobSchema
  );