import { extractDataFromText } from './lib/extraction.js';
import { matchParcel } from './lib/matching.js';

async function testRajasthanFormat() {
  const mockRecords = [
    { plot_id: "2", owner_name: "Suresh Kumar Sharma", aadhaar_number: "222233334444", area_record: 2.50 }
  ];
  const ocrText = `
GOVERNMENT OF RAJASTHAN,
DEPARTMENT OF REVENUE
HISTORICAL RECORD OF OWNERSHIP & LEASE (Jamabandi - Past)
District: Jaipur (Demo), Tehsil: Sanganer (Demo), Village: Rampura (Demo)
Khasra/Plot No.: 2 (matching current ROR) Total Area: 2.50 Hectares GPS Coordinates: Latitude: 26.8125° N, 75.7832° E, Latitude: 26.8130° N, 75.7836° E
S.No. Name of Past Holder Father's Name Type of Right Lease/Tenure Period (Start) (End) Transfer Document No. Remarks
1 Suresh Kumar Sharma Ramchandra Sharma Khatedar Owner [Transition from Current] [Current ROR] Sale Deed 123/2024 (Transition to current ROR)
2 Geeta Devi W/o Dinesh Kumar Dinesh Kumar Khatedar Owner 01/01/2019 31/12/2023 Sale Deed 202/2019 (Sold to Entry 1)
3 Rampura Village Cooperative Society Ltd. - (Society) Village Leaseholder 01/01/2010 31/12/2018 Lease Agreement 50/2010 (Lease for community farming)
4 Mahendra Singh S/o Late Partap Singh Late Partap Singh Khatedar Owner 01/01/2000 31/12/2009 Succession Certificate 10/2000 (Inherited from father)
5 Partap Singh S/o Late Kanhaiya Lal Late Kanhaiya Lal Allotted Khatedar Owner 15/08/1975 31/12/1999 Revenue Allotment Order 300/1975 (Government Land Allotment)
  `;

  console.log("--- Testing Rajasthan Extraction ---");
  const extracted = await extractDataFromText(ocrText);
  const matchResult = matchParcel({
    plot_id: "2",
    area_map: 2.50,
    owner_name_map: "Suresh Kumar Sharma",
    aadhaar_number: "222233334444" // Correct
  } as any, mockRecords);
  console.log("Match Result (Matches):", matchResult.status);

  const mismatchResult = matchParcel({
    plot_id: "2",
    area_map: 2.50,
    owner_name_map: "Suresh Kumar Sharma",
    aadhaar_number: "999988887777" // Wrong Person
  } as any, mockRecords);
  console.log("Match Result (Aadhaar Mismatch):", mismatchResult.status);
}

testRajasthanFormat();
