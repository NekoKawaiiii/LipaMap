/* ═══════════════════════════════════════════════════════════
   LipaMap — script.js  v5
   Map · Admin · Add Place · Detail Panel · Heatmap · Search
   Categories · Database (Neon PostgreSQL)
   ═══════════════════════════════════════════════════════════ */


/* ═══════════════════════════════════════
   1. ADMIN SYSTEM
═══════════════════════════════════════ */

var ADMIN_PASSWORD = 'admin123';
var isAdmin = false;
var currentMarkerData = null;

function openLogin() {
  document.getElementById('loginModal').classList.add('open');
  document.getElementById('adminPassword').value = '';
  document.getElementById('loginError').classList.remove('show');
  setTimeout(function () { document.getElementById('adminPassword').focus(); }, 100);
}

function closeLogin() {
  document.getElementById('loginModal').classList.remove('open');
}

function attemptLogin() {
  var pw = document.getElementById('adminPassword').value;
  if (pw === ADMIN_PASSWORD) {
    isAdmin = true;
    closeLogin();
    activateAdminMode();
  } else {
    document.getElementById('loginError').classList.add('show');
    document.getElementById('adminPassword').value = '';
    document.getElementById('adminPassword').focus();
  }
}

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
  btn.onclick = openLogin;
  closeSettings();
  closeAddPanel();
  showToast('👋 Logged out of admin mode.');
}

document.getElementById('adminPassword').addEventListener('keyup', function (e) {
  if (e.key === 'Enter') attemptLogin();
});


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
  [13.8700, 121.1000],
  [14.0300, 121.2400]
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

var lipaBoundary = L.polygon([
  [14.0000, 121.1400],
  [13.9900, 121.2000],
  [13.9600, 121.2200],
  [13.9100, 121.2100],
  [13.8800, 121.1700],
  [13.8900, 121.1200],
  [13.9300, 121.1100],
  [13.9700, 121.1200]
], {
  color: '#15803d', weight: 2, dashArray: '8,6',
  fillColor: '#22c55e', fillOpacity: 0.04
}).addTo(map).bindTooltip('Lipa City, Batangas', { sticky: true });

map.on('layeradd', function () { lipaBoundary.bringToFront(); });

function toggleBoundary(show) {
  show ? map.addLayer(lipaBoundary) : map.removeLayer(lipaBoundary);
}


/* ═══════════════════════════════════════
   7. LAYER GROUPS
═══════════════════════════════════════ */

var layers = {
  park:       L.layerGroup().addTo(map),
  forest:     L.layerGroup().addTo(map),
  garden:     L.layerGroup().addTo(map),
  wetland:    L.layerGroup().addTo(map),
  recycle:    L.layerGroup().addTo(map),
  compost:    L.layerGroup().addTo(map),
  collection: L.layerGroup().addTo(map)
};


/* ═══════════════════════════════════════
   8. COUNTERS
═══════════════════════════════════════ */

var counts = { park:0, forest:0, garden:0, wetland:0, recycle:0, compost:0, collection:0 };

function updateCounts() {
  Object.keys(counts).forEach(function (k) {
    var el = document.getElementById(k + 'Count');
    if (el) el.textContent = counts[k];
  });
}


/* ═══════════════════════════════════════
   9. ICONS & COLORS
═══════════════════════════════════════ */

var COLORS = {
  park:       '#3b82f6',
  forest:     '#166534',
  garden:     '#22c55e',
  wetland:    '#06b6d4',
  recycle:    '#f59e0b',
  compost:    '#92400e',
  collection: '#6b7280'
};

var LABELS = {
  park:       'Park',
  forest:     'Urban Forest',
  garden:     'Community Garden',
  wetland:    'Wetland',
  recycle:    'Recycling Center',
  compost:    'Composting Site',
  collection: 'Collection Point'
};

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
   10. HEATMAP
═══════════════════════════════════════ */

var heatLayer = null;
var heatPoints = {};
Object.keys(layers).forEach(function (k) { heatPoints[k] = []; });
var allHeatPoints = [];

function toggleHeatmap(show) {
  if (show) {
    var pts = currentFilter ? heatPoints[currentFilter] : allHeatPoints;
    if (!pts.length) pts = allHeatPoints;
    heatLayer = L.heatLayer(pts, {
      radius: 40, blur: 28, maxZoom: 16,
      gradient: { 0.0:'#86efac', 0.35:'#facc15', 0.65:'#f97316', 1.0:'#ef4444' }
    }).addTo(map);
  } else {
    if (heatLayer) { map.removeLayer(heatLayer); heatLayer = null; }
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
      '<img src="' + imgSrc + '" style="width:150px;height:85px;object-fit:cover;border-radius:8px;margin:6px 0;display:block" onerror="this.style.display=\'none\'">' +
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

  if (heatLayer) { toggleHeatmap(false); toggleHeatmap(true); }
}


/* ═══════════════════════════════════════
   12. YOUR LOCATION DATA
═══════════════════════════════════════ */

addMarker('park', [13.9415, 121.1637],
  'Lipa City Park', '/ComParkLipa.png',
  'The main public recreation park at the heart of Lipa City. Features open lawns, walking paths, children\'s playground, and a small amphitheater used for community events.',
  { 'Operating Hours':'5:00 AM – 9:00 PM', 'Area':'3.2 hectares', 'Managed by':'City Parks & Recreation Office', 'Facilities':'Benches, Playground, Covered Stage', 'Last Updated':'December 2025' }
);

addMarker('park', [13.9400, 121.1600],
  'Lipa Riverside Park',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Riverside_park.jpg/640px-Riverside_park.jpg',
  'A linear park running along the riverbank, ideal for jogging and early morning walks. Features native tree plantings and riverside viewing areas.',
  { 'Operating Hours':'Open 24 hours', 'Area':'1.8 hectares', 'Trail Length':'1.2 km', 'Managed by':'City Environment Office', 'Last Updated':'November 2025' }
);

addMarker('forest', [13.9490, 121.1720],
  'Mt. Malarayat Forest Reserve',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/Forest_path.jpg/640px-Forest_path.jpg',
  'A major forested mountain area serving as the primary green lung of Lipa City. Home to endemic bird species and supports watershed protection for eastern barangays.',
  { 'Classification':'Protected Forest Reserve', 'Area':'420 hectares', 'Elevation':'600–1,150 MASL', 'Key Species':'Narra, Molave, Philippine Eagle Owl', 'Managed by':'DENR Region IV-A', 'Last Updated':'October 2025' }
);

addMarker('garden', [13.9350, 121.1500],
  'Community Garden – Brgy. San Jose',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Vegetable_garden.jpg/640px-Vegetable_garden.jpg',
  'A community-led urban garden producing fresh vegetables for local households. Established under the city\'s Urban Agriculture Program. Open to volunteer participation on weekends.',
  { 'Produce':'Kangkong, Sitaw, Talong, Ampalaya', 'Plots Available':'24 plots', 'Area':'0.5 hectares', 'Program':'Urban Agriculture Program', 'Contact':'Brgy. San Jose Hall', 'Last Updated':'December 2025' }
);

addMarker('wetland', [13.9200, 121.1750],
  'Wetland Reserve – Brgy. Lodlod',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/4/49/Marshland.jpg/640px-Marshland.jpg',
  'A natural wetland providing critical habitat for migratory waterbirds and serving as a natural flood buffer for downstream communities. Currently under habitat restoration.',
  { 'Classification':'Natural Wetland', 'Area':'12 hectares', 'Bird Species':'30+ recorded species', 'Status':'Under Restoration', 'Managed by':'DENR & City ENRO', 'Last Updated':'September 2025' }
);

addMarker('recycle', [13.9300, 121.1800],
  'Recycling Center – City Proper',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/Recycling_bins.jpg/640px-Recycling_bins.jpg',
  'The primary city-operated materials recovery facility (MRF). Accepts plastic, paper, metal, and glass. Drop-off open to all residents.',
  { 'Accepts':'Plastic, Paper, Metal, Glass', 'Capacity':'5 tons/day', 'Operating Hours':'Mon–Sat, 7:00 AM – 5:00 PM', 'Managed by':'City Environment Office', 'Contact':'(043) 123-4567', 'Last Updated':'December 2025' }
);

addMarker('compost', [13.9550, 121.1600],
  'Composting Site – Brgy. Anilao',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Compost.jpg/640px-Compost.jpg',
  'A barangay-level composting facility processing organic kitchen and garden waste. Finished compost is distributed free to community gardens and urban farmers.',
  { 'Input Material':'Kitchen & Garden Waste', 'Output':'Organic compost (free to residents)', 'Capacity':'800 kg/week', 'Operating Hours':'Mon, Wed, Fri — 8:00 AM – 12:00 PM', 'Managed by':'Brgy. Anilao Council', 'Last Updated':'November 2025' }
);

addMarker('collection', [13.9380, 121.1680],
  'Waste Collection Point – Brgy. Marawoy',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7c/Garbage_collection.jpg/640px-Garbage_collection.jpg',
  'Designated barangay waste collection point serving residential zones in Marawoy. Segregated bins for biodegradable, residual, and recyclable waste.',
  { 'Collection Schedule':'Mon, Wed, Fri', 'Collection Time':'6:00 AM – 10:00 AM', 'Bins Available':'Biodegradable, Recyclable, Residual', 'Serves':'Approx. 450 households', 'Managed by':'Brgy. Marawoy & City Sanitation', 'Last Updated':'December 2025' }
);


/* ═══════════════════════════════════════
   13. ADD PLACE PANEL
═══════════════════════════════════════ */

function openAddPanel() {
  if (!isAdmin) { openLogin(); return; }
  document.getElementById('addPanel').classList.add('open');
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
    var imgPath = imgFile ? 'uploads/' + imgFile.name : '';
    addMarker(category, [lat, lng], name, imgPath, desc, info, null, address);

    var emoji = { park:'🌳', garden:'🌱', forest:'🌲', wetland:'💧', recycle:'♻️', compost:'🍂', collection:'🚛' };
    var newItem = document.createElement('div');
    newItem.className = 'tab-item';
    newItem.innerHTML = (emoji[category]||'📍') + ' <b>' + name + '</b> added just now';
    document.getElementById('tab-added').prepend(newItem);

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
  // Fix image path for uploaded images
  var imgSrc = data.img;
  if (imgSrc && !imgSrc.startsWith('http') && !imgSrc.startsWith('/')) {
    imgSrc = '/' + imgSrc;
  }
  document.getElementById('detailImg').src = imgSrc;
  document.getElementById('detailTag').textContent  = LABELS[data.category] || data.category;
  document.getElementById('detailName').textContent = data.name;
  document.getElementById('detailCoords').innerHTML =
    '📍 ' + data.coords[0].toFixed(5) + ', ' + data.coords[1].toFixed(5);
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
  document.getElementById('detailPanel').classList.add('open');
}

function closeDetail() {
  document.getElementById('detailPanel').classList.remove('open');
  currentMarkerData = null;
}

function saveEdit() {
  if (!currentMarkerData) return;
  currentMarkerData.name = document.getElementById('editName').value;
  currentMarkerData.desc = document.getElementById('editDesc').value;
  document.getElementById('detailName').textContent = currentMarkerData.name;
  document.getElementById('detailDesc').textContent = currentMarkerData.desc;
  showToast('✅ Changes saved!');
}

function deleteLocation() {
  if (!currentMarkerData) { showToast('❌ No location selected!'); return; }

  var confirmDelete = window.confirm('🗑️ Are you sure you want to delete "' + currentMarkerData.name + '"?\n\nThis cannot be undone!');
  if (!confirmDelete) return;

  var dataToDelete = currentMarkerData;

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

  lipaBoundary.bringToFront();
  if (heatLayer) { toggleHeatmap(false); toggleHeatmap(true); }
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
  lipaBoundary.bringToFront();
  map.flyTo(LIPA_CENTER, 13);
  if (heatLayer) { toggleHeatmap(false); toggleHeatmap(true); }
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
  alert('🌿 About Lipa City\n\nLipa City is a highly urbanized city in Batangas, Philippines, known as the "Coffee Capital of the Philippines."\n\nArea: 210.41 km²  |  Population: ~349,000 (2020)\nKnown for: Café de Lipa, Mt. Malarayat, Ayala Malls Solenad\n\nLipaMap tracks green infrastructure and waste management to support environmental awareness, urban planning, and community access to organized data.');
}

function showContact() {
  alert('✉️ Contact / Feedback\n\nMaintained by: Lipa City ENRO\nEmail: lipamap@lipa.gov.ph\nPhone: (043) 123-4567\nAddress: City Hall, Lipa City, Batangas\n\nTo report incorrect data, email with subject: [LipaMap Update]');
}


/* ═══════════════════════════════════════
   20. FINALIZE
═══════════════════════════════════════ */
setTimeout(function () { lipaBoundary.bringToFront(); }, 500);


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
      list.innerHTML = '<p style="font-size:0.78rem;color:var(--ink-400);">No custom categories yet.</p>';
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
    navItem.innerHTML = '<span class="nav-icon">' + cat.emoji + '</span> ' + cat.label;
    navItem.onclick = function() { soloLayer(cat.name); };

    var targetSection = null;
    var allLabels = document.querySelectorAll('.sidebar .nav-label');
    allLabels.forEach(function(lbl) {
      if (cat.group_type === 'green' && lbl.textContent.trim() === 'Green Infrastructure') {
        targetSection = lbl.nextElementSibling;
      }
      if (cat.group_type === 'waste' && lbl.textContent.trim() === 'Waste Management') {
        targetSection = lbl.nextElementSibling;
      }
    });
    if (!targetSection) {
      var allNavSections = document.querySelectorAll('.sidebar .nav-section');
      targetSection = allNavSections[allNavSections.length - 2];
    }
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

  // Add to stats sidebar
  var statsId = cat.name + 'Count';
  if (!document.getElementById(statsId)) {
    var statCard = document.createElement('div');
    statCard.className = 'stat-card';
    statCard.innerHTML =
      '<div class="stat-num" id="' + statsId + '">' + (counts[cat.name] || 0) + '</div>' +
      '<div class="stat-label">' + cat.label + '</div>';
    var legendBox = document.querySelector('.legend-box');
    if (legendBox) {
      document.getElementById('statsSidebar').insertBefore(statCard, legendBox);
    }
  }

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
}


/* ═══════════════════════════════════════
   23. STARTUP
   Load categories first, then locations
═══════════════════════════════════════ */
loadCustomCategories().then(function() {
  loadLocationsFromDB();
});