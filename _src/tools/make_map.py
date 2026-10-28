"""Build the dot-matrix Zimbabwe map (SVG partial) from the country boundary.

    python _src/tools/make_map.py
"""
import json
import math
import os

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
# geoBoundaries gbOpen ADM0 (simplified, ~2,000 vertices): accurate border at this scale
geo = json.load(open(os.path.join(ROOT, "_src", "raw", "zwe-gb.geojson")))
ring = geo["features"][0]["geometry"]["coordinates"][0]

LON0, LON1, LAT0, LAT1 = 25.1, 33.2, -22.5, -15.5
K = math.cos(math.radians(19))  # equirectangular, corrected at mid-latitude
W = 800
SCALE = W / ((LON1 - LON0) * K)
H = round((LAT1 - LAT0) * SCALE)


def proj(lon, lat):
    return ((lon - LON0) * K * SCALE, (LAT1 - lat) * SCALE)


poly = [proj(*p) for p in ring]


def inside(x, y):
    c = False
    j = len(poly) - 1
    for i in range(len(poly)):
        xi, yi = poly[i]
        xj, yj = poly[j]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
            c = not c
        j = i
    return c


STEP = 13
dots = []
for gy in range(0, H + STEP, STEP):
    for gx in range(0, W + STEP, STEP):
        x = gx + (STEP / 2 if (gy // STEP) % 2 else 0)
        if inside(x, gy):
            dots.append((x, gy))

PINS = [  # id, label, sub, lon, lat
    ("borrowdale", "Borrowdale Brooke", "Harare", 31.10, -17.73),
    ("ruparara", "Ruparara Estate", "Nyanga", 32.74, -18.22),
    ("clipsham", "Clipsham Views", "Masvingo", 30.83, -20.09),
    ("amberwood", "Amberwood Gardens", "Hillside, Bulawayo", 28.60, -20.18),
]
CITIES = [("Harare", 31.05, -17.83), ("Bulawayo", 28.58, -20.15), ("Masvingo", 30.83, -20.07),
          ("Mutare", 32.67, -18.97), ("Gweru", 29.82, -19.45), ("Victoria Falls", 25.84, -17.93),
          ("Beitbridge", 30.0, -22.22)]

outline = "M" + " L".join(f"{x:.1f},{y:.1f}" for x, y in poly) + "Z"
parts = [f'<svg class="zmap" viewBox="-20 -20 {W + 40} {H + 40}" role="img" '
         f'aria-label="Map of Zimbabwe showing Jabreel developments in Harare, Nyanga, Masvingo and Bulawayo">',
         f'<path class="zmap-glow" d="{outline}"/>', f'<path class="zmap-outline" d="{outline}"/>', '<g class="zmap-dots">']
for i, (x, y) in enumerate(dots):
    parts.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="2.6" style="--i:{i % 97}"/>')
parts.append("</g>")
parts.append('<g class="zmap-cities">')
for name, lon, lat in CITIES:
    x, y = proj(lon, lat)
    parts.append(f'<g transform="translate({x:.1f} {y:.1f})"><circle r="3"/><text x="9" y="4">{name}</text></g>')
parts.append("</g>")
for pid, label, sub, lon, lat in PINS:
    x, y = proj(lon, lat)
    parts.append(
        f'<g class="zmap-pin" data-pin="{pid}" transform="translate({x:.1f} {y:.1f})" tabindex="0" role="button" aria-label="{label}, {sub}">'
        f'<circle class="pulse" r="10"/><circle class="ring" r="16"/>'
        f'<path class="marker" d="M0 0c-9-12-14-19-14-26a14 14 0 1 1 28 0c0 7-5 14-14 26z" transform="translate(0 -2)"/>'
        f'<path class="roof" d="M-6 -27l6-6 6 6v7h-12z" transform="translate(0 -2)"/></g>')
parts.append("</svg>")
out = os.path.join(ROOT, "_src", "partials", "map.svg")
os.makedirs(os.path.dirname(out), exist_ok=True)
open(out, "w", encoding="utf-8").write("\n".join(parts))
print(len(dots), "dots", W, H)
