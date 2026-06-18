const mongoose = require("mongoose");

const connectDB = async () => {
  const maxAttempts = 10;
  const delayMs = 3000;

  for (
    let attempt = 1;
    attempt <= maxAttempts;
    attempt++
  ) {
    try {
      await mongoose.connect(
        process.env.MONGO_URI
      );

      console.log("MongoDB Connected");
      return;
    } catch (error) {
      console.error(
        `MongoDB attempt ${attempt} failed:`,
        error.message
      );

      if (attempt === maxAttempts) {
        process.exit(1);
      }

      await new Promise(
        (resolve) =>
          setTimeout(resolve, delayMs)
      );
    }
  }
};

module.exports = connectDB;
