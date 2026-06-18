const classifyImage =
  require("./classificationService");

const analyzeImage =
  require("./visionService");

const generateCaption =
  require("./captionService");

const checkSafety =
  require("./safetyService");

const processImage =
  async (imagePath) => {

    // Hugging Face Classification
    const classifications =
      await classifyImage(
        imagePath
      );

    // Google Vision Analysis
    const visionResult =
      await analyzeImage(
        imagePath
      );

    // HF Labels
    const hfLabels =
      classifications.map(
        (item) => item.label
      );

    // Vision Labels
    const visionLabels =
      visionResult.labels.map(
        (item) =>
          item.description
      );

    // Vision Objects
    const objectLabels =
      visionResult.objects.map(
        (item) =>
          item.name
      );

    // Merge Everything
    const uniqueLabels =
      [...new Set([
        ...hfLabels,
        ...visionLabels,
        ...objectLabels
      ])];

    // Safety Check
    const safety =
      checkSafety(
        uniqueLabels
      );

    let caption;

    try {

      caption =
        await generateCaption(
          imagePath
        );

    } catch {

      if (
        uniqueLabels.includes("Dog")
      ) {

        caption =
          "A dog is visible in the image.";

      } else if (
        uniqueLabels.includes("Cat")
      ) {

        caption =
          "A cat is visible in the image.";

      } else {

        caption =
          `Image contains ${uniqueLabels
            .slice(0, 3)
            .join(", ")}`;
      }
    }

    return {

      caption,

      labels:
        uniqueLabels,

      huggingFace:
        hfLabels,

      googleVision:
        visionLabels,

      objects:
        objectLabels,

      safeSearch:
        visionResult.safeSearch,

      flagged:
        safety.flagged,

      flaggedCategory:
        safety.flaggedCategory
    };
};

module.exports =
  processImage;