const classifyImage =
  require("./classificationService");

const analyzeImage =
  require("./visionService");

const checkSafety =
  require("./safetyService");

const buildCaption =
  (labels) => {
    if (labels.includes("Dog")) {
      return "A dog is visible in the image.";
    }

    if (labels.includes("Cat")) {
      return "A cat is visible in the image.";
    }

    if (labels.length === 0) {
      return "No caption generated";
    }

    return `Image contains ${labels
      .slice(0, 3)
      .join(", ")}`;
  };

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

    const caption =
      buildCaption(uniqueLabels);

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