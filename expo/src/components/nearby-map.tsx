import { useMemo } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, UrlTile, type Region } from 'react-native-maps';

import { decorative } from '@/lib/a11y';
import type { LatLng } from '@/lib/distance';
import { nearbyMapLabel } from '@/lib/nearby-map-label';
import { colors, curve, fonts, spacing } from '@/theme';

type MapPlace = LatLng & { id: string; label: string };

const CARTO_TILES = 'https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

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
  const region = useMemo(() => regionFor(origin, radiusMiles), [origin, radiusMiles]);
  const hasSeparateUserLocation = userLocation != null && !samePoint(userLocation, origin);
  const label = nearbyMapLabel(
    radiusMiles,
    places.map((place) => place.label),
    Platform.OS === 'android' ? 'Map data from OpenStreetMap and CARTO.' : 'Map data from Apple Maps.',
    hasSeparateUserLocation,
    originLabel,
  );
  const mapKey = `${origin.latitude.toFixed(3)}:${origin.longitude.toFixed(3)}:${radiusMiles}`;

  return (
    <View style={styles.frame}>
      <MapView
        key={mapKey}
        {...decorative}
        pointerEvents="none"
        style={styles.map}
        initialRegion={region}
        mapType={Platform.OS === 'android' ? 'none' : 'standard'}
        scrollEnabled={false}
        zoomEnabled={false}
        zoomTapEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
        scrollDuringRotateOrZoomEnabled={false}
        moveOnMarkerPress={false}
        toolbarEnabled={false}
        showsPointsOfInterests={false}
        showsCompass={false}
        showsMyLocationButton={false}
      >
        {Platform.OS === 'android' ? (
          <UrlTile urlTemplate={CARTO_TILES} maximumZ={19} tileSize={256} />
        ) : null}
        <Marker coordinate={origin} pinColor={colors.purple} tracksViewChanges={false} />
        {hasSeparateUserLocation ? <Marker coordinate={userLocation} pinColor={colors.blueStrong} tracksViewChanges={false} /> : null}
        {places.map((place) => (
          <Marker
            key={place.id}
            coordinate={{ latitude: place.latitude, longitude: place.longitude }}
            pinColor={colors.mapStore}
            tracksViewChanges={false}
          />
        ))}
      </MapView>
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={label}
        pointerEvents="none"
        style={styles.hit}
      />
      {Platform.OS === 'android' ? <Text {...decorative} style={styles.attribution}>© OpenStreetMap © CARTO</Text> : null}
    </View>
  );
}

function samePoint(a: LatLng, b: LatLng) {
  return Math.abs(a.latitude - b.latitude) < 0.00001 && Math.abs(a.longitude - b.longitude) < 0.00001;
}

function regionFor(origin: LatLng, radiusMiles: number): Region {
  const latitudeDelta = Math.max((radiusMiles * 2.6) / 69, 0.05);
  const longitudeDelta = latitudeDelta / Math.max(Math.cos((origin.latitude * Math.PI) / 180), 0.2);
  return {
    latitude: origin.latitude,
    longitude: origin.longitude,
    latitudeDelta,
    longitudeDelta,
  };
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
