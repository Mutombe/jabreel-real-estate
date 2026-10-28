"""Isometric estate shapes for the audience cards (SVG partials).

    python _src/tools/make_art.py

Points are (x, z, y): x runs right-down, z (depth) runs left-down, y is up.
Visible faces are the top, the z = depth face (left) and the x = length face (right).
"""
import os

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, "_src", "partials")
C, S = 0.866, 0.5


def iso(p, o):
    x, z, y = p
    return (o[0] + (x - z) * C, o[1] + (x + z) * S - y)


def poly(pts, o, fill, extra=""):
    d = " ".join(f"{a:.1f},{b:.1f}" for a, b in (iso(p, o) for p in pts))
    return f'<polygon points="{d}" fill="{fill}"{extra}/>'


def grad(gid, a, b, x2="0", y2="1", oa="1", ob="1"):
    return (f'<linearGradient id="{gid}" x1="0" y1="0" x2="{x2}" y2="{y2}">'
            f'<stop offset="0" stop-color="{a}" stop-opacity="{oa}"/><stop offset="1" stop-color="{b}" stop-opacity="{ob}"/></linearGradient>')


def svg(defs, body):
    return ('<svg viewBox="0 0 300 400" preserveAspectRatio="xMaxYMid slice" aria-hidden="true">'
            f"<defs>{defs}</defs>{body}</svg>")


# ---- houses (homebuyers) ------------------------------------------------------
def house(o, L, D, H, R, p):
    out = []
    out.append(poly([(0, D, 0), (L, D, 0), (L, D, H), (0, D, H)], o, f"url(#{p}w)"))                     # long wall
    out.append(poly([(L, 0, 0), (L, D, 0), (L, D, H), (L, D / 2, H + R), (L, 0, H)], o, f"url(#{p}g)"))  # gable
    out.append(poly([(0, D, H), (L, D, H), (L, D / 2, H + R), (0, D / 2, H + R)], o, f"url(#{p}r)"))     # roof
    out.append(poly([(L * .62, D, 0), (L * .8, D, 0), (L * .8, D, H * .62), (L * .62, D, H * .62)], o, "#5c4f42", ' opacity=".85"'))  # door
    out.append(poly([(L * .14, D, H * .38), (L * .44, D, H * .38), (L * .44, D, H * .74), (L * .14, D, H * .74)], o, "#fff", ' opacity=".55"'))  # window
    out.append(poly([(L, D * .3, H * .5), (L, D * .7, H * .5), (L, D * .7, H * .8), (L, D * .3, H * .8)], o, "#fff", ' opacity=".5"'))
    return "".join(out)


defs = (grad("hw", "#fbf7f1", "#e0d2bf") + grad("hg", "#ffffff", "#efe5d8") + grad("hr", "#b49f86", "#7d6a57", "1", "1"))
body = house((150, 205), 120, 90, 70, 52, "h") + house((40, 330), 90, 70, 54, 40, "h") + house((235, 330), 100, 80, 60, 46, "h")
open(os.path.join(OUT, "art-roofs.html"), "w").write(svg(defs, body))


# ---- arcade + spheres (investors) --------------------------------------------
def arcade(o, L, D, H, n, p):
    out = [poly([(0, 0, H), (L, 0, H), (L, D, H), (0, D, H)], o, f"url(#{p}t)"),
           poly([(0, D, 0), (L, D, 0), (L, D, H), (0, D, H)], o, f"url(#{p}f)"),
           poly([(L, 0, 0), (L, D, 0), (L, D, H), (L, 0, H)], o, f"url(#{p}s)")]
    bay = L / n
    for i in range(n):
        x0, x1 = i * bay + bay * .2, i * bay + bay * .8
        r = (x1 - x0) / 2
        pts = [(x0, D, 0), (x0, D, H * .5)]
        for k in range(1, 12):
            import math
            a = math.pi - math.pi * k / 12
            pts.append((x0 + r + r * math.cos(a), D, H * .5 + r * math.sin(a) * 1.0))
        pts += [(x1, D, H * .5), (x1, D, 0)]
        out.append(poly(pts, o, f"url(#{p}a)"))
    return "".join(out)


defs = (grad("at", "#ffffff", "#e9e7e3") + grad("af", "#e4e1dc", "#b9b4ad") + grad("as", "#f4f2ef", "#cfcac3")
        + grad("aa", "#6d675f", "#a7a199")
        + '<radialGradient id="ap" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#fff"/><stop offset=".55" stop-color="#dcd8d2"/><stop offset="1" stop-color="#9e988f"/></radialGradient>'
        + '<radialGradient id="ab" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#fff"/><stop offset=".45" stop-color="#d9c7ae"/><stop offset="1" stop-color="#65584a"/></radialGradient>')
body = (arcade((60, 270), 210, 70, 110, 3, "a")
        + '<ellipse cx="128" cy="230" rx="44" ry="13" fill="#3a352f" opacity=".14"/>'
        + '<circle cx="128" cy="180" r="52" fill="url(#ap)"/>'
        + '<ellipse cx="207" cy="266" rx="16" ry="5" fill="#3a352f" opacity=".12"/>'
        + '<circle cx="207" cy="246" r="19" fill="url(#ab)"/>')
open(os.path.join(OUT, "art-arches.html"), "w").write(svg(defs, body))


# ---- stepped towers (builders) -------------------------------------------------
def tower(o, w, d, h, p, floors):
    out = [poly([(0, d, 0), (w, d, 0), (w, d, h), (0, d, h)], o, f"url(#{p}f)"),
           poly([(w, 0, 0), (w, d, 0), (w, d, h), (w, 0, h)], o, f"url(#{p}s)"),
           poly([(0, 0, h), (w, 0, h), (w, d, h), (0, d, h)], o, f"url(#{p}t)")]
    for k in range(1, floors):
        y = h * k / floors
        out.append(poly([(w * .12, d, y), (w * .88, d, y), (w * .88, d, y + 3), (w * .12, d, y + 3)], o, "#fff", ' opacity=".4"'))
        out.append(poly([(w, d * .15, y), (w, d * .85, y), (w, d * .85, y + 3), (w, d * .15, y + 3)], o, "#fff", ' opacity=".25"'))
    return "".join(out)


defs = (grad("tf", "#9a8672", "#5c4f42") + grad("ts", "#c9b49a", "#8a7763") + grad("tt", "#efe3d1", "#d9c7ae")
        + grad("uf", "#f5efe7", "#d8ccbd") + grad("us", "#fffdf9", "#e9e1d8") + grad("ut", "#ffffff", "#f3eee7"))
body = (tower((92, 410), 58, 58, 120, "u", 4) + tower((168, 372), 58, 58, 210, "t", 7) + tower((244, 334), 58, 58, 300, "t", 10))
open(os.path.join(OUT, "art-towers.html"), "w").write(svg(defs, body))
print("art written")
