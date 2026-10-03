// Reads duration and frame size from an MP4/MOV file (the "moov" box), without external tools.
// The panel needs the real length of every video to price it before generating.
const fs = require('fs');

function readBoxes(buf, start, end, onBox) {
  let pos = start;
  while (pos + 8 <= end) {
    let size = buf.readUInt32BE(pos);
    const type = buf.toString('latin1', pos + 4, pos + 8);
    let header = 8;
    if (size === 1) {
      size = Number(buf.readBigUInt64BE(pos + 8));
      header = 16;
    } else if (size === 0) {
      size = end - pos;
    }
    if (size < header || pos + size > end) break;
    onBox(type, pos + header, pos + size);
    pos += size;
  }
}

/** Finds the top-level moov box by seeking through the file, so large videos are not loaded into memory. */
function readMoov(file) {
  const fd = fs.openSync(file, 'r');
  try {
    const total = fs.fstatSync(fd).size;
    const head = Buffer.alloc(16);
    let pos = 0;
    while (pos + 8 <= total) {
      fs.readSync(fd, head, 0, 16, pos);
      let size = head.readUInt32BE(0);
      const type = head.toString('latin1', 4, 8);
      let header = 8;
      if (size === 1) {
        size = Number(head.readBigUInt64BE(8));
        header = 16;
      } else if (size === 0) {
        size = total - pos;
      }
      if (size < header) return null;
      if (type === 'moov') {
        if (size > 64 * 1024 * 1024) return null;
        const buf = Buffer.alloc(size - header);
        fs.readSync(fd, buf, 0, buf.length, pos + header);
        return buf;
      }
      pos += size;
    }
    return null;
  } finally {
    fs.closeSync(fd);
  }
}

function videoMetadata(file) {
  let moov;
  try {
    moov = readMoov(file);
  } catch {
    return null;
  }
  if (!moov) return null;
  const meta = { duration: null, width: null, height: null };
  readBoxes(moov, 0, moov.length, (type, start, end) => {
    if (type === 'mvhd') {
      const v = moov[start];
      const timescale = v === 1 ? moov.readUInt32BE(start + 20) : moov.readUInt32BE(start + 12);
      const duration = v === 1 ? Number(moov.readBigUInt64BE(start + 24)) : moov.readUInt32BE(start + 16);
      if (timescale > 0) meta.duration = duration / timescale;
    }
    if (type === 'trak' && !meta.width) {
      readBoxes(moov, start, end, (t, s) => {
        if (t !== 'tkhd') return;
        const base = s + (moov[s] === 1 ? 4 + 32 : 4 + 20) + 8 + 8; // skip header fields up to the matrix
        const a = moov.readInt32BE(base);
        const b = moov.readInt32BE(base + 4);
        const w = moov.readUInt32BE(base + 36) / 65536;
        const h = moov.readUInt32BE(base + 40) / 65536;
        if (w > 0 && h > 0) {
          const rotated = a === 0 && b !== 0; // 90° / 270° (e.g. vertical iPhone video)
          meta.width = Math.round(rotated ? h : w);
          meta.height = Math.round(rotated ? w : h);
        }
      });
    }
  });
  return meta.duration ? meta : null;
}

module.exports = { videoMetadata };
