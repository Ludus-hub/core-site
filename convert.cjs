const fs = require('fs');
const dir = 'Versions/Assets/Pictures/Non-edited';

let deleted = 0;
let skipped = 0;

fs.readdirSync(dir)
  .filter(f => /\.(png|jpg|jpeg)$/i.test(f))
  .forEach(f => {
    const webpName = f.replace(/\.\w+$/, '.webp');
    const webpPath = `${dir}/${webpName}`;
    const originalPath = `${dir}/${f}`;

    if (fs.existsSync(webpPath)) {
      fs.unlinkSync(originalPath);
      console.log('deleted (has webp):', f);
      deleted++;
    } else {
      console.log('kept (no webp yet):', f);
      skipped++;
    }
  });

console.log(`\nDone. Deleted: ${deleted}, kept: ${skipped}`);