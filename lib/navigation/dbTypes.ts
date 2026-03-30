export type DbMark = {
  id: string;
  code: string;
  key: string | null;
  name: string;
  shape: string | null;
  colour: string | null;
  latitude_decimal: number | null;
  longitude_decimal: number | null;
  latitude_dmm: string | null;
  longitude_dmm: string | null;
  type: string;
  notes: string | null;
};

export type DbCourse = {
  id: string;
  code: string;
  family: string;
  family_name: string;
  bearing_deg: number;
  course_number: number;
  displayed_distance_long_nm: number | null;
  displayed_distance_short_nm: number | null;
  raw_sequence: string;
};

export type DbCourseLeg = {
  id: string;
  course_id: string;
  leg_order: number;
  token: string;
  mark_code: string;
  rounding_side: "port" | "starboard" | null;
  optional_for_short_class: boolean;
};