const API = {
    emergencies: "/api/emergencies",
    units: "/api/units",
    stats: "/api/dashboard/stats"
};

const ROUTING_API = "https://router.project-osrm.org/route/v1/driving";
const SIMULATION_SPEED_KMH = 360;
const MAX_SIMULATION_DURATION_MS = 60_000;
const SIMULATION_TICK_MS = 700;
const POSITION_SYNC_MS = 2100;

const MAHARASHTRA_BOUNDS = {
    south: 15.5,
    west: 72.5,
    north: 22.1,
    east: 80.9
};

const elements = {
    appShell: document.querySelector("#app-shell"),
    sidebar: document.querySelector("#sidebar"),
    sidebarToggle: document.querySelector("#sidebar-toggle"),
    sidebarBackdrop: document.querySelector("#sidebar-backdrop"),
    mobileMenu: document.querySelector("#mobile-menu"),
    pageTitle: document.querySelector("#page-title"),
    globalSearch: document.querySelector("#global-search"),
    notificationButton: document.querySelector("#notification-button"),
    notificationDot: document.querySelector("#notification-dot"),
    notificationCount: document.querySelector("#nav-emergency-count"),
    navDispatchCount: document.querySelector("#nav-dispatch-count"),
    headerStatus: document.querySelector("#header-status"),
    connectionLabel: document.querySelector("#connection-label"),
    sidebarConnectionTitle: document.querySelector("#sidebar-connection-title"),
    sidebarConnectionDetail: document.querySelector("#sidebar-connection-detail"),
    refreshButton: document.querySelector("#refresh-button"),
    refreshLabel: document.querySelector("#refresh-button span"),
    globalNotice: document.querySelector("#global-notice"),
    emergencyList: document.querySelector("#emergency-list"),
    emergencyTable: document.querySelector("#emergency-table-wrap"),
    emergencyState: document.querySelector("#emergency-state"),
    emergencyCount: document.querySelector("#emergency-count"),
    emergencySearch: document.querySelector("#emergency-search"),
    emergencyStatusFilter: document.querySelector("#emergency-status-filter"),
    emergencyCategoryFilter: document.querySelector("#emergency-category-filter"),
    unitList: document.querySelector("#unit-list"),
    unitState: document.querySelector("#unit-state"),
    reportDialog: document.querySelector("#report-dialog"),
    reportForm: document.querySelector("#report-form"),
    closeReportForm: document.querySelector("#close-report-form"),
    cancelReport: document.querySelector("#cancel-report"),
    submitReport: document.querySelector("#submit-report"),
    formMessage: document.querySelector("#form-message"),
    detailDialog: document.querySelector("#emergency-dialog"),
    dialogContent: document.querySelector("#dialog-content"),
    overviewList: document.querySelector("#overview-incidents-list"),
    overviewState: document.querySelector("#overview-state"),
    overviewDetailsStatus: document.querySelector("#overview-details-status"),
    overviewDetailsContent: document.querySelector("#overview-details-content"),
    overviewDetailsActions: document.querySelector("#overview-details-actions"),
    fleetTypeSummary: document.querySelector("#fleet-type-summary"),
    fleetState: document.querySelector("#fleet-state"),
    dispatchList: document.querySelector("#dispatch-list"),
    dispatchState: document.querySelector("#dispatch-state"),
    statusBreakdown: document.querySelector("#status-breakdown"),
    categoryBreakdown: document.querySelector("#category-breakdown"),
    mapContainer: document.querySelector("#operations-map"),
    mapEmptyNotice: document.querySelector("#map-empty-notice"),
    mapLoadError: document.querySelector("#map-load-error"),
    mapStatus: document.querySelector("#map-status"),
    mapPickBanner: document.querySelector("#map-pick-banner"),
    cancelLocationPick: document.querySelector("#cancel-location-pick"),
    pickLocation: document.querySelector("#pick-location"),
    reportLocation: document.querySelector("#report-location"),
    selectedCoordinate: document.querySelector("#selected-coordinate")
};

const statElements = {
    totalEmergencies: document.querySelector("#stat-total"),
    unresolvedEmergencies: document.querySelector("#stat-unresolved"),
    availableUnits: document.querySelector("#stat-available"),
    dispatchedUnits: document.querySelector("#stat-dispatched")
};

const pageTitles = {
    overview: "Overview",
    emergencies: "Emergencies",
    units: "Emergency Units",
    dispatch: "Dispatch Center",
    reports: "Reports"
};

const iconPaths = {
    medical: ["M12 5v14", "M5 12h14"],
    fire: ["M12 3c-2 3-1 5-3 7-1 1.4-2 2.5-2 4.5a5 5 0 0 0 10 0c0-2-1-4-3-6 0 2-1 3-2 3-1-2 1-5 0-8z"],
    security: ["M12 3 19 6v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z"],
    vehicle: ["M3 16v-5l2-3h9l4 4h3v4", "M5 16h.01", "M17 16h.01", "M5 8V6h7v2"],
    incident: ["M12 8v5M12 17h.01", "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z"]
};

let currentView = "overview";
let emergencyRecords = [];
let emergencyLoadError = "";
let units = [];
let unitsLoadError = "";
let statsLoadError = "";
let activeStats = null;
let isRefreshing = false;
let noticeTimer = 0;
const pendingActions = new Set();
let operationsMap = null;
let mapMarkers = null;
let mapResizeObserver = null;
let mapTileErrorShown = false;
let locationPicking = false;
let selectedLocationMarker = null;
let activeEmergencyId = null;
const emergencyMarkers = new Map();
const unitMarkers = new Map();
const routeLayers = new Map();
const simulations = new Map();

async function requestJson(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: {
            Accept: "application/json",
            ...(options.body ? { "Content-Type": "application/json" } : {}),
            ...options.headers
        }
    });

    const bodyText = await response.text();
    let body = null;
    if (bodyText) {
        try {
            body = JSON.parse(bodyText);
        } catch {
            body = bodyText;
        }
    }
    if (!response.ok) {
        const message = body && typeof body === "object" && body.message
            ? body.message
            : typeof body === "string" && body.trim()
                ? body
                : `Request failed with status ${response.status}.`;
        throw new Error(message);
    }
    return body;
}

function createIcon(kind, className = "") {
    const svgNamespace = "http://www.w3.org/2000/svg";
    const icon = document.createElementNS(svgNamespace, "svg");
    icon.setAttribute("viewBox", "0 0 24 24");
    icon.setAttribute("aria-hidden", "true");
    icon.setAttribute("focusable", "false");
    if (className) icon.setAttribute("class", className);
    for (const pathData of iconPaths[kind] || iconPaths.incident) {
        const path = document.createElementNS(svgNamespace, "path");
        path.setAttribute("d", pathData);
        icon.append(path);
    }
    return icon;
}

function categoryIconType(category) {
    switch (String(category || "").toUpperCase()) {
        case "MEDICAL": return "medical";
        case "ACCIDENT": return "medical";
        case "FIRE": return "fire";
        case "SECURITY": return "security";
        default: return "incident";
    }
}

function unitIconType(unitType) {
    const type = String(unitType || "").toLowerCase();
    if (type.includes("ambulance")) return "medical";
    if (type.includes("fire")) return "fire";
    if (type.includes("police")) return "security";
    return "vehicle";
}

function categoryClass(category) {
    switch (String(category || "").toUpperCase()) {
        case "MEDICAL": return "category-medical";
        case "ACCIDENT": return "category-medical";
        case "FIRE": return "category-fire";
        case "SECURITY": return "category-security";
        default: return "";
    }
}

function unitClass(unitType) {
    const type = String(unitType || "").toLowerCase();
    if (type.includes("ambulance")) return "unit-ambulance";
    if (type.includes("fire")) return "unit-fire";
    if (type.includes("police")) return "unit-police";
    return "";
}

function formatCategory(category) {
    const value = String(category || "Unknown");
    return value.charAt(0) + value.slice(1).toLowerCase();
}

function formatStatus(status) {
    const value = String(status || "UNKNOWN").toLowerCase();
    return value.charAt(0).toUpperCase() + value.slice(1);
}

function statusClass(status) {
    const normalized = String(status || "").toLowerCase();
    if (normalized === "resolved") return "status-resolved";
    if (normalized === "dispatched") return "status-dispatched";
    if (normalized === "arrived") return "status-arrived";
    if (normalized === "reported") return "status-reported";
    return "status-unknown";
}

function makeStatusBadge(status) {
    const badge = document.createElement("span");
    badge.className = `status-badge ${statusClass(status)}`;
    badge.textContent = formatStatus(status);
    return badge;
}

function showNotice(message, type = "error") {
    window.clearTimeout(noticeTimer);
    elements.globalNotice.textContent = message;
    elements.globalNotice.className = `toast-region toast-${type}`;
    elements.globalNotice.hidden = !message;
    if (message) {
        noticeTimer = window.setTimeout(() => {
            elements.globalNotice.hidden = true;
        }, 5200);
    }
}

function setConnectionStatus(healthy) {
    elements.headerStatus.classList.toggle("system-degraded", !healthy);
    elements.connectionLabel.textContent = healthy ? "All systems normal" : "Connection issue";
    elements.sidebarConnectionTitle.textContent = healthy ? "Systems operational" : "Connection issue";
    elements.sidebarConnectionDetail.textContent = healthy ? "API connection active" : "Some API data unavailable";
}

function showListMessage(container, message, type = "") {
    container.replaceChildren();
    container.className = `list-state ${type}`.trim();
    container.textContent = message;
    container.hidden = false;
}

function renderEmptyState(container, title, description, withReport = false) {
    container.replaceChildren();
    container.className = "list-state empty-state";
    const illustration = document.createElement("span");
    illustration.className = "empty-illustration";
    illustration.append(createIcon("incident"));
    const heading = document.createElement("strong");
    heading.textContent = title;
    const copy = document.createElement("span");
    copy.className = "empty-copy";
    copy.textContent = description;
    container.append(illustration, heading, copy);
    if (withReport) {
        const button = document.createElement("button");
        button.className = "button button-primary";
        button.type = "button";
        button.dataset.openReport = "";
        button.textContent = "Report an emergency";
        container.append(button);
    }
    container.hidden = false;
}

function setText(id, value) {
    const target = document.getElementById(id);
    if (target) target.textContent = value == null ? "—" : String(value);
}

function getCoordinates(record) {
    if (!record || typeof record !== "object") return null;
    const latitude = typeof record.latitude === "number" ? record.latitude : record.lat;
    const longitude = typeof record.longitude === "number"
        ? record.longitude
        : typeof record.lng === "number"
            ? record.lng
            : record.lon;
    if (typeof latitude !== "number" || typeof longitude !== "number"
        || !Number.isFinite(latitude) || !Number.isFinite(longitude)
        || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
        return null;
    }
    return [latitude, longitude];
}

function isWithinMaharashtraBounds([latitude, longitude]) {
    return latitude >= MAHARASHTRA_BOUNDS.south
        && latitude <= MAHARASHTRA_BOUNDS.north
        && longitude >= MAHARASHTRA_BOUNDS.west
        && longitude <= MAHARASHTRA_BOUNDS.east;
}

function createMapPopup(title, detail, status) {
    const popup = document.createElement("div");
    popup.className = "map-popup";
    const heading = document.createElement("strong");
    heading.textContent = title;
    const description = document.createElement("span");
    description.textContent = detail;
    const state = document.createElement("small");
    state.textContent = status;
    popup.append(heading, description, state);
    return popup;
}

function emergencyIcon(status) {
    const resolved = status === "RESOLVED";
    return window.L.divIcon({
        className: "emergency-marker-shell",
        html: `<span class="emergency-marker${resolved ? " emergency-marker-resolved" : ""}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 7v6M12 17h.01"></path><circle cx="12" cy="12" r="9"></circle></svg></span>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
    });
}

function unitIcon(unit) {
    const icon = unitIconType(unit.unitType);
    return window.L.divIcon({
        className: "unit-marker-shell",
        html: `<span class="unit-marker ${unit.available ? "unit-marker-available" : "unit-marker-dispatched"} unit-marker-${icon}" title="Simulated unit ${unit.id}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 16v-5l2-3h9l4 4h3v4M5 16h.01M17 16h.01M5 8V6h7v2"></path></svg></span>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15]
    });
}

function initializeMap() {
    if (!window.L) {
        elements.mapStatus.textContent = "Map library could not be loaded.";
        elements.mapLoadError.textContent = "The interactive map is unavailable. Check the network connection to load Leaflet; operations data remains available.";
        elements.mapLoadError.hidden = false;
        return;
    }

    try {
        const bounds = window.L.latLngBounds(
            [MAHARASHTRA_BOUNDS.south, MAHARASHTRA_BOUNDS.west],
            [MAHARASHTRA_BOUNDS.north, MAHARASHTRA_BOUNDS.east]
        );
        operationsMap = window.L.map(elements.mapContainer, {
            maxBounds: bounds,
            maxBoundsViscosity: 1,
            minZoom: 5,
            maxZoom: 18,
            zoomSnap: 0.25,
            zoomControl: true,
            scrollWheelZoom: true,
            keyboard: true
        });
        operationsMap.fitBounds(bounds, { padding: [10, 10], maxZoom: 7, animate: false });
        mapMarkers = window.L.layerGroup().addTo(operationsMap);
        window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            minZoom: 5,
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(operationsMap);

        operationsMap.on("tileerror", () => {
            if (mapTileErrorShown) return;
            mapTileErrorShown = true;
            elements.mapStatus.textContent = "Map tiles unavailable — check your network connection.";
        });
        operationsMap.on("click", event => {
            if (!locationPicking) return;
            const coordinates = [event.latlng.lat, event.latlng.lng];
            if (!isWithinMaharashtraBounds(coordinates)) {
                elements.formMessage.textContent = "Choose a point within the supported Maharashtra map area.";
                return;
            }
            const [latitude, longitude] = coordinates;
            elements.reportForm.elements.latitude.value = latitude.toFixed(6);
            elements.reportForm.elements.longitude.value = longitude.toFixed(6);
            elements.reportLocation.value = `Map point · ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
            elements.selectedCoordinate.textContent = `Selected coordinates: ${latitude.toFixed(6)}, ${longitude.toFixed(6)} · Maharashtra`;
            if (selectedLocationMarker) selectedLocationMarker.remove();
            selectedLocationMarker = window.L.circleMarker(coordinates, {
                radius: 8,
                color: "#ff5964",
                weight: 2,
                fillColor: "#ff5964",
                fillOpacity: 0.35
            }).addTo(operationsMap);
            stopLocationPicking();
            elements.reportDialog.showModal();
            elements.reportForm.elements.category.focus();
        });
        if ("ResizeObserver" in window) {
            mapResizeObserver = new ResizeObserver(() => {
                if (operationsMap) operationsMap.invalidateSize({ pan: false });
            });
            mapResizeObserver.observe(elements.mapContainer);
        }
        window.addEventListener("resize", invalidateMapSize);
        updateMapMarkers();
        window.setTimeout(invalidateMapSize, 150);
    } catch (error) {
        elements.mapStatus.textContent = "Map could not be initialized.";
        elements.mapLoadError.textContent = `The interactive map could not start: ${error.message}`;
        elements.mapLoadError.hidden = false;
    }
}

function stopLocationPicking() {
    locationPicking = false;
    elements.mapPickBanner.hidden = true;
    elements.mapContainer.classList.remove("map-selecting");
    if (elements.reportDialog.open) return;
    elements.reportDialog.showModal();
}

function beginLocationPicking() {
    elements.formMessage.textContent = "";
    if (elements.reportDialog.open) elements.reportDialog.close();
    locationPicking = true;
    elements.mapPickBanner.hidden = false;
    elements.mapContainer.classList.add("map-selecting");
    setActiveView("overview");
    window.setTimeout(invalidateMapSize, 180);
}

function invalidateMapSize() {
    if (operationsMap) operationsMap.invalidateSize({ pan: false });
}

function updateMapMarkers() {
    if (!operationsMap || !mapMarkers) return;
    const liveEmergencyIds = new Set();
    const liveUnitIds = new Set();
    let emergencyCoordinateCount = 0;

    for (const emergency of emergencyRecords) {
        const coordinates = getCoordinates(emergency);
        if (!coordinates || !isWithinMaharashtraBounds(coordinates)) continue;
        liveEmergencyIds.add(emergency.id);
        emergencyCoordinateCount++;
        let marker = emergencyMarkers.get(emergency.id);
        if (!marker) {
            marker = window.L.marker(coordinates, { icon: emergencyIcon(emergency.status), title: `Emergency #${emergency.id}` });
            marker.addTo(mapMarkers);
            emergencyMarkers.set(emergency.id, marker);
            marker.on("click", () => focusEmergency(emergency.id));
        } else {
            marker.setLatLng(coordinates);
            marker.setIcon(emergencyIcon(emergency.status));
        }
        marker.bindPopup(createMapPopup(
            `Emergency #${emergency.id}`,
            `${formatCategory(emergency.category)} · ${emergency.location || "Location not provided"}`,
            formatStatus(emergency.status)
        ));
    }

    for (const unit of units) {
        const coordinates = getCoordinates(unit);
        if (!coordinates || !isWithinMaharashtraBounds(coordinates)) continue;
        liveUnitIds.add(unit.id);
        let marker = unitMarkers.get(unit.id);
        if (!marker) {
            marker = window.L.marker(coordinates, { icon: unitIcon(unit), title: `Simulated unit ${unit.id}` });
            marker.addTo(mapMarkers);
            unitMarkers.set(unit.id, marker);
        } else {
            marker.setLatLng(coordinates);
            marker.setIcon(unitIcon(unit));
        }
        marker.bindPopup(createMapPopup(
            `SIMULATED · Unit ${unit.id}`,
            String(unit.unitType || "Emergency unit"),
            `${unit.available ? "Available" : "Dispatched"} · ${coordinates[0].toFixed(5)}, ${coordinates[1].toFixed(5)} · DEMONSTRATION POSITION`
        ));
    }

    for (const [id, marker] of emergencyMarkers) {
        if (!liveEmergencyIds.has(id)) {
            marker.remove();
            emergencyMarkers.delete(id);
        }
    }
    for (const [id, marker] of unitMarkers) {
        if (!liveUnitIds.has(id)) {
            marker.remove();
            unitMarkers.delete(id);
        }
    }

    const coordinatesAvailable = emergencyCoordinateCount > 0;
    elements.mapEmptyNotice.hidden = coordinatesAvailable;
    elements.mapStatus.textContent = coordinatesAvailable
        ? `${emergencyCoordinateCount} reported location${emergencyCoordinateCount === 1 ? "" : "s"} · ${units.length} simulated fleet positions.`
        : `Maharashtra Operations Map — awaiting emergency location data. ${units.length} demo unit positions are simulated.`;
}

function focusEmergency(id) {
    const emergency = emergencyRecords.find(record => record.id === id);
    const coordinates = getCoordinates(emergency);
    if (!coordinates || !operationsMap) return;
    activeEmergencyId = id;
    const route = emergency.status === "DISPATCHED" ? routeLayers.get(id) : null;
    if (route) {
        operationsMap.fitBounds(route.getBounds(), { padding: [32, 32], maxZoom: 12, animate: true });
    } else {
        operationsMap.setView(coordinates, Math.max(operationsMap.getZoom(), 8), { animate: true });
    }
    emergencyMarkers.get(id)?.openPopup();
    if (route) route.openPopup?.();
    document.querySelectorAll(".dispatch-row[data-emergency-id]").forEach(row => {
        row.classList.toggle("dispatch-row-active", Number(row.dataset.emergencyId) === id);
    });
}

function distanceBetween(first, second) {
    const radians = value => value * Math.PI / 180;
    const latitudeDelta = radians(second[0] - first[0]);
    const longitudeDelta = radians(second[1] - first[1]);
    const a = Math.sin(latitudeDelta / 2) ** 2
        + Math.cos(radians(first[0])) * Math.cos(radians(second[0])) * Math.sin(longitudeDelta / 2) ** 2;
    return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function routeDistance(points) {
    let distance = 0;
    for (let index = 1; index < points.length; index++) {
        distance += distanceBetween(points[index - 1], points[index]);
    }
    return distance;
}

async function calculateRoute(origin, destination) {
    const coordinates = `${origin[1]},${origin[0]};${destination[1]},${destination[0]}`;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 12000);
    try {
        const response = await fetch(`${ROUTING_API}/${coordinates}?overview=full&geometries=geojson`, {
            headers: { Accept: "application/json" },
            signal: controller.signal
        });
        if (!response.ok) throw new Error(`Routing service returned ${response.status}.`);
        const data = await response.json();
        const route = data.routes?.[0];
        if (data.code !== "Ok" || !route || !Array.isArray(route.geometry?.coordinates)
            || route.geometry.coordinates.length < 2 || !Number.isFinite(route.distance)) {
            throw new Error("Routing service returned no usable road route.");
        }
        return {
            points: route.geometry.coordinates.map(([longitude, latitude]) => [latitude, longitude]),
            distanceMeters: route.distance,
            routeType: "OSRM road route"
        };
    } catch (error) {
        const points = [origin, destination];
        return {
            points,
            distanceMeters: distanceBetween(origin, destination),
            routeType: "Simulated direct fallback · not road-verified",
            error
        };
    } finally {
        window.clearTimeout(timeout);
    }
}

function positionAlongRoute(points, progress) {
    const lengths = [];
    let total = 0;
    for (let index = 1; index < points.length; index++) {
        const length = distanceBetween(points[index - 1], points[index]);
        lengths.push(length);
        total += length;
    }
    let target = total * progress;
    for (let index = 0; index < lengths.length; index++) {
        if (target <= lengths[index] || index === lengths.length - 1) {
            const fraction = lengths[index] ? Math.min(1, target / lengths[index]) : 0;
            return [
                points[index][0] + (points[index + 1][0] - points[index][0]) * fraction,
                points[index][1] + (points[index + 1][1] - points[index][1]) * fraction
            ];
        }
        target -= lengths[index];
    }
    return points.at(-1);
}

function drawRoute(id, route) {
    routeLayers.get(id)?.remove();
    const simulated = route.routeType.startsWith("Simulated");
    const layer = window.L.polyline(route.points, {
        color: simulated ? "#f5a23d" : "#2dd4bf",
        weight: 5,
        opacity: 0.9,
        dashArray: simulated ? "9 8" : null,
        lineCap: "round",
        lineJoin: "round"
    }).addTo(operationsMap);
    layer.bindPopup(createMapPopup(
        route.routeType,
        `${(route.distanceMeters / 1000).toFixed(1)} km`,
        "Estimated route · not live traffic"
    ));
    routeLayers.set(id, layer);
    return layer;
}

function syncUnitPosition(unitId, coordinates) {
    const unit = units.find(item => item.id === unitId);
    if (!unit) return;
    unit.latitude = coordinates[0];
    unit.longitude = coordinates[1];
    const marker = unitMarkers.get(unitId);
    if (marker) marker.setLatLng(coordinates);
}

function updateSimulationProgress(id, simulation) {
    const percent = Math.round(simulation.progress * 100);
    const progress = document.querySelector(`[data-route-progress="${id}"]`);
    if (progress) progress.style.width = `${percent}%`;
    const label = document.querySelector(`[data-route-label="${id}"]`);
    if (label) {
        const remainingKm = simulation.route.distanceMeters * (1 - simulation.progress) / 1000;
        const remainingMs = simulation.durationMs * (1 - simulation.progress);
        const minutes = Math.ceil(remainingMs / 60_000);
        label.textContent = `${simulation.route.routeType} · ${remainingKm.toFixed(1)} km remaining · ~${minutes} min demo ETA`;
    }
}

async function persistSimulationPosition(id, simulation, coordinates) {
    const unit = units.find(item => item.id === emergencyRecords.find(record => record.id === id)?.assignedUnitId);
    if (!unit) return;
    const request = requestJson(`${API.emergencies}/${encodeURIComponent(id)}/simulation-position`, {
        method: "POST",
        body: JSON.stringify({ latitude: coordinates[0], longitude: coordinates[1] })
    }).then(() => {
        syncUnitPosition(unit.id, coordinates);
        updateMapMarkers();
        renderOverviewSelection();
    });
    simulation.pendingSync = request;
    await request;
    simulation.pendingSync = null;
}

async function completeSimulation(id, simulation) {
    window.clearInterval(simulation.timer);
    simulation.timer = 0;
    try {
        if (simulation.pendingSync) await simulation.pendingSync;
        await requestJson(`${API.emergencies}/${encodeURIComponent(id)}/arrive`, { method: "POST" });
        simulations.delete(id);
        showNotice(`Emergency #${id}: response unit arrived.`, "success");
        await refreshDashboard();
    } catch (error) {
        simulation.paused = true;
        simulation.arrivalPending = false;
        renderDispatchQueue();
        showNotice(`Could not record arrival: ${error.message}`, "error");
    }
}

function tickSimulation(id, simulation) {
    if (simulation.paused || simulation.syncing) return;
    try {
        simulation.progress = Math.min(1, simulation.progress + SIMULATION_TICK_MS / simulation.durationMs);
        const coordinates = positionAlongRoute(simulation.route.points, simulation.progress);
        if (!coordinates.every(Number.isFinite)) {
            throw new Error("The prepared route returned an invalid vehicle position.");
        }
        syncUnitPosition(simulation.unitId, coordinates);
        updateMapMarkers();
        updateSimulationProgress(id, simulation);

        const now = Date.now();
        if (now - simulation.lastSync >= POSITION_SYNC_MS || simulation.progress >= 1) {
            simulation.syncing = true;
            simulation.lastSync = now;
            persistSimulationPosition(id, simulation, coordinates)
                .catch(error => {
                    simulation.paused = true;
                    showNotice(`Simulation position could not be saved: ${error.message}`, "error");
                })
                .finally(() => { simulation.syncing = false; });
        }
        if (simulation.progress >= 1 && !simulation.arrivalPending) {
            simulation.arrivalPending = true;
            void completeSimulation(id, simulation);
        }
    } catch (error) {
        simulation.paused = true;
        showNotice(`Simulation stopped: ${error.message}`, "error");
        renderDispatchQueue();
        renderOverviewSelection();
    }
}

function beginSimulationTimer(id, simulation) {
    if (simulation.timer) return;
    simulation.timer = window.setInterval(() => tickSimulation(id, simulation), SIMULATION_TICK_MS);
}

async function prepareDispatchSimulation(emergency) {
    if (simulations.has(emergency.id) || emergency.status !== "DISPATCHED") return;
    const unit = units.find(item => item.id === emergency.assignedUnitId);
    const origin = getCoordinates(unit);
    const destination = getCoordinates(emergency);
    if (!unit || !unit.simulatedLocation || !origin || !destination
        || !isWithinMaharashtraBounds(origin) || !isWithinMaharashtraBounds(destination)) {
        showNotice(`Emergency #${emergency.id} is dispatched, but route coordinates are unavailable.`, "error");
        return;
    }

    const simulation = {
        unitId: unit.id,
        progress: 0,
        timer: 0,
        started: false,
        paused: false,
        syncing: false,
        lastSync: 0
    };
    simulations.set(emergency.id, simulation);
    try {
        simulation.route = await calculateRoute(origin, destination);
        simulation.durationMs = Math.min(
            MAX_SIMULATION_DURATION_MS,
            Math.max(
                8000,
                simulation.route.distanceMeters / (SIMULATION_SPEED_KMH * 1000 / 3600) * 1000
            )
        );
        simulation.lastSync = Date.now();
        drawRoute(emergency.id, simulation.route);
        focusEmergency(emergency.id);
        renderDispatchQueue();
        updateSimulationProgress(emergency.id, simulation);
        if (simulation.route.error) {
            elements.mapStatus.textContent = `${simulation.route.routeType}.`;
            showNotice(`Road routing unavailable: ${simulation.route.error.message} Movement uses a clearly labeled simulated fallback.`, "error");
        }
        renderOverviewSelection();
    } catch (error) {
        simulations.delete(emergency.id);
        showNotice(`Could not prepare dispatch route: ${error.message}`, "error");
        renderOverviewSelection();
    }
}

function ensureDispatchedSimulations() {
    emergencyRecords
        .filter(emergency => emergency.status === "DISPATCHED" && emergency.assignedUnitId != null)
        .forEach(emergency => { void prepareDispatchSimulation(emergency); });
}

function startSimulation(id) {
    const emergency = emergencyRecords.find(item => item.id === id);
    const simulation = simulations.get(id);
    const unit = units.find(item => item.id === emergency?.assignedUnitId);
    const unitCoordinates = getCoordinates(unit);
    const emergencyCoordinates = getCoordinates(emergency);
    if (!emergency || emergency.status !== "DISPATCHED") {
        showNotice(`Emergency #${id} is no longer in DISPATCHED status. Refresh the dashboard before starting movement.`, "error");
        return;
    }
    if (!simulation?.route || !unit || !unit.simulatedLocation || simulation.unitId !== unit.id
        || !unitCoordinates || !isWithinMaharashtraBounds(unitCoordinates)
        || !emergencyCoordinates || !isWithinMaharashtraBounds(emergencyCoordinates)) {
        showNotice(`Emergency #${id} is missing a prepared route or valid simulated unit coordinates.`, "error");
        return;
    }
    if (simulation.timer || simulation.started) {
        return;
    }
    focusEmergency(id);
    simulation.started = true;
    simulation.paused = false;
    beginSimulationTimer(id, simulation);
    renderDispatchQueue();
    renderOverviewSelection();
    const mapBounds = elements.mapContainer.getBoundingClientRect();
    if (mapBounds.bottom <= 0 || mapBounds.top >= window.innerHeight) {
        elements.mapContainer.scrollIntoView({ behavior: "smooth", block: "center" });
        window.setTimeout(invalidateMapSize, 250);
    }
    showNotice(`Simulation for emergency #${id} started.`, "success");
}

function setSimulationPaused(id, paused) {
    const simulation = simulations.get(id);
    if (!simulation) return;
    simulation.paused = paused;
    if (!paused && !simulation.timer) beginSimulationTimer(id, simulation);
    renderDispatchQueue();
    renderOverviewSelection();
    showNotice(`Simulation for emergency #${id} ${paused ? "paused" : "resumed"}.`, "success");
}

async function resetSimulation(id) {
    const simulation = simulations.get(id);
    const wasStarted = Boolean(simulation?.started);
    const wasPaused = simulation?.paused;
    if (simulation?.timer) window.clearInterval(simulation.timer);
    if (simulation) {
        simulation.timer = 0;
        simulation.paused = true;
    }
    try {
        if (simulation?.pendingSync) await simulation.pendingSync;
        await requestJson(`${API.emergencies}/${encodeURIComponent(id)}/simulation-reset`, { method: "POST" });
        simulations.delete(id);
        routeLayers.get(id)?.remove();
        routeLayers.delete(id);
        await refreshDashboard();
        renderOverviewSelection();
        showNotice(`Simulation for emergency #${id} reset to the configured demonstration starting position.`, "success");
    } catch (error) {
        if (simulation && wasStarted) {
            simulation.paused = wasPaused;
            beginSimulationTimer(id, simulation);
        }
        showNotice(`Could not reset simulation: ${error.message}`, "error");
    }
}

function setActiveView(view) {
    if (!pageTitles[view]) return;
    currentView = view;
    elements.pageTitle.textContent = pageTitles[view];
    document.querySelectorAll("[data-section]").forEach(section => {
        const isActive = section.dataset.section === view;
        section.hidden = !isActive;
        section.classList.toggle("active", isActive);
    });
    document.querySelectorAll(".nav-link[data-view]").forEach(link => {
        const isActive = link.dataset.view === view;
        link.classList.toggle("active", isActive);
        if (isActive) link.setAttribute("aria-current", "page");
        else link.removeAttribute("aria-current");
    });
    closeMobileNavigation();
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (view === "overview") window.setTimeout(invalidateMapSize, 180);
}

function closeMobileNavigation() {
    elements.appShell.classList.remove("sidebar-open");
    elements.mobileMenu.setAttribute("aria-expanded", "false");
    elements.sidebarBackdrop.hidden = true;
}

function openMobileNavigation() {
    elements.appShell.classList.add("sidebar-open");
    elements.mobileMenu.setAttribute("aria-expanded", "true");
    elements.sidebarBackdrop.hidden = false;
}

async function loadStats() {
    const stats = await requestJson(API.stats);
    const keys = ["totalEmergencies", "unresolvedEmergencies", "availableUnits", "dispatchedUnits"];
    for (const key of keys) {
        if (typeof stats?.[key] !== "number") {
            throw new Error(`Dashboard response is missing a valid "${key}" count.`);
        }
    }
    activeStats = stats;
    statsLoadError = "";
    for (const key of keys) statElements[key].textContent = String(stats[key]);
    setText("emergency-total-mini", stats.totalEmergencies);
    setText("emergency-open-mini", stats.unresolvedEmergencies);
    setText("emergency-dispatched-mini", stats.dispatchedUnits);
    setText("report-total", stats.totalEmergencies);
    setText("report-unresolved", stats.unresolvedEmergencies);
    setText("report-available", stats.availableUnits);
    setText("dispatch-ready-count", stats.availableUnits);
}

async function loadEmergencies() {
    const result = await requestJson(API.emergencies);
    if (!Array.isArray(result)) throw new Error("Emergency list response was not a list.");
    emergencyRecords = result;
    emergencyLoadError = "";
    renderEmergencyViews();
    updateMapMarkers();
}

async function loadUnits() {
    const result = await requestJson(API.units);
    if (!Array.isArray(result)) throw new Error("Unit list response was not a list.");
    units = result;
    unitsLoadError = "";
    renderUnitViews();
    renderDispatchQueue();
    renderOverviewSelection();
    renderReports();
    updateMapMarkers();
}

function selectOverviewEmergency(id) {
    activeEmergencyId = id;
    focusEmergency(id);
    renderOverviewIncidents();
    renderOverviewSelection();
    renderDispatchQueue();
}

function renderCompactIncident(emergency) {
    const row = document.createElement("article");
    row.className = `compact-incident${activeEmergencyId === emergency.id ? " compact-incident-selected" : ""}`;
    row.tabIndex = 0;
    row.setAttribute("role", "button");
    row.setAttribute("aria-pressed", String(activeEmergencyId === emergency.id));
    row.setAttribute("aria-label", `Select ${formatCategory(emergency.category)} emergency ${emergency.id}`);
    row.addEventListener("click", () => selectOverviewEmergency(emergency.id));
    row.addEventListener("keydown", event => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            selectOverviewEmergency(emergency.id);
        }
    });
    const icon = document.createElement("span");
    icon.className = `category-mark ${categoryClass(emergency.category)}`;
    icon.append(createIcon(categoryIconType(emergency.category)));
    const copy = document.createElement("span");
    copy.className = "compact-incident-copy";
    const title = document.createElement("strong");
    title.textContent = `${formatCategory(emergency.category)} · #${emergency.id}`;
    const location = document.createElement("small");
    location.textContent = emergency.location || "Location not provided";
    copy.append(title, location);
    row.append(icon, copy, makeStatusBadge(emergency.status));
    return row;
}

function renderOverviewIncidents() {
    elements.overviewList.replaceChildren();
    if (emergencyLoadError) {
        showListMessage(elements.overviewState, emergencyLoadError, "error-state");
        return;
    }
    const unresolved = emergencyRecords.filter(item => item.status !== "RESOLVED");
    if (!emergencyRecords.some(item => item.id === activeEmergencyId)) {
        activeEmergencyId = (unresolved[0] || emergencyRecords[0])?.id ?? null;
    }
    setText("overview-emergency-count", unresolved.length);
    if (!unresolved.length) {
        renderEmptyState(elements.overviewState, "No active incidents", "New reported emergencies will appear in this queue.", true);
        return;
    }
    elements.overviewState.hidden = true;
    unresolved.slice(0, 4).forEach(item => elements.overviewList.append(renderCompactIncident(item)));
}

function appendOverviewDetail(container, labelText, valueText) {
    const detail = document.createElement("div");
    detail.className = "overview-detail";
    const label = document.createElement("span");
    label.textContent = labelText;
    const value = document.createElement("strong");
    value.textContent = valueText || "Not available";
    detail.append(label, value);
    container.append(detail);
}

function renderOverviewSelection() {
    const emergency = emergencyRecords.find(item => item.id === activeEmergencyId);
    elements.overviewDetailsContent.replaceChildren();
    elements.overviewDetailsActions.replaceChildren();
    elements.overviewDetailsStatus.replaceChildren();
    if (!emergency) {
        const message = document.createElement("p");
        message.className = "list-state compact-state";
        message.textContent = emergencyLoadError
            ? `Emergency details unavailable: ${emergencyLoadError}`
            : "No emergency is available to select.";
        elements.overviewDetailsContent.append(message);
        return;
    }

    elements.overviewDetailsStatus.append(makeStatusBadge(emergency.status));
    appendOverviewDetail(elements.overviewDetailsContent, "Emergency", `#${emergency.id}`);
    appendOverviewDetail(elements.overviewDetailsContent, "Type", formatCategory(emergency.category));
    appendOverviewDetail(elements.overviewDetailsContent, "Location", emergency.location || "Location not provided");
    appendOverviewDetail(elements.overviewDetailsContent, "Status", formatStatus(emergency.status));

    const unit = units.find(item => item.id === emergency.assignedUnitId);
    appendOverviewDetail(
        elements.overviewDetailsContent,
        "Assigned unit",
        unit
            ? `Unit ${unit.id} · ${unit.unitType} · ${unit.available ? "Available" : "Assigned to this emergency"}`
            : emergency.assignedUnitId == null ? "Not assigned" : `Unit ${emergency.assignedUnitId} · details unavailable`
    );
    const unitCoordinates = getCoordinates(unit);
    appendOverviewDetail(
        elements.overviewDetailsContent,
        "Simulated unit position",
        unitCoordinates && unit?.simulatedLocation
            ? `${unitCoordinates[0].toFixed(5)}, ${unitCoordinates[1].toFixed(5)}`
            : "Not available"
    );

    const simulation = simulations.get(emergency.id);
    if (simulation?.route) {
        const remainingKm = simulation.route.distanceMeters * (1 - simulation.progress) / 1000;
        appendOverviewDetail(
            elements.overviewDetailsContent,
            "Route",
            `${simulation.route.routeType} · ${remainingKm.toFixed(1)} km remaining`
        );
        if (simulation.started) {
            const minutes = Math.ceil(simulation.durationMs * (1 - simulation.progress) / 60_000);
            appendOverviewDetail(elements.overviewDetailsContent, "Estimated arrival", `~${minutes} min at demo speed`);
        }
    } else if (emergency.status === "DISPATCHED" && unit && unit.simulatedLocation
        && getCoordinates(emergency) && isWithinMaharashtraBounds(getCoordinates(emergency))) {
        appendOverviewDetail(elements.overviewDetailsContent, "Route", "Preparing route…");
    }
    if (emergency.description) {
        appendOverviewDetail(elements.overviewDetailsContent, "Situation details", emergency.description);
    }

    const pending = pendingActions.has(emergency.id);
    if (emergency.status === "REPORTED") {
        const compatibleCount = availableCompatibleUnits(emergency.category);
        elements.overviewDetailsActions.append(createActionButton(
            pending ? "Dispatching…" : "Dispatch unit",
            "button-dispatch",
            () => performAction(emergency.id, "dispatch"),
            pending || compatibleCount === 0
        ));
        if (!compatibleCount) {
            appendOverviewDetail(elements.overviewDetailsContent, "Unit availability", "No compatible available unit");
        }
    } else if (emergency.status === "DISPATCHED") {
        const emergencyCoordinates = getCoordinates(emergency);
        const movementCoordinatesAvailable = Boolean(
            unit
            && unit.simulatedLocation
            && unitCoordinates
            && isWithinMaharashtraBounds(unitCoordinates)
            && emergencyCoordinates
            && isWithinMaharashtraBounds(emergencyCoordinates)
        );
        if (simulation?.route && movementCoordinatesAvailable) {
            if (!simulation.started) {
                elements.overviewDetailsActions.append(createActionButton(
                    "Start Simulation",
                    "button-primary",
                    () => startSimulation(emergency.id)
                ));
            } else {
                elements.overviewDetailsActions.append(createActionButton(
                    pending ? "Updating…" : simulation.paused ? "Resume" : "Pause",
                    "button-view",
                    () => setSimulationPaused(emergency.id, !simulation.paused),
                    pending
                ));
            }
            const reset = createActionButton(
                "Reset simulation",
                "button-view",
                () => resetSimulation(emergency.id),
                pending
            );
            reset.dataset.simulationAction = "";
            elements.overviewDetailsActions.append(reset);
        } else if (!movementCoordinatesAvailable) {
            elements.overviewDetailsActions.append(createActionButton(
                pending ? "Updating…" : "Mark Arrived",
                "button-arrive",
                () => performAction(emergency.id, "arrive"),
                pending
            ));
        }
    } else if (emergency.status === "ARRIVED") {
        elements.overviewDetailsActions.append(createActionButton(
            pending ? "Resolving…" : "Resolve Emergency",
            "button-resolve",
            () => performAction(emergency.id, "resolve"),
            pending
        ));
    }
}

function renderEmergencyViews() {
    renderEmergencyTable();
    renderOverviewIncidents();
    renderOverviewSelection();
    renderDispatchQueue();
    renderReports();
    const unresolved = emergencyRecords.filter(item => item.status !== "RESOLVED").length;
    const awaiting = emergencyRecords.filter(item => item.status === "REPORTED").length;
    setText("nav-emergency-count", unresolved);
    setText("nav-dispatch-count", awaiting);
    elements.notificationDot.hidden = unresolved === 0;
    setText("emergency-total-mini", activeStats?.totalEmergencies);
    setText("emergency-open-mini", activeStats?.unresolvedEmergencies);
    setText("emergency-dispatched-mini", activeStats?.dispatchedUnits);
    setText("dispatch-pending-count", awaiting);
}

function getFilteredEmergencies() {
    const query = elements.emergencySearch.value.trim().toLowerCase();
    const status = elements.emergencyStatusFilter.value;
    const category = elements.emergencyCategoryFilter.value;
    return emergencyRecords.filter(item => {
        const matchesStatus = !status || item.status === status;
        const matchesCategory = !category || item.category === category;
        const searchable = [item.id, item.category, item.location, item.description, item.status]
            .map(value => String(value || "").toLowerCase())
            .join(" ");
        return matchesStatus && matchesCategory && searchable.includes(query);
    });
}

function createActionButton(label, actionClass, callback, disabled = false) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `button button-small ${actionClass}`;
    button.textContent = label;
    button.disabled = disabled;
    button.addEventListener("click", callback);
    return button;
}

function renderEmergencyTable() {
    elements.emergencyList.replaceChildren();
    elements.emergencyTable.hidden = true;
    if (emergencyLoadError) {
        setText("emergency-count", "!");
        showListMessage(elements.emergencyState, emergencyLoadError, "error-state");
        return;
    }
    const filtered = getFilteredEmergencies();
    setText("emergency-count", filtered.length);
    if (!filtered.length) {
        if (emergencyRecords.length) {
            renderEmptyState(elements.emergencyState, "No incidents match these filters", "Try another search or clear one of the selected filters.");
        } else {
            renderEmptyState(elements.emergencyState, "No emergencies reported", "When an incident is reported, it will be available here for review and response.", true);
        }
        return;
    }

    elements.emergencyState.hidden = true;
    elements.emergencyTable.hidden = false;
    for (const emergency of filtered) {
        const row = document.createElement("tr");
        const incidentCell = document.createElement("td");
        const incident = document.createElement("div");
        incident.className = "incident-cell";
        const marker = document.createElement("span");
        marker.className = `category-mark ${categoryClass(emergency.category)}`;
        marker.append(createIcon(categoryIconType(emergency.category)));
        const summary = document.createElement("span");
        summary.className = "incident-cell-copy";
        const category = document.createElement("strong");
        category.textContent = formatCategory(emergency.category);
        const id = document.createElement("small");
        id.textContent = `Emergency #${emergency.id}`;
        summary.append(category, id);
        incident.append(marker, summary);
        incidentCell.append(incident);

        const locationCell = document.createElement("td");
        locationCell.className = "location-cell";
        const location = document.createElement("strong");
        location.textContent = emergency.location || "Location not provided";
        const description = document.createElement("small");
        description.textContent = emergency.description || "No description provided";
        locationCell.append(location, description);

        const statusCell = document.createElement("td");
        statusCell.append(makeStatusBadge(emergency.status));

        const actionsCell = document.createElement("td");
        actionsCell.className = "action-cell";
        const group = document.createElement("span");
        group.className = "action-group";
        group.append(createActionButton("Details", "button-view", () => viewEmergency(emergency.id)));
        if (emergency.status === "REPORTED") {
            group.append(createActionButton(
                pendingActions.has(emergency.id) ? "Dispatching…" : "Dispatch",
                "button-dispatch",
                () => performAction(emergency.id, "dispatch"),
                pendingActions.has(emergency.id)
            ));
        }
        if (emergency.status === "ARRIVED") {
            group.append(createActionButton(
                pendingActions.has(emergency.id) ? "Updating…" : "Resolve",
                "button-resolve",
                () => performAction(emergency.id, "resolve"),
                pendingActions.has(emergency.id)
            ));
        }
        actionsCell.append(group);
        row.append(incidentCell, locationCell, statusCell, actionsCell);
        elements.emergencyList.append(row);
    }
}

function categoryMatchesUnit(category, unitType) {
    const type = String(unitType || "").toLowerCase();
    if (category === "MEDICAL" || category === "ACCIDENT") return type.includes("ambulance");
    if (category === "FIRE") return type.includes("fire");
    if (category === "SECURITY") return type.includes("police");
    return false;
}

function availableCompatibleUnits(category) {
    return units.filter(unit => unit.available && categoryMatchesUnit(category, unit.unitType)).length;
}

function renderDispatchQueue() {
    elements.dispatchList.replaceChildren();
    if (emergencyLoadError || unitsLoadError) {
        const message = [emergencyLoadError, unitsLoadError].filter(Boolean).join(" ");
        showListMessage(elements.dispatchState, message, "error-state");
        return;
    }
    const activeRecords = emergencyRecords.filter(item => item.status !== "RESOLVED");
    const pending = activeRecords.filter(item => item.status === "REPORTED");
    setText("dispatch-pending-count", pending.length);
    if (!activeRecords.length) {
        renderEmptyState(elements.dispatchState, "Dispatch queue is clear", "Reported emergencies and active simulations will appear here.");
        return;
    }
    elements.dispatchState.hidden = true;
    for (const emergency of activeRecords) {
        const row = document.createElement("article");
        row.className = `dispatch-row${activeEmergencyId === emergency.id ? " dispatch-row-active" : ""}`;
        row.dataset.emergencyId = emergency.id;
        row.addEventListener("click", event => {
            if (event.target.closest("button")) return;
            selectOverviewEmergency(emergency.id);
        });
        const main = document.createElement("div");
        main.className = "dispatch-row-main";
        const mark = document.createElement("span");
        mark.className = `category-mark ${categoryClass(emergency.category)}`;
        mark.append(createIcon(categoryIconType(emergency.category)));
        const copy = document.createElement("span");
        copy.className = "dispatch-row-copy";
        const title = document.createElement("strong");
        title.textContent = `${formatCategory(emergency.category)} emergency · #${emergency.id}`;
        const location = document.createElement("small");
        location.textContent = `${emergency.location || "Location not provided"} · ${emergency.description || "No description provided"}`;
        copy.append(title, location);
        main.append(mark, copy);

        const status = makeStatusBadge(emergency.status);
        row.append(main, status);
        if (emergency.status === "REPORTED") {
            const matchCount = availableCompatibleUnits(emergency.category);
            const compatible = document.createElement("span");
            compatible.className = "dispatch-match";
            compatible.textContent = `${matchCount} compatible ${matchCount === 1 ? "unit" : "units"} available`;
            const dispatchButton = createActionButton(
                pendingActions.has(emergency.id) ? "Dispatching…" : "Dispatch unit",
                "button-dispatch",
                () => performAction(emergency.id, "dispatch"),
                matchCount === 0 || pendingActions.has(emergency.id)
            );
            row.append(compatible, dispatchButton);
        } else {
            const unit = units.find(item => item.id === emergency.assignedUnitId);
            const simulation = simulations.get(emergency.id);
            const assigned = document.createElement("div");
            assigned.className = "dispatch-route-meta";
            const assignedLabel = document.createElement("strong");
            assignedLabel.textContent = unit
                ? `Unit ${unit.id} · ${unit.unitType} · ${unit.available ? "Available" : "Assigned · SIMULATED"}`
                : `Unit ${emergency.assignedUnitId ?? "unknown"} · assignment details unavailable`;
            const routeLabel = document.createElement("small");
            routeLabel.dataset.routeLabel = emergency.id;
            routeLabel.textContent = simulation?.route
                ? `${simulation.route.routeType} · ${(simulation.route.distanceMeters * (1 - simulation.progress) / 1000).toFixed(1)} km remaining`
                : emergency.status === "ARRIVED"
                    ? "Vehicle arrived at the reported coordinates."
                    : getCoordinates(emergency)
                        ? "Preparing route from simulated unit position…"
                        : "No destination coordinates; route simulation is unavailable.";
            const progressTrack = document.createElement("span");
            progressTrack.className = "dispatch-progress-track";
            const progressFill = document.createElement("span");
            progressFill.className = "dispatch-progress-fill";
            progressFill.dataset.routeProgress = emergency.id;
            progressFill.style.width = `${Math.round((simulation?.progress || (emergency.status === "ARRIVED" ? 1 : 0)) * 100)}%`;
            progressTrack.append(progressFill);
            assigned.append(assignedLabel, routeLabel, progressTrack);
            row.append(assigned);

            if (emergency.status === "DISPATCHED") {
                const unitCoordinates = getCoordinates(unit);
                const emergencyCoordinates = getCoordinates(emergency);
                const movementCoordinatesAvailable = Boolean(
                    unit
                    && unit.simulatedLocation
                    && unitCoordinates
                    && isWithinMaharashtraBounds(unitCoordinates)
                    && emergencyCoordinates
                    && isWithinMaharashtraBounds(emergencyCoordinates)
                );
                if (movementCoordinatesAvailable) {
                    if (simulation?.route && !simulation.started) {
                        const start = createActionButton(
                            "Start Simulation",
                            "button-view",
                            () => startSimulation(emergency.id),
                            pendingActions.has(emergency.id)
                        );
                        start.dataset.simulationAction = "";
                        row.append(start);
                    } else if (simulation?.started) {
                        const pause = createActionButton(
                            pendingActions.has(emergency.id)
                                ? "Updating…"
                                : simulation.paused ? "Resume simulation" : "Pause simulation",
                            "button-view",
                            () => setSimulationPaused(emergency.id, !simulation.paused),
                            pendingActions.has(emergency.id)
                        );
                        pause.dataset.simulationAction = "";
                        row.append(pause);
                    }
                    if (simulation) {
                        const reset = createActionButton(
                            "Reset simulation",
                            "button-view",
                            () => resetSimulation(emergency.id),
                            pendingActions.has(emergency.id)
                        );
                        reset.dataset.simulationAction = "";
                        row.append(reset);
                    }
                } else {
                    row.append(createActionButton(
                        pendingActions.has(emergency.id) ? "Updating…" : "Mark Arrived",
                        "button-arrive",
                        () => performAction(emergency.id, "arrive"),
                        pendingActions.has(emergency.id)
                    ));
                }
            } else if (emergency.status === "ARRIVED") {
                row.append(createActionButton(
                    pendingActions.has(emergency.id) ? "Resolving…" : "Resolve incident",
                    "button-resolve",
                    () => performAction(emergency.id, "resolve"),
                    pendingActions.has(emergency.id)
                ));
            }
        }
        elements.dispatchList.append(row);
    }
}

function renderUnitViews() {
    elements.unitList.replaceChildren();
    elements.fleetTypeSummary.replaceChildren();
    if (unitsLoadError) {
        showListMessage(elements.unitState, unitsLoadError, "error-state");
        showListMessage(elements.fleetState, unitsLoadError, "error-state");
        ["units-total", "units-available", "units-unavailable", "fleet-ready-count", "fleet-total-count"].forEach(id => setText(id, "—"));
        return;
    }

    elements.unitState.hidden = true;
    elements.fleetState.hidden = true;
    const available = units.filter(unit => unit.available).length;
    const unavailable = units.length - available;
    setText("units-total", units.length);
    setText("units-available", available);
    setText("units-unavailable", unavailable);
    setText("fleet-ready-count", available);
    setText("fleet-total-count", units.length);
    const percentage = units.length ? (available / units.length) * 100 : 0;
    document.querySelector("#fleet-meter-fill").style.width = `${percentage}%`;

    if (!units.length) {
        renderEmptyState(elements.unitState, "No units registered", "Emergency response units will be listed here when available.");
        renderEmptyState(elements.fleetState, "No fleet data", "No response units were returned by the API.");
        return;
    }

    const types = new Map();
    for (const unit of units) {
        const current = types.get(unit.unitType) || { total: 0, available: 0 };
        current.total++;
        if (unit.available) current.available++;
        types.set(unit.unitType, current);

        const type = String(unit.unitType || "");
        const card = document.createElement("article");
        card.className = `unit-card ${unitClass(type)}`;
        const top = document.createElement("div");
        top.className = "unit-card-top";
        const icon = document.createElement("span");
        icon.className = "unit-icon";
        icon.append(createIcon(unitIconType(type)));
        const state = document.createElement("span");
        state.className = `unit-status ${unit.available ? "available" : "unavailable"}`;
        const indicator = document.createElement("span");
        indicator.className = "service-indicator";
        const label = document.createElement("span");
        label.textContent = unit.available ? "Available" : "Unavailable";
        state.append(indicator, label);
        top.append(icon, state);
        const copy = document.createElement("div");
        copy.className = "unit-copy";
        const name = document.createElement("strong");
        name.textContent = type || "Emergency unit";
        const identifier = document.createElement("small");
        identifier.textContent = `Unit ${unit.id}`;
        copy.append(name, identifier);
        const detail = document.createElement("div");
        detail.className = "unit-detail";
        const detailLabel = document.createElement("span");
        detailLabel.textContent = unit.simulatedLocation ? "Simulated position" : "Fleet status";
        const detailValue = document.createElement("strong");
        const unitCoordinates = getCoordinates(unit);
        detailValue.textContent = unitCoordinates
            ? `${unit.available ? "Available" : "Dispatched"} · ${unitCoordinates[0].toFixed(3)}, ${unitCoordinates[1].toFixed(3)} · DEMO`
            : unit.available ? "Ready for response" : "Not available";
        detail.append(detailLabel, detailValue);
        card.append(top, copy, detail);
        elements.unitList.append(card);
    }

    const typeColors = ["#5795d0", "#d7904a", "#827cbe", "#60a987"];
    let index = 0;
    for (const [type, count] of types) {
        const row = document.createElement("div");
        row.className = "fleet-type-row";
        const dot = document.createElement("span");
        dot.className = "fleet-type-dot";
        dot.style.backgroundColor = typeColors[index % typeColors.length];
        const label = document.createElement("span");
        label.textContent = type || "Other";
        const total = document.createElement("strong");
        total.textContent = `${count.available} / ${count.total}`;
        row.append(dot, label, total);
        elements.fleetTypeSummary.append(row);
        index++;
    }
}

function renderBreakdown(container, rows, total, labelOf, fillClassOf) {
    container.replaceChildren();
    if (!total) {
        const note = document.createElement("p");
        note.className = "empty-copy";
        note.textContent = "No records are available for this breakdown.";
        container.append(note);
        return;
    }
    for (const item of rows) {
        const row = document.createElement("div");
        row.className = "breakdown-row";
        const label = document.createElement("span");
        label.className = "breakdown-label";
        label.textContent = labelOf(item.key);
        const track = document.createElement("span");
        track.className = "breakdown-track";
        const fill = document.createElement("span");
        fill.className = `breakdown-fill ${fillClassOf(item.key)}`;
        fill.style.width = `${(item.count / total) * 100}%`;
        track.append(fill);
        const value = document.createElement("strong");
        value.className = "breakdown-value";
        value.textContent = String(item.count);
        row.append(label, track, value);
        container.append(row);
    }
}

function countBy(records, field, order) {
    const counts = new Map(order.map(key => [key, 0]));
    for (const record of records) {
        const key = record[field];
        if (counts.has(key)) counts.set(key, counts.get(key) + 1);
    }
    return order.map(key => ({ key, count: counts.get(key) }));
}

function renderReports() {
    if (emergencyLoadError) {
        showListMessage(elements.statusBreakdown, emergencyLoadError, "error-state");
    } else {
        const statusRows = countBy(emergencyRecords, "status", ["REPORTED", "DISPATCHED", "ARRIVED", "RESOLVED"]);
        renderBreakdown(
            elements.statusBreakdown,
            statusRows,
            emergencyRecords.length,
            formatStatus,
            status => `status-${String(status).toLowerCase()}-fill`
        );
    }
    if (unitsLoadError) {
        showListMessage(elements.categoryBreakdown, unitsLoadError, "error-state");
    } else {
        const unitTypes = [...new Set(units.map(unit => unit.unitType))];
        const counts = new Map(unitTypes.map(type => [type, 0]));
        units.forEach(unit => counts.set(unit.unitType, counts.get(unit.unitType) + 1));
        const rows = unitTypes.map(key => ({ key, count: counts.get(key) }));
        renderBreakdown(
            elements.categoryBreakdown,
            rows,
            units.length,
            key => key || "Other units",
            key => `category-${categoryClass(key).replace("category-", "")}-fill`
        );
    }
}

async function viewEmergency(id) {
    try {
        const emergency = await requestJson(`${API.emergencies}/${encodeURIComponent(id)}`);
        const fields = [
            ["Emergency ID", emergency.id],
            ["Type", formatCategory(emergency.category)],
            ["Status", formatStatus(emergency.status)],
            ["Location", emergency.location],
            ["Coordinates", getCoordinates(emergency)?.join(", ")],
            ["Assigned unit", emergency.assignedUnitId == null ? "Not assigned" : `Unit ${emergency.assignedUnitId}`],
            ["Description", emergency.description]
        ];
        elements.dialogContent.replaceChildren();
        for (const [labelText, value] of fields) {
            const row = document.createElement("div");
            row.className = "detail-row";
            const label = document.createElement("span");
            label.className = "detail-label";
            label.textContent = labelText;
            const detail = document.createElement("div");
            detail.className = "detail-value";
            detail.textContent = value == null || value === "" ? "Not provided" : String(value);
            row.append(label, detail);
            elements.dialogContent.append(row);
        }
        elements.detailDialog.showModal();
    } catch (error) {
        showNotice(`Could not load emergency details: ${error.message}`, "error");
    }
}

async function refreshDashboard(showSuccess = false) {
    if (isRefreshing) return false;
    isRefreshing = true;
    elements.refreshButton.disabled = true;
    elements.refreshLabel.textContent = "Refreshing";
    showNotice("");

    const results = await Promise.allSettled([loadStats(), loadEmergencies(), loadUnits()]);
    const errors = [];
    if (results[0].status === "rejected") {
        statsLoadError = results[0].reason?.message || "Could not load dashboard statistics.";
        errors.push(`Statistics: ${statsLoadError}`);
        Object.values(statElements).forEach(element => { element.textContent = "—"; });
        ["emergency-total-mini", "emergency-open-mini", "emergency-dispatched-mini", "report-total", "report-unresolved", "report-available", "dispatch-ready-count"].forEach(id => setText(id, "—"));
    } else {
        statsLoadError = "";
    }
    if (results[1].status === "rejected") {
        emergencyLoadError = results[1].reason?.message || "Could not load emergencies.";
        emergencyRecords = [];
        errors.push(`Emergencies: ${emergencyLoadError}`);
    }
    if (results[2].status === "rejected") {
        unitsLoadError = results[2].reason?.message || "Could not load units.";
        units = [];
        errors.push(`Units: ${unitsLoadError}`);
    }

    if (errors.length) {
        renderEmergencyViews();
        renderUnitViews();
    }

    isRefreshing = false;
    elements.refreshButton.disabled = false;
    elements.refreshLabel.textContent = "Refresh";
    if (errors.length) {
        updateMapMarkers();
        setConnectionStatus(false);
        showNotice(`Some data could not be refreshed. ${errors.join(" ")}`, "error");
        return false;
    }
    setConnectionStatus(true);
    ensureDispatchedSimulations();
    if (showSuccess) showNotice("Dashboard data refreshed.", "success");
    return true;
}

async function performAction(id, action) {
    if (pendingActions.has(id)) return;
    const emergency = emergencyRecords.find(item => item.id === id);
    if (!emergency) {
        showNotice("This emergency is no longer in the current list. Refresh and try again.", "error");
        return;
    }
    pendingActions.add(id);
    renderEmergencyViews();
    try {
        await requestJson(`${API.emergencies}/${encodeURIComponent(id)}/${action}`, { method: "POST" });
        if (action === "resolve") {
            const simulation = simulations.get(id);
            if (simulation?.timer) window.clearInterval(simulation.timer);
            simulations.delete(id);
            routeLayers.get(id)?.remove();
            routeLayers.delete(id);
        }
        showNotice(action === "dispatch"
            ? `Emergency #${id} dispatched to a compatible available unit.`
            : action === "arrive"
                ? `Emergency #${id} marked arrived.`
            : `Emergency #${id} resolved. The assigned unit is available again.`, "success");
        await refreshDashboard();
    } catch (error) {
        showNotice(error.message, "error");
        renderEmergencyViews();
    } finally {
        pendingActions.delete(id);
        renderEmergencyViews();
    }
}

function openReportForm() {
    elements.formMessage.textContent = "";
    elements.formMessage.className = "form-message";
    elements.reportDialog.showModal();
    elements.reportForm.elements.category.focus();
}

function closeReportForm() {
    if (elements.reportDialog.open) elements.reportDialog.close();
    elements.reportForm.reset();
    elements.formMessage.textContent = "";
    elements.selectedCoordinate.textContent = "No map location selected.";
    if (selectedLocationMarker) {
        selectedLocationMarker.remove();
        selectedLocationMarker = null;
    }
}

function setFormBusy(busy) {
    elements.submitReport.disabled = busy;
    elements.cancelReport.disabled = busy;
    elements.closeReportForm.disabled = busy;
    elements.submitReport.innerHTML = busy
        ? "<span>Submitting…</span>"
        : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6"></path></svg> Submit report';
}

elements.reportForm.addEventListener("submit", async event => {
    event.preventDefault();
    if (elements.submitReport.disabled) return;

    const formData = new FormData(elements.reportForm);
    const latitude = Number(formData.get("latitude"));
    const longitude = Number(formData.get("longitude"));
    const payload = {
        category: String(formData.get("category") || ""),
        location: String(formData.get("location") || "").trim(),
        description: String(formData.get("description") || "").trim(),
        latitude,
        longitude
    };

    if (!["ACCIDENT", "FIRE", "MEDICAL", "SECURITY"].includes(payload.category)) {
        elements.formMessage.textContent = "Choose a valid emergency type.";
        return;
    }
    if (!payload.location || !Number.isFinite(latitude) || !Number.isFinite(longitude)
        || !isWithinMaharashtraBounds([latitude, longitude])) {
        elements.formMessage.textContent = "Select a valid incident point within the Maharashtra map area.";
        return;
    }

    setFormBusy(true);
    elements.formMessage.textContent = "";
    try {
        const created = await requestJson(API.emergencies, { method: "POST", body: JSON.stringify(payload) });
        closeReportForm();
        let dispatchMessage = "";
        let dispatchFailed = false;
        try {
            await requestJson(`${API.emergencies}/${encodeURIComponent(created.id)}/dispatch`, { method: "POST" });
            dispatchMessage = " Nearest compatible available unit dispatched.";
        } catch (dispatchError) {
            dispatchFailed = true;
            dispatchMessage = ` It remains unassigned: ${dispatchError.message}`;
        }
        await refreshDashboard();
        showNotice(`Emergency #${created.id} reported · ${formatStatus(created.status)}.${dispatchMessage}`, dispatchFailed ? "error" : "success");
    } catch (error) {
        elements.formMessage.textContent = error.message;
        showNotice(error.message, "error");
    } finally {
        setFormBusy(false);
    }
});

document.addEventListener("click", event => {
    const simulationButton = event.target.closest("[data-simulation-action]");
    if (simulationButton) {
        event.stopPropagation();
        return;
    }
    const viewButton = event.target.closest("[data-view]");
    if (viewButton) {
        setActiveView(viewButton.dataset.view);
        return;
    }
    const viewLink = event.target.closest("[data-view-link]");
    if (viewLink) {
        event.preventDefault();
        setActiveView(viewLink.dataset.viewLink);
        return;
    }
    if (event.target.closest("[data-open-report]")) {
        openReportForm();
    }
});

elements.pickLocation.addEventListener("click", beginLocationPicking);
elements.cancelLocationPick.addEventListener("click", stopLocationPicking);
elements.reportDialog.addEventListener("cancel", event => {
    event.preventDefault();
    closeReportForm();
});
elements.reportDialog.addEventListener("click", event => {
    if (event.target === elements.reportDialog) closeReportForm();
});
elements.sidebarToggle.addEventListener("click", () => {
    if (window.matchMedia("(max-width: 900px)").matches) {
        closeMobileNavigation();
        return;
    }
    const collapsed = elements.appShell.classList.toggle("sidebar-collapsed");
    elements.sidebarToggle.setAttribute("aria-label", collapsed ? "Expand sidebar" : "Collapse sidebar");
    elements.sidebarToggle.title = collapsed ? "Expand sidebar" : "Collapse sidebar";
    window.setTimeout(invalidateMapSize, 220);
});
elements.mobileMenu.addEventListener("click", () => {
    if (elements.appShell.classList.contains("sidebar-open")) closeMobileNavigation();
    else openMobileNavigation();
});
elements.sidebarBackdrop.addEventListener("click", closeMobileNavigation);
elements.notificationButton.addEventListener("click", () => setActiveView("emergencies"));
elements.refreshButton.addEventListener("click", () => refreshDashboard(true));
elements.emergencySearch.addEventListener("input", renderEmergencyTable);
elements.emergencyStatusFilter.addEventListener("change", renderEmergencyTable);
elements.emergencyCategoryFilter.addEventListener("change", renderEmergencyTable);
elements.globalSearch.addEventListener("input", () => {
    elements.emergencySearch.value = elements.globalSearch.value;
    setActiveView("emergencies");
    renderEmergencyTable();
});
elements.globalSearch.addEventListener("keydown", event => {
    if (event.key === "Escape") {
        elements.globalSearch.value = "";
        elements.emergencySearch.value = "";
        renderEmergencyTable();
        elements.globalSearch.blur();
    }
});
document.addEventListener("keydown", event => {
    if (event.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) {
        event.preventDefault();
        elements.globalSearch.focus();
    }
});
elements.closeReportForm.addEventListener("click", closeReportForm);
elements.cancelReport.addEventListener("click", closeReportForm);
document.querySelector("#close-dialog").addEventListener("click", () => elements.detailDialog.close());
elements.detailDialog.addEventListener("click", event => {
    if (event.target === elements.detailDialog) elements.detailDialog.close();
});

initializeMap();
refreshDashboard();
window.addEventListener("pagehide", () => {
    simulations.forEach(simulation => {
        if (simulation.timer) window.clearInterval(simulation.timer);
    });
});
