const checkSafety =
  require("../services/safetyService");

describe("checkSafety", () => {

  test("flags LIKELY SafeSearch category", () => {
    const result =
      checkSafety(
        {
          adult: "LIKELY",
          violence: "UNLIKELY"
        },
        []
      );

    expect(result.flagged).toBe(true);
    expect(result.flaggedCategory).toBe("adult");
  });

  test("flags VERY_LIKELY SafeSearch category", () => {
    const result =
      checkSafety(
        {
          violence: "VERY_LIKELY"
        },
        []
      );

    expect(result.flagged).toBe(true);
    expect(result.flaggedCategory).toBe("violence");
  });

  test("returns safe when all SafeSearch levels are safe", () => {
    const result =
      checkSafety(
        {
          adult: "UNLIKELY",
          violence: "VERY_UNLIKELY"
        },
        ["Dog", "Pet"]
      );

    expect(result.flagged).toBe(false);
  });

  test("flags unsafe keyword in labels", () => {
    const result =
      checkSafety(
        {},
        ["Weapon", "Metal"]
      );

    expect(result.flagged).toBe(true);
    expect(result.flaggedCategory).toBe("unsafe-content");
  });
});
