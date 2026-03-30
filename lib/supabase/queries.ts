import { supabase } from "./client";
import type { DbCourse, DbCourseLeg, DbMark } from "@/lib/navigation/dbTypes";

export async function fetchCourses(): Promise<DbCourse[]> {
  const { data, error } = await supabase
    .from("courses")
    .select("*")
    .order("family", { ascending: true })
    .order("course_number", { ascending: true });

  if (error) throw error;
  return data as DbCourse[];
}

export async function fetchCourseLegs(): Promise<DbCourseLeg[]> {
  const { data, error } = await supabase
    .from("course_legs")
    .select("*")
    .order("course_id", { ascending: true })
    .order("leg_order", { ascending: true });

  if (error) throw error;
  return data as DbCourseLeg[];
}

export async function fetchMarks(): Promise<DbMark[]> {
  const { data, error } = await supabase
    .from("marks")
    .select("*")
    .order("code", { ascending: true });

  if (error) throw error;
  return data as DbMark[];
}