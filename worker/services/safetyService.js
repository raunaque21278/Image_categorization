const unsafeKeywords =
  require("../config/safetyKeywords");

const UNSAFE_LEVELS =
  ["LIKELY", "VERY_LIKELY"];

const checkSafeSearch =
  (safeSearch) => {
    if (!safeSearch) {
      return null;
    }

    for (const [
      category,
      level
    ] of Object.entries(safeSearch)) {

      if (
        UNSAFE_LEVELS.includes(level)
      ) {
        return {
          flagged: true,
          flaggedCategory: category
        };
      }
    }

    return null;
  };

const checkSafety =
  (safeSearch, labels) => {

    const safeSearchResult =
      checkSafeSearch(safeSearch);

    if (safeSearchResult) {
      return safeSearchResult;
    }

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