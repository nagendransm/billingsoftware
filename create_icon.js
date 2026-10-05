const fs = require('fs');
const path = require('path');

const pngPath = path.join(__dirname, 'client', 'src', 'assets', 'hero.png');
const icoPath = path.join(__dirname, 'app.ico');

if (fs.existsSync(pngPath)) {
  const pngBuffer = fs.readFileSync(pngPath);
  
  // Create ICO header (6 bytes)
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(1, 2); // Type 1 = Icon
  header.writeUInt16LE(1, 4); // Number of images

  // Create Icon Entry (16 bytes)
  const entry = Buffer.alloc(16);
  entry.writeUInt8(48, 0);   // Width 48
  entry.writeUInt8(48, 1);   // Height 48
  entry.writeUInt8(0, 2);    // Colors in palette
  entry.writeUInt8(0, 3);    // Reserved
  entry.writeUInt16LE(1, 4); // Color planes
  entry.writeUInt16LE(32, 6);// Bits per pixel
  entry.writeUInt32LE(pngBuffer.length, 8);  // Image data size
  entry.writeUInt32LE(6 + 16, 12);           // Offset where image data starts

  const icoBuffer = Buffer.concat([header, entry, pngBuffer]);
  fs.writeFileSync(icoPath, icoBuffer);
  console.log('Created app.ico successfully!');
} else {
  console.log('PNG not found');
}
