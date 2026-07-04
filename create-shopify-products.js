const https = require('https');

const domain = 'uprint-lab-v2.myshopify.com';
const token = '203c567953e0ed484b891495e1c34608';

const products = [
  { title: "Orange Contrast Rotate", desc: "Bold orange contrast with 360 rotating stand.", price: "24.90", id: 1 },
  { title: "Blue Contrast Rotate", desc: "Vibrant blue contrast with 360 rotating stand.", price: "24.90", id: 2 },
  { title: "Green Contrast Rotate", desc: "Deep green contrast with rotating stand.", price: "24.90", id: 3 },
  { title: "Mint Contrast Rotate", desc: "Refreshing mint contrast with rotating stand.", price: "24.90", id: 4 },
  { title: "Mirror Bowknot Series", desc: "Real mirror face with 3D bowknot detail.", price: "22.80", id: 5 },
  { title: "Blue Floral Charm", desc: "Hand-painted blue floral patterns with bow accent.", price: "19.50", id: 6 },
  { title: "Sweet Pink Pearl", desc: "High-quality romantic pink case with 3D texture.", price: "26.00", id: 7 },
  { title: "Checkered Vibe Bow", desc: "Classic pink checkered pattern with bowknot.", price: "21.90", id: 8 },
  { title: "Smiley Polka Chain", desc: "Viral smiley polka dot case with bead chain.", price: "26.50", id: 9 },
  { title: "Purple Monster Stand", desc: "3D Purple Monster with card holder and braided strap.", price: "24.90", id: 10 },
  { title: "Crybaby Polka Love", desc: "Adorable Crybaby doll with polka dots and heart.", price: "22.50", id: 11 }
];

async function graphql(op, desc) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query: op });
    const req = https.request({
      hostname: domain, path: '/admin/api/2024-04/graphql.json',
      method: 'POST',
      headers: { 'X-Shopify-Access-Token': token, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    }, res => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch(e) { reject(e); }
      });
    });
    req.on('error', e => reject(e));
    req.write(body);
    req.end();
  });
}

async function main() {
  const results = [];
  for (const p of products) {
    // Step 1: Create product
    console.log(`Creating: ${p.title}...`);
    const createQuery = `mutation { productCreate(product: {title: ${JSON.stringify(p.title)}, vendor: "CaseCraft", productType: "Phone Case", descriptionHtml: ${JSON.stringify(p.desc)}, status: ACTIVE}) { product { id variants(first:1) { edges { node { id price } } } } userErrors { field message } } }`;
    
    const r1 = await graphql(createQuery);
    if (r1.errors) {
      console.log(`  ERR create: ${JSON.stringify(r1.errors)}`);
      continue;
    }
    if (r1.data?.productCreate?.userErrors?.length) {
      console.log(`  ERR create userErrors: ${JSON.stringify(r1.data.productCreate.userErrors)}`);
      continue;
    }
    
    const prod = r1.data.productCreate.product;
    const variantId = prod.variants.edges[0].node.id;
    const productId = prod.id;
    console.log(`  Created: ${productId}, Variant: ${variantId}`);
    
    // Step 2: Update variant price
    const updateQuery = `mutation { productVariantsBulkUpdate(productId: ${JSON.stringify(productId)}, variants: [{id: ${JSON.stringify(variantId)}, price: "${p.price}"}]) { product { id } productVariants { id price } userErrors { field message } } }`;
    
    const r2 = await graphql(updateQuery);
    if (r2.data?.productVariantsBulkUpdate?.userErrors?.length) {
      console.log(`  ERR update userErrors: ${JSON.stringify(r2.data.productVariantsBulkUpdate.userErrors)}`);
    } else {
      console.log(`  ✅ Price updated to $${p.price}`);
    }
    
    results.push({ id: p.id, productId, variantId, title: p.title, price: p.price });
    await new Promise(r => setTimeout(r, 300));
  }
  
  console.log('\n=== VARIANT ID MAPPING FOR CHECKOUT ===');
  results.forEach(r => {
    if (r) console.log(`id=${r.id}: "${r.variantId}" -> ${r.title} ($${r.price})`);
  });
  
  // Save to file for later use
  const fs = require('fs');
  fs.writeFileSync('E:\\AI_Tools\\variant-ids.json', JSON.stringify(results.filter(Boolean), null, 2));
  console.log('\nSaved to E:\\AI_Tools\\variant-ids.json');
}

main().catch(e => console.error(e));
