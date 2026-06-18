const axios = require("axios");
const fs = require("fs");
const mime = require("mime-types");

const detectObjects = async (imagePath) => {
  try {
    const imageBuffer = fs.readFileSync(imagePath);

    const contentType =
      mime.lookup(imagePath) || "image/jpeg";

    const response = await axios.post(
      "https://router.huggingface.co/hf-inference/models/facebook/detr-resnet-50",
      imageBuffer,
      {
        headers: {
          Authorization: `Bearer ${process.env.HF_API_KEY}`,
          "Content-Type": contentType
        }
      }
    );

    return Array.isArray(response.data)
      ? response.data
      : [];

  } catch (error) {

    console.error(
      "Detection Error:",
      error.response?.data ||
      error.message
    );

    return [];
  }
};

module.exports = detectObjects;