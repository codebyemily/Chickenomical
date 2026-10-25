import { useEffect, useRef, type ComponentRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Map as MapLibreMap, Marker, setWorkerUrl } from 'maplibre-gl';

import { decorative } from '@/lib/a11y';
import type { LatLng } from '@/lib/distance';
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
  const placeKey = places.map((place) => `${place.id}:${place.latitude.toFixed(5)}:${place.longitude.toFixed(5)}`).join('|');
  const hasSeparateUserLocation = userLocation != null && !samePoint(userLocation, origin);
  const label = nearbyMapLabel(radiusMiles, places.map((place) => place.label), 'Map data from OpenStreetMap and CARTO.', hasSeparateUserLocation, originLabel);
  const userKey = userLocation ? `${userLocation.latitude.toFixed(5)}:${userLocation.longitude.toFixed(5)}` : '';

  useEffect(() => {
    const node = host.current as unknown as HTMLElement | null;
    if (!node) return undefined;
    const map = new MapLibreMap({
      container: node,
      style: CARTO_STYLE,
      center: [origin.longitude, origin.latitude],
      zoom: zoomFor(origin.latitude, radiusMiles),
      interactive: false,
      attributionControl: false,
    });
    const markers = [
      marker(origin, colors.purple, 16),
      ...(hasSeparateUserLocation ? [marker(userLocation, colors.blueStrong, 14)] : []),
      ...places.map((place) => marker(place, colors.mapStore, 12)),
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
  }, [origin.latitude, origin.longitude, radiusMiles, placeKey, userKey, hasSeparateUserLocation]);

  return (
    <View style={styles.frame}>
      <View {...decorative} ref={host} style={styles.map} />
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={label}
        pointerEvents="none"
        style={styles.hit}
      />
      <Text {...decorative} style={styles.attribution}>© OpenStreetMap © CARTO</Text>
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

function zoomFor(latitude: number, radiusMiles: number) {
  const latitudeDelta = Math.max((radiusMiles * 2.6) / 69, 0.05);
  const longitudeDelta = latitudeDelta / Math.max(Math.cos((latitude * Math.PI) / 180), 0.2);
  return Math.min(15, Math.max(9, Math.log2(360 / longitudeDelta) - 1));
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
