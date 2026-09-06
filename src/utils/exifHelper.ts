/**
 * Pure TypeScript EXIF Metadata Extractor and Injector
 * Preserves GPS location, Camera Make/Model, Lens Model, and shooting parameters
 * across HTML5 Canvas JPEG export operations.
 */

export interface ExifMetadata {
  hasExif: boolean;
  camera?: string;
  lens?: string;
  gps?: string;
  dateTime?: string;
  rawSegments: Uint8Array[];
}

/**
 * Extracts APP1 (Exif & XMP) and APP2 (ICC Profile) segments from a JPEG ArrayBuffer
 */
export function extractExifSegments(buffer: ArrayBuffer): { segments: Uint8Array[]; meta: ExifMetadata } {
  const meta: ExifMetadata = {
    hasExif: false,
    rawSegments: [],
  };

  const view = new DataView(buffer);
  if (view.byteLength < 4) return { segments: [], meta };

  // Verify SOI marker (0xFFD8)
  if (view.getUint16(0) !== 0xffd8) {
    return { segments: [], meta };
  }

  let offset = 2;
  const collectedSegments: Uint8Array[] = [];

  while (offset < view.byteLength - 4) {
    if (view.getUint8(offset) !== 0xff) break;
    const marker = view.getUint8(offset + 1);

    // SOS (0xDA) or EOI (0xD9) marks start of entropy-coded image data
    if (marker === 0xda || marker === 0xd9) break;

    const length = view.getUint16(offset + 2);
    if (length < 2 || offset + 2 + length > view.byteLength) break;

    // APP1 (0xE1: Exif / XMP) or APP2 (0xE2: ICC Profile)
    if (marker === 0xe1 || marker === 0xe2) {
      const segCopy = new Uint8Array(buffer.slice(offset, offset + 2 + length));

      // If this is an Exif APP1 segment, normalize orientation to 1
      if (marker === 0xe1 && isExifApp1(segCopy)) {
        normalizeOrientation(segCopy);
        parseExifDetails(segCopy, meta);
        meta.hasExif = true;
      } else if (marker === 0xe1 && isXmpApp1(segCopy)) {
        parseXmpDetails(segCopy, meta);
      }

      collectedSegments.push(segCopy);
    }

    offset += 2 + length;
  }

  meta.rawSegments = collectedSegments;
  return { segments: collectedSegments, meta };
}

function isExifApp1(seg: Uint8Array): boolean {
  if (seg.length < 10) return false;
  // seg[0]=FF, seg[1]=E1, seg[2..3]=length, seg[4..9]="Exif\0\0"
  return (
    seg[4] === 0x45 && // E
    seg[5] === 0x78 && // x
    seg[6] === 0x69 && // i
    seg[7] === 0x66 && // f
    seg[8] === 0x00 &&
    seg[9] === 0x00
  );
}

function isXmpApp1(seg: Uint8Array): boolean {
  if (seg.length < 32) return false;
  const header = String.fromCharCode(...seg.slice(4, 33));
  return header.startsWith('http://ns.adobe.com/xap/1.0/');
}

/**
 * Ensures EXIF orientation tag is set to 1 (top-left) because
 * canvas rendering already uprights the image pixels.
 */
function normalizeOrientation(seg: Uint8Array) {
  if (seg.length < 18) return;
  const tiffStart = 10;
  const isLittle = seg[tiffStart] === 0x49 && seg[tiffStart + 1] === 0x49;

  const getUint16 = (off: number) =>
    isLittle ? seg[off] | (seg[off + 1] << 8) : (seg[off] << 8) | seg[off + 1];

  const setUint16 = (off: number, val: number) => {
    if (isLittle) {
      seg[off] = val & 0xff;
      seg[off + 1] = (val >> 8) & 0xff;
    } else {
      seg[off] = (val >> 8) & 0xff;
      seg[off + 1] = val & 0xff;
    }
  };

  const getUint32 = (off: number) =>
    isLittle
      ? (seg[off] | (seg[off + 1] << 8) | (seg[off + 2] << 16) | (seg[off + 3] << 24)) >>> 0
      : ((seg[off] << 24) | (seg[off + 1] << 16) | (seg[off + 2] << 8) | seg[off + 3]) >>> 0;

  const ifd0Offset = getUint32(tiffStart + 4);
  const ifd0Start = tiffStart + ifd0Offset;
  if (ifd0Start + 2 > seg.length) return;

  const numEntries = getUint16(ifd0Start);
  for (let i = 0; i < numEntries; i++) {
    const entryStart = ifd0Start + 2 + i * 12;
    if (entryStart + 12 > seg.length) break;
    const tag = getUint16(entryStart);
    if (tag === 0x0112) {
      // Orientation tag: set to 1
      setUint16(entryStart + 8, 1);
      break;
    }
  }
}

/**
 * Extracts Camera, Lens, GPS, and DateTime from EXIF TIFF structure
 */
function parseExifDetails(seg: Uint8Array, meta: ExifMetadata) {
  try {
    const tiffStart = 10;
    const isLittle = seg[tiffStart] === 0x49 && seg[tiffStart + 1] === 0x49;

    const getUint16 = (off: number) =>
      isLittle ? seg[off] | (seg[off + 1] << 8) : (seg[off] << 8) | seg[off + 1];

    const getUint32 = (off: number) =>
      isLittle
        ? (seg[off] | (seg[off + 1] << 8) | (seg[off + 2] << 16) | (seg[off + 3] << 24)) >>> 0
        : ((seg[off] << 24) | (seg[off + 1] << 16) | (seg[off + 2] << 8) | seg[off + 3]) >>> 0;

    const getString = (off: number, len: number) => {
      let str = '';
      for (let i = 0; i < len; i++) {
        const ch = seg[off + i];
        if (ch === 0) break;
        str += String.fromCharCode(ch);
      }
      return str.trim();
    };

    const ifd0Offset = getUint32(tiffStart + 4);
    const ifd0Start = tiffStart + ifd0Offset;
    if (ifd0Start + 2 > seg.length) return;

    let exifSubIfdOffset = 0;
    let gpsIfdOffset = 0;
    let make = '';
    let model = '';

    const numEntries = getUint16(ifd0Start);
    for (let i = 0; i < numEntries; i++) {
      const entryStart = ifd0Start + 2 + i * 12;
      if (entryStart + 12 > seg.length) break;
      const tag = getUint16(entryStart);
      const type = getUint16(entryStart + 2);
      const count = getUint32(entryStart + 4);
      const valOffset = count <= 4 && type === 2 ? entryStart + 8 : tiffStart + getUint32(entryStart + 8);

      if (tag === 0x010f && valOffset < seg.length) {
        make = getString(valOffset, Math.min(count, 40));
      } else if (tag === 0x0110 && valOffset < seg.length) {
        model = getString(valOffset, Math.min(count, 60));
      } else if (tag === 0x8769) {
        exifSubIfdOffset = getUint32(entryStart + 8);
      } else if (tag === 0x8825) {
        gpsIfdOffset = getUint32(entryStart + 8);
      } else if (tag === 0x0132 && valOffset < seg.length) {
        meta.dateTime = getString(valOffset, Math.min(count, 25));
      }
    }

    if (model) {
      meta.camera = make && !model.toLowerCase().includes(make.toLowerCase()) ? `${make} ${model}` : model;
    } else if (make) {
      meta.camera = make;
    }

    // Parse Exif SubIFD (for Lens and DateTimeOriginal)
    if (exifSubIfdOffset > 0) {
      const subStart = tiffStart + exifSubIfdOffset;
      if (subStart + 2 <= seg.length) {
        const subEntries = getUint16(subStart);
        for (let i = 0; i < subEntries; i++) {
          const entryStart = subStart + 2 + i * 12;
          if (entryStart + 12 > seg.length) break;
          const tag = getUint16(entryStart);
          const type = getUint16(entryStart + 2);
          const count = getUint32(entryStart + 4);
          const valOffset = count <= 4 && type === 2 ? entryStart + 8 : tiffStart + getUint32(entryStart + 8);

          if (tag === 0xa434 && valOffset < seg.length) {
            // LensModel
            meta.lens = getString(valOffset, Math.min(count, 80));
          } else if (tag === 0x9003 && valOffset < seg.length) {
            // DateTimeOriginal
            meta.dateTime = getString(valOffset, Math.min(count, 25));
          }
        }
      }
    }

    // Parse GPS IFD
    if (gpsIfdOffset > 0) {
      const gpsStart = tiffStart + gpsIfdOffset;
      if (gpsStart + 2 <= seg.length) {
        const gpsEntries = getUint16(gpsStart);
        let latRef = 'N';
        let lonRef = 'E';
        let latDeg = 0;
        let lonDeg = 0;

        for (let i = 0; i < gpsEntries; i++) {
          const entryStart = gpsStart + 2 + i * 12;
          if (entryStart + 12 > seg.length) break;
          const tag = getUint16(entryStart);
          const valOffset = tiffStart + getUint32(entryStart + 8);

          if (tag === 0x0001) {
            latRef = String.fromCharCode(seg[entryStart + 8]);
          } else if (tag === 0x0003) {
            lonRef = String.fromCharCode(seg[entryStart + 8]);
          } else if (tag === 0x0002 && valOffset + 24 <= seg.length) {
            // Rational x 3
            const dNum = getUint32(valOffset);
            const dDen = getUint32(valOffset + 4) || 1;
            const mNum = getUint32(valOffset + 8);
            const mDen = getUint32(valOffset + 12) || 1;
            const sNum = getUint32(valOffset + 16);
            const sDen = getUint32(valOffset + 20) || 1;
            latDeg = dNum / dDen + mNum / mDen / 60 + sNum / sDen / 3600;
          } else if (tag === 0x0004 && valOffset + 24 <= seg.length) {
            const dNum = getUint32(valOffset);
            const dDen = getUint32(valOffset + 4) || 1;
            const mNum = getUint32(valOffset + 8);
            const mDen = getUint32(valOffset + 12) || 1;
            const sNum = getUint32(valOffset + 16);
            const sDen = getUint32(valOffset + 20) || 1;
            lonDeg = dNum / dDen + mNum / mDen / 60 + sNum / sDen / 3600;
          }
        }

        if (latDeg > 0 || lonDeg > 0) {
          meta.gps = `${latDeg.toFixed(5)}° ${latRef}, ${lonDeg.toFixed(5)}° ${lonRef}`;
        }
      }
    }
  } catch (err) {
    console.warn('Error parsing EXIF metadata details:', err);
  }
}

function parseXmpDetails(seg: Uint8Array, meta: ExifMetadata) {
  try {
    const text = new TextDecoder('utf-8', { fatal: false }).decode(seg);
    if (!meta.lens) {
      const matchLens = text.match(/<aux:Lens>(.*?)<\/aux:Lens>/i) || text.match(/aux:Lens="(.*?)"/i);
      if (matchLens && matchLens[1]) meta.lens = matchLens[1];
    }
    if (!meta.camera) {
      const matchModel = text.match(/<tiff:Model>(.*?)<\/tiff:Model>/i) || text.match(/tiff:Model="(.*?)"/i);
      if (matchModel && matchModel[1]) meta.camera = matchModel[1];
    }
  } catch {
    // Ignore XMP parsing errors
  }
}

/**
 * Injects raw APP1/APP2 segments into a newly generated JPEG Blob
 */
export async function injectExifSegments(jpegBlob: Blob, segments: Uint8Array[]): Promise<Blob> {
  if (!segments || segments.length === 0) {
    return jpegBlob;
  }

  const targetBuffer = await jpegBlob.arrayBuffer();
  const targetView = new DataView(targetBuffer);

  // Check valid target JPEG SOI
  if (targetView.byteLength < 4 || targetView.getUint16(0) !== 0xffd8) {
    return jpegBlob;
  }

  let insertPos = 2; // Default immediately after SOI (0xFFD8)

  // If target has APP0 (JFIF), insert after APP0 to maintain valid JFIF ordering
  if (targetView.getUint8(2) === 0xff && targetView.getUint8(3) === 0xe0) {
    const jfifLen = targetView.getUint16(4);
    insertPos = 4 + jfifLen;
  }

  // Calculate total byte size needed
  let totalSegLen = 0;
  for (const seg of segments) {
    totalSegLen += seg.byteLength;
  }

  const combined = new Uint8Array(targetBuffer.byteLength + totalSegLen);

  // Copy header part up to insertPos
  combined.set(new Uint8Array(targetBuffer, 0, insertPos), 0);

  // Insert original EXIF/APP segments
  let currentOffset = insertPos;
  for (const seg of segments) {
    combined.set(seg, currentOffset);
    currentOffset += seg.byteLength;
  }

  // Copy remaining target JPEG data
  combined.set(new Uint8Array(targetBuffer, insertPos), currentOffset);

  return new Blob([combined], { type: 'image/jpeg' });
}

/**
 * Constructs a valid sample APP1 Exif segment for demo images
 * so that users can immediately inspect and test GPS & Lens retention
 */
export function createDemoSampleExifSegment(): Uint8Array {
  // We assemble a real, valid TIFF IFD0 + SubIFD + GPS IFD block
  // Little-endian layout
  const make = 'Sony\0';
  const model = 'ILCE-7M4 (A7M4)\0';
  const lens = 'FE 24-70mm F2.8 GM II\0';
  const dateStr = '2026:09:05 14:35:12\0';

  // Fixed size buffer for safety
  const buf = new Uint8Array(1024);
  const dv = new DataView(buf.buffer);

  // Marker 0xFFE1
  buf[0] = 0xff;
  buf[1] = 0xe1;
  // Length placeholder at 2, 3

  // Exif\0\0
  buf[4] = 0x45;
  buf[5] = 0x78;
  buf[6] = 0x69;
  buf[7] = 0x66;
  buf[8] = 0x00;
  buf[9] = 0x00;

  // TIFF Header at offset 10: "II" (0x4949), 42 (0x002A), IFD0 offset = 8
  const tiffBase = 10;
  dv.setUint16(tiffBase, 0x4949, true);
  dv.setUint16(tiffBase + 2, 42, true);
  dv.setUint32(tiffBase + 4, 8, true);

  // IFD0 at offset 18 (tiffBase + 8)
  const ifd0 = tiffBase + 8;
  // 5 tags: Make, Model, Orientation, ExifIFD, GPSIFD
  dv.setUint16(ifd0, 5, true);

  let curValOffset = 180; // Value data heap

  // Tag 1: Make (0x010F)
  dv.setUint16(ifd0 + 2, 0x010f, true);
  dv.setUint16(ifd0 + 4, 2, true); // ASCII
  dv.setUint32(ifd0 + 6, make.length, true);
  dv.setUint32(ifd0 + 10, curValOffset, true);
  for (let i = 0; i < make.length; i++) buf[tiffBase + curValOffset + i] = make.charCodeAt(i);
  curValOffset += (make.length + 3) & ~3;

  // Tag 2: Model (0x0110)
  dv.setUint16(ifd0 + 14, 0x0110, true);
  dv.setUint16(ifd0 + 16, 2, true);
  dv.setUint32(ifd0 + 18, model.length, true);
  dv.setUint32(ifd0 + 22, curValOffset, true);
  for (let i = 0; i < model.length; i++) buf[tiffBase + curValOffset + i] = model.charCodeAt(i);
  curValOffset += (model.length + 3) & ~3;

  // Tag 3: Orientation (0x0112)
  dv.setUint16(ifd0 + 26, 0x0112, true);
  dv.setUint16(ifd0 + 28, 3, true); // SHORT
  dv.setUint32(ifd0 + 30, 1, true);
  dv.setUint16(ifd0 + 34, 1, true);

  // SubIFD offset
  const subIfdOffset = curValOffset;
  dv.setUint16(ifd0 + 38, 0x8769, true); // ExifOffset
  dv.setUint16(ifd0 + 40, 4, true); // LONG
  dv.setUint32(ifd0 + 42, 1, true);
  dv.setUint32(ifd0 + 46, subIfdOffset, true);

  // GPS IFD offset placeholder
  const gpsIfdOffsetPos = ifd0 + 50;

  // Build SubIFD at tiffBase + subIfdOffset
  const subIfd = tiffBase + subIfdOffset;
  dv.setUint16(subIfd, 2, true); // 2 tags: DateTimeOriginal, LensModel
  curValOffset += 2 + 2 * 12 + 4;

  // SubTag 1: DateTimeOriginal (0x9003)
  dv.setUint16(subIfd + 2, 0x9003, true);
  dv.setUint16(subIfd + 4, 2, true);
  dv.setUint32(subIfd + 6, dateStr.length, true);
  dv.setUint32(subIfd + 10, curValOffset, true);
  for (let i = 0; i < dateStr.length; i++) buf[tiffBase + curValOffset + i] = dateStr.charCodeAt(i);
  curValOffset += (dateStr.length + 3) & ~3;

  // SubTag 2: LensModel (0xA434)
  dv.setUint16(subIfd + 14, 0xa434, true);
  dv.setUint16(subIfd + 16, 2, true);
  dv.setUint32(subIfd + 18, lens.length, true);
  dv.setUint32(subIfd + 22, curValOffset, true);
  for (let i = 0; i < lens.length; i++) buf[tiffBase + curValOffset + i] = lens.charCodeAt(i);
  curValOffset += (lens.length + 3) & ~3;

  // Build GPS IFD
  const gpsIfdOffset = curValOffset;
  dv.setUint16(gpsIfdOffsetPos, 0x8825, true); // GPSInfo
  dv.setUint16(gpsIfdOffsetPos + 2, 4, true);
  dv.setUint32(gpsIfdOffsetPos + 4, 1, true);
  dv.setUint32(gpsIfdOffsetPos + 8, gpsIfdOffset, true);

  const gpsIfd = tiffBase + gpsIfdOffset;
  dv.setUint16(gpsIfd, 4, true); // 4 tags: LatRef, Lat, LonRef, Lon
  curValOffset += 2 + 4 * 12 + 4;

  // GPS Tag 1: LatRef (0x0001)
  dv.setUint16(gpsIfd + 2, 0x0001, true);
  dv.setUint16(gpsIfd + 4, 2, true);
  dv.setUint32(gpsIfd + 6, 2, true);
  buf[gpsIfd + 10] = 0x4e; // 'N'
  buf[gpsIfd + 11] = 0x00;

  // GPS Tag 2: Lat (0x0002) 39° 59' 48.0"
  dv.setUint16(gpsIfd + 14, 0x0002, true);
  dv.setUint16(gpsIfd + 16, 5, true); // RATIONAL
  dv.setUint32(gpsIfd + 18, 3, true);
  dv.setUint32(gpsIfd + 22, curValOffset, true);
  const latPos = tiffBase + curValOffset;
  dv.setUint32(latPos, 39, true);
  dv.setUint32(latPos + 4, 1, true);
  dv.setUint32(latPos + 8, 59, true);
  dv.setUint32(latPos + 12, 1, true);
  dv.setUint32(latPos + 16, 480, true);
  dv.setUint32(latPos + 20, 10, true);
  curValOffset += 24;

  // GPS Tag 3: LonRef (0x0003)
  dv.setUint16(gpsIfd + 26, 0x0003, true);
  dv.setUint16(gpsIfd + 28, 2, true);
  dv.setUint32(gpsIfd + 30, 2, true);
  buf[gpsIfd + 34] = 0x45; // 'E'
  buf[gpsIfd + 35] = 0x00;

  // GPS Tag 4: Lon (0x0004) 116° 18' 22.0"
  dv.setUint16(gpsIfd + 38, 0x0004, true);
  dv.setUint16(gpsIfd + 40, 5, true);
  dv.setUint32(gpsIfd + 42, 3, true);
  dv.setUint32(gpsIfd + 46, curValOffset, true);
  const lonPos = tiffBase + curValOffset;
  dv.setUint32(lonPos, 116, true);
  dv.setUint32(lonPos + 4, 1, true);
  dv.setUint32(lonPos + 8, 18, true);
  dv.setUint32(lonPos + 12, 1, true);
  dv.setUint32(lonPos + 16, 220, true);
  dv.setUint32(lonPos + 20, 10, true);
  curValOffset += 24;

  const totalLength = tiffBase + curValOffset;
  dv.setUint16(2, totalLength - 2, false); // Big-endian segment length

  return buf.slice(0, totalLength);
}
