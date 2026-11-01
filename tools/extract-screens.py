#!/usr/bin/env python3
"""Extract bare app screens from the iPhone 6.9" App Store renders.

The source renders (1320x2868) are: blue gradient background + device frame +
marketing caption, with a dark overlay fading the lower half of the device out.
This script finds the screen rectangle, inverts that fade, crops, and writes
WebP at two widths plus a manifest the landing page uses for width/height.

    python3 tools/extract-screens.py [SOURCE_DIR]

Default SOURCE_DIR is ~/Desktop/iPhones  6.9
"""

import json
import os
import sys

from PIL import Image

# Colour the fade overlay blends toward, sampled from the caption band.
OVERLAY = (5, 12, 26)

# Every render fades its phone out before the screen ends, so no source holds a
# complete 19.5:9 screen -- the overlay is fully opaque by ~2.0x width on the
# best of them. Rather than leave a dead band at the bottom of the frame, all
# eight are cut to one aspect that each can actually reach, and the CSS device
# frame is built to match. 1.90 needs at most alpha 0.93 to recover; 1.95 would
# push two of the images to 0.96, where inverting the fade turns to noise.
TARGET_ASPECT = 1.90

# Refuse to invert past this -- a guard in case a future source fades harder.
MAX_ALPHA = 0.94

OUT_WIDTHS = (920, 460)
QUALITY = 82

# src file -> (output name, human caption, pillar key)
SCREENS = [
    ("01.png", "billboard-home", "Browse every listing in one place", "billboard"),
    ("02.png", "billboard-housing", "Housing, filtered to your area", "billboard"),
    ("03.png", "ask-feed", "Questions from your neighbors", "ask"),
    ("04.png", "ask-thread", "Real answers, threaded", "ask"),
    ("05.png", "circles-feed", "Your circles, all in one feed", "circles"),
    ("06.png", "circles-discover", "Discover circles near you", "circles"),
    ("07.png", "pros-feed", "Professionals your community trusts", "pros"),
    ("08.png", "pros-path", "Find a path to any company", "pros"),
]


def is_bezel(px):
    return max(px) < 55


def find_screen_x(img, y):
    """Walk out from the horizontal centre until hitting the bezel on each side."""
    w = img.size[0]
    px = img.load()
    cx = w // 2

    def edge(step):
        x, run = cx, 0
        while 0 <= x < w:
            run = run + 1 if is_bezel(px[x, y]) else 0
            if run >= 16:
                return x - step * (run - 1)
            x += step
        return 0 if step < 0 else w - 1

    return edge(-1) + 1, edge(1) - 1


def find_screen_top(img, x0, x1):
    """Row where the screen starts: past the background, past the bezel.

    Walks down the horizontal centre of the device. The column reads as
    background (blue gradient), then the bezel's top edge, then the screen.
    """
    h = img.size[1]
    px = img.load()
    cx = (x0 + x1) // 2

    y = 0
    # 1. skip anything before the device -- the bezel top edge is a solid dark run
    run = 0
    while y < h:
        run = run + 1 if is_bezel(px[cx, y]) else 0
        if run >= 10:
            break
        y += 1
    else:
        return 0

    # 2. walk to the end of that bezel run
    while y < h and is_bezel(px[cx, y]):
        y += 1

    # 3. the screen begins here; require it to hold so a speck doesn't win
    while y < h and not all(
        not is_bezel(px[cx, yy]) for yy in range(y, min(y + 10, h))
    ):
        y += 1
    return y


def alpha_profile(img, x0, x1, y0):
    """Estimate overlay alpha per row from how far the brightest pixel has sunk.

    Inside the app the brightest pixel on a row is white (255) almost everywhere,
    so its decay traces the overlay directly.
    """
    h = img.size[1]
    px = img.load()
    xs = range(x0, x1, 7)
    raw = []
    for y in range(y0, h):
        peak = max(max(px[x, y]) for x in xs)
        raw.append(peak)

    # Baseline: the brightest we ever see, i.e. unfaded white.
    base = max(raw[: max(1, len(raw) // 3)])

    # alpha such that base*(1-a) + OVERLAY_max*a == peak
    ov = max(OVERLAY)
    alphas = []
    for peak in raw:
        if base <= ov:
            alphas.append(0.0)
            continue
        a = (base - peak) / (base - ov)
        alphas.append(min(max(a, 0.0), 1.0))

    # The peak is noisy on rows that happen to hold no white; enforce a
    # monotonically non-decreasing ramp, which is what the overlay actually is.
    smoothed, running = [], 0.0
    for a in alphas:
        running = max(running, a)
        smoothed.append(running)
    return smoothed


def unfade(img, box, alphas):
    """Invert the overlay row by row over the cropped region."""
    x0, y0, x1, y1 = box
    crop = img.crop(box).convert("RGB")
    px = crop.load()
    w, h = crop.size
    for y in range(h):
        a = alphas[y] if y < len(alphas) else 1.0
        if a < 0.004:
            continue
        inv = 1.0 / (1.0 - a)
        oa = [c * a for c in OVERLAY]
        for x in range(w):
            r, g, b = px[x, y]
            px[x, y] = (
                min(255, max(0, int((r - oa[0]) * inv))),
                min(255, max(0, int((g - oa[1]) * inv))),
                min(255, max(0, int((b - oa[2]) * inv))),
            )
    return crop


def process(src_dir, out_dir):
    manifest = {}
    os.makedirs(out_dir, exist_ok=True)

    for fname, name, caption, pillar in SCREENS:
        path = os.path.join(src_dir, fname)
        img = Image.open(path).convert("RGB")
        w, h = img.size

        # A row that is reliably inside the device for both layouts.
        probe = 900 if fname in ("01.png", "03.png", "05.png", "07.png") else 2000
        x0, x1 = find_screen_x(img, probe)

        # 02 is a zoomed crop whose device runs off the right edge -- the scan
        # finds no right bezel, so clamp to the canvas.
        x1 = min(x1, w - 1)
        if x1 - x0 < 200:
            raise SystemExit(f"{fname}: screen scan failed ({x0}..{x1})")

        y0 = find_screen_top(img, x0, x1)
        alphas = alpha_profile(img, x0, x1, y0)

        # Every screen is cut to the same aspect so they all fill the frame.
        rows = round(TARGET_ASPECT * (x1 - x0))
        if rows > len(alphas) or y0 + rows > h:
            raise SystemExit(
                "%s: only %.2f aspect available, need %.2f"
                % (fname, len(alphas) / (x1 - x0), TARGET_ASPECT)
            )
        peak = alphas[rows - 1]
        if peak > MAX_ALPHA:
            raise SystemExit(
                "%s: reaching %.2f aspect needs alpha %.3f (max %.2f)"
                % (fname, TARGET_ASPECT, peak, MAX_ALPHA)
            )
        y1 = y0 + rows

        out = unfade(img, (x0, y0, x1, y1), alphas)

        cw, ch = out.size
        entry = {"caption": caption, "pillar": pillar, "sources": {}}
        for target in OUT_WIDTHS:
            if target > cw:
                continue
            scaled = out.resize(
                (target, round(ch * target / cw)), Image.Resampling.LANCZOS
            )
            rel = f"{name}-{target}.webp"
            scaled.save(
                os.path.join(out_dir, rel), "WEBP", quality=QUALITY, method=6
            )
            entry["sources"][target] = {
                "file": rel,
                "w": scaled.size[0],
                "h": scaled.size[1],
            }
        manifest[name] = entry
        print(
            f"{fname} -> {name}: screen x {x0}..{x1} y {y0}..{y1} "
            f"({cw}x{ch}, aspect {ch / cw:.3f}, peak alpha {peak:.3f})"
        )

    with open(os.path.join(out_dir, "manifest.json"), "w") as fh:
        json.dump(manifest, fh, indent=2)
    print(f"\nwrote {len(manifest)} screens to {out_dir}")


if __name__ == "__main__":
    src = sys.argv[1] if len(sys.argv) > 1 else os.path.expanduser(
        "~/Desktop/iPhones  6.9"
    )
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    process(src, os.path.join(root, "screens"))
