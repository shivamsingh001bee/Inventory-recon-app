export interface AppUser {
  user_id: string;
  name: string;
  role: "member" | "admin";
  active: boolean;
}

export interface CriteriaOptions {
  gemstones: string[];
  locations: string[];
}

export interface NormalEntrySubmission {
  packet_no: string;
  gemstone: string;
  entry_numbers: string[];
}

export interface LotEntryInput {
  lot_no: string;
  no_of_pcs: number;
  carat_wt: number;
  entry_date: string; // yyyy-mm-dd
  comments?: string;
  location: string;
  gemstone: string;
}

export interface NoPktEntrySubmission {
  location: string;
  gemstone: string;
  entry_numbers: string[];
}
