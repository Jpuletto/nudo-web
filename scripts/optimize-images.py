from __future__ import annotations

import json
import os
import sys
from pathlib import Path

from PIL import Image


ROOT = Path.cwd()
WIDTHS = [480, 640, 960, 1280, 1600, 1920, 2400]
IMAGE_EXTENSIONS = {".avif", ".jpeg", ".jpg", ".png", ".webp"}
SKIP_DIRS = {"dist", "optimized", ".git", ".agents", ".codex"}


def iter_images() -> list[Path]:
    roots = [ROOT / "projects", ROOT / "IMG", ROOT / "img"]
    files: list[Path] = []
    for root in roots:
        if not root.exists():
            continue
        for path in root.rglob("*"):
            if any(part in SKIP_DIRS for part in path.parts):
                continue
            if path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS:
                files.append(path)
    return sorted(files, key=lambda p: str(p).lower())


def output_stem(relative: Path) -> Path:
    parts = [safe_part(part) for part in relative.with_suffix("").parts]
    return Path("optimized").joinpath(*parts)


def safe_part(value: str) -> str:
    safe = "".join(ch.lower() if ch.isalnum() else "-" for ch in value)
    return "-".join(part for part in safe.split("-") if part)


def convert_image(path: Path) -> dict | None:
    relative = path.relative_to(ROOT)
    if relative.as_posix().lower() == "img/favicon.jpg":
        return None

    try:
        image = Image.open(path)
    except Exception as exc:
        print(f"Saltando {relative}: {exc}", file=sys.stderr)
        return None

    image.load()
    width, height = image.size
    target_widths = [w for w in WIDTHS if w < width]
    if width not in target_widths:
        target_widths.append(width)
    target_widths = sorted(set(target_widths))

    stem = output_stem(relative)
    variants = []
    for target_width in target_widths:
        ratio = target_width / width
        target_height = max(1, round(height * ratio))
        resized = image
        if target_width != width:
            resized = image.resize((target_width, target_height), Image.Resampling.LANCZOS)

        if resized.mode not in ("RGB", "RGBA"):
            resized = resized.convert("RGBA" if "A" in resized.getbands() else "RGB")

        output = ROOT / f"{stem}-{target_width}.webp"
        output.parent.mkdir(parents=True, exist_ok=True)
        resized.save(output, "WEBP", quality=88, method=6)
        variants.append({
            "w": target_width,
            "src": output.relative_to(ROOT).as_posix()
        })

    return {
        "src": relative.as_posix(),
        "width": width,
        "height": height,
        "variants": variants
    }


def main() -> int:
    manifest = {}
    for image_path in iter_images():
        item = convert_image(image_path)
        if item:
            manifest[item["src"]] = item

    (ROOT / "optimized.generated.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Optimizadas {len(manifest)} imágenes.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
