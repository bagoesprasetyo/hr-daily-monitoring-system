'use strict';

/**
 * OCR Service — KTP Identity Reader (Tesseract.js + Sharp)
 *
 * Pipeline:
 *  1. Decode base64 → Buffer
 *  2. Sharp: Resize (1800px) + Grayscale (Preserves natural text contrast)
 *  3. Tesseract.js (ind+eng)
 *  4. Parse & bersihkan field KTP
 *  5. Return { parsed, text }
 */

const { createWorker } = require('tesseract.js');
const sharp = require('sharp');

// ── Preprocessing ─────────────────────────────────────────────────────────────

async function preprocessImage(buffer) {
  try {
    return await sharp(buffer)
      .resize(1800, null, { kernel: sharp.kernel.lanczos3, fit: 'inside' })
      .grayscale()
      .png()
      .toBuffer();
  } catch {
    return buffer;
  }
}

// ── Parser Helpers ────────────────────────────────────────────────────────────

function cleanVal(str) {
  if (!str) return '';
  return str
    .replace(/[=;|\\{}\[\]<>~`_!“"]/g, '') // karakter sampah & tanda kutip OCR
    .replace(/—+|-{2,}/g, '')               // em-dash / multiple hyphens
    .replace(/\s{2,}/g, ' ')                // spasi ganda
    .trim();
}

function extractValue(line, labelRegex) {
  if (!line) return null;
  // Coba ambil setelah pemisah (: — . " “)
  const sepMatch = line.match(/[:—."“]\s*(.+)$/);
  if (sepMatch && sepMatch[1].trim()) {
    return cleanVal(sepMatch[1]);
  }
  // Fallback: hapus label utama dari baris
  const stripped = line.replace(labelRegex, '').trim();
  return cleanVal(stripped);
}

// ── Pad angka RT/RW ke 3 digit ────────────────────────────────────────────────
function padToThreeDigits(str) {
  if (!str) return '';
  const num = str.replace(/\D/g, '');
  if (!num) return '';
  return num.padStart(3, '0').slice(0, 3);
}

// ── Normalisasi Agama ─────────────────────────────────────────────────────────
function normalizeReligion(raw) {
  if (!raw) return '';
  const u = raw.toUpperCase().trim();
  if (/ISLAM/.test(u))                              return 'Islam';
  if (/KRISTEN(\s*PROTESTAN)?/.test(u))             return 'Kristen Protestan';
  if (/KATOLIK/.test(u))                            return 'Katolik';
  if (/HINDU/.test(u))                              return 'Hindu';
  if (/BUDH?A|BUDDHA/.test(u))                      return 'Buddha';
  if (/KONG\s*HU\s*CU|KHONGHUCU|KONHUCU/.test(u))  return 'Konghucu';
  return raw;
}

// ── Normalisasi Status Perkawinan ─────────────────────────────────────────────
function normalizeMaritalStatus(raw) {
  if (!raw) return '';
  const u = raw.toUpperCase().replace(/\s+/g, ' ').trim();
  if (/BELUM\s*KAWIN/.test(u))  return 'Belum Kawin';
  if (/CERAI\s*HIDUP/.test(u))  return 'Cerai Hidup';
  if (/CERAI\s*MATI/.test(u))   return 'Cerai Mati';
  if (/KAWIN/.test(u))           return 'Kawin';
  return raw;
}

// ── Normalisasi Pekerjaan ─────────────────────────────────────────────────────
const OCCUPATION_MAP = [
  { pattern: /BELUM\s*(BEKERJA|KERJA)|TIDAK\s*(BEKERJA|KERJA)/i,                      value: 'Belum/Tidak Bekerja' },
  { pattern: /MENGURUS\s*RUMAH\s*TANGGA|IRT\b|RUMAH\s*TANGGA/i,                       value: 'Mengurus Rumah Tangga' },
  { pattern: /PELAJAR|MAHASISWA/i,                                                     value: 'Pelajar/Mahasiswa' },
  { pattern: /PENSIUNAN/i,                                                             value: 'Pensiunan' },
  { pattern: /PEGAWAI\s*NEGERI\s*SIPIL|\bPNS\b/i,                                     value: 'Pegawai Negeri Sipil (PNS)' },
  { pattern: /TENTARA\s*NASIONAL\s*INDONESIA|\bTNI\b/i,                               value: 'Tentara Nasional Indonesia (TNI)' },
  { pattern: /KEPOLISIAN|\bPOLRI\b|\bPOLISI\b/i,                                      value: 'Kepolisian RI (POLRI)' },
  { pattern: /KARYAWAN\s*BUMN|KARYAWAN\s*BUMD|\bBUMN\b|\bBUMD\b/i,                   value: 'Karyawan BUMN / BUMD' },
  { pattern: /KARYAWAN\s*SWASTA|PEGAWAI\s*SWASTA/i,                                   value: 'Karyawan Swasta' },
  { pattern: /WIRASWASTA|WIRAUSAHA/i,                                                  value: 'Wiraswasta' },
  { pattern: /PEDAGANG|PIALANG|BROKER/i,                                               value: 'Pedagang / Pialang' },
  { pattern: /KARYAWAN\s*HONORER|\bHONOR\b/i,                                         value: 'Karyawan Honorer' },
  { pattern: /PETANI|PEKEBUN/i,                                                        value: 'Petani / Pekebun' },
  { pattern: /PETERNAK/i,                                                              value: 'Peternak' },
  { pattern: /NELAYAN|PERIKANAN/i,                                                     value: 'Nelayan / Perikanan' },
  { pattern: /BURUH\s*(TANI|PERKEBUNAN|NELAYAN|PETERNAKAN)/i,                         value: 'Buruh Tani / Perkebunan / Nelayan / Peternakan' },
  { pattern: /GURU|DOSEN|PENELITI/i,                                                   value: 'Guru / Dosen / Peneliti' },
  { pattern: /DOKTER|PERAWAT|BIDAN|APOTEKER/i,                                        value: 'Dokter / Perawat / Bidan / Apoteker' },
  { pattern: /PENGACARA|NOTARIS|AKUNTAN|KONSULTAN|ARSITEK/i,                          value: 'Pengacara / Notaris / Akuntan / Konsultan / Arsitek' },
  { pattern: /SOPIR|PILOT|PELAUT/i,                                                    value: 'Sopir / Pilot / Pelaut' },
  { pattern: /TUKANG\s*(JAHIT|KAYU|BATU|LISTRIK|CUKUR)/i,                            value: 'Tukang Jahit / Tukang Kayu / Tukang Batu / Tukang Listrik / Tukang Cukur' },
  { pattern: /PENATA\s*RIAS|JURU\s*MASAK|\bCHEF\b/i,                                 value: 'Penata Rias / Juru Masak / Chef' },
  { pattern: /BURUH\s*HARIAN\s*LEPAS|BURUH\s*LEPAS|\bBHL\b/i,                        value: 'Buruh Harian Lepas' },
];

function normalizeOccupation(raw) {
  if (!raw) return '';
  for (const entry of OCCUPATION_MAP) {
    if (entry.pattern.test(raw)) return entry.value;
  }
  return raw;
}

function repairNikDigits(str) {
  if (!str) return '';
  return str
    .replace(/[OoD]/g, '0')
    .replace(/[IiLlb|!]/g, '1')
    .replace(/[Zz]/g, '2')
    .replace(/[Ee]/g, '3')
    .replace(/[A]/g, '4')
    .replace(/[S]/g, '5')
    .replace(/[Gg]/g, '6')
    .replace(/[TT]/g, '7')
    .replace(/[B]/g, '8')
    .replace(/[qP]/g, '9')
    .replace(/\D/g, '');
}

// ── KTP Field Parser ──────────────────────────────────────────────────────────

function parseKTPText(rawText) {
  const parsed = {};

  const lines = rawText
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // ── NIK ────────────────────────────────────────────────
    if (!parsed.nik) {
      const directMatch = line.match(/\b(\d{16})\b/);
      if (directMatch) {
        parsed.nik = directMatch[1];
      } else if (/nik|n1k|nkl|n\s*i\s*k/i.test(line)) {
        const val = extractValue(line, /.*nik\s*/i) || line;
        const digits = repairNikDigits(val);
        if (digits.length >= 16) {
          parsed.nik = digits.slice(0, 16);
        }
      }
    }

    // ── Nama ───────────────────────────────────────────────
    if (!parsed.name && /nama/i.test(line) && !/agama|kecamatan|kelurahan/i.test(line)) {
      const val = extractValue(line, /.*nama\s*/i);
      if (val && val.length > 1 && !/^\d+$/.test(val)) {
        parsed.name = val;
      }
    }

    // ── Tempat/Tgl Lahir ───────────────────────────────────
    if (!parsed.birth_place_date && /tempat|tgl|lahir|ttl/i.test(line)) {
      const val = extractValue(line, /.*(tempat|tgl|lahir|ttl)\s*/i);
      if (val) {
        parsed.birth_place_date = val;
        const parts = val.split(',');
        if (parts.length >= 2) {
          parsed.birth_place = parts[0].trim();
          parsed.birth_date  = parts.slice(1).join(',').trim();
        }
      }
    }

    // ── Jenis Kelamin ──────────────────────────────────────
    if (!parsed.gender && /jenis|kelamin|kelam/i.test(line)) {
      const val = extractValue(line, /.*(jenis|kelamin)\s*/i) || line;
      if (/laki/i.test(val))              parsed.gender = 'LAKI-LAKI';
      else if (/perempuan|wanita/i.test(val)) parsed.gender = 'PEREMPUAN';
    }

    // ── Golongan Darah ─────────────────────────────────────
    if (!parsed.blood_type) {
      const gdMatch = line.match(/gol[\s.]*darah\s*[:—.]?\s*([ABO]{1,2}[+-]?)/i);
      if (gdMatch) parsed.blood_type = gdMatch[1].toUpperCase();
    }

    // ── Alamat ─────────────────────────────────────────────
    if (!parsed.address && /alamat/i.test(line)) {
      const val = extractValue(line, /.*alamat\s*/i);
      if (val) parsed.address = val;
    }

    // ── RT/RW ──────────────────────────────────────────────
    if (!parsed.rt && /^\s*(rt|rw|rt[\s/]*rw)/i.test(line)) {
      const src = extractValue(line, /.*rt[\s/]*rw\s*/i) || line;
      const match = src.match(/(\d{1,3})\s*[/\-]\s*(\d{1,3})/);
      if (match) {
        parsed.rt    = padToThreeDigits(match[1]);
        parsed.rw    = padToThreeDigits(match[2]);
        parsed.rt_rw = `${parsed.rt}/${parsed.rw}`;
      }
    }

    // ── Kelurahan / Desa ───────────────────────────────────
    if (!parsed.village && /(kel[\s/]*desa|\bkelurahan\b|\bdesa\b)/i.test(line) && !/kelamin|kecamatan/i.test(line)) {
      const val = extractValue(line, /.*(kel[\s/]*desa|kelurahan|desa)\s*/i);
      if (val) parsed.village = val.replace(/^desa\s*/i, '').trim();
    }

    // ── Kecamatan ──────────────────────────────────────────
    if (!parsed.district && /kecamatan|kecam/i.test(line)) {
      const val = extractValue(line, /.*kecamatan\s*/i);
      if (val) parsed.district = val;
    }

    // ── Agama ──────────────────────────────────────────────
    if (!parsed.religion && /agama/i.test(line)) {
      const val = extractValue(line, /.*agama\s*/i) || line;
      parsed.religion = normalizeReligion(val);
    }

    // ── Status Perkawinan ──────────────────────────────────
    if (!parsed.marital_status && /status|perkawinan/i.test(line)) {
      const val = extractValue(line, /.*(status|perkawinan)\s*/i) || line;
      const normalized = normalizeMaritalStatus(val);
      if (normalized) parsed.marital_status = normalized;
    }

    // ── Pekerjaan ──────────────────────────────────────────
    if (!parsed.occupation && /pekerjaan|pekerj/i.test(line)) {
      let val = extractValue(line, /.*pekerjaan\s*/i);
      if (val) {
        // Hapus nama kota/provinsi yang ikut tercetak di sebelah kanan pekerjaan
        val = val.split(/JAKARTA|BEKASI|BOGOR|TANGERANG|DEPOK|BANDUNG|SURABAYA/i)[0];
        val = val.replace(/\s+[a-z]{1,4}$/, '').trim();
        parsed.occupation = normalizeOccupation(val);
      }
    }

    // ── Kewarganegaraan ────────────────────────────────────
    if (!parsed.nationality && /kewarganegaraan|warga/i.test(line)) {
      const val = extractValue(line, /.*kewarganegaraan\s*/i) || line;
      if (/wni/i.test(val))      parsed.nationality = 'WNI';
      else if (/wna/i.test(val)) parsed.nationality = 'WNA';
    }
  }

  // ── Global Fallbacks ─────────────────────────────────────────
  const fullText = rawText.toUpperCase();

  if (!parsed.nik) {
    const nikMatch = rawText.match(/\b\d{16}\b/);
    if (nikMatch) parsed.nik = nikMatch[0];
  }

  if (!parsed.gender) {
    if (fullText.includes('LAKI-LAKI'))       parsed.gender = 'LAKI-LAKI';
    else if (fullText.includes('PEREMPUAN'))   parsed.gender = 'PEREMPUAN';
  }

  if (!parsed.religion) {
    const agamaMatch = fullText.match(/\b(ISLAM|KRISTEN(\s*PROTESTAN)?|KATOLIK|HINDU|BUDH?A|KHONGHUCU|KONGHUCU)\b/);
    if (agamaMatch) parsed.religion = normalizeReligion(agamaMatch[0]);
  }

  if (!parsed.marital_status) {
    if (fullText.includes('BELUM KAWIN'))      parsed.marital_status = 'Belum Kawin';
    else if (fullText.includes('CERAI HIDUP')) parsed.marital_status = 'Cerai Hidup';
    else if (fullText.includes('CERAI MATI'))  parsed.marital_status = 'Cerai Mati';
    else if (fullText.includes('KAWIN'))        parsed.marital_status = 'Kawin';
  }

  if (!parsed.nationality) {
    if (fullText.includes('WNI'))      parsed.nationality = 'WNI';
    else if (fullText.includes('WNA')) parsed.nationality = 'WNA';
    else parsed.nationality = 'WNI';
  }

  // ── Strict Field Sanitization (Hapus Simbol & Format Sesuai Aturan) ─────────────

  // NIK: ANGKA SAJA (16 digit, tanpa simbol/huruf)
  if (parsed.nik) {
    parsed.nik = parsed.nik.replace(/\D/g, '').slice(0, 16);
  }

  // NAMA LENGKAP: HURUF SAJA (plus spasi, titik, petik, strip)
  if (parsed.name) {
    parsed.name = parsed.name.replace(/[^a-zA-Z\s.'-]/g, '').replace(/\s+/g, ' ').trim().toUpperCase();
  }

  // RT: 3 DIGIT (zero-padded)
  if (parsed.rt) {
    parsed.rt = padToThreeDigits(parsed.rt);
  }

  // RW: 3 DIGIT (zero-padded)
  if (parsed.rw) {
    parsed.rw = padToThreeDigits(parsed.rw);
  }

  // KELURAHAN / DESA: HURUF SAJA (tanpa simbol/angka)
  if (parsed.village) {
    parsed.village = parsed.village.replace(/[^a-zA-Z\s]/g, '').replace(/\s+/g, ' ').trim().toUpperCase();
  }

  // KECAMATAN: HURUF SAJA (tanpa simbol/angka)
  if (parsed.district) {
    parsed.district = parsed.district.replace(/[^a-zA-Z\s]/g, '').replace(/\s+/g, ' ').trim().toUpperCase();
  }

  // AGAMA: normalisasi ke nilai baku
  if (parsed.religion) {
    parsed.religion = normalizeReligion(parsed.religion.replace(/[^a-zA-Z\s]/g, '').trim()) || parsed.religion;
  }

  // STATUS PERKAWINAN: normalisasi ke nilai baku
  if (parsed.marital_status) {
    parsed.marital_status = normalizeMaritalStatus(parsed.marital_status.replace(/[^a-zA-Z\s]/g, '').trim()) || parsed.marital_status;
  }

  // PEKERJAAN: normalisasi ke nilai baku
  if (parsed.occupation) {
    const cleanedOcc = parsed.occupation.replace(/[^a-zA-Z\s/-]/g, '').replace(/\s+/g, ' ').trim();
    parsed.occupation = normalizeOccupation(cleanedOcc) || cleanedOcc;
  }

  // KEWARGANEGARAAN: hanya WNI atau WNA
  if (parsed.nationality) {
    const nat = parsed.nationality.replace(/[^a-zA-Z\s]/g, '').trim().toUpperCase();
    parsed.nationality = nat.includes('WNA') ? 'WNA' : 'WNI';
  }

  return parsed;
}

// ── Main Export ───────────────────────────────────────────────────────────────

/**
 * Jalankan OCR pada gambar KTP (base64) dan kembalikan field yang sudah diparsing.
 * @param {string} base64String
 * @returns {{ text: string, parsed: object }}
 */
async function performOCR(base64String) {
  const base64Data    = base64String.replace(/^data:image\/\w+;base64,/, '');
  const rawBuffer     = Buffer.from(base64Data, 'base64');
  const processedBuf  = await preprocessImage(rawBuffer);

  const worker = await createWorker('ind+eng', 1, { logger: () => {} });
  let text = '';
  try {
    await worker.setParameters({ tessedit_pageseg_mode: '6' });
    const { data } = await worker.recognize(processedBuf);
    text = data.text || '';
  } finally {
    await worker.terminate();
  }

  const parsed = parseKTPText(text);
  return { text, parsed };
}

module.exports = { performOCR };
