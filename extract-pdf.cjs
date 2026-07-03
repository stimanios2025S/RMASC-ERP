const fs = require('fs');
const path = require('path');

// Read the PDF as text
const pdfPath = path.join(__dirname, 'catalogues mekisan.pdf');
const buffer = fs.readFileSync(pdfPath);
const content = buffer.toString('utf8');

// Extract text between parentheses (PDF text objects)
const textMatches = content.match(/\(([^)]*)\)/g) || [];
const texts = textMatches.map(m => m.slice(1, -1));

// Extract font names
const fontMatches = content.match(/\/Font[\s\S]*?>>/g) || [];

// Look for embedded images (XObject)
const xobjectMatches = content.match(/\/XObject[\s\S]*?>>/g) || [];

// Extract page labels / structure
console.log('=== PDF TEXT EXTRACTION ===');
console.log(`File size: ${buffer.length} bytes`);
console.log(`Number of text objects: ${texts.length}`);
console.log('');

// Filter meaningful text (longer than 2 chars)
const meaningful = texts.filter(t => t.length > 2 && !t.match(/^[\d\s.,;:!?]+$/));
console.log('=== MEANINGFUL TEXTS ===');
meaningful.forEach((t, i) => console.log(`${i}: ${t}`));

console.log('');
console.log('=== ALL TEXTS (short ones too) ===');
texts.forEach((t, i) => console.log(`${i}: "${t}"`));

// Check for image references
const imageRefs = content.match(/\/Im\d+/g) || [];
console.log('');
console.log(`Image references: ${imageRefs.length}`);

// Check for JPEG/PNG headers
let jpegCount = 0;
let pngCount = 0;
for (let i = 0; i < buffer.length - 10; i++) {
  if (buffer[i] === 0xFF && buffer[i+1] === 0xD8) jpegCount++;
  if (buffer[i] === 0x89 && buffer[i+1] === 0x50) pngCount++;
}
console.log(`JPEG images found: ${jpegCount}`);
console.log(`PNG images found: ${pngCount}`);
