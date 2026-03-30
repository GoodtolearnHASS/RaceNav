import type { Course, Mark } from "./types";
import type { DbCourse, DbCourseLeg, DbMark } from "./dbTypes";

export function mapDbMarkToMark(mark: DbMark): Mark {
  return {
    id: mark.id,
    code: mark.code,
    name: mark.name,
    position: {
      lat: mark.latitude_decimal ?? 0,
      lon: mark.longitude_decimal ?? 0,
    },
    notes: mark.notes,
  };
}

export function mapDbCourseToCourse(
  course: DbCourse,
  courseLegs: DbCourseLeg[]
): Course {
  const sequence = [...courseLegs]
    .sort((a, b) => a.leg_order - b.leg_order)
    .map((leg) => ({
      markCode: leg.mark_code,
      optionalForShortClass: leg.optional_for_short_class,
    }));

  return {
    id: course.id,
    year: 2025,
    code: course.code,
    name: `${course.family_name} ${course.course_number}`,
    sequence,
  };
}