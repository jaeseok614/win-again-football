"""Restore missing files from the verified v22 snapshot without overwriting edits."""
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
    restored = 0
    preserved = 0
    for entry in entries:
        destination = target.joinpath(*PurePosixPath(entry.filename).parts)
        if destination.exists():
            preserved += 1
            continue
        destination.parent.mkdir(parents=True, exist_ok=True)
        # Write only verified regular-file entries.  Never let ZipFile replace a
        # developer's working copy when a partially populated source/ exists.
        with bundle.open(entry) as source, destination.open("xb") as output:
            while chunk := source.read(1024 * 1024):
                output.write(chunk)
        restored += 1
print(f"Ready: source/ ({restored} restored, {preserved} preserved). Read DEVELOPMENT.md for run and test commands.")
