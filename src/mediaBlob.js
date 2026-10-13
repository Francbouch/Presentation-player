// Matérialise les octets avant de conserver un fichier provenant d’une clé USB
// ou d’un autre support externe. slice() seul conserve son fichier d’origine.
export async function snapshotBlob(blob) {
  const parts = [];
  for (let offset = 0; offset < blob.size; offset += 16 * 1024 * 1024) {
    const bytes = await blob.slice(offset, offset + 16 * 1024 * 1024).arrayBuffer();
    parts.push(new Blob([bytes]));
  }
  return new Blob(parts, { type: blob.type });
}
