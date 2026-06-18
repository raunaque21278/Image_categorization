const unsafeKeywords =
  require("../config/safetyKeywords");

const checkSafety =
  (labels) => {

    const unsafeLabel =
      labels.find(
        (label) =>
          unsafeKeywords.includes(
            label.toLowerCase()
          )
      );

    return {
      flagged:
        !!unsafeLabel,

      flaggedCategory:
        unsafeLabel
          ? "unsafe-content"
          : ""
    };
};

module.exports =
  checkSafety;