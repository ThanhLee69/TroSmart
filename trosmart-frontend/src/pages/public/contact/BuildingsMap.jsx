import { useEffect, useMemo, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

/**
 * Bản đồ nhiều tòa nhà (OpenStreetMap + Leaflet, miễn phí, không cần API key).
 *
 * buildings: [{ id, letter, name, address, lat, lng }]  (lat, lng là số)
 * activeId:  id tòa đang chọn (bay tới và mở popup)
 * onSelect:  (id) => void, gọi khi bấm vào ghim
 */

// Ghim hình giọt nước có chữ cái, dùng divIcon nên không cần ảnh marker của Leaflet
const createPin = (letter, active) =>
  L.divIcon({
    className: "bm-pin-wrap",
    html: `<span class="bm-pin${active ? " bm-pin--active" : ""}"><i>${letter}</i></span>`,
    iconSize: [34, 42],
    iconAnchor: [17, 42],
    popupAnchor: [0, -38],
  });

// Tự thu phóng để thấy hết các tòa nhà
function FitToBuildings({ buildings }) {
  const map = useMap();

  useEffect(() => {
    if (buildings.length === 0) return;

    if (buildings.length === 1) {
      map.setView([buildings[0].lat, buildings[0].lng], 16);
      return;
    }

    map.fitBounds(
      buildings.map((building) => [building.lat, building.lng]),
      { padding: [40, 40], maxZoom: 17 },
    );
  }, [buildings, map]);

  return null;
}

// Bay tới tòa đang chọn
function FlyToActive({ buildings, activeId }) {
  const map = useMap();

  useEffect(() => {
    const active = buildings.find((building) => building.id === activeId);
    if (!active) return;

    map.flyTo([active.lat, active.lng], Math.max(map.getZoom(), 16), {
      duration: 0.6,
    });
    // Chỉ chạy khi đổi tòa được chọn
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  return null;
}

export default function BuildingsMap({
  buildings,
  activeId,
  onSelect,
  className,
}) {
  const markerRefs = useRef({});

  // Mở popup của tòa đang chọn
  useEffect(() => {
    markerRefs.current[activeId]?.openPopup();
  }, [activeId]);

  const first = buildings[0];

  const pins = useMemo(
    () =>
      Object.fromEntries(
        buildings.map((building) => [
          building.id,
          {
            normal: createPin(building.letter, false),
            active: createPin(building.letter, true),
          },
        ]),
      ),
    [buildings],
  );

  return (
    <MapContainer
      center={[first.lat, first.lng]}
      zoom={16}
      scrollWheelZoom={false}
      className={className}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <FitToBuildings buildings={buildings} />
      <FlyToActive buildings={buildings} activeId={activeId} />

      {buildings.map((building) => (
        <Marker
          key={building.id}
          position={[building.lat, building.lng]}
          icon={
            building.id === activeId
              ? pins[building.id].active
              : pins[building.id].normal
          }
          ref={(marker) => {
            markerRefs.current[building.id] = marker;
          }}
          eventHandlers={{ click: () => onSelect?.(building.id) }}
        >
          <Popup>
            <div className="bm-popup">
              <b>{building.name}</b>
              {building.address && <span>{building.address}</span>}
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${building.lat},${building.lng}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Chỉ đường
              </a>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
