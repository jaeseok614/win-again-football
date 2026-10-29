"""Inspect the actual AAB, using Android's published AAPT2 Resources.proto fields.

This checks release contents, not a Play review or cryptographic signature.
Schema: https://android.googlesource.com/platform/frameworks/base/+/refs/heads/main/tools/aapt2/Resources.proto
"""
import argparse
import hashlib
import json
from pathlib import Path
import re
import zipfile

ANDROID = "http://schemas.android.com/apk/res/android"
PACKAGE = "com.jaeseok614.winagainfootball"


def fields(data):
    at = 0

    def varint():
        nonlocal at
        result = 0
        for shift in range(0, 70, 7):
            if at >= len(data):
                raise ValueError("Truncated protobuf varint")
            byte = data[at]
            at += 1
            result |= (byte & 127) << shift
            if not byte & 128:
                return result
        raise ValueError("Oversized protobuf varint")

    while at < len(data):
        tag = varint()
        number, wire = tag >> 3, tag & 7
        if not number:
            raise ValueError("Invalid protobuf field")
        if wire == 0:
            value = varint()
        elif wire in (1, 2, 5):
            size = varint() if wire == 2 else 8 if wire == 1 else 4
            if size > len(data) - at:
                raise ValueError("Truncated protobuf field")
            value = data[at:at + size]
            at += size
        else:
            raise ValueError("Unsupported protobuf wire type")
        yield number, value


def one(rows, number, default=None):
    values = [value for key, value in rows if key == number]
    if len(values) > 1:
        raise ValueError("Duplicate singular protobuf field")
    return values[0] if values else default


def xml_node(data, depth=0):
    if depth > 32:
        raise ValueError("Manifest nesting is too deep")
    element = one(list(fields(data)), 1)
    if element is None:
        return None
    rows = list(fields(element))
    name = one(rows, 3, b"").decode("utf-8")
    attrs = {}
    for key, value in rows:
        if key == 4:
            attr = list(fields(value))
            identity = (one(attr, 1, b"").decode(), one(attr, 2, b"").decode())
            if identity in attrs:
                raise ValueError("Duplicate manifest attribute")
            attrs[identity] = one(attr, 3, b"").decode()
    return {"name": name, "attrs": attrs, "children": [child for key, value in rows if key == 5 if (child := xml_node(value, depth + 1))]}


def check(condition, message):
    if not condition:
        raise ValueError(message)


def verify_bundle(file, assets=None, require_signature="unsigned"):
    with zipfile.ZipFile(file) as bundle:
        names = bundle.namelist()
        check(len(names) == len(set(names)), "Duplicate bundle entries")
        check(all(not n.startswith(("/", "\\")) and ".." not in n.replace("\\", "/").split("/") for n in names), "Invalid bundle path")
        check(bundle.testzip() is None, "Corrupt bundle entry")
        check(bundle.getinfo("base/manifest/AndroidManifest.xml").file_size < 1048576, "Manifest is too large")
        manifest = xml_node(bundle.read("base/manifest/AndroidManifest.xml"))
        check(manifest and manifest["name"] == "manifest", "Missing manifest root")
        attr = lambda node, key, namespace=ANDROID: node["attrs"].get((namespace, key))
        check(attr(manifest, "package", "") == PACKAGE, "Wrong release package")
        children = manifest["children"]
        sdk = [n for n in children if n["name"] == "uses-sdk"]
        app = [n for n in children if n["name"] == "application"]
        check(len(sdk) == len(app) == 1, "Missing or duplicate release nodes")
        check(attr(sdk[0], "minSdkVersion") == "24" and attr(sdk[0], "targetSdkVersion") == "36", "Wrong SDK targets")
        # Billing adds only native HTTPS verification and Play Billing access.
        # The WebView still blocks all network requests and native file paths.
        private_permission = PACKAGE + ".DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION"
        uses = [n for n in children if n["name"].startswith("uses-permission")]
        declarations = [n for n in children if n["name"] == "permission"]
        allowed_permissions = {private_permission, "android.permission.INTERNET", "android.permission.ACCESS_NETWORK_STATE", "com.android.vending.BILLING"}
        check(all(attr(n, "name") in allowed_permissions for n in uses), "Unexpected network or device permission: " + str([attr(n, "name") for n in uses if attr(n, "name") not in allowed_permissions]))
        check(all(attr(n, "name") == private_permission and attr(n, "protectionLevel") == "signature" for n in declarations), "Unexpected declared permission")
        check(not any(attr(n, "name") == private_permission for n in uses) or len(declarations) == 1, "Missing private signature permission declaration")
        app = app[0]
        check(attr(app, "debuggable") in (None, "false"), "Debuggable release")
        check(attr(app, "allowBackup") == "false" and attr(app, "usesCleartextTraffic") == "false", "Wrong release storage/network policy")
        check(attr(app, "appCategory") == "game", "Missing game category")
        activity = [n for n in app["children"] if n["name"] == "activity" and attr(n, "name", ANDROID) == PACKAGE + ".MainActivity"]
        check(len(activity) == 1 and attr(activity[0], "screenOrientation") == "sensorLandscape", "Wrong landscape activity")
        metadata_bytes = bundle.read("base/assets/game/build-info.json")
        metadata = json.loads(metadata_bytes)
        html = bundle.read("base/assets/game/index.html")
        check(metadata["schema"] == 1 and metadata["applicationId"] == PACKAGE and metadata["saveKey"] == "win-again-season-v17", "Wrong game identity")
        check(str(metadata["versionCode"]) == attr(manifest, "versionCode") and metadata["versionName"] == attr(manifest, "versionName"), "Manifest/game version mismatch")
        check(len(html) == metadata["bytes"] and hashlib.sha256(html).hexdigest() == metadata["sha256"], "Game bytes/hash mismatch")
        check(bundle.getinfo("BundleConfig.pb").file_size > 0 and any(n.startswith("base/dex/") and n.endswith(".dex") for n in names), "Missing native bundle code")
        if assets:
            assets = Path(assets)
            check((assets / "index.html").read_bytes() == html and (assets / "build-info.json").read_bytes() == metadata_bytes, "AAB/local game mismatch")
        blocks = [n for n in names if re.fullmatch(r"META-INF/[^/]+\.(RSA|DSA|EC)", n, re.I)]
        sf = [n for n in names if re.fullmatch(r"META-INF/[^/]+\.SF", n, re.I)]
        if require_signature == "unsigned":
            check(not blocks and not sf, "Expected unsigned CI bundle")
        else:
            check(bool(blocks and sf), "Upload signature is missing")
        return {"applicationId": PACKAGE, "versionCode": metadata["versionCode"], "versionName": metadata["versionName"], "minSdk": 24, "targetSdk": 36, "orientation": "sensorLandscape", "htmlBytes": len(html), "htmlSha256": metadata["sha256"], "aabBytes": Path(file).stat().st_size, "aabSha256": hashlib.sha256(Path(file).read_bytes()).hexdigest(), "signature": "present; cryptographic verification still required" if blocks else "unsigned; owner upload key required", "localAssetsEqual": bool(assets), "playSubmitted": False}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("bundle")
    parser.add_argument("--assets")
    parser.add_argument("--require-signature", choices=("unsigned", "present"), default="unsigned")
    parser.add_argument("--json")
    args = parser.parse_args()
    report = verify_bundle(args.bundle, args.assets, args.require_signature)
    text = json.dumps(report, indent=2) + "\n"
    if args.json:
        Path(args.json).write_text(text, encoding="utf-8")
    print(text, end="")
