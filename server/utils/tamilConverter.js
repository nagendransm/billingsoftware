/**
 * Server-side Tamil Text Utility & Converter
 * Handles Unicode, UTF-8 Mojibake recovery, and TSCII 1.7 conversion
 */

const TSCII_MAP = {
  0x82: '\u0BB6\u0BCD\u0BB0\u0BC0', 0x83: 'ஜ', 0x84: 'ஷ', 0x85: 'ஸ', 0x86: 'ஹ',
  0x87: 'க்ஷ', 0x88: 'ஜ்', 0x89: 'ஷ்', 0x8A: 'ஸ்', 0x8B: 'ஹ்', 0x8C: 'க்ஷ்',
  0x80: '௦', 0x81: '௧', 0x8D: '௨', 0x8E: '௩', 0x8F: '௪',
  0x90: '௫', 0x95: '௬', 0x96: '௭', 0x97: '௮', 0x98: '௯',
  0x9D: '௰', 0x9E: '௱', 0x9F: '௲',
  0xAB: 'அ', 0xAC: 'ஆ', 0xAD: 'இ', 0xAE: 'ஈ', 0xAF: 'உ',
  0xB0: 'ஊ', 0xB1: 'எ', 0xB2: 'ஏ', 0xB3: 'ஐ', 0xB4: 'ஒ',
  0xB5: 'ஓ', 0xB6: 'ஔ', 0xB7: 'ஃ', 0xFE: 'இ',
  0xB8: 'க', 0xB9: 'ங', 0xBA: 'ச', 0xBB: 'ஞ', 0xBC: 'ட',
  0xBD: 'ண', 0xBE: 'த', 0xBF: 'ந', 0xC0: 'ப', 0xC1: 'ம',
  0xC2: 'ய', 0xC3: 'ர', 0xC4: 'ல', 0xC5: 'வ', 0xC6: 'ழ',
  0xC7: 'ள', 0xC8: 'ற', 0xC9: 'ன',
  0xEC: 'க்', 0xED: 'ங்', 0xEE: 'ச்', 0xEF: 'ஞ்', 0xF0: 'ட்',
  0xF1: 'ண்', 0xF2: 'த்', 0xF3: 'ந்', 0xF4: 'ப்', 0xF5: 'ம்',
  0xF6: 'ய்', 0xF7: 'ர்', 0xF8: 'ல்', 0xF9: 'வ்', 0xFA: 'ழ்',
  0xFB: 'ள்', 0xFC: 'ற்', 0xFD: 'ன்',
  0xCC: 'கு', 0x99: 'ஙு', 0xCD: 'சு', 0x9A: 'ஞு',
  0xCE: 'டு', 0xCF: 'ணு', 0xD0: 'து', 0xD1: 'நு', 0xD2: 'பு',
  0xD3: 'மு', 0xD4: 'யு', 0xD5: 'ரு', 0xD6: 'லு', 0xD7: 'வு',
  0xD8: 'ழு', 0xD9: 'ளு', 0xDA: 'று', 0xDB: 'னு',
  0x9B: 'ஙூ', 0x9C: 'ஞூ',
  0xDC: 'கூ', 0xDD: 'சூ', 0xDE: 'டூ', 0xDF: 'ணூ', 0xE0: 'தூ',
  0xE1: 'நூ', 0xE2: 'பூ', 0xE3: 'மூ', 0xE4: 'யூ', 0xE5: 'ரூ',
  0xE6: 'லூ', 0xE7: 'வூ', 0xE8: 'ழூ', 0xE9: 'ளூ', 0xEA: 'றூ',
  0xEB: 'னூ',
  0xCA: 'டி', 0xCB: 'டீ',
  0xA1: 'ா', 0xA2: 'ி', 0xA3: 'ீ', 0xA4: 'ு', 0xA5: 'ூ',
  0xAA: 'ௌ',
  0xA6: 'ெ', 0xA7: 'ே', 0xA8: 'ை',
  0x91: '\u2018', 0x92: '\u2019', 0x93: '\u201C', 0x94: '\u201D', 0xA9: '©'
};

function tsciiToUnicode(input) {
  if (!input || typeof input !== 'string') return input || '';
  let out = '';
  const len = input.length;
  for (let i = 0; i < len; i++) {
    const c = input.charCodeAt(i);
    if (c < 128) {
      out += input[i];
      continue;
    }
    if (c === 0xA6 || c === 0xA7 || c === 0xA8) {
      const nextC = i + 1 < len ? input.charCodeAt(i + 1) : 0;
      const cons = TSCII_MAP[nextC] || '';
      const afterC = i + 2 < len ? input.charCodeAt(i + 2) : 0;
      if (c === 0xA6 && afterC === 0xA1 && cons) {
        out += cons + 'ொ';
        i += 2;
      } else if (c === 0xA7 && afterC === 0xA1 && cons) {
        out += cons + 'ோ';
        i += 2;
      } else if (c === 0xA6 && afterC === 0xAA && cons) {
        out += cons + 'ௌ';
        i += 2;
      } else if (cons) {
        const vowel = c === 0xA6 ? 'ெ' : c === 0xA7 ? 'ே' : 'ை';
        out += cons + vowel;
        i += 1;
      } else {
        out += TSCII_MAP[c] || input[i];
      }
      continue;
    }
    if (TSCII_MAP[c]) {
      out += TSCII_MAP[c];
    } else {
      out += input[i];
    }
  }
  return out;
}

function decodeMojibake(str) {
  if (!str || typeof str !== 'string') return str || '';
  if (/(à®|à¯|Ã)/.test(str)) {
    try {
      const bytes = new Uint8Array(str.length);
      for (let i = 0; i < str.length; i++) {
        bytes[i] = str.charCodeAt(i) & 0xff;
      }
      const decoded = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
      if (/[\u0B80-\u0BFF]/.test(decoded)) {
        return decoded;
      }
    } catch {
      // ignore
    }
  }
  return str;
}

function isTscii(str) {
  if (!str || typeof str !== 'string') return false;
  let count = 0;
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    if (TSCII_MAP[c]) count++;
  }
  return count >= 2;
}

function cleanTamilText(input) {
  if (!input) return '';
  let str = String(input).trim();
  if (!str) return '';
  str = decodeMojibake(str);
  if (/[\u0B80-\u0BFF]/.test(str)) {
    return str.normalize('NFC');
  }
  if (isTscii(str)) {
    const converted = tsciiToUnicode(str);
    if (/[\u0B80-\u0BFF]/.test(converted)) {
      return converted.normalize('NFC');
    }
  }
  return str.normalize('NFC');
}

module.exports = {
  cleanTamilText,
  tsciiToUnicode,
  decodeMojibake
};
