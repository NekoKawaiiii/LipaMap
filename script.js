/* ═══════════════════════════════════════════════════════════
   LipaMap — script.js  v5
   Map · Admin · Add Place · Detail Panel · Heatmap · Search
   Categories · Database (Neon PostgreSQL)
   ═══════════════════════════════════════════════════════════ */

// Disable Leaflet's default blue teardrop icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({ iconUrl: '', shadowUrl: '' });


/* ═══════════════════════════════════════
   1. ADMIN SYSTEM
═══════════════════════════════════════ */

var isAdmin = false;
var currentMarkerData = null;

function activateAdminMode() {
  document.querySelectorAll('.admin-only').forEach(function (el) {
    el.classList.add('visible');
    el.style.display = '';
  });
  var label = document.getElementById('adminStatusLabel');
  label.textContent = '🔐 Admin Mode';
  label.classList.add('is-admin');
  var btn = document.getElementById('adminToggleBtn');
  btn.textContent = '🚪 Logout';
  btn.classList.add('logged-in');
  btn.onclick = adminLogout;
  showToast('✅ Admin mode activated!');
}

function adminLogout() {
  sessionStorage.removeItem('lipamap_admin');
  isAdmin = false;
  document.querySelectorAll('.admin-only').forEach(function (el) {
    el.classList.remove('visible');
  });
  var label = document.getElementById('adminStatusLabel');
  label.textContent = '👁️ Viewer Mode';
  label.classList.remove('is-admin');
  var btn = document.getElementById('adminToggleBtn');
  btn.textContent = '🔐 Admin Login';
  btn.classList.remove('logged-in');
  btn.onclick = function () { window.location.href = '/admin/login'; };
  closeSettings();
  closeAddPanel();
  showToast('👋 Logged out of admin mode.');
}

// One-shot admin handoff from /admin/login (Option Y):
// reading-and-clearing the flag means a hard refresh of /
// returns the user to viewer mode. removeItem MUST come
// before activateAdminMode().
(function () {
  if (sessionStorage.getItem('lipamap_admin') === '1') {
    sessionStorage.removeItem('lipamap_admin');
    isAdmin = true;
    activateAdminMode();
  }
})();


/* ═══════════════════════════════════════
   2. TOAST NOTIFICATION
═══════════════════════════════════════ */

function showToast(msg) {
  var t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(function () { t.classList.remove('show'); }, 3000);
}


/* ═══════════════════════════════════════
   3. MOBILE DRAWER
═══════════════════════════════════════ */

function openMobileMenu() {
  document.getElementById('mobileDrawer').classList.add('open');
  document.getElementById('mobileOverlay').classList.add('open');
}

function closeMobileMenu() {
  document.getElementById('mobileDrawer').classList.remove('open');
  document.getElementById('mobileOverlay').classList.remove('open');
}


/* ═══════════════════════════════════════
   4. MAP INITIALIZATION
═══════════════════════════════════════ */

var LIPA_CENTER = [13.9411, 121.1630];

var lipaBounds = L.latLngBounds(
  [13.8500, 121.0700],
  [14.0500, 121.2600]
);

var map = L.map('map', {
  center: LIPA_CENTER,
  zoom: 13,
  minZoom: 12,
  maxZoom: 18,
  maxBounds: lipaBounds,
  maxBoundsViscosity: 1.0
});

map.on('drag', function () {
  map.panInsideBounds(lipaBounds, { animate: false });
});


/* ═══════════════════════════════════════
   5. TILE LAYERS
═══════════════════════════════════════ */

var street = L.tileLayer(
  'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  { attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors', maxZoom: 19 }
);

var satellite = L.tileLayer(
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  { attribution: '© Esri', maxZoom: 19 }
);

street.addTo(map);
L.control.layers({ '🗺️ Street': street, '🛰️ Satellite': satellite }).addTo(map);

function toggleSatellite(on) {
  if (on) { map.removeLayer(street); map.addLayer(satellite); }
  else     { map.removeLayer(satellite); map.addLayer(street); }
}


/* ═══════════════════════════════════════
   6. LIPA CITY BOUNDARY
═══════════════════════════════════════ */

var lipaBoundaryData = null;
var boundaryVisible  = true;
var boundaryGroup    = L.layerGroup().addTo(map); // permanent container

var BOUNDARY_STYLE = {
  color: '#15803d', weight: 2.5,
  dashArray: '8,6', fillColor: '#22c55e', fillOpacity: 0.04
};

fetch('lipa-boundary.geojson')
  .then(function(r) { return r.json(); })
  .then(function(data) {
    lipaBoundaryData = data;
    if (boundaryVisible) {
      L.geoJSON(data, { style: BOUNDARY_STYLE })
        .bindTooltip('Lipa City, Batangas', { sticky: true })
        .addTo(boundaryGroup);
    }
  })
  .catch(function(e) { console.log('Could not load boundary:', e); });

function toggleBoundary(show) {
  boundaryVisible = show;
  boundaryGroup.clearLayers();
  if (show && lipaBoundaryData) {
    L.geoJSON(lipaBoundaryData, { style: BOUNDARY_STYLE })
      .bindTooltip('Lipa City, Batangas', { sticky: true })
      .addTo(boundaryGroup);
  }
}


/* ═══════════════════════════════════════
   7. LAYER GROUPS
═══════════════════════════════════════ */

// Layers and counts are now fully dynamic — populated by addCategoryToUI()
var layers = {};
var counts = {};


/* ═══════════════════════════════════════
   8. COUNTERS
═══════════════════════════════════════ */

// counts is declared above with layers

function updateCounts() {
  Object.keys(counts).forEach(function (k) {
    var el = document.getElementById(k + 'Count');
    if (el) el.textContent = counts[k];
    var navEl = document.getElementById('navcount-' + k);
    if (navEl) navEl.textContent = '(' + counts[k] + ')';
    var mobNavEl = document.getElementById('mobilenavcount-' + k);
    if (mobNavEl) mobNavEl.textContent = '(' + counts[k] + ')';
  });
}


/* ═══════════════════════════════════════
   9. ICONS & COLORS
═══════════════════════════════════════ */

// COLORS and LABELS are now fully dynamic — populated by addCategoryToUI()
var COLORS = {};
var LABELS = {};

function makeIcon(category) {
  var c = COLORS[category] || '#6b7280';
  return L.divIcon({
    className: '',
    iconAnchor: [12, 12],
    html:
      '<div style="' +
        'background:' + c + ';' +
        'width:22px;height:22px;' +
        'border-radius:50%;' +
        'border:3px solid rgba(255,255,255,0.9);' +
        'box-shadow:0 3px 10px rgba(0,0,0,0.25),0 0 0 1px ' + c + '40;' +
      '"></div>'
  });
}


/* ═══════════════════════════════════════
   10. CHOROPLETH HEATMAP BY BARANGAY
═══════════════════════════════════════ */

var heatLayer        = null;
var heatPoints       = {};
var allHeatPoints    = [];
var choroGroup       = null;
var choroLayer       = null;
var barangayGeoJSON  = null;
var choroLegend      = null;
var brgyBorderLayer  = null;
var allMarkerCoords  = [];
var heatmapActive    = false;
var pendingChoroBuild = false;
var userLocationMarker = null;
var userLocationCircle = null;

// Initialize choroGroup after map is ready
choroGroup = L.layerGroup().addTo(map);
map.createPane('choroPane');
map.getPane('choroPane').style.zIndex = 350;

// ─── BARANGAY CENTROIDS (fly-to for all 72) ───
var BRGY_CENTROIDS = {
  'Adya':                [13.8780, 121.1340],
  'Anilao':              [13.9420, 121.1580],
  'Anilao-Labac':        [13.9380, 121.1620],
  'Antipolo Del Norte':  [13.9310, 121.1680],
  'Antipolo Del Sur':    [13.9250, 121.1700],
  'Bagong Pook':         [13.9430, 121.1120],
  'Balintawak':          [13.9650, 121.1580],
  'Banaybanay':          [13.9320, 121.1150],
  'Bangkuwit':           [13.9500, 121.1050],
  'Bolbok':              [13.9240, 121.1490],
  'Bugtong na Pulo':     [13.9980, 121.1720],
  'Bulacnin':            [13.9830, 121.1430],
  'Bulaklakan':          [13.9550, 121.1900],
  'Calamias':            [13.8750, 121.1520],
  'Cumba':               [13.9060, 121.1390],
  'Dagatan':             [13.9700, 121.1350],
  'Duhatan':             [13.9370, 121.0870],
  'Halang':              [13.9550, 121.1280],
  'Inosloban':           [13.9850, 121.1650],
  'Kayumanggi':          [13.9600, 121.1750],
  'Latag':               [13.9320, 121.1730],
  'Lodlod':              [13.9290, 121.1440],
  'Lumbang':             [13.9820, 121.2070],
  'Mabini':              [13.8850, 121.1510],
  'Malagonlong':         [13.9200, 121.1600],
  'Malitlit':            [13.9150, 121.1650],
  'Marauoy':             [13.9610, 121.1620],
  'Mataas na Lupa':      [13.9450, 121.1490],
  'Munting Pulo':        [13.9520, 121.1870],
  'Pagolingin Bata':     [13.9100, 121.1580],
  'Pagolingin East':     [13.9130, 121.1620],
  'Pagolingin West':     [13.9100, 121.1550],
  'Pangao':              [13.9170, 121.1200],
  'Pinagkawitan':        [13.9200, 121.1750],
  'Pinagtongulan':       [13.9280, 121.0980],
  'Plaridel':            [13.9350, 121.1580],
  'Poblacion Barangay 1':[13.9430, 121.1620],
  'Poblacion Barangay 2':[13.9420, 121.1630],
  'Poblacion Barangay 3':[13.9410, 121.1640],
  'Poblacion Barangay 4':[13.9400, 121.1650],
  'Poblacion Barangay 5':[13.9390, 121.1660],
  'Poblacion Barangay 6':[13.9380, 121.1670],
  'Poblacion Barangay 7':[13.9370, 121.1680],
  'Poblacion Barangay 8':[13.9360, 121.1690],
  'Poblacion Barangay 9':[13.9350, 121.1700],
  'Poblacion Barangay 9-A':[13.9345, 121.1705],
  'Poblacion Barangay 10':[13.9340, 121.1710],
  'Poblacion Barangay 11':[13.9330, 121.1720],
  'Pusil':               [13.9730, 121.1540],
  'Quezon':              [13.8960, 121.1360],
  'Rizal':               [13.8720, 121.1600],
  'Sabang':              [13.9480, 121.1680],
  'Sampaguita':          [13.9040, 121.1460],
  'San Benito':          [13.9300, 121.1950],
  'San Carlos':          [13.9550, 121.1450],
  'San Celestino':       [13.9220, 121.2220],
  'San Francisco':       [13.9020, 121.2380],
  'San Guillermo':       [13.8940, 121.1550],
  'San Jose':            [13.9300, 121.1890],
  'San Lucas':           [13.9650, 121.1480],
  'San Salvador':        [13.9620, 121.1330],
  'San Sebastian':       [13.9500, 121.1350],
  'Santiago':            [13.9750, 121.1480],
  'Santo Niño':          [13.9520, 121.2120],
  'Santo Toribio':       [13.9180, 121.1900],
  'Sapac':               [13.9800, 121.1550],
  'Sico':                [13.9100, 121.1800],
  'Talisay':             [13.9680, 121.2040],
  'Tambo':               [13.9520, 121.1380],
  'Tangob':              [13.9460, 121.1910],
  'Tanguay':             [13.9680, 121.1400],
  'Tibig':               [13.9560, 121.1470],
  'Tipacan':             [13.9190, 121.1990],
  'Unson':               [13.9650, 121.1250]
};

// Load barangay boundaries on startup — show as subtle lines always
fetch('lipa-barangays.geojson')
  .then(function(r) { return r.json(); })
  .then(function(data) {
    barangayGeoJSON = data;
    // Draw subtle boundary lines using boundaryGroup pattern
    brgyBorderLayer = L.layerGroup().addTo(map);
    L.geoJSON(data, {
      style: {
        color:       '#15803d',
        weight:      0.8,
        opacity:     0.4,
        fillColor:   'transparent',
        fillOpacity: 0
      }
    }).addTo(brgyBorderLayer);
    if (pendingChoroBuild && heatmapActive) {
      pendingChoroBuild = false;
      buildChoropleth();
    }
  })
  .catch(function() { console.log('Barangay GeoJSON not found.'); });

// Point-in-polygon (ray casting)
function pointInPolygon(point, polygon) {
  var x = point[0], y = point[1];
  var inside = false;
  for (var i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    var xi = polygon[i][0], yi = polygon[i][1];
    var xj = polygon[j][0], yj = polygon[j][1];
    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  return inside;
}

function getPolygonCoords(geometry) {
  if (geometry.type === 'Polygon') return geometry.coordinates[0];
  if (geometry.type === 'MultiPolygon') return geometry.coordinates[0][0];
  return [];
}

function getChoroplethColor(count) {
  if (count === 0)  return null;           // transparent
  if (count <= 2)   return '#bbf7d2';      // light green
  if (count <= 5)   return '#4ade80';      // medium green
  if (count <= 9)   return '#16a34a';      // dark green
  return '#14532d';                         // deep forest green 10+
}

function buildChoropleth() {
  if (!barangayGeoJSON) {
    pendingChoroBuild = true;
    return;
  }
  if (!choroGroup) { 
    showToast('⚠️ Map not ready yet.'); 
    console.error('choroGroup is null');
    return; 
  }

  console.log('Building choropleth with', allHeatPoints.length, 'points');

  // Clear previous choropleth
  choroGroup.clearLayers();
  try { if (choroLegend) { choroLegend.remove(); } } catch(e) {}
  choroLegend = null;

  // Use allHeatPoints [lat, lng, intensity]
  var points = allHeatPoints.map(function(pt) {
    return { lng: pt[1], lat: pt[0] };
  });

  console.log('Converted points:', points.length);

  // Count points per barangay
  var brgyCounts = {};
  barangayGeoJSON.features.forEach(function(feature) {
    var name = feature.properties.name || 'Unknown';
    brgyCounts[name] = 0;
    var poly = getPolygonCoords(feature.geometry);
    points.forEach(function(pt) {
      if (pointInPolygon([pt.lng, pt.lat], poly)) brgyCounts[name]++;
    });
  });

  console.log('Barangay counts:', brgyCounts);

  // Add choropleth to the permanent group
  L.geoJSON(barangayGeoJSON, {
    pane: 'choroPane',
    filter: function(feature) {
      // Only render polygon barangay boundaries; skip stray Point features
      // that would otherwise spawn default markers and trigger the
      // "iconUrl not set in Icon options" error from Leaflet's Icon.js.
      return feature.geometry &&
        (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon');
    },
    pointToLayer: function(feature, latlng) {
      // Defensive: if any Point sneaks past the filter, render an invisible
      // circleMarker instead of a default Icon-based marker so iconUrl is
      // never required.
      return L.circleMarker(latlng, { radius: 0, opacity: 0, fillOpacity: 0 });
    },
    style: function(feature) {
      var name  = feature.properties.name || 'Unknown';
      var count = brgyCounts[name] || 0;
      var color = getChoroplethColor(count);
      return {
        color:       '#15803d',
        weight:      1.2,
        opacity:     0.8,
        fillColor:   color || '#f9fafb',
        fillOpacity: color ? 0.75 : 0.15
      };
    },
    onEachFeature: function(feature, layer) {
      var name  = feature.properties.name || 'Unknown';
      var count = brgyCounts[name] || 0;
      layer.bindTooltip(
        '<b>' + name + '</b><br>' + count + ' green infrastructure location' + (count !== 1 ? 's' : ''),
        { sticky: true }
      );
    }
  }).addTo(choroGroup);

  console.log('Choropleth added to map');

  // Add legend as plain HTML div — avoids Leaflet control removal errors
  var existingLegend = document.getElementById('choropleth-legend');
  if (existingLegend) existingLegend.remove();
  var legendDiv = document.createElement('div');
  legendDiv.id = 'choropleth-legend';
  legendDiv.style.cssText = 'position:fixed;bottom:80px;right:16px;z-index:1000;background:rgba(255,255,255,0.92);backdrop-filter:blur(10px);padding:12px 16px;border-radius:12px;border:1px solid rgba(134,239,176,0.5);box-shadow:0 4px 16px rgba(20,83,45,0.15);font-family:Outfit,sans-serif;font-size:0.78rem;min-width:160px;';
  legendDiv.innerHTML =
    '<div style="font-weight:700;color:#14532d;margin-bottom:8px;font-size:0.82rem;">🌿 Green Infrastructure</div>' +
    '<div style="font-weight:600;color:#6b7280;margin-bottom:6px;font-size:0.7rem;text-transform:uppercase;letter-spacing:0.05em;">Locations per Barangay</div>' +
    '<div style="display:flex;align-items:center;gap:8px;margin-bottom:5px;"><span style="width:18px;height:18px;background:#14532d;border-radius:3px;display:inline-block;"></span> 10+ locations</div>' +
    '<div style="display:flex;align-items:center;gap:8px;margin-bottom:5px;"><span style="width:18px;height:18px;background:#16a34a;border-radius:3px;display:inline-block;"></span> 6–9 locations</div>' +
    '<div style="display:flex;align-items:center;gap:8px;margin-bottom:5px;"><span style="width:18px;height:18px;background:#4ade80;border-radius:3px;display:inline-block;"></span> 3–5 locations</div>' +
    '<div style="display:flex;align-items:center;gap:8px;margin-bottom:5px;"><span style="width:18px;height:18px;background:#bbf7d2;border-radius:3px;display:inline-block;"></span> 1–2 locations</div>' +
    '<div style="display:flex;align-items:center;gap:8px;"><span style="width:18px;height:18px;background:transparent;border-radius:3px;display:inline-block;border:1px solid #d1d5db;"></span> No data</div>';
  document.body.appendChild(legendDiv);
  choroLegend = legendDiv;
  
  console.log('Legend added');
}

function toggleHeatmap(show) {
  heatmapActive = show;
  console.log('toggleHeatmap called, show=', show);
  if (show) {
    document.body.classList.add('choropleth-active');
    // Hide all marker layers
    Object.keys(layers).forEach(function(k) {
      if (map.hasLayer(layers[k])) map.removeLayer(layers[k]);
    });
    // Hide user location if present
    if (userLocationMarker && map.hasLayer(userLocationMarker)) map.removeLayer(userLocationMarker);
    if (userLocationCircle && map.hasLayer(userLocationCircle))  map.removeLayer(userLocationCircle);
    // Show choropleth
    buildChoropleth();
  } else {
    document.body.classList.remove('choropleth-active');
    // Clear choropleth
    if (choroGroup) choroGroup.clearLayers();
    try { if (choroLegend) { choroLegend.remove(); } } catch(e) {}
    choroLegend = null;
    // Restore ALL marker layers unconditionally
    Object.keys(layers).forEach(function(k) {
      map.addLayer(layers[k]);
    });
    // Restore user location
    if (userLocationMarker) map.addLayer(userLocationMarker);
    if (userLocationCircle)  map.addLayer(userLocationCircle);
    // Re-activate all chips visually
    document.querySelectorAll('.chip').forEach(function(c) {
      c.classList.add('active');
    });
  }
}


/* ═══════════════════════════════════════
   11. ADD MARKER FUNCTION
═══════════════════════════════════════ */

function addMarker(category, coords, name, imgSrc, desc, info, dbId, address) {
  // Make sure layer exists for custom categories
  if (!layers[category]) {
    layers[category] = L.layerGroup().addTo(map);
  }
  if (!heatPoints[category]) {
    heatPoints[category] = [];
  }
  if (counts[category] === undefined) {
    counts[category] = 0;
  }

  var data = {
    category: category,
    coords:   coords,
    name:     name,
    img:      imgSrc,
    desc:     desc,
    info:     info || null,
    id:       dbId || null,
    address:  address || ''
  };

  var popup =
    '<div style="min-width:150px;font-family:Outfit,sans-serif">' +
      '<b style="font-size:0.88rem;color:#14532d">' + name + '</b><br>' +
      '<img src="' + imgSrc + '" style="width:150px;height:85px;object-fit:cover;border-radius:8px;margin:6px 0;display:none" onload="this.style.display=\'block\'" onerror="this.style.display=\'none\'">' +
      '<span style="font-size:0.72rem;color:#9ca3af">Click marker for full details →</span>' +
    '</div>';

  var marker = L.marker(coords, { icon: makeIcon(category) })
    .addTo(layers[category])
    .bindPopup(popup)
    .on('click', function () { openDetail(data); });

  // Store data on marker for search
  marker._data = data;

  var pt = [coords[0], coords[1], 1.0];
  heatPoints[category].push(pt);
  allHeatPoints.push(pt);

  counts[category]++;

  // Directly update the stat card
  var el = document.getElementById(category + 'Count');
  if (el) el.textContent = counts[category];
  var navEl = document.getElementById('navcount-' + category);
  if (navEl) navEl.textContent = '(' + counts[category] + ')';
  var mobNavEl = document.getElementById('mobilenavcount-' + category);
  if (mobNavEl) mobNavEl.textContent = '(' + counts[category] + ')';

  if (heatmapActive) { buildChoropleth(); }
}


/* ═══════════════════════════════════════
   12. YOUR LOCATION DATA
═══════════════════════════════════════ */

/* ═══════════════════════════════════════
   13. ADD PLACE PANEL
═══════════════════════════════════════ */

function openAddPanel() {
  if (!isAdmin) { window.location.href = '/admin/login'; return; }
  document.getElementById('addPanel').classList.add('open');
}

function flyToBarangay(address) {
  if (!address) return;
  // Extract barangay name from address like "Brgy. Sabang, Lipa City, Batangas"
  var match = address.match(/Brgy\.\s+(.+?),/);
  if (!match) return;
  var name = match[1].trim();
  var coords = BRGY_CENTROIDS[name];
  if (coords) {
    map.flyTo(coords, 15);
  }
}

function fillMyLocation() {
  if (!navigator.geolocation) {
    showToast('❌ Geolocation not supported by your browser.');
    return;
  }
  showToast('📍 Getting your location...');
  navigator.geolocation.getCurrentPosition(
    function(position) {
      var lat = position.coords.latitude.toFixed(6);
      var lng = position.coords.longitude.toFixed(6);
      document.getElementById('addLat').value = lat;
      document.getElementById('addLng').value = lng;
      showToast('✅ Coordinates filled in!');
    },
    function(error) {
      var msg = {
        1: '❌ Location access denied.',
        2: '❌ Location unavailable.',
        3: '❌ Location request timed out.'
      }[error.code] || '❌ Could not get location.';
      showToast(msg);
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
  );
}

function closeAddPanel() {
  document.getElementById('addPanel').classList.remove('open');
}

function previewImage(url) {
  var img = document.getElementById('imgPreview');
  var hint = document.querySelector('#imgPreviewBox .upload-hint');
  if (url) {
    img.src = url;
    img.style.display = 'block';
    img.onerror = function () { img.style.display = 'none'; hint.style.display = 'flex'; };
    hint.style.display = 'none';
  } else {
    img.style.display = 'none';
    hint.style.display = 'flex';
  }
}

function previewImageFile(input) {
  var img  = document.getElementById('imgPreview');
  var hint = document.querySelector('#imgPreviewBox .upload-hint');
  if (input.files && input.files[0]) {
    var reader = new FileReader();
    reader.onload = function(e) {
      img.src = e.target.result;
      img.style.display = 'block';
      hint.style.display = 'none';
    };
    reader.readAsDataURL(input.files[0]);
  }
}

function addInfoRow() {
  var container = document.getElementById('infoRows');
  var row = document.createElement('div');
  row.className = 'info-row';
  row.innerHTML =
    '<input class="edit-input" placeholder="Label (e.g. Operating Hours)" />' +
    '<input class="edit-input" placeholder="Value (e.g. 6am–9pm)" />' +
    '<button class="btn-remove-row" onclick="removeInfoRow(this)">✕</button>';
  container.appendChild(row);
}

function removeInfoRow(btn) {
  btn.parentElement.remove();
}

function submitNewPlace() {
  var name     = document.getElementById('addName').value.trim();
  var category = document.getElementById('addCategory').value;
  var desc     = document.getElementById('addDesc').value.trim();
  var lat      = parseFloat(document.getElementById('addLat').value);
  var lng      = parseFloat(document.getElementById('addLng').value);
  var imgFile  = document.getElementById('addImg').files[0];
  var address  = document.getElementById('addBarangay').value.trim();

  if (!name)                  { showToast('⚠️ Please enter a place name.'); return; }
  if (!desc)                  { showToast('⚠️ Please enter a description.'); return; }
  if (isNaN(lat)||isNaN(lng)) { showToast('⚠️ Please enter valid coordinates.'); return; }
  if (lat < 13.87 || lat > 14.03 || lng < 121.10 || lng > 121.24) {
    showToast('⚠️ Coordinates appear to be outside Lipa City!');
    return;
  }

  var info = {};
  var rows = document.querySelectorAll('#infoRows .info-row');
  rows.forEach(function (row) {
    var inputs = row.querySelectorAll('input');
    var label  = inputs[0].value.trim();
    var value  = inputs[1].value.trim();
    if (label && value) info[label] = value;
  });
  info['Added by']   = 'Admin';
  info['Date Added'] = new Date().toLocaleDateString('en-PH', { year:'numeric', month:'long', day:'numeric' });

  var formData = new FormData();
  formData.append('name',        name);
  formData.append('category',    category);
  formData.append('description', desc);
  formData.append('latitude',    lat);
  formData.append('longitude',   lng);
  formData.append('info',        JSON.stringify(info));
  formData.append('address',     address);
  if (imgFile) formData.append('image', imgFile);

  showToast('⏳ Saving to database...');

  fetch('/api/locations', { method: 'POST', body: formData })
  .then(function(response) { return response.json(); })
  .then(function(data) {
    var imgPath = data.image_path || '';
    addMarker(category, [lat, lng], name, imgPath, desc, info, null, address);

    var emoji = { park:'🌳', garden:'🌱', forest:'🌲', wetland:'💧', recycle:'♻️', compost:'🍂', collection:'🚛' };
    var newItem = document.createElement('div');
    newItem.className = 'tab-item';
    newItem.style.cursor = 'pointer';
    newItem.innerHTML = (emoji[category] || LABELS[category] ? (emoji[category]||'📍') : '📍') +
      ' <b>' + name + '</b> — added just now';
    newItem.onclick = function() { map.flyTo([lat, lng], 16); };

    // Clear placeholder text and prepend
    var addedTab = document.getElementById('tab-added');
    var placeholder = addedTab.querySelector('[style*="italic"]');
    if (placeholder) placeholder.remove();
    addedTab.prepend(newItem);

    // Also prepend to Recent Updates tab
    var updatesTab = document.getElementById('tab-updates');
    var updateItem = document.createElement('div');
    updateItem.className = 'tab-item';
    updateItem.style.cursor = 'pointer';
    updateItem.innerHTML = (emoji[category]||'📍') + ' <b>' + name + '</b>' +
      (address ? ' — ' + address.replace(', Lipa City, Batangas','') : '');
    updateItem.onclick = function() { map.flyTo([lat, lng], 16); };
    updatesTab.prepend(updateItem);

    map.flyTo([lat, lng], 16);

    document.getElementById('addName').value    = '';
    document.getElementById('addDesc').value    = '';
    document.getElementById('addLat').value     = '';
    document.getElementById('addLng').value     = '';
    document.getElementById('addImg').value     = '';
    document.getElementById('addBarangay').value = '';
    document.getElementById('infoRows').innerHTML =
      '<div class="info-row">' +
        '<input class="edit-input" placeholder="Label (e.g. Operating Hours)" />' +
        '<input class="edit-input" placeholder="Value (e.g. 6am–9pm)" />' +
        '<button class="btn-remove-row" onclick="removeInfoRow(this)">✕</button>' +
      '</div>';

    closeAddPanel();
    showToast('✅ ' + name + ' saved to database!');
  })
  .catch(function(error) {
    console.error('Error:', error);
    showToast('❌ Something went wrong. Is the server running?');
  });
}


/* ═══════════════════════════════════════
   14. DETAIL PANEL
═══════════════════════════════════════ */

function openDetail(data) {
  currentMarkerData = data;
  var imgSrc = data.img || '';
  document.getElementById('detailImg').src = imgSrc;
  document.getElementById('detailImg').style.display = imgSrc ? 'block' : 'none';
  document.getElementById('detailTag').textContent  = LABELS[data.category] || data.category;
  document.getElementById('detailName').textContent = data.name;
  document.getElementById('detailCoords').innerHTML =
    '📍 ' + data.coords[0].toFixed(5) + ', ' + data.coords[1].toFixed(5);

  // Street View button — links to Google Maps Street View at this location
  var svBtn = document.getElementById('streetViewBtn');
  svBtn.href = 'https://maps.google.com/?cbll=' + data.coords[0] + ',' + data.coords[1] + '&layer=c';

  document.getElementById('detailDesc').textContent = data.desc;

  var addrEl = document.getElementById('detailAddress');
  if (addrEl) addrEl.textContent = data.address ? '📍 ' + data.address : '';

  var table = document.getElementById('detailTable');
  table.innerHTML = '';
  if (data.info && Object.keys(data.info).length) {
    Object.entries(data.info).forEach(function (e) {
      var tr = document.createElement('tr');
      tr.innerHTML = '<td>' + e[0] + '</td><td>' + e[1] + '</td>';
      table.appendChild(tr);
    });
    document.getElementById('detailInfoBlock').style.display = '';
  } else {
    document.getElementById('detailInfoBlock').style.display = 'none';
  }

  document.getElementById('editName').value = data.name;
  document.getElementById('editDesc').value = data.desc;

  // Populate the edit image preview with the current photo
  var editImg  = document.getElementById('editImgPreview');
  var editHint = document.getElementById('editImgHint');
  if (data.img) {
    editImg.src = data.img;
    editImg.style.display = 'block';
    editHint.style.display = 'none';
  } else {
    editImg.src = '';
    editImg.style.display = 'none';
    editHint.style.display = 'flex';
  }
  document.getElementById('editImg').value = '';

  document.getElementById('detailPanel').classList.add('open');
}

function closeDetail() {
  document.getElementById('detailPanel').classList.remove('open');
  currentMarkerData = null;
}

function saveEdit() {
  if (!currentMarkerData) return;

  var name    = document.getElementById('editName').value.trim();
  var desc    = document.getElementById('editDesc').value.trim();
  var imgFile = document.getElementById('editImg').files[0];

  if (!name) { showToast('⚠️ Name cannot be empty.'); return; }

  // If no DB id, just update in-memory (shouldn't happen after migration)
  if (!currentMarkerData.id) {
    currentMarkerData.name = name;
    currentMarkerData.desc = desc;
    document.getElementById('detailName').textContent = name;
    document.getElementById('detailDesc').textContent = desc;
    showToast('✅ Changes saved!');
    return;
  }

  var formData = new FormData();
  formData.append('name',        name);
  formData.append('description', desc);
  if (imgFile) formData.append('image', imgFile);

  showToast('⏳ Saving changes...');

  fetch('/api/locations/' + currentMarkerData.id, { method: 'PUT', body: formData })
  .then(function(r) { return r.json(); })
  .then(function(data) {
    currentMarkerData.name = name;
    currentMarkerData.desc = desc;

    // Update detail panel text
    document.getElementById('detailName').textContent = name;
    document.getElementById('detailDesc').textContent = desc;

    // Update image if a new one was uploaded
    if (imgFile && data.image_path) {
      currentMarkerData.img = data.image_path;
      var detailImg = document.getElementById('detailImg');
      detailImg.src = data.image_path;
      detailImg.style.display = 'block';
      // Also refresh the edit preview
      document.getElementById('editImgPreview').src = data.image_path;
    }

    // Clear the file input
    document.getElementById('editImg').value = '';

    showToast('✅ Changes saved!');
  })
  .catch(function(err) {
    console.error(err);
    showToast('❌ Could not save changes.');
  });
}

function previewEditImage(input) {
  var img  = document.getElementById('editImgPreview');
  var hint = document.getElementById('editImgHint');
  if (input.files && input.files[0]) {
    var reader = new FileReader();
    reader.onload = function(e) {
      img.src = e.target.result;
      img.style.display = 'block';
      hint.style.display = 'none';
    };
    reader.readAsDataURL(input.files[0]);
  }
}

function deleteLocation() {
  if (!currentMarkerData) { showToast('❌ No location selected!'); return; }

  var dataToDelete = currentMarkerData;

  openAppModal({
    icon: '🗑️',
    title: 'Delete this location?',
    danger: true,
    html:
      '<p>You are about to delete <b>' + dataToDelete.name + '</b>.</p>' +
      '<p style="color:#991b1b;font-weight:600;margin-top:10px;">This action cannot be undone.</p>',
    actions: [
      { label: 'Cancel', kind: 'secondary' },
      { label: 'Delete', kind: 'danger', onClick: function () { performDelete(dataToDelete); } }
    ]
  });
}

function performDelete(dataToDelete) {
  if (!dataToDelete) return;

  if (!dataToDelete.id) {
    removeMarkerFromMap(dataToDelete);
    closeDetail();
    showToast('🗑️ Location removed from map!');
    return;
  }

  fetch('/api/locations/' + dataToDelete.id, { method: 'DELETE' })
  .then(function(response) {
    if (!response.ok) throw new Error('Server error: ' + response.status);
    return response.json();
  })
  .then(function(data) {
    removeMarkerFromMap(dataToDelete);
    closeDetail();
    showToast('🗑️ ' + dataToDelete.name + ' deleted!');
  })
  .catch(function(error) {
    console.error('Delete error:', error);
    showToast('❌ Could not delete. Check console for details.');
  });
}

function removeMarkerFromMap(data) {
  var removed = false;
  if (!layers[data.category]) return;
  layers[data.category].eachLayer(function(marker) {
    if (removed) return;
    var popup = marker.getPopup().getContent();
    if (popup.indexOf(data.name) !== -1) {
      layers[data.category].removeLayer(marker);
      counts[data.category]--;
      var el = document.getElementById(data.category + 'Count');
      if (el) el.textContent = counts[data.category];
      var navEl = document.getElementById('navcount-' + data.category);
      if (navEl) navEl.textContent = '(' + counts[data.category] + ')';
      var mobNavEl = document.getElementById('mobilenavcount-' + data.category);
      if (mobNavEl) mobNavEl.textContent = '(' + counts[data.category] + ')';
      removed = true;
    }
  });
}


/* ═══════════════════════════════════════
   15. LAYER FILTERS
═══════════════════════════════════════ */

var currentFilter = null;

function soloLayer(category) {
  document.querySelectorAll('.nav-item').forEach(function (el) { el.classList.remove('active'); });
  var navEl = document.getElementById('nav-' + category);
  if (navEl) navEl.classList.add('active');

  if (currentFilter === category) { showAll(); return; }
  currentFilter = category;

  Object.keys(layers).forEach(function (key) {
    key === category ? map.addLayer(layers[key]) : map.removeLayer(layers[key]);
  });

  document.querySelectorAll('.chip').forEach(function (chip) {
    chip.classList.toggle('active', chip.getAttribute('data-cat') === category);
  });

  if (heatmapActive) { buildChoropleth(); }
}

function chipFilter(category) {
  var chip = document.querySelector('.chip[data-cat="' + category + '"]');
  var on = chip.classList.toggle('active');
  on ? map.addLayer(layers[category]) : map.removeLayer(layers[category]);
  currentFilter = null;
  document.querySelectorAll('.nav-item').forEach(function (el) { el.classList.remove('active'); });
}

function showAll() {
  currentFilter = null;
  document.querySelectorAll('.nav-item').forEach(function (el) { el.classList.remove('active'); });
  Object.values(layers).forEach(function (l) { map.addLayer(l); });
  document.querySelectorAll('.chip').forEach(function (c) { c.classList.add('active'); });
  map.flyTo(LIPA_CENTER, 13);
  if (heatmapActive) { buildChoropleth(); }
}


/* ═══════════════════════════════════════
   16. SETTINGS & PANELS
═══════════════════════════════════════ */

function openSettings() { document.getElementById('settingsPanel').classList.add('open'); }
function closeSettings() { document.getElementById('settingsPanel').classList.remove('open'); }


/* ═══════════════════════════════════════
   17. BOTTOM TABS
═══════════════════════════════════════ */

function switchTab(name, btn) {
  document.querySelectorAll('.tab-content').forEach(function (el) { el.classList.add('hidden'); });
  document.querySelectorAll('.tab-btn').forEach(function (el) { el.classList.remove('active'); });
  document.getElementById('tab-' + name).classList.remove('hidden');
  btn.classList.add('active');
}


/* ═══════════════════════════════════════
   18. SEARCH
═══════════════════════════════════════ */

function focusSearch() { document.getElementById('search').focus(); }

document.getElementById('search').addEventListener('keyup', function (e) {
  if (e.key !== 'Enter') return;
  var q = this.value.toLowerCase().trim();
  if (!q) return;

  // ── Coordinate search: "13.9415, 121.1637" or "13.9415 121.1637" ──
  var coordMatch = q.match(/(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)/);
  if (coordMatch) {
    var lat = parseFloat(coordMatch[1]);
    var lng = parseFloat(coordMatch[2]);
    if (!isNaN(lat) && !isNaN(lng)) {
      map.flyTo([lat, lng], 17);
      // Drop a temporary pin so you can see the exact spot
      var tempIcon = L.divIcon({
        className: '',
        iconAnchor: [12, 24],
        html: '<div style="font-size:1.6rem;line-height:1;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.4))">📌</div>'
      });
      var tempMarker = L.marker([lat, lng], { icon: tempIcon })
        .addTo(map)
        .bindPopup('<b>📌 Searched Location</b><br><span style="font-size:0.75rem;color:#6b7280">' +
          lat.toFixed(5) + ', ' + lng.toFixed(5) + '</span>')
        .openPopup();
      // Remove the pin after 8 seconds
      setTimeout(function() { map.removeLayer(tempMarker); }, 8000);
      showToast('📌 Flying to ' + lat.toFixed(4) + ', ' + lng.toFixed(4));
      return;
    }
  }

  var found = false;
  var firstMatch = null;

  Object.keys(layers).forEach(function (categoryKey) {
    var layer = layers[categoryKey];
    var categoryLabel = (LABELS[categoryKey] || categoryKey).toLowerCase();

    layer.eachLayer(function (marker) {
      var popupContent = marker.getPopup().getContent().toLowerCase();
      var markerData = marker._data || {};

      // Search in: popup content, category name, category label, address, description
      var searchable = [
        popupContent,
        categoryKey.toLowerCase(),
        categoryLabel,
        (markerData.address || '').toLowerCase(),
        (markerData.desc || '').toLowerCase()
      ].join(' ');

      // Remove trailing 's' to handle plurals (parks→park, forests→forest)
      var qSingular = q.endsWith('s') ? q.slice(0, -1) : q;
      if (searchable.includes(q) || searchable.includes(qSingular)) {
        map.addLayer(layer);
        if (!firstMatch) firstMatch = marker;
        found = true;
      }
    });
  });

  if (found && firstMatch) {
    map.flyTo(firstMatch.getLatLng(), 16);
    setTimeout(function () { firstMatch.openPopup(); }, 600);
  }

  if (!found) showToast('🔍 No results found for "' + this.value + '"');
});


/* ═══════════════════════════════════════
   19. ABOUT & CONTACT
═══════════════════════════════════════ */

function showAbout() {
  openAppModal({
    icon: '🌿',
    title: 'About Lipa City',
    html:
      '<p>Lipa City is a highly urbanized city in Batangas, Philippines, ' +
      'known as the <b>"Coffee Capital of the Philippines."</b></p>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 14px;margin:14px 0;font-size:0.84rem;">' +
        '<div><b>Area:</b> 210.41 km²</div>' +
        '<div><b>Population:</b> ~349,000 (2020)</div>' +
      '</div>' +
      '<p><b>Known for:</b> Café de Lipa, Mt. Malarayat, Ayala Malls Solenad.</p>' +
      '<p style="margin-top:14px;font-size:0.82rem;color:var(--ink-500);">' +
        'LipaMap tracks green infrastructure and waste management to support environmental ' +
        'awareness, urban planning, and community access to organized data.' +
      '</p>'
  });
}


/* ═══════════════════════════════════════
   EXPORT TO CSV
═══════════════════════════════════════ */

function exportToCSV() {
  showToast('⏳ Preparing export...');

  fetch('/api/locations')
  .then(function(r) { return r.json(); })
  .then(function(locations) {
    if (!locations.length) {
      showToast('⚠️ No locations to export.');
      return;
    }

    // Build CSV rows
    var headers = ['ID', 'Name', 'Category', 'Description', 'Address', 'Latitude', 'Longitude', 'Image URL'];
    var rows = [headers];

    locations.forEach(function(loc) {
      // Parse info JSON for extra details
      var info = '';
      if (loc.info) {
        try {
          var infoObj = JSON.parse(loc.info);
          info = Object.entries(infoObj).map(function(e) {
            return e[0] + ': ' + e[1];
          }).join(' | ');
        } catch(e) {}
      }

      rows.push([
        loc.id,
        '"' + (loc.name        || '').replace(/"/g, '""') + '"',
        '"' + (loc.category    || '').replace(/"/g, '""') + '"',
        '"' + (loc.description || '').replace(/"/g, '""') + '"',
        '"' + (loc.address     || '').replace(/"/g, '""') + '"',
        loc.latitude,
        loc.longitude,
        '"' + (loc.image_path  || '').replace(/"/g, '""') + '"'
      ]);
    });

    var csvContent = rows.map(function(r) { return r.join(','); }).join('\n');

    // Trigger download
    var blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    var url  = URL.createObjectURL(blob);
    var a    = document.createElement('a');
    a.href     = url;
    a.download = 'LipaMap_Locations_' + new Date().toISOString().slice(0,10) + '.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast('✅ Exported ' + locations.length + ' locations!');
  })
  .catch(function(err) {
    console.error(err);
    showToast('❌ Export failed. Try again.');
  });
}


/* ═══════════════════════════════════════
   LOCATE ME — Show user's current position
═══════════════════════════════════════ */

var userHeadingCone     = null;
var currentHeading      = null;
var userLat             = null;
var userLng             = null;

function makeUserIcon(heading) {
  // If we have a heading, show a directional cone + dot; otherwise just the pulsing dot
  if (heading !== null) {
    return L.divIcon({
      className: '',
      iconAnchor: [20, 20],
      html: '<div style="position:relative;width:40px;height:40px;">' +
        // Heading cone (triangle pointing up, rotated to heading)
        '<div style="' +
          'position:absolute;top:0;left:50%;transform:translateX(-50%) rotate(' + heading + 'deg);' +
          'transform-origin:bottom center;' +
          'width:0;height:0;' +
          'border-left:8px solid transparent;' +
          'border-right:8px solid transparent;' +
          'border-bottom:22px solid rgba(59,130,246,0.45);' +
          'margin-top:-18px;' +
        '"></div>' +
        // Blue pulsing dot
        '<div style="' +
          'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);' +
          'width:18px;height:18px;' +
          'background:#3b82f6;' +
          'border:3px solid white;' +
          'border-radius:50%;' +
          'box-shadow:0 0 0 4px rgba(59,130,246,0.35);' +
          'animation:pulse-blue 1.5s infinite;' +
        '"></div>' +
      '</div>'
    });
  }
  return L.divIcon({
    className: '',
    iconAnchor: [10, 10],
    html: '<div style="' +
      'width:20px;height:20px;' +
      'background:#3b82f6;' +
      'border:3px solid white;' +
      'border-radius:50%;' +
      'box-shadow:0 0 0 4px rgba(59,130,246,0.35);' +
      'animation:pulse-blue 1.5s infinite;' +
    '"></div>'
  });
}

function updateUserMarker() {
  if (userLat === null || userLocationMarker === null) return;
  userLocationMarker.setIcon(makeUserIcon(currentHeading));
}

function startHeadingWatch() {
  // DeviceOrientationEvent — only works on mobile with compass
  if (!window.DeviceOrientationEvent) return;

  function handleOrientation(e) {
    var heading = null;
    if (e.webkitCompassHeading !== undefined) {
      // iOS
      heading = e.webkitCompassHeading;
    } else if (e.alpha !== null) {
      // Android (alpha is degrees from north, counterclockwise)
      heading = 360 - e.alpha;
    }
    if (heading !== null) {
      currentHeading = Math.round(heading);
      updateUserMarker();
    }
  }

  // iOS 13+ requires permission
  if (typeof DeviceOrientationEvent.requestPermission === 'function') {
    DeviceOrientationEvent.requestPermission()
      .then(function(state) {
        if (state === 'granted') {
          window.addEventListener('deviceorientation', handleOrientation, true);
        }
      })
      .catch(function() {});
  } else {
    window.addEventListener('deviceorientation', handleOrientation, true);
  }
}

function locateMe() {
  if (!navigator.geolocation) {
    showToast('❌ Geolocation is not supported by your browser.');
    return;
  }

  showToast('📍 Finding your location...');

  navigator.geolocation.getCurrentPosition(
    function (position) {
      userLat = position.coords.latitude;
      userLng = position.coords.longitude;
      var accuracy = position.coords.accuracy;

      // Remove previous markers if any
      if (userLocationMarker) map.removeLayer(userLocationMarker);
      if (userLocationCircle)  map.removeLayer(userLocationCircle);

      userLocationMarker = L.marker([userLat, userLng], { icon: makeUserIcon(currentHeading) })
        .addTo(map)
        .bindPopup('<b>📍 You are here</b><br><span style="font-size:0.75rem;color:#6b7280">' +
          userLat.toFixed(5) + ', ' + userLng.toFixed(5) + '</span>')
        .openPopup();

      // Accuracy circle
      userLocationCircle = L.circle([userLat, userLng], {
        radius:      accuracy,
        color:       '#3b82f6',
        fillColor:   '#3b82f6',
        fillOpacity: 0.08,
        weight:      1.5,
        dashArray:   '4,4'
      }).addTo(map);

      map.flyTo([userLat, userLng], 16);
      showToast('✅ Location found!');

      // Start watching compass heading
      startHeadingWatch();
    },
    function (error) {
      var msg = {
        1: '❌ Location access denied. Please allow location in your browser.',
        2: '❌ Location unavailable. Try again.',
        3: '❌ Location request timed out.'
      }[error.code] || '❌ Could not get your location.';
      showToast(msg);
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
  );
}

function showContact() {
  openAppModal({
    icon: '✉️',
    title: 'Contact / Feedback',
    html:
      '<p style="margin-bottom:12px;"><b>Maintained by:</b> Lipa City ENRO</p>' +
      '<ul style="list-style:none;padding:0;margin:0 0 14px 0;display:flex;flex-direction:column;gap:6px;font-size:0.86rem;">' +
        '<li>📧 <a href="mailto:lipamap@lipa.gov.ph">lipamap@lipa.gov.ph</a></li>' +
        '<li>📞 <a href="tel:+63431234567">(043) 123-4567</a></li>' +
        '<li>📍 City Hall, Lipa City, Batangas</li>' +
      '</ul>' +
      '<p style="font-size:0.78rem;color:var(--ink-500);background:rgba(34,197,94,0.06);' +
        'border:1px solid rgba(34,197,94,0.18);border-radius:8px;padding:8px 10px;">' +
        'To report incorrect data, email with subject: <b>[LipaMap Update]</b>' +
      '</p>'
  });
}


/* ═══════════════════════════════════════
   20. FINALIZE
═══════════════════════════════════════ */


/* ═══════════════════════════════════════
   21. LOAD LOCATIONS FROM DATABASE
═══════════════════════════════════════ */

function loadLocationsFromDB() {
  fetch('/api/locations')
  .then(function(response) { return response.json(); })
  .then(function(locations) {
    locations.forEach(function(loc) {
      var info = null;
      if (loc.info) {
        try { info = JSON.parse(loc.info); } catch(e) { info = null; }
      }
      var imgPath = loc.image_path ? loc.image_path : '';
      addMarker(
        loc.category,
        [loc.latitude, loc.longitude],
        loc.name,
        imgPath,
        loc.description,
        info,
        loc.id,
        loc.address
      );
    });

    // Populate Recent Updates tab with the 5 most recently added locations
    var updatesTab = document.getElementById('tab-updates');
    updatesTab.innerHTML = '';
    var recent = locations.slice().reverse().slice(0, 5);
    if (recent.length === 0) {
      updatesTab.innerHTML = '<div class="tab-item" style="color:var(--ink-400);font-style:italic;">No locations yet.</div>';
    } else {
      recent.forEach(function(loc) {
        var emoji = (LABELS[loc.category] ? '' : '📍');
        // Use category emoji from COLORS map or fallback
        var catEmoji = {
          park:'🌳', garden:'🌱', forest:'🌲', wetland:'💧',
          recycle:'♻️', compost:'🍂', collection:'🚛', mrf:'🏭', solar:'☀️'
        }[loc.category] || '📍';
        var item = document.createElement('div');
        item.className = 'tab-item';
        item.style.cursor = 'pointer';
        item.innerHTML = catEmoji + ' <b>' + loc.name + '</b>' +
          (loc.address ? ' — ' + loc.address.replace(', Lipa City, Batangas','') : '');
        item.title = 'Click to view on map';
        (function(l) {
          item.onclick = function() {
            map.flyTo([l.latitude, l.longitude], 16);
          };
        })(loc);
        updatesTab.appendChild(item);
      });
    }
  })
  .catch(function(error) {
    console.log('Could not load from database:', error);
  });
}


/* ═══════════════════════════════════════
   22. CATEGORY MANAGER
═══════════════════════════════════════ */

function openCategoryManager() {
  closeSettings();
  document.getElementById('categoryPanel').classList.add('open');
  loadCustomCategories();
}

function closeCategoryManager() {
  document.getElementById('categoryPanel').classList.remove('open');
}

function loadCustomCategories() {
  return fetch('/api/categories')
  .then(function(r) { return r.json(); })
  .then(function(cats) {
    var list = document.getElementById('customCategoryList');
    if (cats.length === 0) {
      list.innerHTML = '<p style="font-size:0.78rem;color:var(--ink-400);">No categories yet.</p>';
      return;
    }
    list.innerHTML = '';
    cats.forEach(function(cat) {
      var item = document.createElement('div');
      item.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:rgba(255,255,255,0.8);border:1px solid var(--mint-200);border-radius:8px;';
      item.innerHTML =
        '<div style="display:flex;align-items:center;gap:8px;">' +
          '<span style="width:12px;height:12px;border-radius:50%;background:' + cat.color + ';display:inline-block;"></span>' +
          '<span style="font-size:0.83rem;font-weight:500;color:var(--ink-700)">' + cat.emoji + ' ' + cat.label + '</span>' +
        '</div>' +
        '<button onclick="deleteCustomCategory(' + cat.id + ', this)" style="width:24px;height:24px;border:1px solid #fca5a5;border-radius:6px;background:#fee2e2;cursor:pointer;font-size:0.7rem;color:#dc2626;">✕</button>';
      list.appendChild(item);
      addCategoryToUI(cat);
    });
  })
  .catch(function(e) {
    console.log('Error loading categories:', e);
  });
}

function submitNewCategory() {
  var name  = document.getElementById('catName').value.trim().toLowerCase().replace(/\s+/g, '_');
  var label = document.getElementById('catLabel').value.trim();
  var emoji = document.getElementById('catEmoji').value.trim();
  var color = document.getElementById('catColor').value;
  var group = document.getElementById('catGroup').value;

  if (!name)  { showToast('⚠️ Please enter a category name!'); return; }
  if (!label) { showToast('⚠️ Please enter a display label!'); return; }
  if (!emoji) { showToast('⚠️ Please enter an emoji!'); return; }

  fetch('/api/categories', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name:name, label:label, emoji:emoji, color:color, group_type:group })
  })
  .then(function(r) { return r.json(); })
  .then(function(data) {
    showToast('✅ Category "' + label + '" added!');
    document.getElementById('catName').value  = '';
    document.getElementById('catLabel').value = '';
    document.getElementById('catEmoji').value = '';
    loadCustomCategories();
  })
  .catch(function(e) { showToast('❌ Error adding category!'); });
}

function deleteCustomCategory(id, btn) {
  fetch('/api/categories/' + id, { method: 'DELETE' })
  .then(function(r) { return r.json(); })
  .then(function(data) {
    showToast('🗑️ Category deleted!');
    loadCustomCategories();
  });
}

function addCategoryToUI(cat) {
  COLORS[cat.name] = cat.color;
  LABELS[cat.name] = cat.label;

  if (!layers[cat.name]) {
    layers[cat.name] = L.layerGroup().addTo(map);
  }
  if (!heatPoints[cat.name]) {
    heatPoints[cat.name] = [];
  }
  if (counts[cat.name] === undefined) {
    counts[cat.name] = 0;
  }

  // Add to sidebar
  var sidebarId = 'nav-' + cat.name;
  if (!document.getElementById(sidebarId)) {
    var navItem = document.createElement('div');
    navItem.className = 'nav-item';
    navItem.id = sidebarId;
    navItem.innerHTML =
      '<span class="nav-icon">' + cat.emoji + '</span>' +
      '<span class="nav-text">' + cat.label + '</span>' +
      '<span class="nav-count" id="navcount-' + cat.name + '">(' + (counts[cat.name] || 0) + ')</span>';
    navItem.onclick = function() { soloLayer(cat.name); };

    var sectionId = cat.group_type === 'waste' ? 'sidebar-waste' : 'sidebar-green';
    var targetSection = document.getElementById(sectionId);
    if (targetSection) targetSection.appendChild(navItem);
  }

  // Add to chips
  if (!document.querySelector('[data-cat="' + cat.name + '"]')) {
    var chip = document.createElement('button');
    chip.className = 'chip active';
    chip.setAttribute('data-cat', cat.name);
    chip.innerHTML = cat.emoji + ' ' + cat.label;
    chip.onclick = function() { chipFilter(cat.name); };
    document.getElementById('chipsRow').appendChild(chip);
  }

  // Add to dropdown
  var selectEl = document.getElementById('addCategory');
  var exists = false;
  for (var i = 0; i < selectEl.options.length; i++) {
    if (selectEl.options[i].value === cat.name) { exists = true; break; }
  }
  if (!exists) {
    var option = document.createElement('option');
    option.value = cat.name;
    option.textContent = cat.emoji + ' ' + cat.label;
    selectEl.appendChild(option);
  }

  // Stat cards have been removed; counts now live inline in the sidebar nav items.

  // Add to legend
  var legendId = 'legend-' + cat.name;
  if (!document.getElementById(legendId)) {
    var legRow = document.createElement('div');
    legRow.className = 'leg-row';
    legRow.id = legendId;
    legRow.innerHTML =
      '<span class="leg-dot" style="background:' + cat.color + '"></span>' +
      cat.label;
    var legendBox = document.querySelector('.legend-box');
    if (legendBox) legendBox.appendChild(legRow);
  }

  // Add to mobile drawer
  var mobileId = 'mobile-nav-' + cat.name;
  if (!document.getElementById(mobileId)) {
    var mobileItem = document.createElement('div');
    mobileItem.className = 'nav-item';
    mobileItem.id = mobileId;
    mobileItem.innerHTML =
      '<span class="nav-icon">' + cat.emoji + '</span>' +
      '<span class="nav-text">' + cat.label + '</span>' +
      '<span class="nav-count" id="mobilenavcount-' + cat.name + '">(' + (counts[cat.name] || 0) + ')</span>';
    mobileItem.onclick = function() { soloLayer(cat.name); closeMobileMenu(); };

    var mobileSectionId = cat.group_type === 'waste' ? 'mobile-waste' : 'mobile-green';
    var mobileSection = document.getElementById(mobileSectionId);
    if (mobileSection) mobileSection.appendChild(mobileItem);
  }
}


/* ═══════════════════════════════════════
   23. APP MODAL (themed alert / confirm)
═══════════════════════════════════════ */

var _appModalKeyHandler = null;

function openAppModal(opts) {
  opts = opts || {};
  var overlay  = document.getElementById('lpModal');
  var card     = document.getElementById('lpModalCard');
  var iconEl   = document.getElementById('lpModalIcon');
  var titleEl  = document.getElementById('lpModalTitle');
  var bodyEl   = document.getElementById('lpModalBody');
  var actionsEl = document.getElementById('lpModalActions');
  if (!overlay || !card) return;

  // Icon
  if (opts.icon) {
    iconEl.textContent = opts.icon;
    iconEl.style.display = '';
  } else {
    iconEl.textContent = '';
    iconEl.style.display = 'none';
  }

  // Title
  titleEl.textContent = opts.title || '';

  // Body (HTML allowed; content is hardcoded by us)
  bodyEl.innerHTML = opts.html || '';

  // Danger variant
  if (opts.danger) {
    card.classList.add('danger');
  } else {
    card.classList.remove('danger');
  }

  // Actions
  actionsEl.innerHTML = '';
  var actions = opts.actions || [];
  for (var i = 0; i < actions.length; i++) {
    (function (action) {
      var btn = document.createElement('button');
      btn.type = 'button';
      var kind = action.kind || 'primary';
      btn.className = 'lp-modal-btn ' + kind;
      btn.textContent = action.label || 'OK';
      btn.onclick = function () {
        if (typeof action.onClick === 'function') {
          try { action.onClick(); } catch (e) { console.error(e); }
        }
        closeAppModal();
      };
      actionsEl.appendChild(btn);
    })(actions[i]);
  }

  // Lock body scroll
  document.body.style.overflow = 'hidden';

  // Show
  overlay.classList.add('open');

  // ESC to close
  if (_appModalKeyHandler) {
    document.removeEventListener('keydown', _appModalKeyHandler);
  }
  _appModalKeyHandler = function (e) {
    if (e.key === 'Escape' || e.keyCode === 27) {
      closeAppModal();
    }
  };
  document.addEventListener('keydown', _appModalKeyHandler);
}

function closeAppModal() {
  var overlay = document.getElementById('lpModal');
  if (!overlay) return;
  overlay.classList.remove('open');
  document.body.style.overflow = '';
  if (_appModalKeyHandler) {
    document.removeEventListener('keydown', _appModalKeyHandler);
    _appModalKeyHandler = null;
  }
}

function onAppModalOverlayClick(e) {
  // Close only when the click target is the overlay itself, not the card
  if (e.target && e.target.id === 'lpModal') {
    closeAppModal();
  }
}


/* ═══════════════════════════════════════
   24. STARTUP
   Load categories first, then locations
═══════════════════════════════════════ */
loadCustomCategories().then(function() {
  loadLocationsFromDB();
});


/* ═══════════════════════════════════════
   BOUNDARY EDITOR — Draw & Edit Barangay Boundaries
═══════════════════════════════════════ */

var boundaryEditorActive = false;
var drawControl = null;
var drawnItems = null;

function toggleBoundaryEditor() {
  if (!isAdmin) {
    showToast('⚠️ Admin access required');
    return;
  }

  boundaryEditorActive = !boundaryEditorActive;
  var btn = document.getElementById('boundaryEditorBtn');

  if (boundaryEditorActive) {
    // Activate editor mode
    btn.textContent = '✅ Exit Editor Mode';
    btn.style.background = 'linear-gradient(135deg,rgba(239,68,68,0.15),rgba(239,68,68,0.12))';
    btn.style.color = '#991b1b';
    btn.style.borderColor = 'rgba(239,68,68,0.35)';
    
    // Initialize drawing layer
    drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);

    // Add existing barangay boundaries to the editable layer
    if (barangayGeoJSON) {
      L.geoJSON(barangayGeoJSON, {
        style: {
          color: '#3b82f6',
          weight: 2,
          opacity: 0.8,
          fillColor: '#3b82f6',
          fillOpacity: 0.1
        },
        onEachFeature: function(feature, layer) {
          drawnItems.addLayer(layer);
          layer.bindTooltip(feature.properties.name || 'Unknown', { permanent: true, direction: 'center' });
        }
      });
    }

    // Add drawing controls
    drawControl = new L.Control.Draw({
      edit: {
        featureGroup: drawnItems,
        edit: true,
        remove: true
      },
      draw: {
        polygon: {
          allowIntersection: false,
          showArea: true,
          shapeOptions: {
            color: '#3b82f6',
            weight: 2
          }
        },
        polyline: false,
        rectangle: false,
        circle: false,
        marker: false,
        circlemarker: false
      }
    });
    map.addControl(drawControl);

    // Handle new drawings
    map.on(L.Draw.Event.CREATED, function(e) {
      var layer = e.layer;
      var name = prompt('Enter barangay name:');
      if (name) {
        layer.bindTooltip(name, { permanent: true, direction: 'center' });
        layer.feature = {
          type: 'Feature',
          properties: { name: name },
          geometry: layer.toGeoJSON().geometry
        };
        drawnItems.addLayer(layer);
        showToast('✅ Barangay "' + name + '" added! Click "Save Boundaries" to save.');
      }
    });

    // Handle edits
    map.on(L.Draw.Event.EDITED, function(e) {
      showToast('✅ Boundaries edited! Click "Save Boundaries" to save changes.');
    });

    // Handle deletions
    map.on(L.Draw.Event.DELETED, function(e) {
      showToast('✅ Boundaries deleted! Click "Save Boundaries" to save changes.');
    });

    // Add save button
    var saveBtn = document.createElement('button');
    saveBtn.id = 'saveBoundariesBtn';
    saveBtn.textContent = '💾 Save Boundaries';
    saveBtn.style.cssText = 'position:fixed;top:80px;right:20px;z-index:1000;padding:12px 20px;background:linear-gradient(135deg,#22c55e,#16a34a);color:white;border:none;border-radius:8px;font-family:Outfit,sans-serif;font-weight:600;font-size:0.85rem;cursor:pointer;box-shadow:0 4px 12px rgba(34,197,94,0.3);';
    saveBtn.onclick = saveBoundaries;
    document.body.appendChild(saveBtn);

    showToast('✏️ Boundary editor activated! Draw or edit barangay boundaries.');
    closeSettings();
  } else {
    // Deactivate editor mode
    btn.textContent = '✏️ Edit Barangay Boundaries';
    btn.style.background = 'linear-gradient(135deg,rgba(59,130,246,0.15),rgba(59,130,246,0.12))';
    btn.style.color = '#1d4ed8';
    btn.style.borderColor = 'rgba(59,130,246,0.35)';

    // Remove drawing controls
    if (drawControl) {
      map.removeControl(drawControl);
      drawControl = null;
    }

    // Remove drawn items layer
    if (drawnItems) {
      map.removeLayer(drawnItems);
      drawnItems = null;
    }

    // Remove save button
    var saveBtn = document.getElementById('saveBoundariesBtn');
    if (saveBtn) saveBtn.remove();

    // Remove event listeners
    map.off(L.Draw.Event.CREATED);
    map.off(L.Draw.Event.EDITED);
    map.off(L.Draw.Event.DELETED);

    showToast('👋 Boundary editor closed.');
  }
}

function saveBoundaries() {
  if (!drawnItems) {
    showToast('⚠️ No boundaries to save.');
    return;
  }

  var features = [];
  drawnItems.eachLayer(function(layer) {
    if (layer.feature) {
      features.push(layer.feature);
    } else {
      // Create feature from layer if it doesn't have one
      var geoJSON = layer.toGeoJSON();
      features.push({
        type: 'Feature',
        properties: { name: 'Unnamed' },
        geometry: geoJSON.geometry
      });
    }
  });

  var geoJSONData = {
    type: 'FeatureCollection',
    features: features
  };

  // Update the in-memory barangayGeoJSON
  barangayGeoJSON = geoJSONData;

  // Show the GeoJSON in console for copying
  console.log('=== NEW BARANGAY BOUNDARIES ===');
  console.log(JSON.stringify(geoJSONData, null, 2));
  console.log('=== Copy the above and save to lipa-barangays.geojson ===');

  // Download as file
  var dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(geoJSONData, null, 2));
  var downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute('download', 'lipa-barangays-new.geojson');
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();

  showToast('✅ Boundaries saved! Check console and downloads folder.');
  
  // Reload the barangay borders
  if (brgyBorderLayer) {
    map.removeLayer(brgyBorderLayer);
    brgyBorderLayer = L.layerGroup().addTo(map);
    L.geoJSON(barangayGeoJSON, {
      style: {
        color: '#15803d',
        weight: 0.8,
        opacity: 0.4,
        fillColor: 'transparent',
        fillOpacity: 0
      }
    }).addTo(brgyBorderLayer);
  }
}
