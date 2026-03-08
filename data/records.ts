// Sample CSV-equivalent data representing official land records
// This simulates records from a government database
// Includes intentional discrepancies for testing matching logic

export interface LandRecord {
  id?: string; // Database ID
  plot_id: string;
  owner_name: string;
  aadhaar_number?: string;
  area_record: number; // in hectares
  north?: number;
  south?: number;
  east?: number;
  west?: number;
}

export const landRecords: LandRecord[] = [
  { plot_id: "1", owner_name: "Amit", aadhaar_number: "111122223333", area_record: 0.39 },
  { plot_id: "2", owner_name: "Suresh Kumar Sharma", aadhaar_number: "222233334444", area_record: 2.50 },
  { plot_id: "3", owner_name: "Deepak", aadhaar_number: "333344445555", area_record: 0.53 },

  // area mismatch
  { plot_id: "4", owner_name: "Suresh", aadhaar_number: "444455556666", area_record: 2.85 },

  { plot_id: "5", owner_name: "Rakesh", aadhaar_number: "555566667777", area_record: 0.47 },
  { plot_id: "6", owner_name: "Ramesh", aadhaar_number: "666677778888", area_record: 0.85 },

  // owner mismatch
  { plot_id: "7", owner_name: "Basavaraj M", aadhaar_number: "777788889999", area_record: 0.83 },

  { plot_id: "8", owner_name: "Rajesh", aadhaar_number: "888899990000", area_record: 0.94 },

  // area mismatch
  { plot_id: "9", owner_name: "Chandan", aadhaar_number: "999900001111", area_record: 2.01 },

  { plot_id: "10", owner_name: "Arjun", aadhaar_number: "101020203030", area_record: 0.51 },

  { plot_id: "11", owner_name: "Suresh", aadhaar_number: "444455556666", area_record: 0.66 },
  { plot_id: "12", owner_name: "Suresh", aadhaar_number: "444455556666", area_record: 0.40 },

  // matched
  { plot_id: "13", owner_name: "Rajesh", aadhaar_number: "888899990000", area_record: 0.68 },
  { plot_id: "14", owner_name: "Rakesh", aadhaar_number: "555566667777", area_record: 1.48 },
  { plot_id: "15", owner_name: "Rajesh", aadhaar_number: "888899990000", area_record: 0.39 },

  // owner mismatch
  { plot_id: "16", owner_name: "Girish", aadhaar_number: "161626263636", area_record: 0.65 },

  // matched
  { plot_id: "17", owner_name: "Vijay", aadhaar_number: "171727273737", area_record: 0.36 },
  { plot_id: "18", owner_name: "Ramesh", aadhaar_number: "222233334444", area_record: 0.29 },
  { plot_id: "19", owner_name: "Chandan", aadhaar_number: "999900001111", area_record: 0.25 },
  { plot_id: "20", owner_name: "Rajesh", aadhaar_number: "888899990000", area_record: 0.16 },

  // mismatch
  { plot_id: "21", owner_name: "Eshan", aadhaar_number: "212131314141", area_record: 1.75 },
  { plot_id: "22", owner_name: "Rahul", aadhaar_number: "222232324242", area_record: 0.18 },
  { plot_id: "23", owner_name: "Rahul", aadhaar_number: "222232324242", area_record: 0.24 },

  { plot_id: "24", owner_name: "Arjun", area_record: 1.75 },
  { plot_id: "25", owner_name: "Rakesh", area_record: 0.47 },

  // matched
  { plot_id: "27", owner_name: "Ramesh", area_record: 0.36 },
  { plot_id: "28", owner_name: "Bharat", area_record: 0.33 },
  { plot_id: "29", owner_name: "Chandan", area_record: 0.63 },

  // mismatch
  { plot_id: "31", owner_name: "Rajesh", area_record: 1.75 },
  { plot_id: "32", owner_name: "Rajesh", area_record: 0.39 },

  { plot_id: "33", owner_name: "Mohan", area_record: 1.75 },
  { plot_id: "34", owner_name: "Deepak", area_record: 1.75 },

  // matched big parcels
  { plot_id: "35", owner_name: "Rahul", area_record: 3.66 },
  { plot_id: "36", owner_name: "Rahul", area_record: 3.55 },

  { plot_id: "38", owner_name: "Saurav", area_record: 0.55 },
  { plot_id: "39", owner_name: "Vijay", area_record: 0.30 },

  // matched
  { plot_id: "41", owner_name: "Vijay", area_record: 0.24 },

  // area mismatch
  { plot_id: "42", owner_name: "Rakesh", area_record: 0.87 },

  { plot_id: "43", owner_name: "Mohan", area_record: 2.75 },
  { plot_id: "44", owner_name: "Rahul", area_record: 1.75 },

  { plot_id: "46", owner_name: "Ramesh", area_record: 1.75 },
  { plot_id: "47", owner_name: "Rajesh", area_record: 0.20 },

  { plot_id: "48", owner_name: "Vijay", area_record: 1.75 },

  { plot_id: "49", owner_name: "Deepak", area_record: 0.28 },

  { plot_id: "50", owner_name: "Krishna", area_record: 1.26 },

  { plot_id: "51", owner_name: "Vijay", area_record: 0.83 },

  { plot_id: "52", owner_name: "Saurav", area_record: 1.75 },

  { plot_id: "53", owner_name: "Krishna", area_record: 0.15 },

  { plot_id: "54", owner_name: "Rakesh", area_record: 1.75 },

  { plot_id: "55", owner_name: "Krishna", area_record: 2.75 },

  { plot_id: "56", owner_name: "Deepak", area_record: 1.12 },

  { plot_id: "57", owner_name: "Rahul", area_record: 0.38 },
];
