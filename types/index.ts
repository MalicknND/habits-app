/** Calendar day in storage and logs. Convention: `YYYY-MM-DD` (local). */
export type DateYMD = string;

/** Time of day for a habit. Convention: `HH:mm` (24h). */
export type TimeHHmm = string;

export interface Habit {
  id: string;
  title: string;
  /** Local time slot, HH:mm */
  time: TimeHHmm;
  /** ISO 8601 timestamp when the habit was created */
  createdAt: string;
}

export interface HabitLog {
  id: string;
  habitId: string;
  /** Local calendar day the log applies to, YYYY-MM-DD */
  date: DateYMD;
  completed: boolean;
}
