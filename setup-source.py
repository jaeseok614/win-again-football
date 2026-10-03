"""Complete the verified v22 development snapshot without overwriting edits."""
from pathlib import Path, PurePosixPath
import hashlib
import zipfile

root = Path(__file__).resolve().parent
archive = root / "football-source-v22.zip"
target = root / "source"
expected = "51fab2d2e0b86ef6a4896d7a72b681d254a229aa74e3edc3023e7a7b371ff393"
if hashlib.sha256(archive.read_bytes()).hexdigest() != expected:
    raise SystemExit("Source archive checksum mismatch.")
with zipfile.ZipFile(archive) as bundle:
    entries = bundle.infolist()
    if len(entries) != 140:
        raise SystemExit("Unexpected source file count.")
    for entry in entries:
        path = PurePosixPath(entry.filename)
        if path.is_absolute() or '..' in path.parts or '\\' in entry.filename:
            raise SystemExit("Unsafe archive path.")
        if (entry.external_attr >> 16) & 0o170000 == 0o120000:
            raise SystemExit("Archive symlinks are not supported.")
    added = 0
    for entry in entries:
        destination = target
        for part in PurePosixPath(entry.filename).parts:
            if destination.is_symlink():
                raise SystemExit("Refusing to extract through a source/ symlink.")
            destination /= part
        if destination.is_symlink():
            raise SystemExit("Refusing to replace a source/ symlink.")
        if destination.exists():
            continue
        bundle.extract(entry, target)
        if not entry.is_dir():
            added += 1
print(f"Ready: source/ ({added} missing files added; existing edits kept). Read DEVELOPMENT.md for run and test commands.")
