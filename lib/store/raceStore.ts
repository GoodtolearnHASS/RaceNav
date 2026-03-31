import { create } from "zustand";
import type { BoatClass, Course, Mark, ResolvedLeg } from "@/lib/navigation/types";
import { resolveCourseForClass } from "@/lib/navigation/courseResolver";

type RaceStore = {
  selectedCourse: Course | null;
  boatClass: BoatClass;
  resolvedLegs: ResolvedLeg[];
  activeLegIndex: number;

  countdownSeconds: number;
  countdownInitialSeconds: number;
  countdownRunning: boolean;
  raceStartedAt: number | null;

  startRace: (course: Course, boatClass: BoatClass, marks: Mark[]) => void;
  nextLeg: () => void;
  previousLeg: () => void;
  resetRace: () => void;

  setCountdownPreset: (seconds: number) => void;
  startCountdown: () => void;
  pauseCountdown: () => void;
  resetCountdown: () => void;
  tickCountdown: () => void;

  startRaceClock: () => void;
  setRaceStartedAt: (timestamp: number | null) => void;
};

export const useRaceStore = create<RaceStore>((set) => ({
  selectedCourse: null,
  boatClass: "cruisers2",
  resolvedLegs: [],
  activeLegIndex: 0,

  countdownSeconds: 600,
  countdownInitialSeconds: 600,
  countdownRunning: false,
  raceStartedAt: null,

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

  setCountdownPreset: (seconds) =>
    set({
      countdownSeconds: seconds,
      countdownInitialSeconds: seconds,
      countdownRunning: false,
    }),

  startCountdown: () =>
    set((state) => ({
      countdownRunning: state.countdownSeconds > 0,
    })),

  pauseCountdown: () =>
    set({
      countdownRunning: false,
    }),

  resetCountdown: () =>
    set((state) => ({
      countdownSeconds: state.countdownInitialSeconds,
      countdownRunning: false,
      raceStartedAt: null,
    })),

  tickCountdown: () =>
    set((state) => {
      if (!state.countdownRunning) return state;

      if (state.countdownSeconds <= 0) {
        return {
          countdownSeconds: 0,
          countdownRunning: false,
        };
      }

      const nextSeconds = state.countdownSeconds - 1;

      return {
        countdownSeconds: nextSeconds,
        countdownRunning: nextSeconds > 0,
      };
    }),

  startRaceClock: () =>
    set({
      raceStartedAt: Date.now(),
      countdownRunning: false,
      countdownSeconds: 0,
    }),

  setRaceStartedAt: (timestamp) =>
    set({
      raceStartedAt: timestamp,
    }),
}));