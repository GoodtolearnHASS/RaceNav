import type { Course, Mark } from "./types";

export const sampleMarks: Mark[] = [
  {
    id: "mark-a",
    code: "A",
    name: "Mark A",
    position: { lat: 53.344, lon: -6.18 },
  },
  {
    id: "mark-b",
    code: "B",
    name: "Mark B",
    position: { lat: 53.352, lon: -6.145 },
  },
  {
    id: "mark-c",
    code: "C",
    name: "Mark C",
    position: { lat: 53.337, lon: -6.11 },
  },
  {
    id: "mark-d",
    code: "D",
    name: "Mark D",
    position: { lat: 53.326, lon: -6.155 },
  },
];

export const sampleCourses: Course[] = [
  {
    id: "course-1",
    year: 2025,
    code: "C1",
    name: "Course 1",
    sequence: [
      { markCode: "A", optionalForShortClass: false },
      { markCode: "B", optionalForShortClass: true },
      { markCode: "C", optionalForShortClass: false },
      { markCode: "D", optionalForShortClass: false },
    ],
  },
  {
    id: "course-2",
    year: 2025,
    code: "C2",
    name: "Course 2",
    sequence: [
      { markCode: "D", optionalForShortClass: false },
      { markCode: "B", optionalForShortClass: true },
      { markCode: "A", optionalForShortClass: false },
    ],
  },
];