import { create } from "zustand";
import type { BoatClass, Course, Mark, ResolvedLeg } from "../navigation/types";
import { resolveCourseForClass } from "../navigation/courseResolver";

type RaceStore = {
  selectedCourse: Course | null;
  boatClass: BoatClass;
  resolvedLegs: ResolvedLeg[];
  activeLegIndex: number;
  startRace: (course: Course, boatClass: BoatClass, marks: Mark[]) => void;
  nextLeg: () => void;
  previousLeg: () => void;
  resetRace: () => void;
};

export const useRaceStore = create<RaceStore>((set) => ({
  selectedCourse: null,
  boatClass: "cruisers2",
  resolvedLegs: [],
  activeLegIndex: 0,

  startRace: (course, boatClass, marks) =>
    set({
      selectedCourse: course,
      boatClass,
      resolvedLegs: resolveCourseForClass(course, boatClass, marks),
      activeLegIndex: 0,
    }),

  nextLeg: () =>
    set((state) => ({
      activeLegIndex: Math.min(
        state.activeLegIndex + 1,
        Math.max(state.resolvedLegs.length - 1, 0)
      ),
    })),

  previousLeg: () =>
    set((state) => ({
      activeLegIndex: Math.max(state.activeLegIndex - 1, 0),
    })),

  resetRace: () =>
    set({
      activeLegIndex: 0,
    }),
}));