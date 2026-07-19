from __future__ import annotations

import json
import os
import shutil
import sys
from pathlib import Path

from PIL import Image


ROOT = Path.cwd()
WIDTHS = [480, 640, 960, 1280, 1600, 1920, 2400]
IMAGE_EXTENSIONS = {".avif", ".jpeg", ".jpg", ".png", ".webp"}
VIDEO_EXTENSIONS = {".mp4", ".mov", ".webm"}
SKIP_DIRS = {"dist", "optimized", ".git", ".agents", ".codex"}


def iter_images() -> list[Path]:
    referenced = referenced_image_paths()
    if referenced:
        return sorted(referenced, key=lambda p: str(p).lower())

    image_root = ROOT / "img"
    return sorted(
        path
        for root in [ROOT / "projects", image_root]
        if root.exists()
        for path in root.rglob("*")
        if not any(part in SKIP_DIRS for part in path.parts)
        and path.is_file()
        and path.suffix.lower() in IMAGE_EXTENSIONS
    )


def referenced_image_paths() -> list[Path]:
    refs: set[Path] = set()

    projects = read_json(ROOT / "projects.generated.json", [])
    for project in projects:
        if project.get("published") is False:
            continue
        folder = project.get("folder") or project.get("slug")
        for file_name in [project.get("cover"), *[item.get("file") for item in project.get("gallery", []) if isinstance(item, dict)]]:
            if not file_name:
                continue
            relative = Path("projects") / str(folder) / str(file_name)
            add_image_ref(refs, relative)

    assets = read_json(ROOT / "assets.generated.json", {})
    for key in ("hero", "heroDesktop", "heroMobile", "process", "directors"):
        for file_name in assets.get(key, []) or []:
            add_image_ref(refs, Path(str(file_name)))

    return [path for path in refs if path.exists()]


def read_json(path: Path, fallback):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return fallback


def add_image_ref(refs: set[Path], relative: Path) -> None:
    if relative.suffix.lower() not in IMAGE_EXTENSIONS:
        return
    if relative.as_posix().lower() in {"img/favicon.jpg", "img/favicon.png"}:
        return
    refs.add(ROOT / relative)


def output_stem(relative: Path) -> Path:
    parts = [safe_part(part) for part in relative.with_suffix("").parts]
    return Path("optimized").joinpath(*parts)


def safe_part(value: str) -> str:
    safe = "".join(ch.lower() if ch.isalnum() else "-" for ch in value)
    return "-".join(part for part in safe.split("-") if part)


def convert_image(path: Path) -> dict | None:
    relative = path.relative_to(ROOT)
    if relative.as_posix().lower() in {"img/favicon.jpg", "img/favicon.png"}:
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
    shutil.rmtree(ROOT / "optimized", ignore_errors=True)

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
