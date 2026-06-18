const axios = require("axios");
const fs = require("fs");

const classifyImage = async (imagePath) => {
  try {
    const imageBuffer =
      fs.readFileSync(imagePath);

    const response =
      await axios.post(
        "https://router.huggingface.co/hf-inference/models/google/vit-base-patch16-224",
        imageBuffer,
        {
          headers: {
            Authorization: `Bearer ${process.env.HF_API_KEY}`,
            "Content-Type":
              "application/octet-stream"
          }
        }
      );

    console.log(
      "Classification Response:",
      response.data
    );

    return Array.isArray(response.data)
      ? response.data
      : [];

  } catch (error) {

    console.error(
      "Classification Error:",
      error.response?.data ||
      error.message
    );

    return [];
  }
};

module.exports =
  classifyImage;