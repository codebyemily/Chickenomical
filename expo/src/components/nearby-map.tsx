import { Platform, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, UrlTile } from 'react-native-maps';

import { decorative } from '@/lib/a11y';
import { isValidLatLng, type LatLng } from '@/lib/distance';
import { mapViewportFor, safeMapRadiusMiles } from '@/lib/map-viewport';
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
  const viewport = mapViewportFor(origin, radiusMiles);
  const validUserLocation = isValidLatLng(userLocation) ? userLocation : null;
  const validPlaces = places.filter((place) => isValidLatLng(place));
  const hasSeparateUserLocation = viewport != null
    && validUserLocation != null
    && !samePoint(validUserLocation, viewport);
  const mapLabelRadius = safeMapRadiusMiles(radiusMiles);
  const label = nearbyMapLabel(
    mapLabelRadius,
    validPlaces.map((place) => place.label),
    Platform.OS === 'android' ? 'Map data from OpenStreetMap and CARTO.' : 'Map data from Apple Maps.',
    hasSeparateUserLocation,
    originLabel,
  );
  if (!viewport) {
    return (
      <View accessible accessibilityRole="image" accessibilityLabel="Map unavailable" style={styles.frame}>
        <View style={styles.unavailable}>
          <Text {...decorative} style={styles.unavailableText}>Map unavailable</Text>
        </View>
      </View>
    );
  }

  const mapKey = `${viewport.latitude.toFixed(3)}:${viewport.longitude.toFixed(3)}:${viewport.latitudeDelta.toFixed(3)}:${viewport.longitudeDelta.toFixed(3)}`;

  return (
    <View style={styles.frame}>
      <MapView
        key={mapKey}
        {...decorative}
        pointerEvents="none"
        style={styles.map}
        initialRegion={viewport}
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
        {hasSeparateUserLocation && validUserLocation ? <Marker coordinate={validUserLocation} pinColor={colors.blueStrong} tracksViewChanges={false} /> : null}
        {validPlaces.map((place) => (
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
