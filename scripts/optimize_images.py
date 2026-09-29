"""Turn the full-size originals in images/_src/ into the small WebP files the site serves.

Run after adding or replacing an image:

    .venv/bin/python scripts/optimize_images.py

    images/_src/papers/<paper-id>.<png|jpg|tif|webp>
        -> images/papers/<paper-id>-800.webp    (paper card)
        -> images/papers/<paper-id>-1600.webp   (full-size view)
    images/_src/photo.<ext>
        -> images/photos/photo.webp             (440 px square, sidebar)

<paper-id> must match the `id` of the paper in data/papers.js.
Originals stay in images/_src/, which is gitignored.
"""

from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "images" / "_src"
SOURCE_EXTS = {".png", ".jpg", ".jpeg", ".webp", ".tif", ".tiff"}

PAPER_SIZES = (800, 1600)  # longest side, px
PHOTO_SIZE = 440
QUALITY = 82


def load_flat(path):
    """Open an image, apply EXIF rotation, flatten transparency onto white.

    Journal figures are drawn for a white page; a transparent background would
    turn black text unreadable on the dark theme.
    """
    img = ImageOps.exif_transpose(Image.open(path))
    if img.mode in ("RGBA", "LA", "P"):
        img = img.convert("RGBA")
        flat = Image.new("RGB", img.size, "white")
        flat.paste(img, mask=img.getchannel("A"))
        return flat
    return img.convert("RGB")


def kb(path):
    return f"{path.stat().st_size / 1024:,.0f} KB"


def optimize_papers():
    out_dir = ROOT / "images" / "papers"
    out_dir.mkdir(parents=True, exist_ok=True)
    for src in sorted((SRC / "papers").glob("*")):
        if src.suffix.lower() not in SOURCE_EXTS:
            continue
        img = load_flat(src)
        outputs = []
        for side in PAPER_SIZES:
            resized = img.copy()
            resized.thumbnail((side, side), Image.Resampling.LANCZOS)  # never upscales
            dest = out_dir / f"{src.stem}-{side}.webp"
            resized.save(dest, "WEBP", quality=QUALITY, method=6)
            outputs.append(f"{dest.name} {resized.width}x{resized.height} {kb(dest)}")
        print(f"{src.name} ({img.width}x{img.height}, {kb(src)})")
        for line in outputs:
            print(f"  -> {line}")


def optimize_photo():
    sources = [p for p in SRC.glob("photo.*") if p.suffix.lower() in SOURCE_EXTS]
    if not sources:
        return
    src = sources[0]
    img = ImageOps.fit(load_flat(src), (PHOTO_SIZE, PHOTO_SIZE), Image.Resampling.LANCZOS)
    dest = ROOT / "images" / "photos" / "photo.webp"
    dest.parent.mkdir(parents=True, exist_ok=True)
    img.save(dest, "WEBP", quality=QUALITY, method=6)
    print(f"{src.name} ({kb(src)}) -> {dest.relative_to(ROOT)} {kb(dest)}")


if __name__ == "__main__":
    if not SRC.exists():
        raise SystemExit(f"No originals folder at {SRC.relative_to(ROOT)}")
    optimize_papers()
    optimize_photo()
