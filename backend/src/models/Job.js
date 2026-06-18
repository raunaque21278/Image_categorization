const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    imageUrl: {
      type: String,
      required: true
    },

    status: {
      type: String,
      enum: [
        "pending",
        "processing",
        "completed",
        "failed"
      ],
      default: "pending"
    },

    caption: {
      type: String,
      default: ""
    },

    queueJobId: {
  type: String
},

    labels: {
      type: [String],
      default: []
    },

    flagged: {
      type: Boolean,
      default: false
    },

    flaggedCategory: {
      type: String,
      default: ""
    },

    retryCount: {
      type: Number,
      default: 0
    },

    errorMessage: {
  type: String,
  default: ""
}

  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model(
  "Job",
  jobSchema
);