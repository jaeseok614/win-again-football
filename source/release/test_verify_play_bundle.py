import hashlib
import json
from pathlib import Path
import tempfile
import unittest
import warnings
import zipfile

from .verify_play_bundle import ANDROID, PACKAGE, fields, verify_bundle


def varint(n):
    out = bytearray()
    while n > 127:
        out.append((n & 127) | 128)
        n >>= 7
    return bytes(out) + bytes([n])


def field(key, value):
    if isinstance(value, str):
        value = value.encode()
    return varint(key * 8 + 2) + varint(len(value)) + value


def node(name, attrs=(), children=()):
    element = field(3, name)
    for key, value, namespace in attrs:
        element += field(4, field(1, namespace) + field(2, key) + field(3, value))
    return field(1, element + b"".join(field(5, child) for child in children))


class BundleTests(unittest.TestCase):
    def setUp(self):
        work = Path(__file__).resolve().parents[2] / "work"
        work.mkdir(exist_ok=True)
        self.temp = tempfile.TemporaryDirectory(dir=work)
        self.addCleanup(self.temp.cleanup)
        self.file = Path(self.temp.name) / "test.aab"

    def bundle(self, package=PACKAGE, target="36", debug=None, permissions=(), signature=False, bad_hash=False, duplicate=False):
        html = b"<!doctype html><title>local test fixture</title>"
        app_attrs = [("allowBackup", "false", ANDROID), ("usesCleartextTraffic", "false", ANDROID), ("appCategory", "game", ANDROID)]
        if debug:
            app_attrs.append(("debuggable", debug, ANDROID))
        activity = node("activity", [("name", PACKAGE + ".MainActivity", ANDROID), ("screenOrientation", "sensorLandscape", ANDROID)])
        manifest = node("manifest", [("package", package, ""), ("versionCode", "1", ANDROID), ("versionName", "1.0.0", ANDROID)], [node("uses-sdk", [("minSdkVersion", "24", ANDROID), ("targetSdkVersion", target, ANDROID)]), node("application", app_attrs, [activity]), *permissions])
        metadata = {"schema": 1, "applicationId": PACKAGE, "saveKey": "win-again-season-v17", "versionCode": 1, "versionName": "1.0.0", "bytes": len(html), "sha256": "0" * 64 if bad_hash else hashlib.sha256(html).hexdigest()}
        with warnings.catch_warnings(), zipfile.ZipFile(self.file, "w") as bundle:
            warnings.simplefilter("ignore", UserWarning)
            bundle.writestr("base/manifest/AndroidManifest.xml", manifest)
            bundle.writestr("base/assets/game/index.html", html)
            bundle.writestr("base/assets/game/build-info.json", json.dumps(metadata))
            bundle.writestr("base/dex/classes.dex", b"fixture")
            bundle.writestr("BundleConfig.pb", b"fixture")
            if signature:
                bundle.writestr("META-INF/UPLOAD.RSA", b"not a real signature")
                bundle.writestr("META-INF/UPLOAD.SF", b"not a real signature")
            if duplicate:
                bundle.writestr("BundleConfig.pb", b"duplicate")
        return self.file

    def test_release_identity_and_unsigned_state(self):
        result = verify_bundle(self.bundle())
        self.assertEqual(result["applicationId"], PACKAGE)
        self.assertIn("unsigned", result["signature"])
        self.assertFalse(result["playSubmitted"])

    def test_reject_debug_package(self):
        with self.assertRaisesRegex(ValueError, "Wrong release package"):
            verify_bundle(self.bundle(package=PACKAGE + ".debug"))

    def test_reject_old_target(self):
        with self.assertRaisesRegex(ValueError, "Wrong SDK"):
            verify_bundle(self.bundle(target="35"))

    def test_reject_debuggable(self):
        with self.assertRaisesRegex(ValueError, "Debuggable"):
            verify_bundle(self.bundle(debug="true"))

    def test_allow_billing_but_reject_unrelated_permissions(self):
        verify_bundle(self.bundle(permissions=[node("uses-permission", [("name", name, ANDROID)]) for name in ("android.permission.INTERNET", "com.android.vending.BILLING")]))
        with self.assertRaisesRegex(ValueError, "Unexpected network"):
            verify_bundle(self.bundle(permissions=[node("uses-permission", [("name", "android.permission.READ_CONTACTS", ANDROID)])]))

    def test_androidx_permission_is_only_own_signature(self):
        name = PACKAGE + ".DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION"
        use = node("uses-permission", [("name", name, ANDROID)])
        declaration = node("permission", [("name", name, ANDROID), ("protectionLevel", "signature", ANDROID)])
        verify_bundle(self.bundle(permissions=[declaration, use]))
        with self.assertRaisesRegex(ValueError, "Missing private"):
            verify_bundle(self.bundle(permissions=[use]))

    def test_reject_stale_game_hash(self):
        with self.assertRaisesRegex(ValueError, "Game bytes/hash"):
            verify_bundle(self.bundle(bad_hash=True))

    def test_local_bytes_are_checked(self):
        self.bundle()
        with zipfile.ZipFile(self.file) as bundle:
            for name in ("index.html", "build-info.json"):
                (Path(self.temp.name) / name).write_bytes(bundle.read("base/assets/game/" + name))
        self.assertTrue(verify_bundle(self.file, self.temp.name)["localAssetsEqual"])
        (Path(self.temp.name) / "index.html").write_bytes(b"stale")
        with self.assertRaisesRegex(ValueError, "AAB/local"):
            verify_bundle(self.file, self.temp.name)

    def test_signature_presence_never_claims_crypto_validation(self):
        with self.assertRaisesRegex(ValueError, "Expected unsigned"):
            verify_bundle(self.bundle(signature=True))
        result = verify_bundle(self.file, require_signature="present")
        self.assertIn("cryptographic verification still required", result["signature"])
        with self.assertRaisesRegex(ValueError, "missing"):
            verify_bundle(self.bundle(), require_signature="present")

    def test_reject_duplicate_entries(self):
        with self.assertRaisesRegex(ValueError, "Duplicate bundle"):
            verify_bundle(self.bundle(duplicate=True))

    def test_reject_truncated_protobuf(self):
        for data in (b"\x80", b"\x0a\x05a", b"\x00", b"\x0b"):
            with self.assertRaises(ValueError):
                list(fields(data))


if __name__ == "__main__":
    unittest.main()
