const fs = require("fs");
const path = require("path");
const os = require("os");
const axios = require("axios");

const resolveImagePath =
  async (imagePath) => {

    const uploadsRoot =
      process.env.UPLOADS_DIR ||
      path.join(
        __dirname,
        "../../backend"
      );

    let fullImagePath =
      path.isAbsolute(imagePath)
        ? imagePath
        : path.join(
            uploadsRoot,
            imagePath
          );

    if (fs.existsSync(fullImagePath)) {
      return fullImagePath;
    }

    let apiUrl =
      process.env.API_URL ||
      "http://localhost:5000";

    if (
      !apiUrl.startsWith("http")
    ) {
      apiUrl =
        `https://${apiUrl}`;
    }

    const downloadUrl =
      `${apiUrl}/${imagePath.replace(/\\/g, "/")}`;

    const tempPath =
      path.join(
        os.tmpdir(),
        path.basename(imagePath)
      );

    console.log(
      "Downloading image:",
      downloadUrl
    );

    const response =
      await axios.get(
        downloadUrl,
        {
          responseType:
            "arraybuffer"
        }
      );

    fs.writeFileSync(
      tempPath,
      response.data
    );

    return tempPath;
  };

module.exports =
  resolveImagePath;
