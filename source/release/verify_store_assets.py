"""Check Play listing files; native screenshot provenance is verified separately.
Official constraints: https://support.google.com/googleplay/android-developer/answer/9866151
"""
import argparse
import hashlib
import json
from pathlib import Path
import struct
import zlib


def png_info(file):
    data = Path(file).read_bytes()
    if data[:8] != b"\x89PNG\r\n\x1a\n":
        raise ValueError("Not a PNG: " + str(file))
    offset = 8
    kinds = []
    while offset < len(data):
        if offset + 12 > len(data):
            raise ValueError("Truncated PNG")
        size = struct.unpack_from(">I", data, offset)[0]
        kind = data[offset + 4:offset + 8]
        if size > len(data) - offset - 12:
            raise ValueError("Truncated PNG chunk")
        body = data[offset + 8:offset + 8 + size]
        crc = struct.unpack_from(">I", data, offset + 8 + size)[0]
        if zlib.crc32(kind + body) & 0xffffffff != crc:
            raise ValueError("Corrupt PNG chunk")
        if kind == b"IHDR":
            if kinds or size != 13:
                raise ValueError("Invalid PNG header")
            width, height, bits, colour, compression, filtering, interlace = struct.unpack(">IIBBBBB", body)
            if compression or filtering or interlace not in (0, 1):
                raise ValueError("Unsupported PNG header")
        kinds.append(kind)
        offset += size + 12
        if kind == b"IEND":
            break
    if not kinds or kinds[0] != b"IHDR" or kinds[-1] != b"IEND" or b"IDAT" not in kinds or offset != len(data):
        raise ValueError("Incomplete PNG")
    return {"file": str(file), "width": width, "height": height, "bitDepth": bits, "colourType": colour, "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()}


def verify(root, screenshots=()):
    root = Path(root)
    icon = png_info(root / "app-icon-512-draft.png")
    graphic = png_info(root / "feature-graphic-1024x500-draft.png")
    if (icon["width"], icon["height"], icon["bitDepth"], icon["colourType"]) != (512, 512, 8, 6) or icon["bytes"] > 1024 * 1024:
        raise ValueError("Icon must be 512x512 32-bit RGBA PNG <= 1024KB")
    if (graphic["width"], graphic["height"], graphic["bitDepth"], graphic["colourType"]) != (1024, 500, 8, 2):
        raise ValueError("Feature graphic must be 1024x500 24-bit RGB PNG")
    text = (root / "listing-ko-KR.txt").read_text(encoding="utf-8")
    title = text.splitlines()[1]
    short, detail = text.split("짧은 설명\n", 1)[1].split("\n\n상세 설명\n", 1)
    if not 1 <= len(title) <= 30 or not 1 <= len(short) <= 80 or not 1 <= len(detail) <= 4000:
        raise ValueError("Play listing character limit")
    if "문의: jaeseok614@gmail.com" not in detail or "2부 리그 감독" in text:
        raise ValueError("Wrong support contact or retired title")
    shots = [png_info(file) for file in screenshots]
    for shot in shots:
        if shot["bitDepth"] != 8 or shot["colourType"] != 2 or min(shot["width"], shot["height"]) < 320 or max(shot["width"], shot["height"]) > 3840 or max(shot["width"], shot["height"]) > min(shot["width"], shot["height"]) * 2:
            raise ValueError("Invalid phone screenshot format/dimensions")
    if shots and (not 3 <= len(shots) <= 8 or any(s["width"] < 1920 or s["height"] < 1080 or s["width"] * 9 != s["height"] * 16 for s in shots)):
        raise ValueError("Release kit uses at least three native 1920x1080 16:9 screenshots")
    return {"titleCharacters": len(title), "shortCharacters": len(short), "descriptionCharacters": len(detail), "icon": icon, "graphic": graphic, "screenshots": shots, "nativeProvenanceVerifiedByThisScript": False, "playSubmitted": False}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("root", nargs="?", default="docs/play-store-draft")
    parser.add_argument("--screenshots", nargs="*", default=[])
    parser.add_argument("--json")
    args = parser.parse_args()
    result = json.dumps(verify(args.root, args.screenshots), ensure_ascii=False, indent=2) + "\n"
    if args.json:
        Path(args.json).write_text(result, encoding="utf-8")
    print(result, end="")
