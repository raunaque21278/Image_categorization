const vision =
  require("@google-cloud/vision");

const client =
  new vision.ImageAnnotatorClient();

const analyzeImage =
  async (imagePath) => {

    try {

      const [result] =
        await client.annotateImage({

          image: {
            source: {
              filename:
                imagePath
            }
          },

          features: [
            {
              type:
                "LABEL_DETECTION",
              maxResults: 10
            },

            {
              type:
                "OBJECT_LOCALIZATION",
              maxResults: 10
            },

            {
              type:
                "SAFE_SEARCH_DETECTION"
            }
          ]
        });

      return {

        labels:
          result.labelAnnotations || [],

        objects:
          result.localizedObjectAnnotations || [],

        safeSearch:
          result.safeSearchAnnotation || {}
      };

    } catch (error) {

      console.error(
        "Google Vision Error:",
        error.message
      );

      return {
        labels: [],
        objects: [],
        safeSearch: {}
      };
    }
};

module.exports =
  analyzeImage;