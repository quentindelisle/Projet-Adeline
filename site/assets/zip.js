/* Création d'une archive .zip (sans compression) dans le navigateur */
const ZipMini = (() => {
  const table = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc32 = b => { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = table[(c ^ b[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  function creer(fichiers) { // [{nom, texte}]
    const enc = new TextEncoder(), parts = [], central = [];
    let offset = 0;
    for (const f of fichiers) {
      const nom = enc.encode(f.nom), data = enc.encode(f.texte), crc = crc32(data);
      const h = new DataView(new ArrayBuffer(30));
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true);
      h.setUint32(14, crc, true); h.setUint32(18, data.length, true); h.setUint32(22, data.length, true); h.setUint16(26, nom.length, true);
      parts.push(new Uint8Array(h.buffer), nom, data);
      const c = new DataView(new ArrayBuffer(46));
      c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true);
      c.setUint32(16, crc, true); c.setUint32(20, data.length, true); c.setUint32(24, data.length, true); c.setUint16(28, nom.length, true); c.setUint32(42, offset, true);
      central.push(new Uint8Array(c.buffer), nom);
      offset += 30 + nom.length + data.length;
    }
    const taille = central.reduce((a, b) => a + b.length, 0);
    const fin = new DataView(new ArrayBuffer(22));
    fin.setUint32(0, 0x06054b50, true); fin.setUint16(8, fichiers.length, true); fin.setUint16(10, fichiers.length, true);
    fin.setUint32(12, taille, true); fin.setUint32(16, offset, true);
    return new Blob([...parts, ...central, new Uint8Array(fin.buffer)], { type: 'application/zip' });
  }
  return { creer };
})();
