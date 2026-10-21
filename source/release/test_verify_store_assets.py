import json
from pathlib import Path
import struct
import tempfile
import unittest
import zlib

from .verify_store_assets import png_info, verify


def png(width, height, colour):
    def chunk(kind, body):
        return struct.pack(">I", len(body)) + kind + body + struct.pack(">I", zlib.crc32(kind + body) & 0xffffffff)
    channels = 4 if colour == 6 else 3
    body = (b"\0" + bytes([255]) * width * channels) * height
    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, colour, 0, 0, 0)) + chunk(b"IDAT", zlib.compress(body)) + chunk(b"IEND", b"")


class StoreAssetsTests(unittest.TestCase):
    def setUp(self):
        work = Path(__file__).resolve().parents[2] / "work"
        work.mkdir(exist_ok=True)
        self.temp = tempfile.TemporaryDirectory(dir=work)
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / "app-icon-512-draft.png").write_bytes(png(512, 512, 6))
        (self.root / "feature-graphic-1024x500-draft.png").write_bytes(png(1024, 500, 2))
        self.listing = "제목 (2자)\n게임\n\n짧은 설명\n가로 축구 게임\n\n상세 설명\n문의: jaeseok614@gmail.com\n"
        (self.root / "listing-ko-KR.txt").write_text(self.listing, encoding="utf-8")

    def test_complete_format_and_limits(self):
        result = verify(self.root)
        self.assertEqual(result["titleCharacters"], 2)
        self.assertFalse(result["playSubmitted"])
        self.assertFalse(result["nativeProvenanceVerifiedByThisScript"])

    def test_wrong_colour_channels(self):
        (self.root / "app-icon-512-draft.png").write_bytes(png(512, 512, 2))
        with self.assertRaisesRegex(ValueError, "Icon"):
            verify(self.root)
        (self.root / "app-icon-512-draft.png").write_bytes(png(512, 512, 6))
        (self.root / "feature-graphic-1024x500-draft.png").write_bytes(png(1024, 500, 6))
        with self.assertRaisesRegex(ValueError, "Feature graphic"):
            verify(self.root)

    def test_corrupt_png_crc(self):
        file = self.root / "app-icon-512-draft.png"
        data = bytearray(file.read_bytes())
        data[20] ^= 1
        file.write_bytes(data)
        with self.assertRaisesRegex(ValueError, "Corrupt"):
            png_info(file)

    def test_long_title_and_missing_support(self):
        file = self.root / "listing-ko-KR.txt"
        file.write_text(self.listing.replace("\n게임\n", "\n" + "가" * 31 + "\n"), encoding="utf-8")
        with self.assertRaisesRegex(ValueError, "character limit"):
            verify(self.root)
        file.write_text(self.listing.replace("jaeseok614@gmail.com", "unknown@example.com"), encoding="utf-8")
        with self.assertRaisesRegex(ValueError, "support contact"):
            verify(self.root)

    def test_three_real_size_screenshots_required_in_release_kit(self):
        shot = self.root / "native.png"
        shot.write_bytes(png(1920, 1080, 2))
        with self.assertRaisesRegex(ValueError, "at least three"):
            verify(self.root, [shot])
        result = verify(self.root, [shot, shot, shot])
        self.assertEqual(len(result["screenshots"]), 3)
        shot.write_bytes(png(1600, 720, 2))
        with self.assertRaisesRegex(ValueError, "phone screenshot"):
            verify(self.root, [shot] * 3)


if __name__ == "__main__":
    unittest.main()
