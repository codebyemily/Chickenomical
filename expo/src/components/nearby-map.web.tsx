import { useEffect, useMemo, useRef, type ComponentRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Map as MapLibreMap, Marker, setWorkerUrl } from 'maplibre-gl';

import { decorative } from '@/lib/a11y';
import { isValidLatLng, type LatLng } from '@/lib/distance';
import { mapViewportFor, safeMapRadiusMiles } from '@/lib/map-viewport';
import { nearbyMapLabel } from '@/lib/nearby-map-label';
import { colors, curve, fonts, spacing } from '@/theme';

setWorkerUrl('/maplibre-gl-worker.mjs');

type MapPlace = LatLng & { id: string; label: string };

const CARTO_STYLE = 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json';

export function NearbyMap({
  origin,
  userLocation = null,
  places,
  radiusMiles,
  originLabel,
}: {
  origin: LatLng;
  userLocation?: LatLng | null;
  places: MapPlace[];
  radiusMiles: number;
  originLabel?: string;
}) {
  const host = useRef<ComponentRef<typeof View>>(null);
  const originLatitude = origin.latitude;
  const originLongitude = origin.longitude;
  const viewport = useMemo(
    () => mapViewportFor({ latitude: originLatitude, longitude: originLongitude }, radiusMiles),
    [originLatitude, originLongitude, radiusMiles],
  );
  const validUserLocation = isValidLatLng(userLocation) ? userLocation : null;
  const validPlaces = places.filter((place) => isValidLatLng(place));
  const placeKey = validPlaces.map((place) => `${place.id}:${place.latitude.toFixed(5)}:${place.longitude.toFixed(5)}`).join('|');
  const hasSeparateUserLocation = viewport != null
    && validUserLocation != null
    && !samePoint(validUserLocation, viewport);
  const label = nearbyMapLabel(
    safeMapRadiusMiles(radiusMiles),
    validPlaces.map((place) => place.label),
    'Map data from OpenStreetMap and CARTO.',
    hasSeparateUserLocation,
    originLabel,
  );
  const userKey = validUserLocation ? `${validUserLocation.latitude.toFixed(5)}:${validUserLocation.longitude.toFixed(5)}` : '';

  useEffect(() => {
    const node = host.current as unknown as HTMLElement | null;
    if (!node || !viewport) return undefined;
    const map = new MapLibreMap({
      container: node,
      style: CARTO_STYLE,
      center: [viewport.longitude, viewport.latitude],
      zoom: zoomFor(viewport.longitudeDelta),
      interactive: false,
      attributionControl: false,
    });
    const markers = [
      marker(origin, colors.purple, 16),
      ...(hasSeparateUserLocation && validUserLocation ? [marker(validUserLocation, colors.blueStrong, 14)] : []),
      ...validPlaces.map((place) => marker(place, colors.mapStore, 12)),
    ];
    let markersAdded = false;
    const addMarkers = () => {
      if (markersAdded) return;
      markersAdded = true;
      map.resize();
      markers.forEach((pin) => pin.addTo(map));
    };
    if (map.loaded()) {
      addMarkers();
    } else {
      map.once('load', addMarkers);
    }
    return () => {
      map.off('load', addMarkers);
      markers.forEach((pin) => pin.remove());
      map.remove();
    };
    // placeKey is the places snapshot. The array identity changes every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewport, placeKey, userKey, hasSeparateUserLocation]);

  return (
    <View style={styles.frame}>
      {viewport ? (
        <View {...decorative} ref={host} style={styles.map} />
      ) : (
        <View style={styles.unavailable}>
          <Text {...decorative} style={styles.unavailableText}>Map unavailable</Text>
        </View>
      )}
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={viewport ? label : 'Map unavailable'}
        pointerEvents="none"
        style={styles.hit}
      />
      {viewport ? <Text {...decorative} style={styles.attribution}>© OpenStreetMap © CARTO</Text> : null}
    </View>
  );
}

function samePoint(a: LatLng, b: LatLng) {
  return Math.abs(a.latitude - b.latitude) < 0.00001 && Math.abs(a.longitude - b.longitude) < 0.00001;
}

function marker(point: LatLng, color: string, size: number) {
  const element = document.createElement('div');
  element.setAttribute('aria-hidden', 'true');
  element.style.width = `${size}px`;
  element.style.height = `${size}px`;
  element.style.display = 'block';
  element.style.position = 'absolute';
  element.style.top = '0';
  element.style.left = '0';
  element.style.zIndex = '3';
  element.style.borderRadius = `${size / 2}px`;
  element.style.background = color;
  element.style.border = `2px solid ${colors.white}`;
  element.style.boxShadow = '0 1px 4px rgba(16, 16, 16, 0.35)';
  return new Marker({ element, anchor: 'center' }).setLngLat([point.longitude, point.latitude]);
}

function zoomFor(longitudeDelta: number) {
  return Math.min(15, Math.max(0, Math.log2(360 / longitudeDelta) - 1));
}

const styles = StyleSheet.create({
  frame: {
    width: '100%',
    height: 220,
    alignSelf: 'center',
    overflow: 'hidden',
    borderRadius: 18,
    borderCurve: curve,
    borderWidth: 1,
    borderColor: colors.warmRule,
    backgroundColor: colors.gray,
  },
  map: { ...StyleSheet.absoluteFill },
  hit: { ...StyleSheet.absoluteFill },
  unavailable: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  unavailableText: {
    color: colors.muted,
    fontFamily: fonts.medium,
    fontSize: 14,
  },
  attribution: {
    position: 'absolute',
    left: spacing.sm,
    bottom: spacing.sm,
    color: colors.black,
    fontFamily: fonts.medium,
    fontSize: 12,
    lineHeight: 16,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
});
