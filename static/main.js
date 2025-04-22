// Hlavní deklarace globálních proměnných
let map, directionsService, directionsRenderer;
let lastRouteAddresses = [];
let lastRouteCoords = [];

let autocompleteInputs = [];

function getWaypoints() {
    // Vrací pole hodnot waypoint inputů (mezi startem a cílem)
    return Array.from(document.querySelectorAll('#waypoints-list input.waypoint'))
        .map(inp => inp.value.trim())
        .filter(Boolean);
}

function updatePointLabels() {
    // Nastaví písmenka (A, B, C, ...) ke všem bodům (start, waypointy, cíl)
    const startLabel = document.querySelector('label[for="start"]');
    if (startLabel) {
        let span = startLabel.querySelector('.point-label');
        if (!span) {
            span = document.createElement('span');
            span.className = 'point-label';
            span.style.fontWeight = 'bold';
            span.style.width = '22px';
            span.style.display = 'inline-block';
            span.style.textAlign = 'center';
            span.style.marginRight = '6px';
            startLabel.prepend(span);
        }
        span.textContent = 'A';
    }
    // Waypointy
    const waypointRows = document.querySelectorAll('#waypoints-list .waypoint-row');
    waypointRows.forEach((row, idx) => {
        let span = row.querySelector('.point-label');
        if (span) span.textContent = String.fromCharCode('B'.charCodeAt(0) + idx);
    });
    // Cíl
    const endLabel = document.querySelector('label[for="end"]');
    if (endLabel) {
        let span = endLabel.querySelector('.point-label');
        if (!span) {
            span = document.createElement('span');
            span.className = 'point-label';
            span.style.fontWeight = 'bold';
            span.style.width = '22px';
            span.style.display = 'inline-block';
            span.style.textAlign = 'center';
            span.style.marginRight = '6px';
            endLabel.prepend(span);
        }
        span.textContent = String.fromCharCode('B'.charCodeAt(0) + waypointRows.length);
    }
}

function initGoogleAutocomplete() {
    // Klasický Google Autocomplete na všech inputech s třídou autocomplete-input
    const inputs = document.querySelectorAll('input.autocomplete-input');
    inputs.forEach(input => {
        if (!input._autocomplete) {
            input._autocomplete = new google.maps.places.Autocomplete(input, {
                types: ['geocode'],
                componentRestrictions: {country: 'cz'}
            });
        }
    });
}


// Veškeré inicializace závislé na Google Maps se přesouvají do initMap


function enableWaypointDragDrop() {
    if (window.Sortable && document.getElementById('waypoints-list')) {
        new Sortable(document.getElementById('waypoints-list'), {
            animation: 150,
            handle: '.drag-handle',
            ghostClass: 'sortable-ghost',
            onEnd: function() {
                initGoogleAutocomplete(); // Po přesunu znovu naváž autocomplete
                planRoute();
                updatePointLabels();
            }
        });
    }
}


function updateRouteLabels() {
    // Aktualizuje popisky podle pozice
    const rows = document.querySelectorAll('.route-point-row');
    rows.forEach((row, idx) => {
        let label = row.querySelector('.route-point-label');
        if (idx === 0) label.textContent = 'Start';
        else if (idx === rows.length - 1) label.textContent = 'Cíl';
        else label.textContent = 'Zastávka';
    });
}

function refreshSuggestionsBinding() {
    // Znovu naváže autocomplete na všechny inputy
    Array.from(document.querySelectorAll('.route-point-row input.route-point')).forEach(input => {
        if (!input._autocomplete) {
            input._autocomplete = new google.maps.places.Autocomplete(input, {
                types: ['geocode'],
                componentRestrictions: {country: 'cz'}
            });
        }
    });
}

function showLoadingSpinner() {
    const details = document.getElementById('route-details');
    details.innerHTML = '<div class="spinner">Načítám trasu...</div>';
}

function hideLoadingSpinner() {
    const details = document.getElementById('route-details');
    const spinner = details.querySelector('.spinner');
    if (spinner) spinner.remove();
}

function planRoute() {
    const start = document.getElementById('start').value.trim();
    const end = document.getElementById('end').value.trim();
    const waypoints = getWaypoints();
    updatePointLabels();
    // Clear previous details and show spinner
    showLoadingSpinner();
    if (!start || !end) {
        document.getElementById('route-details').innerText = 'Zadejte start a cíl.';
        return;
    }
    const dtInput = document.getElementById('departure-time');
    let depTimeStr = '';
    if (dtInput && dtInput.value) {
        depTimeStr = dtInput.value;
    }
    let useHighways = document.getElementById('pouzit-highways').checked;
    let mode = document.getElementById('route-mode') ? document.getElementById('route-mode').value : 'distance';
    fetch('/route', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            start: start,
            end: end,
            waypoints: waypoints,
            mode: mode,
            use_highways: useHighways,
            departure_time: depTimeStr
        })
    })
    .then(res => {
        if (!res.ok) {
            console.error('Chyba v síťové odpovědi:', res.status, res.statusText);
            throw new Error('Network response was not ok: ' + res.status + ' ' + res.statusText);
        }
        return res.json().catch(parseError => {
            console.error('Chyba při parsování JSON odpovědi:', parseError);
            throw parseError;
        });
    })
    .then(data => {
        // --- LOGOVÁNÍ PRO DIAGNOSTIKU ---
        console.log('Odpověď backendu /route:', data);
        if (!data) {
            console.error('Odpověď backendu je prázdná nebo neplatná!');
            document.getElementById('route-details').innerText = 'Chyba: prázdná odpověď backendu.';
            return;
        }
        if (data.error) {
            document.getElementById('route-details').innerText = 'Trasa nenalezena nebo došlo k chybě.';
            if (directionsRenderer) directionsRenderer.set('directions', null);
            return;
        }
        showRouteDetails(data);
        // --- ZOBRAZENÍ TRASY NA MAPĚ ---
        if (data.directions) {
            // Pokud backend vrací Google Directions API response
            directionsRenderer.setDirections(data.directions);
        } else if (data.overview_polyline) {
            // Pokud backend vrací pouze polyline (např. overview_polyline)
            if (window.routePolyline) {
                routePolyline.setMap(null);
            }
            const path = decodePolyline(data.overview_polyline);
            window.routePolyline = new google.maps.Polyline({
                path: path,
                geodesic: true,
                strokeColor: '#1976d2',
                strokeOpacity: 0.9,
                strokeWeight: 6,
                map: map
            });
            // Nastavit mapu na bounds trasy
            const bounds = new google.maps.LatLngBounds();
            path.forEach(pt => bounds.extend(pt));
            map.fitBounds(bounds);
        } else {
            // Není co vykreslit
            if (directionsRenderer) directionsRenderer.set('directions', null);
            if (window.routePolyline) window.routePolyline.setMap(null);
        }
    })
    .catch(error => {
        hideLoadingSpinner();
        document.getElementById('route-details').innerText = 'Chyba při plánování trasy: ' + error.message;
        console.error('Chyba při plánování trasy:', error);
        if (error.response) {
            error.response.text().then(text => {
                console.error('Obsah chybové odpovědi:', text);
            });
        }
    });
}


function showSuggestions(inputElem, suggestionsElem, suggestions) {
    suggestionsElem.innerHTML = '';
    if (!suggestions.length) return;
    const list = document.createElement('div');
    list.className = 'suggestion-list';
    suggestions.forEach(addr => {
        const item = document.createElement('div');
        item.className = 'suggestion-item';
        item.textContent = addr;
        item.onclick = () => {
            inputElem.value = addr;
            suggestionsElem.innerHTML = '';
        };
        list.appendChild(item);
    });
    suggestionsElem.appendChild(list);
}



// Inicializuje pole pro start, cíl a výchozí waypointy
function initWaypoints(startVal = '', endVal = '', waypointsArr = ['']) {
    // Start
    document.getElementById('start').value = startVal;
    // Waypointy
    const list = document.getElementById('waypoints-list');
    list.innerHTML = '';
    (waypointsArr && waypointsArr.length ? waypointsArr : ['']).forEach(val => addWaypointInput(val));
    // Cíl
    document.getElementById('end').value = endVal;
    // Po načtení z Excelu znovu inicializuj autocomplete a drag&drop
    initGoogleAutocomplete();
    enableWaypointDragDrop();
    updatePointLabels();
    // Hned naplánuj trasu
    planRoute();
}

function refreshSuggestionsBinding() {
    bindSuggestions();
}

function initMap() {
    map = new google.maps.Map(document.getElementById('gmap'), {
        center: {lat: 49.8, lng: 15.5},
        zoom: 7,
        mapTypeId: 'roadmap',
        streetViewControl: false,
        fullscreenControl: false
    });
    // Traffic vrstva
    const trafficLayer = new google.maps.TrafficLayer();
    trafficLayer.setMap(map);
    directionsService = new google.maps.DirectionsService();
    directionsRenderer = new google.maps.DirectionsRenderer({
        map: map,
        suppressMarkers: false
    });
    // Inicializace závislé na Google Maps API
    initGoogleAutocomplete();
    document.getElementById('waypoints-list').innerHTML = '';
    addWaypointInput(''); // První prázdná zastávka (uživatel může smazat)
    enableWaypointDragDrop();
    updatePointLabels();
    // Další případné mapové inicializace sem
}
window.initMap = initMap;

// Naváže handler na tlačítko Naplánovat trasu
bindPlanRouteButton();

function createRoutePointRow(val = '', label = 'Zastávka') {
    const div = document.createElement('div');
    div.className = 'route-point-row';
    div.style.display = 'flex';
    div.style.alignItems = 'center';
    div.innerHTML = `<span class="drag-handle" style="cursor:move;margin-right:6px;">☰</span>` +
        `<input type="text" class="route-point" autocomplete="off" placeholder="Adresa" style="flex:1" value="${val}">` +
        `<span class="route-point-label" style="margin-left:8px;width:70px;">${label}</span>` +
        `<button type="button" class="remove-route-point" style="margin-left:4px;">✖</button>`;
    div.querySelector('.remove-route-point').onclick = () => {
        if (document.querySelectorAll('.route-point-row').length > 2) {
            div.remove();
            updateRouteLabels();
            refreshSuggestionsBinding();
            planRoute();
        }
    };
    return div;
}

function initRouteList(points = ['', '']) {
    const list = document.getElementById('route-list');
    list.innerHTML = '';
    points.forEach((val, idx) => {
        let label = 'Zastávka';
        if (idx === 0) label = 'Start';
        else if (idx === points.length - 1) label = 'Cíl';
        list.appendChild(createRoutePointRow(val, label));
    });
    refreshSuggestionsBinding();
    updateRouteLabels();
}

function enableRouteListDragDrop() {
    new Sortable(document.getElementById('route-list'), {
        animation: 150,
        handle: '.drag-handle',
        ghostClass: 'sortable-ghost',
        onEnd: function() {
            updateRouteLabels();
            refreshSuggestionsBinding();
            planRoute();
        }
    });
}

function addWaypointInput(val = '') {
    const list = document.getElementById('waypoints-list');
    const div = document.createElement('div');
    div.className = 'waypoint-row';
    div.style.display = 'flex';
    div.style.alignItems = 'center';
    div.innerHTML = `<span class="drag-handle" style="cursor:move;margin-right:6px;">☰</span>
        <span class="point-label" style="font-weight:bold;width:22px;text-align:center;margin-right:6px;"></span>
        <input type="text" class="waypoint autocomplete-input" placeholder="Zastávka" style="flex:1">
        <button type="button" class="remove-waypoint" style="margin-left:4px;">✖</button>`;
    list.appendChild(div);
    const input = div.querySelector('input.waypoint');
    if (val) input.value = val;
    div.querySelector('.remove-waypoint').onclick = () => {
        div.remove();
        planRoute();
        updatePointLabels();
    };
    initGoogleAutocomplete(); // Inicializuj autocomplete na novém inputu
    enableWaypointDragDrop(); // Zajisti drag&drop i po přidání
    updatePointLabels();
}

// Bind tlačítko pro přidání waypointu
if (document.getElementById('add-waypoint')) {
    document.getElementById('add-waypoint').onclick = () => addWaypointInput('');
}

// ... zbytek kódu ...

function bindPlanRouteButton() {
    document.getElementById('plan-route').addEventListener('click', planRoute);
}

// Polyline decoder (Google polyline algorithm)
function decodePolyline(encoded) {
    let points = [];
    let index = 0, len = encoded.length;
    let lat = 0, lng = 0;
    while (index < len) {
        let b, shift = 0, result = 0;
        do {
            b = encoded.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);
        let dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
        lat += dlat;
        shift = 0;
        result = 0;
        do {
            b = encoded.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);
        let dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
        lng += dlng;
        points.push({lat: lat / 1e5, lng: lng / 1e5});
    }
    return points;
}

function showRouteDetails(routeData) {
    hideLoadingSpinner();
    // Robustní kontrola dat
    if (!routeData || typeof routeData.distance !== 'number' || typeof routeData.time !== 'number') {
        document.getElementById('route-details').innerText = 'Chyba: Neplatná nebo neúplná data z backendu.';
        document.getElementById('export-excel').disabled = true;
        document.getElementById('export-gps').disabled = true;
        return;
    }
    let distKm = routeData.distance.toFixed(1);
    let durMin = Math.round(routeData.time);
    let html = `<b>Vzdálenost:</b> ${distKm} km<br>` +
        `<b>Odhad doby jízdy:</b> ${durMin} min<br>` +
        `<b>Placené úseky:</b> ${routeData.tolls ? 'Ano' : 'Ne'}<br>` +
        (routeData.eta ? `<b>Odhad příjezdu:</b> ${routeData.eta}<br>` : '');
    document.getElementById('route-details').innerHTML = html;
    // Povolit exporty
    document.getElementById('export-excel').disabled = false;
    document.getElementById('export-gps').disabled = false;
}

document.getElementById('export-excel').onclick = function() {
    // Získej aktuální plán trasy včetně písmenek a typů
    const start = document.getElementById('start').value.trim();
    const end = document.getElementById('end').value.trim();
    const waypoints = Array.from(document.querySelectorAll('#waypoints-list input.waypoint')).map(inp => inp.value.trim()).filter(Boolean);
    const rows = [];
    if (start) rows.push({letter: 'A', type: 'Start', address: start});
    waypoints.forEach((addr, idx) => {
        rows.push({letter: String.fromCharCode('B'.charCodeAt(0) + idx), type: 'Zastávka', address: addr});
    });
    if (end) rows.push({letter: String.fromCharCode('B'.charCodeAt(0) + waypoints.length), type: 'Cíl', address: end});
    const ws_data = [
        ['Písmeno', 'Typ', 'Adresa'],
        ...rows.map(r => [r.letter, r.type, r.address])
    ];
    let ws = XLSX.utils.aoa_to_sheet(ws_data);
    let wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Trasa');
    XLSX.writeFile(wb, 'trasa.xlsx');
};

document.getElementById('export-gps').onclick = function() {
    if (!lastRouteCoords.length) return;
    let csv = 'lat,lng,adresa\n' + lastRouteCoords.map(r => `${r[0]},${r[1]},"${r[2].replace(/"/g,'""')}"`).join('\n');
    let blob = new Blob([csv], {type: 'text/csv'});
    let url = URL.createObjectURL(blob);
    let a = document.createElement('a');
    a.href = url;
    a.download = 'trasa_gps.csv';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
};

function initExcelUpload() {
    document.getElementById('excel-upload').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(evt) {
            const data = new Uint8Array(evt.target.result);
            const workbook = XLSX.read(data, {type: 'array'});
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            let addresses = XLSX.utils.sheet_to_json(sheet, {header: 1}).flat().filter(Boolean);
            // Pokud první řádek vypadá jako hlavička, přeskoč ho
            if (addresses[0] && typeof addresses[0] === 'string' && addresses[0].toLowerCase().includes('adresa')) {
                addresses = addresses.slice(1);
            }
            if (addresses.length >= 2) {
                // naplnit start, waypointy, cíl
                const start = addresses[0];
                const end = addresses[addresses.length-1];
                const waypoints = addresses.slice(1, -1);
                initWaypoints(start, end, waypoints);
            }
        };
        reader.readAsArrayBuffer(file);
    });
}

// --- Inicializace Excel uploadu při načtení stránky ---
initExcelUpload();

// --- Dynamické načtení Google Maps API klíče a skriptu ---
(async function loadGoogleMapsApi() {
    try {
        const resp = await fetch('/api/maps-key');
        const data = await resp.json();
        if (!data.key) {
            document.body.innerHTML = '<div style="color:red;font-weight:bold;">Chyba: Google Maps API klíč není nastaven na serveru.</div>' + document.body.innerHTML;
            return;
        }
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${data.key}&callback=initMap&language=cs&libraries=places`;
        script.async = true;
        script.defer = true;
        document.body.appendChild(script);
    } catch (e) {
        document.body.innerHTML = '<div style="color:red;font-weight:bold;">Chyba: Nelze načíst Google Maps API klíč.</div>' + document.body.innerHTML;
    }
})();

