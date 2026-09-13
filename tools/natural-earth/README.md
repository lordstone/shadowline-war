# Natural Earth source data

`src/map-geography.js` is generated from Natural Earth 1:50m vector data:

- `ne_50m_admin_0_countries.geojson`
- `ne_50m_rivers_lake_centerlines.geojson`
- `ne_50m_lakes.geojson`

Natural Earth data is in the public domain. Source and terms: https://www.naturalearthdata.com/about/terms-of-use/

The GeoJSON source files are development inputs and are excluded from Git. Run `node tools/generate-geography.mjs` after placing the three files in this directory.
