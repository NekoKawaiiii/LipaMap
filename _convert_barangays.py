"""
One-time conversion script: extract Lipa City's 72 barangays from
the national PSGC barangay shapefile and write clean GeoJSON files.

Outputs (replacing the existing files in the project root):
  lipa-barangays.geojson   - all 72 Lipa City barangay polygons
  lipa-boundary.geojson    - the union of those 72 polygons (city land outline)

Usage:
  python _convert_barangays.py
"""

import os
import sys
import json
import zipfile
import tempfile
import shutil

import geopandas as gpd
import pandas as pd
from shapely.ops import unary_union
from shapely.geometry import mapping

SOURCE_ZIP    = '_data_import/PH_Adm4_BgySubMuns.shp.zip'
OUTPUT_BRGYS  = 'lipa-barangays.geojson'
OUTPUT_BOUND  = 'lipa-boundary.geojson'
EXPECTED_BRGYS = 72

def main():
    if not os.path.exists(SOURCE_ZIP):
        sys.exit('ERROR: ' + SOURCE_ZIP + ' not found.')

    print('Extracting shapefile...')
    tmpdir = tempfile.mkdtemp(prefix='lipamap_shp_')
    try:
        with zipfile.ZipFile(SOURCE_ZIP) as z:
            z.extractall(tmpdir)
        shp_path = None
        for root, dirs, files in os.walk(tmpdir):
            for fname in files:
                if fname.lower().endswith('.shp'):
                    shp_path = os.path.join(root, fname)
                    break
            if shp_path:
                break
        if not shp_path:
            sys.exit('ERROR: no .shp file found inside the ZIP.')
        print('  shapefile:', shp_path)

        print('Reading shapefile (this may take 30-60 seconds for 45K barangays)...')
        gdf = gpd.read_file(shp_path)
        print('  loaded', len(gdf), 'rows')
        print('  columns:', list(gdf.columns))
        print('  CRS:', gdf.crs)
        print()

        # ----- DISCOVERY: find Lipa City's adm3_pcode -----
        # We don't know the exact code, but we can find it by looking for
        # any row whose adm4_en suggests it's a Lipa City barangay.
        # Known Lipa barangays: Adya, Sabang, Marauoy, Tambo, Lipa Mataas na Lupa, etc.
        # We also know from earlier inspection that the OSM data had Tambo, Sabang, etc.
        print('Searching for Lipa City adm3_pcode...')
        # Search for adm3_pcode that's associated with multiple known Lipa barangays
        known_lipa_brgys = {'Adya', 'Sabang', 'Marauoy', 'Tambo', 'Bolbok', 'Pinagkawitan',
                            'San Salvador', 'Halang', 'Latag', 'Tibig', 'Sapac', 'Talisay',
                            'Bulacnin', 'Lodlod', 'Bulaklakan', 'Inosloban', 'Mataas na Lupa'}
        candidates = gdf[gdf['adm4_en'].isin(known_lipa_brgys)]
        # Group by adm3_pcode and count matches
        if len(candidates) == 0:
            # Try uppercase variations
            up = gdf['adm4_en'].astype(str).str.strip()
            candidates = gdf[up.isin(known_lipa_brgys)]

        if len(candidates) == 0:
            print('Could not find any known Lipa barangay names. Showing sample names:')
            print(gdf['adm4_en'].dropna().sample(min(30, len(gdf))).tolist())
            sys.exit('Failed to identify Lipa City. Check sample names above.')

        adm3_counts = candidates['adm3_pcode'].value_counts()
        print('Top adm3_pcode candidates by Lipa-name match count:')
        print(adm3_counts.head(10))

        if adm3_counts.iloc[0] < 5:
            sys.exit('Top candidate has fewer than 5 matching barangays; data is too ambiguous.')

        lipa_adm3 = adm3_counts.index[0]
        print()
        print(f'Identified Lipa City adm3_pcode: {lipa_adm3}')
        print()

        # Filter all barangays with this adm3_pcode
        lipa = gdf[gdf['adm3_pcode'] == lipa_adm3].copy()
        print(f'Filtered: {len(lipa)} barangays with adm3_pcode={lipa_adm3}')

        # Reproject if needed
        if lipa.crs is None or str(lipa.crs).upper() not in ('EPSG:4326', 'WGS 84'):
            print('Reprojecting from', lipa.crs, 'to EPSG:4326...')
            lipa = lipa.to_crs('EPSG:4326')

        # Sanity report
        print()
        print('=' * 60)
        print(f'Found {len(lipa)} barangays for adm3_pcode={lipa_adm3}')
        print(f'Expected: {EXPECTED_BRGYS}')
        names = sorted(lipa['adm4_en'].astype(str).tolist())
        print('Barangay names:')
        for n in names:
            print('  -', n)
        print('=' * 60)
        print()

        if len(lipa) < EXPECTED_BRGYS - 5 or len(lipa) > EXPECTED_BRGYS + 5:
            print('WARNING: count is far from expected. Stop and check.')
            answer = input('Write output files anyway? [y/N]: ').strip().lower()
            if answer != 'y':
                sys.exit('Aborted by user.')

        # Build output - keep only useful columns, rename adm4_en to "name"
        out = lipa[['adm4_en', 'adm4_pcode', 'geometry']].copy()
        out = out.rename(columns={'adm4_en': 'name', 'adm4_pcode': 'psgc_code'})

        print(f'Writing {OUTPUT_BRGYS} ({len(out)} features)...')
        out.to_file(OUTPUT_BRGYS, driver='GeoJSON')

        # Compute union for the city boundary
        print('Computing union of all barangay polygons (clean city land boundary)...')
        union_geom = unary_union(lipa.geometry.values)
        boundary_feature = {
            'type': 'FeatureCollection',
            'features': [{
                'type': 'Feature',
                'properties': {'name': 'Lipa City'},
                'geometry': mapping(union_geom),
            }],
        }
        with open(OUTPUT_BOUND, 'w', encoding='utf-8') as f:
            json.dump(boundary_feature, f)
        print(f'Writing {OUTPUT_BOUND}...')

        bsize = os.path.getsize(OUTPUT_BRGYS)
        msize = os.path.getsize(OUTPUT_BOUND)
        print()
        print('Done.')
        print(f'  {OUTPUT_BRGYS}: {bsize / 1024:.1f} KB')
        print(f'  {OUTPUT_BOUND}:  {msize / 1024:.1f} KB')
        print()
        print('Next step: hard-refresh your local site and verify the map.')

    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)

if __name__ == '__main__':
    main()
