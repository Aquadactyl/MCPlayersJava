"""Create a reproducible Blueprint ZIP with package files at the archive root."""
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo
import hashlib

root = Path(__file__).resolve().parent.parent
output = root / "dist" / "mcplayers.blueprint"
output.parent.mkdir(exist_ok=True)
files = [root / "conf.yml", root / "README.md", root / "LICENSE", root / "VALIDATION.md"]
for directory in ["admin", "app", "assets", "components", "private", "routes"]:
    files.extend(path for path in (root / directory).rglob("*") if path.is_file())
with ZipFile(output, "w", compression=ZIP_DEFLATED, compresslevel=9) as archive:
    for path in sorted(files):
        name = path.relative_to(root).as_posix()
        content = path.read_bytes()
        if path.suffix.lower() in {".yml", ".yaml", ".md", ".php", ".ts", ".tsx", ".css", ".svg", ".mjs"} or path.name == "LICENSE":
            content = content.replace(b"\r\n", b"\n")
        info = ZipInfo(name, date_time=(2026, 10, 13, 0, 0, 0))
        info.compress_type = ZIP_DEFLATED
        info.external_attr = 0o100644 << 16
        archive.writestr(info, content)
digest = hashlib.sha256(output.read_bytes()).hexdigest()
(output.parent / "mcplayers.blueprint.sha256").write_text(f"{digest}  mcplayers.blueprint\n", encoding="utf-8")
print(f"Packaged {len(files)} files: {output}")
print(f"SHA256: {digest}")
