"""Ray-marched studio renders of the six service objects (transparent WebP).

Each object is a signed distance function. Rays step forward by the distance
to the surface; hits are shaded with bronze metal, espresso lacquer or ivory
stone materials under a virtual softbox studio.

    python _src/tools/render3d.py            # all objects
    python _src/tools/render3d.py house key  # just some
"""
import os
import sys
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, "assets", "img")
SIZE = 520           # final canvas before crop
SS = 2               # supersampling factor
EXPORT = 480         # exported square size


def norm(v):
    return v / np.maximum(np.linalg.norm(v, axis=-1, keepdims=True), 1e-9)


def length(*c):
    return np.sqrt(sum(x * x for x in c))


def rot(x, y, z):
    x, y, z = np.radians([x, y, z])
    Rx = np.array([[1, 0, 0], [0, np.cos(x), -np.sin(x)], [0, np.sin(x), np.cos(x)]])
    Ry = np.array([[np.cos(y), 0, np.sin(y)], [0, 1, 0], [-np.sin(y), 0, np.cos(y)]])
    Rz = np.array([[np.cos(z), -np.sin(z), 0], [np.sin(z), np.cos(z), 0], [0, 0, 1]])
    return Rz @ Ry @ Rx


# ---- primitives (q is (N,3) in local space) --------------------------------
def round_box(q, c, b, r):
    d = np.abs(q - np.array(c)) - (np.array(b) - r)
    out = np.linalg.norm(np.maximum(d, 0), axis=-1)
    return out + np.minimum(d.max(axis=-1), 0) - r


def torus_xy(q, c, R, r):
    p = q - np.array(c)
    return length(length(p[:, 0], p[:, 1]) - R, p[:, 2]) - r


# ---- shapes: each returns (distance, material id) ---------------------------
# material ids: 0 bronze, 1 espresso, 2 ivory
def house(q, want_mat=False):
    x, y, z = q[:, 0], q[:, 1], q[:, 2]
    body = round_box(q, (0, -0.32, 0), (0.74, 0.5, 0.58), 0.05)
    k = np.hypot(0.72, 0.92)
    roof = np.maximum.reduce([(np.abs(x) * 0.72 + (y - 0.16) * 0.92 - 0.92 * 0.72) / k,
                              0.10 - y, np.abs(z) - 0.70]) - 0.035
    chim = round_box(q, (0.42, 0.62, -0.22), (0.1, 0.26, 0.1), 0.03)
    d = np.minimum.reduce([body, roof, chim])
    if not want_mat:
        return d
    m = np.full(len(q), 2)
    m[(roof <= body) | (chim <= body)] = 0
    front = z > 0.5
    door = front & (np.abs(x) < 0.15) & (y < -0.12)
    win = front & (np.abs(x) > 0.3) & (np.abs(x) < 0.58) & (y > -0.5) & (y < -0.16)
    side = (np.abs(x) > 0.7) & (np.abs(z) < 0.2) & (y > -0.5) & (y < -0.16) & (body < roof)
    m[(door | win | side) & (body < roof)] = 1
    return d, m


def key(q, want_mat=False):
    x, y = q[:, 0], q[:, 1]
    bow = torus_xy(q, (0, 0.55, 0), 0.4, 0.13)
    shaft = round_box(q, (0, -0.35, 0), (0.1, 0.62, 0.1), 0.08)
    collar = round_box(q, (0, 0.06, 0), (0.18, 0.06, 0.15), 0.05)
    t1 = round_box(q, (0.2, -0.86, 0), (0.14, 0.08, 0.08), 0.03)
    t2 = round_box(q, (0.17, -0.6, 0), (0.1, 0.06, 0.08), 0.03)
    d = np.minimum.reduce([bow, shaft, collar, t1, t2])
    if not want_mat:
        return d
    m = np.zeros(len(q), int)
    inner = (bow <= d + 1e-4) & (length(x, y - 0.55) < 0.4)
    m[inner] = 1
    m[collar <= d + 1e-4] = 1
    return d, m


TOWERS = [(-0.6, 0.62, 2), (0.0, 0.98, 1), (0.6, 1.36, 0)]  # x, height, material


def towers(q, want_mat=False):
    ds = [round_box(q, (cx, -0.85 + h / 2, 0), (0.27, h / 2, 0.3), 0.045) for cx, h, _ in TOWERS]
    d = np.minimum.reduce(ds)
    if not want_mat:
        return d
    idx = np.argmin(np.stack(ds), axis=0)
    m = np.array([t[2] for t in TOWERS])[idx]
    # floor slabs: thin bronze bands on the stone and lacquer towers
    y = q[:, 1] + 0.85
    band = (np.abs(((y + 0.11) % 0.22) - 0.11) < 0.012) & (m != 0) & (y > 0.08)
    top = np.zeros(len(q), bool)
    for i, (_, h, _) in enumerate(TOWERS):
        top |= (idx == i) & (y > h - 0.05)
    m[band & ~top] = 0
    return d, m


def globe(q, want_mat=False):
    d = np.linalg.norm(q, axis=-1) - 1.0
    if not want_mat:
        return d
    n = norm(q)
    lat = np.degrees(np.arcsin(np.clip(n[:, 1], -1, 1)))
    lon = np.degrees(np.arctan2(n[:, 2], n[:, 0]))
    w = 1.3
    on_lat = np.abs(((lat + 12.857) % 25.714) - 12.857) < w
    on_lon = (np.abs(((lon + 15) % 30) - 15) < w * 1.2 / np.maximum(np.cos(np.radians(lat)), .2)) & (np.abs(lat) < 70)
    m = np.full(len(q), 2)
    m[on_lat | on_lon] = 0
    return d, m


def arch(q, want_mat=False):
    x, y, z = q[:, 0], q[:, 1], q[:, 2]
    body = round_box(q, (0, 0, 0), (0.82, 1.0, 0.3), 0.06)
    open2d = np.minimum(np.maximum(np.abs(x) - 0.4, y - 0.12), length(x, y - 0.12) - 0.4)
    d = np.maximum(body, -open2d)
    if not want_mat:
        return d
    m = np.full(len(q), 2)
    m[np.abs(open2d) < 0.035] = 0
    plinth = y < -0.86
    m[plinth] = 1
    return d, m


def ribbon(q, want_mat=False):
    x, y, z = q[:, 0], q[:, 1], q[:, 2]
    a = np.arctan2(z, x)
    r = length(x, z) - 1.0
    c, s = np.cos(a), np.sin(a)
    u = c * r - s * y
    v = s * r + c * y
    du = np.abs(u) - (0.34 - 0.04)
    dv = np.abs(v) - (0.05 - 0.04)
    d = (length(np.maximum(du, 0), np.maximum(dv, 0)) + np.minimum(np.maximum(du, dv), 0) - 0.04) * 0.55
    if not want_mat:
        return d
    m = np.where(v > 0, 0, 1)
    return d, m


SHAPES = {
    # name: (sdf, pose x/y/z degrees, scale)
    "house": (house, (16, -32, 0), 0.92),
    "key": (key, (8, 24, -28), 0.88),
    "towers": (towers, (14, -30, 0), 0.82),
    "globe": (globe, (18, -28, -14), 0.92),
    "arch": (arch, (6, -30, 0), 0.82),
    "ribbon": (ribbon, (64, 18, -30), 0.95),
}

# ---- studio ------------------------------------------------------------------
LIGHTS = [  # direction, sharpness, strength, colour
    (norm(np.array([-0.55, 0.75, 0.65])), 22, 4.2, np.array([1.0, 0.98, 0.95])),
    (norm(np.array([0.85, 0.25, -0.45])), 10, 1.6, np.array([0.92, 0.94, 1.0])),
    (norm(np.array([0.0, 1.0, 0.1])), 6, 0.6, np.array([1.0, 1.0, 1.0])),
    (norm(np.array([0.6, -0.4, 0.7])), 9, 0.5, np.array([1.0, 0.82, 0.62])),
]
KEY = LIGHTS[0][0]


def env(d):
    y = d[:, 1:2]
    sky, hor, flr = np.array([0.97, 0.96, 0.94]), np.array([0.34, 0.31, 0.28]), np.array([0.12, 0.09, 0.06])
    col = np.where(y > 0, hor + (sky - hor) * np.clip(y * 1.6, 0, 1) ** 0.6,
                   hor + (flr - hor) * np.clip(-y * 2.2, 0, 1) ** 0.5)
    col = col * (0.7 + 0.3 * np.clip(d[:, 0:1] + 0.6, 0, 1))      # darker on the left
    col = col * (0.55 + 0.45 * np.clip(d[:, 2:3] + 0.9, 0, 1))     # darker behind
    col = col + 1.6 * np.exp(-((y - 0.18) / 0.06) ** 2)              # horizontal softbox
    col = col + 1.1 * np.exp(-((d[:, 0:1] - 0.75) / 0.08) ** 2) * (y > -0.2)  # vertical strip
    for ld, sharp, k, c in LIGHTS:
        col = col + k * 0.25 * np.clip(d @ ld, 0, 1)[:, None] ** (sharp * 4) * c
    return col


def fresnel(f0, ndv):
    return f0 + (1 - f0) * (1 - ndv) ** 5


def shade(p, n, v, mat, sdf):
    ndv = np.clip((n * v).sum(-1), 0, 1)[:, None]
    r = 2 * (n * v).sum(-1, keepdims=True) * n - v
    E = env(norm(r))
    h = norm(KEY + v)
    ndh = np.clip((n * h).sum(-1), 0, 1)[:, None]
    ndl = np.clip(n @ KEY, 0, 1)[:, None]

    # ambient occlusion: 5 samples along the normal
    ao = np.ones((len(p), 1))
    for i in range(1, 6):
        hgt = 0.06 * i
        ao -= (hgt - sdf(p + n * hgt)[:, None]) * (0.5 ** i) * 2.4
    ao = np.clip(ao, 0.35, 1)

    out = np.zeros_like(p)
    # bronze metal (champagne bronze tuned to the logo's taupe)
    F0 = np.array([0.86, 0.68, 0.48])
    F = fresnel(F0, ndv)
    bronze = E * F * 0.95 + 0.10 * F0 * ndl + 2.2 * ndh ** 120 * np.array([1, 0.96, 0.9])
    bronze *= np.array([1.03, 0.97, 0.9])
    # espresso lacquer
    base = np.array([0.028, 0.022, 0.018])
    lac = base * (0.35 + 0.9 * ndl) + E * fresnel(0.04, ndv) * 0.75 + 1.4 * ndh ** 90
    lac += np.array([0.35, 0.25, 0.16]) * (1 - ndv) ** 3 * 0.12
    # ivory stone (pearl clear-coat)
    t = np.clip(n[:, 1:2] * 0.5 + 0.5, 0, 1)
    body = np.array([0.60, 0.56, 0.51]) + (np.array([0.95, 0.93, 0.89]) - np.array([0.60, 0.56, 0.51])) * t
    stone = body * (0.35 + 0.85 * ndl) + np.array([1, 0.96, 0.9]) * (1 - ndv) ** 2.5 * 0.25
    stone += E * fresnel(0.04, ndv) * 0.9 + 2.0 * ndh ** 220 + 0.18 * ndh ** 10

    for i, col in enumerate([bronze, lac, stone]):
        sel = mat == i
        out[sel] = col[sel]
    return out * ao


def render(name):
    sdf_local, pose, scale = SHAPES[name]
    R = rot(*pose)
    Rt = R.T

    def sdf(p, want_mat=False):
        q = (p @ R) / scale  # p @ R == (R^T p^T)^T : world -> local
        if want_mat:
            d, m = sdf_local(q, True)
            return d * scale, m
        return sdf_local(q) * scale

    W = SIZE * SS
    ys, xs = np.mgrid[0:W, 0:W]
    u = (xs + 0.5) / W * 2 - 1
    v = 1 - (ys + 0.5) / W * 2
    ro = np.array([0, 0, 5.0])
    rd = norm(np.stack([u * 0.33 * 1.0, v * 0.33, -np.ones_like(u)], -1).reshape(-1, 3))
    N = len(rd)
    t = np.full(N, 2.5)
    hit = np.zeros(N, bool)
    active = np.arange(N)
    for _ in range(300):
        if len(active) == 0:
            break
        p = ro + rd[active] * t[active, None]
        d = sdf(p)
        h = d < 0.0008
        hit[active[h]] = True
        t[active] += d * 0.9
        active = active[~h & (t[active] < 7.5)]

    idx = np.nonzero(hit)[0]
    p = ro + rd[idx] * t[idx, None]
    e = 0.0015
    k = np.array([[1, -1, -1], [-1, -1, 1], [-1, 1, -1], [1, 1, 1]]) * e
    n = norm(sum(kk * sdf(p + kk)[:, None] for kk in k))
    _, mat = sdf(p, True)
    col = shade(p, n, -rd[idx], mat, sdf)
    col = 1 - np.exp(-1.75 * np.clip(col, 0, None))

    img = np.zeros((N, 4))
    img[idx, :3] = col
    img[idx, 3] = 1
    img = img.reshape(W, W, 4)
    # premultiplied downsample
    img = img.reshape(SIZE, SS, SIZE, SS, 4).mean(axis=(1, 3))
    a = img[..., 3:4]
    rgb = np.where(a > 0, img[..., :3] / np.maximum(a, 1e-6), 0)
    rgba = np.concatenate([rgb, a], -1)
    im = Image.fromarray((np.clip(rgba, 0, 1) * 255 + 0.5).astype(np.uint8), "RGBA")
    bbox = im.getchannel("A").getbbox()
    im = im.crop(bbox)
    side = max(im.size) + 32
    sq = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    sq.paste(im, ((side - im.width) // 2, (side - im.height) // 2))
    sq = sq.resize((EXPORT, EXPORT), Image.LANCZOS)
    path = os.path.join(OUT, f"obj-{name}.webp")
    sq.save(path, "WEBP", quality=90, method=6)
    print(name, "->", path)


if __name__ == "__main__":
    for nm in (sys.argv[1:] or SHAPES):
        render(nm)
