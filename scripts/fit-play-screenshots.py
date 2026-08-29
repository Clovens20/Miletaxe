"""Recadre les captures téléphone en 1080x1920 (format Play)."""

from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image

TARGET = (1080, 1920)


def fit(path: Path, dest: Path) -> None:
    src = Image.open(path).convert("RGB")
    tw, th = TARGET
    scale = max(tw / src.width, th / src.height)
    sized = src.resize((round(src.width * scale), round(src.height * scale)), Image.Resampling.LANCZOS)
    left = max(0, (sized.width - tw) // 2)
    # On garde le haut de l'écran (titre, contenu) et on coupe le bas vide / barre Android.
    top = 0 if sized.height >= th else max(0, (sized.height - th) // 2)
    crop = sized.crop((left, top, left + tw, top + th))
    dest.parent.mkdir(parents=True, exist_ok=True)
    crop.save(dest, "JPEG", quality=92, optimize=True)
    print(f"{path.name} -> {dest.name} {crop.size}")


def main() -> None:
    raw = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("store/play/raw")
    out = Path(sys.argv[2]) if len(sys.argv) > 2 else Path("store/play/screenshots")
    files = sorted(p for p in raw.iterdir() if p.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp"})
    if not files:
        print(f"Aucun fichier dans {raw}")
        return
    for index, file in enumerate(files, start=1):
        fit(file, out / f"{index:02d}-{file.stem}-1080x1920.jpg")


if __name__ == "__main__":
    main()
