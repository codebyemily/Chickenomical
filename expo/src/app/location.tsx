import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppFrame, NoticeBand, PageHeading, SectionHeading } from '@/components/app-frame';
import { FormField } from '@/components/form-field';
import { ActionButton } from '@/components/ui/action-button';
import { usePrototype } from '@/state/prototype-context';
import { colors, fonts, radii, spacing } from '@/theme';

const AREAS = [
  { id: 'market', label: 'Market Street · demo roost', detail: 'Four nearby sample coops' },
  { id: 'north-beach', label: 'North Beach · demo roost', detail: 'Distances recentered as the crow flies' },
  { id: 'nowhere', label: 'Empty nest', detail: 'Opens the flock-flew-the-coop state' },
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
        title="Where should this chicken cross the road?"
        description="Enter a place or pick a sample roost. Location access is simulated; we never actually GPS the flock."
      />

      <View style={styles.formPanel}>
        <FormField
          label="Address or nesting ground"
          value={address}
          onChangeText={setAddress}
          placeholder="Example: North Beach"
          submitLabel="search"
          onSubmitEditing={applyAddress}
          help="Submitting an address reuses the local Market Street fixture distances. No geocoding request is made. We don't actually make the chicken cross the road."
        />
        <View style={styles.formAction}>
          <ActionButton kind="primary" disabled={!address.trim()} onPress={applyAddress}>
            Roost here
          </ActionButton>
        </View>
      </View>

      <View style={styles.locationAction}>
        <ActionButton kind="primary" onPress={() => {
          setDemoArea('market', 'Near you · demo roost');
          router.replace('/' as never);
        }}>
          Use current roost (demo)
        </ActionButton>
        <Text style={styles.locationActionNote}>Simulates a successful roost with the Market Street fixture. No device permission prompt or GPS lookup runs. No fowl play.</Text>
      </View>

      <SectionHeading title="Sample roosts" trailing={`CURRENT · ${locationLabel}`} />
      <View style={styles.areaList}>
        {AREAS.map((item) => {
          const selected = area === item.id;
          return (
            <Pressable
              key={item.id}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              onPress={() => {
                setDemoArea(item.id, item.label);
                router.replace('/' as never);
              }}
              style={({ pressed }) => [styles.areaRow, selected && styles.areaSelected, pressed && styles.areaPressed]}>
              <View style={styles.areaText}>
                <Text style={styles.areaName}>{item.label}</Text>
                <Text style={styles.areaDetail}>{item.detail}</Text>
              </View>
              <View style={[styles.radio, selected && styles.radioSelected]}>
                {selected ? <View style={styles.radioDot} /> : null}
              </View>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.radiusSection}>
        <SectionHeading title="Coop radius" trailing="AS THE CROW FLIES" />
        <Text style={styles.radiusCopy}>Show sample roosts within {radiusMiles} miles, as the crow flies.</Text>
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

      <NoticeBand title="Location permission · don't chicken out" tone="neutral">
        No browser or device permission request will run here. Choose “Preview a chicken-out” to see the recovery screen a user would get if location access were declined.
      </NoticeBand>
      <View style={styles.permissionAction}>
        <ActionButton kind="secondary" onPress={() => router.push('/states/location-denied' as never)}>
          Preview a chicken-out
        </ActionButton>
      </View>
    </AppFrame>
  );
}

const styles = StyleSheet.create({
  formPanel: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.black, borderRadius: radii.lg, padding: spacing.md, gap: spacing.md },
  formAction: { alignSelf: 'flex-start', minWidth: 160 },
  locationAction: { alignSelf: 'flex-start', minWidth: 250, gap: spacing.xs },
  locationActionNote: { color: colors.muted, fontFamily: fonts.regular, fontSize: 11, lineHeight: 17 },
  areaList: { gap: spacing.sm },
  areaRow: { minHeight: 76, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md, backgroundColor: colors.white, padding: spacing.md, borderWidth: 1, borderColor: colors.rule, borderRadius: radii.md },
  areaSelected: { borderColor: colors.black, backgroundColor: colors.white },
  areaPressed: { opacity: 0.7 },
  areaText: { flex: 1, gap: 4 },
  areaName: { color: colors.black, fontFamily: fonts.bold, fontSize: 15, lineHeight: 22 },
  areaDetail: { color: colors.muted, fontFamily: fonts.regular, fontSize: 12, lineHeight: 18 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: colors.muted, alignItems: 'center', justifyContent: 'center' },
  radioSelected: { borderColor: colors.black },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.black },
  radiusSection: { gap: spacing.sm },
  radiusCopy: { color: colors.muted, fontFamily: fonts.regular, fontSize: 13, lineHeight: 20 },
  radiusButtons: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' },
  permissionAction: { alignSelf: 'flex-start', minWidth: 220 },
});
