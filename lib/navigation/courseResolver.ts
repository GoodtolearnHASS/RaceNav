import type { BoatClass, Course, Mark, ResolvedLeg } from "./types";

export function resolveCourseForClass(
  course: Course,
  boatClass: BoatClass,
  marks: Mark[]
): ResolvedLeg[] {
  const markMap = new Map(marks.map((mark) => [mark.code, mark]));

  const filteredSequence = course.sequence.filter((token) => {
    if (boatClass === "cruisers3") return true;
    return !token.optionalForShortClass;
  });

  const withoutStartingFinish =
    filteredSequence.length > 0 && filteredSequence[0].markCode === "F"
      ? filteredSequence.slice(1)
      : filteredSequence;

  return withoutStartingFinish.map((token, index) => {
    const mark = markMap.get(token.markCode);

    if (!mark) {
      throw new Error(`Missing mark definition for code: ${token.markCode}`);
    }

    return {
      index,
      mark,
    };
  });
}
