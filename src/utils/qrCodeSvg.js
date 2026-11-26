/**
 * Pure-JS QR Code (ISO/IEC 18004) Matrix & SVG Generator.
 * Supports Byte mode with UTF-8 encoding, ECC Level M (Versions 1-10, up to 213 bytes),
 * standard Reed-Solomon error correction, alignment patterns, and optimal mask selection.
 * Zero external dependencies.
 */

// GF(256) lookup tables with primitive polynomial 0x11D
const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);

(() => {
  let x = 1;
  for (let i = 0; i < 255; i += 1) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) {
      x ^= 0x11d;
    }
  }
  for (let i = 255; i < 512; i += 1) {
    GF_EXP[i] = GF_EXP[i - 255];
  }
})();

function gfMul(a, b) {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[GF_LOG[a] + GF_LOG[b]];
}

function getRsGeneratorPoly(ecCount) {
  let poly = [1];
  for (let i = 0; i < ecCount; i += 1) {
    const next = new Array(poly.length + 1).fill(0);
    const factor = GF_EXP[i];
    for (let j = 0; j < poly.length; j += 1) {
      next[j] ^= poly[j];
      next[j + 1] ^= gfMul(poly[j], factor);
    }
    poly = next;
  }
  return poly;
}

function computeRsEcc(dataBytes, ecCount) {
  const gen = getRsGeneratorPoly(ecCount);
  const res = new Uint8Array(dataBytes.length + ecCount);
  res.set(dataBytes);
  for (let i = 0; i < dataBytes.length; i += 1) {
    const coef = res[i];
    if (coef !== 0) {
      for (let j = 0; j < gen.length; j += 1) {
        res[i + j] ^= gfMul(gen[j], coef);
      }
    }
  }
  return res.slice(dataBytes.length);
}

// Version 1..10 ECC Level M parameters:
// [totalCodewords, ecPerBlock, g1Blocks, g1DataCw, g2Blocks, g2DataCw]
const VERSION_M_SPECS = {
  1: [26, 10, 1, 16, 0, 0],
  2: [44, 16, 1, 28, 0, 0],
  3: [70, 26, 1, 44, 0, 0],
  4: [100, 18, 2, 32, 0, 0],
  5: [134, 24, 2, 43, 0, 0],
  6: [172, 16, 4, 27, 0, 0],
  7: [196, 18, 4, 31, 0, 0],
  8: [242, 22, 2, 38, 2, 39],
  9: [292, 22, 3, 36, 2, 37],
  10: [346, 26, 4, 43, 1, 44],
};

// Alignment pattern center coordinates per version (ISO/IEC 18004 Table E.1)
const ALIGNMENT_CENTERS = {
  1: [],
  2: [6, 18],
  3: [6, 22],
  4: [6, 26],
  5: [6, 30],
  6: [6, 34],
  7: [6, 22, 38],
  8: [6, 24, 42],
  9: [6, 26, 46],
  10: [6, 28, 50],
};

// 15-bit format info for ECC-M (00) + masks 0..7, pre-encoded with BCH(15,5) + XOR 0x5412
const FORMAT_INFO_M = [
  0x5412, 0x5125, 0x5e7c, 0x5b4b, 0x45f9, 0x40ce, 0x4f97, 0x4aa0,
];

// 18-bit version info for versions 7..10
const VERSION_INFO_BITS = {
  7: 0x07c94,
  8: 0x085bc,
  9: 0x09a99,
  10: 0x0a4d3,
};

function encodeUtf8Bytes(text) {
  if (typeof TextEncoder !== "undefined") {
    return Array.from(new TextEncoder().encode(String(text)));
  }
  const str = unescape(encodeURIComponent(String(text)));
  const out = [];
  for (let i = 0; i < str.length; i += 1) {
    out.push(str.charCodeAt(i));
  }
  return out;
}

function selectVersion(byteLen) {
  for (let v = 1; v <= 10; v += 1) {
    const [, , g1b, g1d, g2b, g2d] = VERSION_M_SPECS[v];
    const totalDataCw = g1b * g1d + g2b * g2d;
    // Version 1..9 uses 4-bit mode + 8-bit length; Version 10 uses 4-bit mode + 16-bit length
    const headerBits = v >= 10 ? 20 : 12;
    const capacityBytes = Math.floor((totalDataCw * 8 - headerBits) / 8);
    if (byteLen <= capacityBytes) {
      return v;
    }
  }
  throw new Error(`QR payload too long (${byteLen} bytes > max 213 bytes)`);
}

function buildDataCodewords(bytes, version) {
  const [, , g1b, g1d, g2b, g2d] = VERSION_M_SPECS[version];
  const totalDataCw = g1b * g1d + g2b * g2d;
  const totalDataBits = totalDataCw * 8;

  const bits = [];
  const pushBits = (val, len) => {
    for (let i = len - 1; i >= 0; i -= 1) {
      bits.push((val >>> i) & 1);
    }
  };

  // Byte mode indicator (0100)
  pushBits(0b0100, 4);
  // Character count indicator (8 bits for v1..9, 16 bits for v10+)
  pushBits(bytes.length, version >= 10 ? 16 : 8);

  for (const b of bytes) {
    pushBits(b, 8);
  }

  // Terminator (up to 4 zero bits)
  const termLen = Math.min(4, totalDataBits - bits.length);
  for (let i = 0; i < termLen; i += 1) bits.push(0);

  // Pad to byte boundary
  while (bits.length % 8 !== 0) bits.push(0);

  const codewords = [];
  for (let i = 0; i < bits.length; i += 8) {
    let cw = 0;
    for (let j = 0; j < 8; j += 1) {
      cw = (cw << 1) | bits[i + j];
    }
    codewords.push(cw);
  }

  let padToggle = true;
  while (codewords.length < totalDataCw) {
    codewords.push(padToggle ? 0xec : 0x11);
    padToggle = !padToggle;
  }

  return codewords;
}

function buildFinalBitStream(dataCodewords, version) {
  const [, ecPerBlock, g1b, g1d, g2b, g2d] = VERSION_M_SPECS[version];
  const dataBlocks = [];
  const ecBlocks = [];
  let offset = 0;

  for (let i = 0; i < g1b; i += 1) {
    const blk = dataCodewords.slice(offset, offset + g1d);
    offset += g1d;
    dataBlocks.push(blk);
    ecBlocks.push(computeRsEcc(blk, ecPerBlock));
  }
  for (let i = 0; i < g2b; i += 1) {
    const blk = dataCodewords.slice(offset, offset + g2d);
    offset += g2d;
    dataBlocks.push(blk);
    ecBlocks.push(computeRsEcc(blk, ecPerBlock));
  }

  const interleaved = [];
  const maxDataLen = Math.max(g1d, g2d);
  for (let i = 0; i < maxDataLen; i += 1) {
    for (const blk of dataBlocks) {
      if (i < blk.length) interleaved.push(blk[i]);
    }
  }
  for (let i = 0; i < ecPerBlock; i += 1) {
    for (const ec of ecBlocks) {
      interleaved.push(ec[i]);
    }
  }

  const bits = [];
  for (const byteVal of interleaved) {
    for (let b = 7; b >= 0; b -= 1) {
      bits.push((byteVal >>> b) & 1);
    }
  }
  return bits;
}

function createEmptyGrid(size) {
  return Array.from({ length: size }, () => new Array(size).fill(null));
}

function placeFinderPattern(modules, isFunction, row, col) {
  const size = modules.length;
  for (let r = -1; r <= 7; r += 1) {
    for (let c = -1; c <= 7; c += 1) {
      const rr = row + r;
      const cc = col + c;
      if (rr < 0 || rr >= size || cc < 0 || cc >= size) continue;
      const inOuter = r >= 0 && r <= 6 && c >= 0 && c <= 6;
      const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
      const isCenter = r >= 2 && r <= 4 && c >= 2 && c <= 4;
      modules[rr][cc] = inOuter && (isBorder || isCenter);
      isFunction[rr][cc] = true;
    }
  }
}

function placeAlignmentPattern(modules, isFunction, centerR, centerC) {
  for (let r = -2; r <= 2; r += 1) {
    for (let c = -2; c <= 2; c += 1) {
      const rr = centerR + r;
      const cc = centerC + c;
      const isDark =
        Math.abs(r) === 2 || Math.abs(c) === 2 || (r === 0 && c === 0);
      modules[rr][cc] = isDark;
      isFunction[rr][cc] = true;
    }
  }
}

function placeFormatInfo(modules, isFunction, maskPattern) {
  const size = modules.length;
  const info = FORMAT_INFO_M[maskPattern];
  for (let i = 0; i < 15; i += 1) {
    const bit = ((info >>> i) & 1) === 1;
    // Vertical copy (top-left and bottom-left)
    if (i < 6) {
      modules[i][8] = bit;
      isFunction[i][8] = true;
    } else if (i < 8) {
      modules[i + 1][8] = bit;
      isFunction[i + 1][8] = true;
    } else {
      modules[size - 15 + i][8] = bit;
      isFunction[size - 15 + i][8] = true;
    }
    // Horizontal copy (top-right and top-left)
    if (i < 8) {
      modules[8][size - 1 - i] = bit;
      isFunction[8][size - 1 - i] = true;
    } else if (i < 9) {
      modules[8][15 - i] = bit;
      isFunction[8][15 - i] = true;
    } else {
      modules[8][14 - i] = bit;
      isFunction[8][14 - i] = true;
    }
  }
}

function placeVersionInfo(modules, isFunction, version) {
  if (version < 7) return;
  const size = modules.length;
  const bits = VERSION_INFO_BITS[version];
  for (let i = 0; i < 18; i += 1) {
    const bit = ((bits >>> i) & 1) === 1;
    const r = Math.floor(i / 3);
    const c = size - 11 + (i % 3);
    modules[r][c] = bit;
    isFunction[r][c] = true;
    modules[c][r] = bit;
    isFunction[c][r] = true;
  }
}

function applyMaskPredicate(maskId, r, c) {
  switch (maskId) {
    case 0:
      return (r + c) % 2 === 0;
    case 1:
      return r % 2 === 0;
    case 2:
      return c % 3 === 0;
    case 3:
      return (r + c) % 3 === 0;
    case 4:
      return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0;
    case 5:
      return ((r * c) % 2) + ((r * c) % 3) === 0;
    case 6:
      return (((r * c) % 2) + ((r * c) % 3)) % 2 === 0;
    case 7:
      return (((r + c) % 2) + ((r * c) % 3)) % 2 === 0;
    default:
      return false;
  }
}

function computePenalty(modules) {
  const size = modules.length;
  let penalty = 0;

  // N1: 5+ consecutive same-color modules in row or column
  for (let r = 0; r < size; r += 1) {
    let runColor = modules[r][0];
    let runLen = 1;
    for (let c = 1; c < size; c += 1) {
      if (modules[r][c] === runColor) {
        runLen += 1;
      } else {
        if (runLen >= 5) penalty += 3 + (runLen - 5);
        runColor = modules[r][c];
        runLen = 1;
      }
    }
    if (runLen >= 5) penalty += 3 + (runLen - 5);
  }
  for (let c = 0; c < size; c += 1) {
    let runColor = modules[0][c];
    let runLen = 1;
    for (let r = 1; r < size; r += 1) {
      if (modules[r][c] === runColor) {
        runLen += 1;
      } else {
        if (runLen >= 5) penalty += 3 + (runLen - 5);
        runColor = modules[r][c];
        runLen = 1;
      }
    }
    if (runLen >= 5) penalty += 3 + (runLen - 5);
  }

  // N2: 2x2 blocks of same color
  for (let r = 0; r < size - 1; r += 1) {
    for (let c = 0; c < size - 1; c += 1) {
      const val = modules[r][c];
      if (
        val === modules[r][c + 1] &&
        val === modules[r + 1][c] &&
        val === modules[r + 1][c + 1]
      ) {
        penalty += 3;
      }
    }
  }

  // N3: 1:1:3:1:1 finder-like patterns
  const matchFinderSeq = (arr, start, forward) => {
    const pattern = forward
      ? [true, false, true, true, true, false, true, false, false, false, false]
      : [false, false, false, false, true, false, true, true, true, false, true];
    for (let k = 0; k < 11; k += 1) {
      if (arr[start + k] !== pattern[k]) return false;
    }
    return true;
  };
  for (let r = 0; r < size; r += 1) {
    for (let c = 0; c <= size - 11; c += 1) {
      if (matchFinderSeq(modules[r], c, true) || matchFinderSeq(modules[r], c, false)) {
        penalty += 40;
      }
    }
  }
  for (let c = 0; c < size; c += 1) {
    const colArr = modules.map((row) => row[c]);
    for (let r = 0; r <= size - 11; r += 1) {
      if (matchFinderSeq(colArr, r, true) || matchFinderSeq(colArr, r, false)) {
        penalty += 40;
      }
    }
  }

  // N4: dark module balance
  let darkCount = 0;
  for (let r = 0; r < size; r += 1) {
    for (let c = 0; c < size; c += 1) {
      if (modules[r][c]) darkCount += 1;
    }
  }
  const percent = (darkCount * 100) / (size * size);
  const k = Math.floor(Math.abs(percent - 50) / 5);
  penalty += k * 10;

  return penalty;
}

/**
 * Generate a QR Code boolean matrix for the given text (ECC-M).
 * @param {string} text
 * @returns {{ size: number, version: number, modules: boolean[][] }}
 */
export function generateQrMatrix(text) {
  const bytes = encodeUtf8Bytes(text || "");
  const version = selectVersion(bytes.length);
  const size = version * 4 + 17;

  const dataCw = buildDataCodewords(bytes, version);
  const dataBits = buildFinalBitStream(dataCw, version);

  const baseModules = createEmptyGrid(size);
  const isFunction = Array.from({ length: size }, () => new Array(size).fill(false));

  // Finder patterns
  placeFinderPattern(baseModules, isFunction, 0, 0);
  placeFinderPattern(baseModules, isFunction, 0, size - 7);
  placeFinderPattern(baseModules, isFunction, size - 7, 0);

  // Alignment patterns (must be placed before timing patterns so centers on row/col 6 are not skipped)
  const centers = ALIGNMENT_CENTERS[version] || [];
  for (const r of centers) {
    for (const c of centers) {
      if (isFunction[r][c]) continue;
      placeAlignmentPattern(baseModules, isFunction, r, c);
    }
  }

  // Timing patterns
  for (let i = 8; i < size - 8; i += 1) {
    const dark = i % 2 === 0;
    baseModules[6][i] = dark;
    isFunction[6][i] = true;
    baseModules[i][6] = dark;
    isFunction[i][6] = true;
  }

  // Dark module
  baseModules[4 * version + 9][8] = true;
  isFunction[4 * version + 9][8] = true;

  // Reserve format info & version info cells before zig-zag data placement
  placeFormatInfo(baseModules, isFunction, 0);
  placeVersionInfo(baseModules, isFunction, version);

  // Place data bits in zig-zag columns from bottom-right
  let bitIdx = 0;
  let upward = true;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right -= 1; // Skip vertical timing column
    for (let step = 0; step < size; step += 1) {
      const r = upward ? size - 1 - step : step;
      for (let dx = 0; dx < 2; dx += 1) {
        const c = right - dx;
        if (!isFunction[r][c]) {
          baseModules[r][c] = bitIdx < dataBits.length ? dataBits[bitIdx] === 1 : false;
          bitIdx += 1;
        }
      }
    }
    upward = !upward;
  }

  // Choose mask pattern with minimum penalty score
  let bestMask = 0;
  let bestPenalty = Infinity;
  let bestModules = null;

  for (let mask = 0; mask < 8; mask += 1) {
    const candidate = baseModules.map((row, r) =>
      row.map((val, c) =>
        isFunction[r][c] ? val : applyMaskPredicate(mask, r, c) ? !val : val
      )
    );
    placeFormatInfo(candidate, Array.from({ length: size }, () => new Array(size).fill(false)), mask);
    const penalty = computePenalty(candidate);
    if (penalty < bestPenalty) {
      bestPenalty = penalty;
      bestMask = mask;
      bestModules = candidate;
    }
  }

  return {
    size,
    version,
    mask: bestMask,
    modules: bestModules || baseModules,
  };
}

/**
 * Build a compact SVG path `d` attribute combining all dark modules.
 */
export function buildQrSvgPath(modules, margin = 2) {
  const parts = [];
  for (let r = 0; r < modules.length; r += 1) {
    const row = modules[r];
    for (let c = 0; c < row.length; c += 1) {
      if (row[c]) {
        parts.push(`M${c + margin},${r + margin}h1v1h-1z`);
      }
    }
  }
  return parts.join("");
}

/**
 * Generate a standalone inline SVG markup string for a QR code.
 * @param {string} text
 * @param {Object} [options]
 * @param {number} [options.size=160]
 * @param {number} [options.margin=2]
 * @param {string} [options.fgColor="#0F172A"]
 * @param {string} [options.bgColor="#FFFFFF"]
 * @returns {string}
 */
export function generateQrSvgString(text, options = {}) {
  const {
    size = 160,
    margin = 2,
    fgColor = "#0F172A",
    bgColor = "#FFFFFF",
  } = options;

  const { size: matrixSize, modules } = generateQrMatrix(text);
  const viewBoxSize = matrixSize + margin * 2;
  const pathData = buildQrSvgPath(modules, margin);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${viewBoxSize} ${viewBoxSize}" shape-rendering="crispEdges" role="img" aria-label="QR Code"><rect width="${viewBoxSize}" height="${viewBoxSize}" fill="${bgColor}"/><path d="${pathData}" fill="${fgColor}"/></svg>`;
}

/**
 * Generate an SVG data URL usable in `<img src="..." />`.
 */
export function generateQrSvgDataUrl(text, options = {}) {
  const svg = generateQrSvgString(text, options);
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
