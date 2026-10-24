import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppFrame, NoticeBand, PageHeading, SectionHeading } from '@/components/app-frame';
import { FormField } from '@/components/form-field';
import { ActionButton } from '@/components/ui/action-button';
import { usePrototype } from '@/state/prototype-context';
import { colors, fonts, spacing } from '@/theme';

const AREAS = [
  { id: 'market', label: 'Market Street · demo area', detail: 'Four nearby sample locations' },
  { id: 'north-beach', label: 'North Beach · demo area', detail: 'Distances recentered for this sample' },
  { id: 'nowhere', label: 'No demo coverage', detail: 'Opens the no-nearby-locations state' },
] as const;

const RADII = [1, 3, 5, 10];

export default function LocationScreen() {
  const router = useRouter();
  const { area, locationLabel, radiusMiles, setDemoArea, setRadiusMiles } = usePrototype();
  const [address, setAddress] = useState('');

  function applyAddress() {
    const trimmed = address.trim();
    if (!trimmed) return;
    setDemoArea('custom', `${trimmed} · demo search`);
    router.replace('/' as never);
  }

  return (
    <AppFrame active="Compare">
      <PageHeading
        title="Choose a search area."
        description="Enter a place or use one of the sample areas. Location access is simulated in this prototype."
      />

      <View style={styles.formPanel}>
        <FormField
          label="Address or neighborhood"
          value={address}
          onChangeText={setAddress}
          placeholder="Example: North Beach"
          submitLabel="search"
          onSubmitEditing={applyAddress}
          help="Submitting an address reuses the local Market Street fixture distances. No geocoding request is made."
        />
        <View style={styles.formAction}>
          <ActionButton kind="primary" disabled={!address.trim()} onPress={applyAddress}>
            Use this address
          </ActionButton>
        </View>
      </View>

      <View style={styles.locationAction}>
        <ActionButton kind="primary" onPress={() => {
          setDemoArea('market', 'Near you · demo location');
          router.replace('/' as never);
        }}>
          Use current location (demo)
        </ActionButton>
        <Text style={styles.locationActionNote}>Simulates a successful location choice with the Market Street fixture. No device permission prompt or GPS lookup runs.</Text>
      </View>

      <SectionHeading title="Sample areas" trailing={`CURRENT · ${locationLabel}`} />
      <View style={styles.areaList}>
        {AREAS.map((item) => {
          const selected = area === item.id;
          return (
            <View key={item.id} style={[styles.areaRow, selected && styles.areaSelected]}>
              <View style={styles.areaText}>
                <Text style={styles.areaName}>{item.label}</Text>
                <Text style={styles.areaDetail}>{item.detail}</Text>
              </View>
              <View style={styles.areaButton}>
                <ActionButton
                  kind={selected ? 'primary' : 'secondary'}
                  onPress={() => {
                    setDemoArea(item.id, item.label);
                    router.replace('/' as never);
                  }}>
                  {selected ? 'Selected' : 'Choose area'}
                </ActionButton>
              </View>
            </View>
          );
        })}
      </View>

      <View style={styles.radiusSection}>
        <SectionHeading title="Search radius" trailing="STRAIGHT-LINE DISTANCE" />
        <Text style={styles.radiusCopy}>Show sample restaurant locations within {radiusMiles} miles.</Text>
        <View style={styles.radiusButtons}>
          {RADII.map((radius) => (
            <ActionButton
              key={radius}
              kind={radiusMiles === radius ? 'primary' : 'secondary'}
              onPress={() => setRadiusMiles(radius)}>
              {`${radius} mi`}
            </ActionButton>
          ))}
        </View>
      </View>

      <NoticeBand title="Current-location permission" tone="neutral">
        No browser or device permission request will run here. Choose “Preview permission denied” to see the recovery screen a user would get if location access were declined.
      </NoticeBand>
      <View style={styles.permissionAction}>
        <ActionButton kind="secondary" onPress={() => router.push('/states/location-denied' as never)}>
          Preview permission denied
        </ActionButton>
      </View>
    </AppFrame>
  );
}

const styles = StyleSheet.create({
  formPanel: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.black, padding: spacing.md, gap: spacing.md },
  formAction: { alignSelf: 'flex-start', minWidth: 160 },
  locationAction: { alignSelf: 'flex-start', minWidth: 250, gap: spacing.xs },
  locationActionNote: { color: colors.muted, fontFamily: fonts.regular, fontSize: 11, lineHeight: 17 },
  areaList: { borderTopWidth: 1, borderTopColor: colors.black },
  areaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md, backgroundColor: colors.white, padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.rule },
  areaSelected: { borderBottomColor: colors.black },
  areaText: { flex: 1, gap: 4 },
  areaName: { color: colors.black, fontFamily: fonts.bold, fontSize: 15, lineHeight: 22 },
  areaDetail: { color: colors.muted, fontFamily: fonts.regular, fontSize: 12, lineHeight: 18 },
  areaButton: { minWidth: 132 },
  radiusSection: { gap: spacing.sm },
  radiusCopy: { color: colors.muted, fontFamily: fonts.regular, fontSize: 13, lineHeight: 20 },
  radiusButtons: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' },
  permissionAction: { alignSelf: 'flex-start', minWidth: 220 },
});
