/**
 * Minimal AIFF → WAV converter (no dependencies).
 * Handles uncompressed PCM AIFF (the format Ableton's Core Library uses).
 *
 * Usage:  node scripts/aif-to-wav.mjs <input.aif> <output.wav>
 */

import { readFileSync, writeFileSync } from "fs";

function read80BitFloat(buf, off) {
  // IEEE 754 80-bit extended → number. AIFF stores sample rate this way.
  const sign = (buf[off] & 0x80) ? -1 : 1;
  const exponent = ((buf[off] & 0x7f) << 8) | buf[off + 1];
  let mantissa = 0;
  for (let i = 0; i < 8; i++) mantissa = mantissa * 256 + buf[off + 2 + i];
  if (exponent === 0 && mantissa === 0) return 0;
  return sign * mantissa * Math.pow(2, exponent - 16383 - 63);
}

function readStr(buf, off, len) {
  return String.fromCharCode(...buf.slice(off, off + len));
}

function aifToWav(inputPath, outputPath) {
  const buf = readFileSync(inputPath);
  if (readStr(buf, 0, 4) !== "FORM") throw new Error("Not an AIFF file");
  const formType = readStr(buf, 8, 4);
  if (formType !== "AIFF" && formType !== "AIFC") {
    throw new Error(`Unsupported FORM type: ${formType}`);
  }

  let numChannels = 0, numFrames = 0, bitsPerSample = 0, sampleRate = 0;
  let dataOffset = 0, dataSize = 0;
  let isCompressed = false, compressionType = "NONE";

  let off = 12;
  while (off < buf.length - 8) {
    const chunkId = readStr(buf, off, 4);
    const chunkSize = buf.readUInt32BE(off + 4);
    const payload = off + 8;

    if (chunkId === "COMM") {
      numChannels   = buf.readInt16BE(payload);
      numFrames     = buf.readUInt32BE(payload + 2);
      bitsPerSample = buf.readInt16BE(payload + 6);
      sampleRate    = Math.round(read80BitFloat(buf, payload + 8));
      if (formType === "AIFC") {
        compressionType = readStr(buf, payload + 18, 4);
        isCompressed = compressionType !== "NONE" && compressionType !== "sowt";
      }
    } else if (chunkId === "SSND") {
      const ssndOffset = buf.readUInt32BE(payload);
      dataOffset = payload + 8 + ssndOffset;
      dataSize = chunkSize - 8 - ssndOffset;
    }

    // Chunks are 2-byte aligned
    off += 8 + chunkSize + (chunkSize & 1);
  }

  if (isCompressed) throw new Error(`Compressed AIFC not supported: ${compressionType}`);
  if (!dataSize) throw new Error("No SSND chunk found");

  // AIFF is big-endian; flip endianness to little-endian for WAV.
  // For 16-bit, 24-bit, and 32-bit PCM we swap bytes per sample.
  // 'sowt' is the only compression type that's already little-endian.
  const bytesPerSample = bitsPerSample / 8;
  const audioData = Buffer.alloc(dataSize);
  if (compressionType === "sowt") {
    buf.copy(audioData, 0, dataOffset, dataOffset + dataSize);
  } else {
    // Big-endian → little-endian byte swap
    for (let i = 0; i < dataSize; i += bytesPerSample) {
      for (let b = 0; b < bytesPerSample; b++) {
        audioData[i + b] = buf[dataOffset + i + bytesPerSample - 1 - b];
      }
    }
  }

  // Write WAV file
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const wav = Buffer.alloc(44 + dataSize);

  wav.write("RIFF", 0);
  wav.writeUInt32LE(36 + dataSize, 4);
  wav.write("WAVE", 8);
  wav.write("fmt ", 12);
  wav.writeUInt32LE(16, 16);              // fmt chunk size
  wav.writeUInt16LE(1, 20);               // PCM format
  wav.writeUInt16LE(numChannels, 22);
  wav.writeUInt32LE(sampleRate, 24);
  wav.writeUInt32LE(byteRate, 28);
  wav.writeUInt16LE(blockAlign, 32);
  wav.writeUInt16LE(bitsPerSample, 34);
  wav.write("data", 36);
  wav.writeUInt32LE(dataSize, 40);
  audioData.copy(wav, 44);

  writeFileSync(outputPath, wav);
  console.log(`✓ ${inputPath}`);
  console.log(`  ${sampleRate}Hz, ${numChannels}ch, ${bitsPerSample}-bit, ${numFrames} frames (${(numFrames / sampleRate).toFixed(3)}s)`);
  console.log(`✓ Wrote ${outputPath} (${wav.length} bytes)`);
}

const [, , input, output] = process.argv;
if (!input || !output) {
  console.error("Usage: node aif-to-wav.mjs <input.aif> <output.wav>");
  process.exit(1);
}
aifToWav(input, output);
