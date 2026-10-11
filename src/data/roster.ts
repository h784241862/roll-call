import type { Student } from "../lib/types";

/**
 * 2505 班花名册。
 *
 * 源文件 `2505花名册-分组打勾表.xlsx` 里是 12 个男女混合的座位组。
 * 点名台不使用座位组，而是按等级重新分成四组：
 * 全部 A → 第一组，全部 B → 第二组，全部 C → 第三组，全部 D → 第四组。
 *
 * `group` 是点名台内部的组号，界面上只显示「第一组…第四组」，
 * 学生的等级字母不会出现在任何页面上。
 */
export const ROSTER: Student[] = [
  { id: "250503", name: "陈立轩", group: 1, no: 3 },
  { id: "250508", name: "李奕凯", group: 1, no: 8 },
  { id: "250520", name: "王思翰", group: 1, no: 20 },
  { id: "250522", name: "吴镛", group: 1, no: 22 },
  { id: "250528", name: "黄诗晴", group: 1, no: 28 },
  { id: "250529", name: "冷依然", group: 1, no: 29 },
  { id: "250534", name: "罗紫馨", group: 1, no: 34 },
  { id: "250539", name: "吴雨桐", group: 1, no: 39 },
  { id: "250540", name: "夏语怡", group: 1, no: 40 },
  { id: "250542", name: "谢雨芯", group: 1, no: 42 },
  { id: "250545", name: "张凌瑶", group: 1, no: 45 },
  { id: "250548", name: "周子程", group: 1, no: 48 },

  { id: "250515", name: "倪仕轩", group: 2, no: 15 },
  { id: "250516", name: "佘承洲", group: 2, no: 16 },
  { id: "250519", name: "王岑", group: 2, no: 19 },
  { id: "250521", name: "文辰瑞", group: 2, no: 21 },
  { id: "250523", name: "肖凯文", group: 2, no: 23 },
  { id: "250525", name: "郑智冲", group: 2, no: 25 },
  { id: "250530", name: "李宛馨", group: 2, no: 30 },
  { id: "250531", name: "李熙雯", group: 2, no: 31 },
  { id: "250538", name: "王嘉蕊", group: 2, no: 38 },
  { id: "250544", name: "詹熙雯", group: 2, no: 44 },
  { id: "250546", name: "周萌依", group: 2, no: 46 },
  { id: "250547", name: "周洋", group: 2, no: 47 },

  { id: "250501", name: "陈嘉豪", group: 3, no: 1 },
  { id: "250506", name: "龚宗铉", group: 3, no: 6 },
  { id: "250509", name: "李懿洲", group: 3, no: 9 },
  { id: "250510", name: "李振轩", group: 3, no: 10 },
  { id: "250512", name: "梁瀚元", group: 3, no: 12 },
  { id: "250513", name: "刘泽澄", group: 3, no: 13 },
  { id: "250514", name: "罗文博", group: 3, no: 14 },
  { id: "250526", name: "陈紫涵", group: 3, no: 26 },
  { id: "250527", name: "胡羽涵", group: 3, no: 27 },
  { id: "250533", name: "刘瑞曦", group: 3, no: 33 },
  { id: "250537", name: "汪紫萱", group: 3, no: 37 },
  { id: "250543", name: "徐欣妍", group: 3, no: 43 },

  { id: "250502", name: "陈锦豪", group: 4, no: 2 },
  { id: "250504", name: "陈震疆", group: 4, no: 4 },
  { id: "250505", name: "邓逸晨", group: 4, no: 5 },
  { id: "250507", name: "胡晨煜", group: 4, no: 7 },
  { id: "250511", name: "李振玥", group: 4, no: 11 },
  { id: "250517", name: "唐皓明", group: 4, no: 17 },
  { id: "250518", name: "陶东阳", group: 4, no: 18 },
  { id: "250524", name: "张权尹", group: 4, no: 24 },
  { id: "250532", name: "刘梦曦", group: 4, no: 32 },
  { id: "250535", name: "聂亦菲", group: 4, no: 35 },
  { id: "250536", name: "史雨昕", group: 4, no: 36 },
  { id: "250541", name: "肖宇馨", group: 4, no: 41 },
];

export const CLASS_NO = "2505";

export const GROUP_LABELS: Record<number, string> = {
  1: "第一组",
  2: "第二组",
  3: "第三组",
  4: "第四组",
};

export const GROUPS = [1, 2, 3, 4] as const;

export function studentsOfGroup(group: number): Student[] {
  return ROSTER.filter((s) => s.group === group);
}

export function byId(id: string): Student | undefined {
  return ROSTER.find((s) => s.id === id);
}

/** 两位学号，例如 3 → "03"。 */
export function studentNoLabel(student: Student): string {
  return String(student.no).padStart(2, "0");
}
