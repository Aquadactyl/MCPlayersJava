"""Verify the release archive, binary HUD sprites and its SHA256 sidecar."""
from pathlib import Path
from zipfile import ZipFile
import hashlib
import struct
import zlib

root = Path(__file__).resolve().parent.parent
package = root / "dist" / "mcplayers.blueprint"
png_count = 0
with ZipFile(package) as archive:
    assert archive.testzip() is None, "Archive CRC check failed"
    for name in archive.namelist():
        if not name.endswith(".png"):
            continue
        data = archive.read(name)
        assert data == (root / name).read_bytes(), f"Binary asset was modified: {name}"
        assert data.startswith(b"\x89PNG\r\n\x1a\n"), f"Invalid PNG signature: {name}"
        offset = 8
        compressed = b""
        dimensions = None
        ended = False
        while offset < len(data):
            size = struct.unpack_from(">I", data, offset)[0]
            kind = data[offset + 4:offset + 8]
            payload = data[offset + 8:offset + 8 + size]
            crc = struct.unpack_from(">I", data, offset + 8 + size)[0]
            assert zlib.crc32(kind + payload) == crc, f"Invalid PNG chunk: {name}"
            if kind == b"IHDR":
                dimensions = struct.unpack_from(">II", payload)
                assert all(0 < dimension <= 1024 for dimension in dimensions)
            elif kind == b"IDAT":
                compressed += payload
            elif kind == b"IEND":
                ended = True
            offset += 12 + size
        assert dimensions and ended and compressed, f"Incomplete PNG: {name}"
        assert zlib.decompress(compressed), f"Invalid PNG pixels: {name}"
        print(f"Verified {name}: {dimensions[0]} x {dimensions[1]}")
        png_count += 1
assert png_count == 8, "Expected the eight bundled HUD sprites"
assert hashlib.sha256(package.read_bytes()).hexdigest() == package.with_suffix(".blueprint.sha256").read_text().split()[0]
print("Package CRC, all HUD PNGs, original binary bytes and SHA256 verified.")
