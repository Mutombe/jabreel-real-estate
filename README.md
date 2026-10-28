# Jabreel Real Estate: website

Static, dependency-free site. Open `index.html` or serve the folder.

## Structure
- `*.html`: built pages (do not edit directly)
- `_src/pages/`: page sources · `_src/partials/`: shared head, nav, footer, map, icons, card art
- `assets/css/style.css`: design system and layout · `assets/js/main.js`: interactions
- `assets/img/`: WebP images, 3D service objects (`obj-*.webp`), logos

## Rebuild
```
node _src/build.mjs                 # assemble pages from _src
python _src/tools/process_images.py # re-export photos (needs Pillow + the raw downloads)
python _src/tools/render3d.py       # re-render the 3D objects (numpy + Pillow)
python _src/tools/make_map.py       # regenerate the dot-matrix Zimbabwe map
python _src/tools/make_art.py       # regenerate the isometric card art
```

Map boundary: geoBoundaries gbOpen ZWE ADM0 (CC BY 4.0).
