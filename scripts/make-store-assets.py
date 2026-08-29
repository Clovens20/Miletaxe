"""Génère l'icône Play, la bannière 1024x500 et l'icône iOS à partir du logo."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
OUT_PLAY = ROOT / "store" / "play"
OUT_IOS = ROOT / "store" / "ios"

INK = (15, 26, 18, 255)
LIME = (24, 143, 42, 255)
MINT = (230, 249, 233, 255)
WHITE = (247, 255, 248, 255)


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    names = (
        ("segoeuib.ttf", "segoeui.ttf") if bold else ("segoeui.ttf", "segoeuib.ttf")
    )
    for name in names:
        path = Path(r"C:\Windows\Fonts") / name
        if path.exists():
            return ImageFont.truetype(str(path), size)
    return ImageFont.load_default()


def contain(image: Image.Image, box: tuple[int, int]) -> Image.Image:
    fitted = image.copy()
    fitted.thumbnail(box, Image.Resampling.LANCZOS)
    return fitted


def play_icon() -> None:
    src = Image.open(ASSETS / "icon.png").convert("RGBA")
    out = src.resize((512, 512), Image.Resampling.LANCZOS)
    dest = OUT_PLAY / "hi-res-icon-512.png"
    out.save(dest, "PNG")
    print(f"wrote {dest} {out.size} {out.mode}")


def ios_icon() -> None:
    src = Image.open(ASSETS / "icon.png").convert("RGBA")
    canvas = Image.new("RGB", (1024, 1024), (7, 8, 7))
    canvas.paste(src, (0, 0), src)
    dest = OUT_IOS / "app-icon-1024.png"
    canvas.save(dest, "PNG")
    print(f"wrote {dest} {canvas.size} {canvas.mode}")


def feature_graphic() -> None:
    canvas = Image.new("RGB", (1024, 500), (15, 26, 18))
    draw = ImageDraw.Draw(canvas)

    # Soft lime wash so the banner does not blend into Play's dark chrome.
    for y in range(500):
        mix = y / 500
        r = int(15 + (24 - 15) * mix * 0.35)
        g = int(26 + (143 - 26) * mix * 0.12)
        b = int(18 + (42 - 18) * mix * 0.08)
        draw.line([(0, y), (1023, y)], fill=(r, g, b))

    logo = Image.open(ASSETS / "logo.png").convert("RGBA")
    mark = contain(logo, (420, 420))
    x = 48
    y = (500 - mark.height) // 2
    canvas.paste(mark, (x, y), mark)

    title = font(42, bold=True)
    body = font(22, bold=False)
    text_x = 500
    draw.text((text_x, 155), "Vos dossiers,", font=title, fill=(247, 255, 248))
    draw.text((text_x, 210), "prêts pour", font=title, fill=(247, 255, 248))
    draw.text((text_x, 265), "votre comptable.", font=title, fill=(182, 240, 190))
    draw.text((text_x, 340), "Km  ·  reçus  ·  revenus", font=font(20), fill=(148, 200, 156))

    dest = OUT_PLAY / "feature-graphic-1024x500.png"
    canvas.save(dest, "PNG")
    print(f"wrote {dest} {canvas.size} {canvas.mode}")


def main() -> None:
    OUT_PLAY.mkdir(parents=True, exist_ok=True)
    OUT_IOS.mkdir(parents=True, exist_ok=True)
    play_icon()
    feature_graphic()
    ios_icon()


if __name__ == "__main__":
    main()
