/** A/B/C/D 只用于内部按等级分组，任何界面都不显示这个字母。 */
export type Level = "A" | "B" | "C" | "D";

export interface Student {
  /** 完整学号，例如 "250503"。 */
  id: string;
  name: string;
  /** 点名台的组号 1–4，界面显示为「第一组…第四组」。 */
  group: number;
  /** 学号后两位的数值，例如 3。 */
  no: number;
}

export interface HeartRecord {
  id: string;
  studentId: string;
  createdAt: number;
}

export interface CloudConfig {
  url: string;
  anonKey: string;
}

export type SyncMode = "local" | "cloud";
