export type Category = "under_2L" | "above_2L";

export interface AppUser {
  user_id: string;
  name: string;
  role: "member" | "admin";
  categories: Category[];
  active: boolean;
}

export interface CriteriaRow {
  packet_no: string;
  gemstone: string;
  category: Category;
}

export interface NormalEntryInput {
  packet_no: string;
  gemstone: string;
  category: Category;
}

export interface LotEntryInput {
  lot_no: string;
  no_of_pcs: number;
  carat_wt: number;
  entry_date: string; // yyyy-mm-dd
  comments?: string;
  category: Category;
}
