import { parseText } from './src/parser/parser';

const testData = `10/14/25 Test
Quivira Fig Tree 2022 $29 (3)
2/1/26: 8. Light mineral nose. Light weight Burgundian.
10/24/25: 7. Tart light nose. Floral almost bitter start.
10/25/25: same
//
From a special site in Dry Creek Valley. Lime, mildly herbal. //
`;

const result = parseText(testData);
for (const batch of result.batches) {
  for (const item of batch.items) {
    console.log("Wine:", item.name, item.vintageYear);
    console.log("Tastings found:", item.tastings.length);
    for (let i = 0; i < item.tastings.length; i++) {
      const t = item.tastings[i];
      console.log("  " + (i+1) + ". Rating:", t.rating, "Notes:", t.notes);
    }
    console.log("Seller notes:", item.sellerNotes);
  }
}
