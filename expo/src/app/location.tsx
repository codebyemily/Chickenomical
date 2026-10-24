import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppFrame, NoticeBand, PageHeading, SectionHeading } from '@/components/app-frame';
import { FormField } from '@/components/form-field';
import { ActionButton } from '@/components/ui/action-button';
import { usePrototype } from '@/state/prototype-context';
import { colors, fonts, radii, spacing } from '@/theme';

const AREAS = [
  { id: 'market', label: 'Market Street · demo area', detail: 'Compare nearby sample locations' },
  { id: 'north-beach', label: 'North Beach · demo area', detail: 'Recenter the illustrative distances' },
  { id: 'nowhere', label: 'No-coverage sample area', detail: 'Preview a search without nearby offers' },
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
    router.dismissTo('/');
  }

  return (
    <AppFrame active="Compare">
      <PageHeading
        title="Choose your search origin."
        description="Enter a place or choose a sample area to compare nearby pickup offers."
      />

      <View style={styles.formPanel}>
        <FormField
          label="Address or area"
          value={address}
          onChangeText={setAddress}
          placeholder="Example: North Beach"
          submitLabel="search"
          onSubmitEditing={applyAddress}
          help="This prototype uses Market Street sample distances for typed addresses. Address lookup is not connected."
        />
        <View style={styles.formAction}>
          <ActionButton kind="primary" disabled={!address.trim()} onPress={applyAddress}>
            Use this area
          </ActionButton>
        </View>
      </View>

      <View style={styles.locationAction}>
        <ActionButton kind="primary" onPress={() => {
          setDemoArea('market', 'Near you · demo area');
          router.dismissTo('/');
        }}>
          Use current location (demo)
        </ActionButton>
        <Text style={styles.locationActionNote}>Uses the Market Street sample area. Device location access is simulated.</Text>
      </View>

      <SectionHeading title="Sample areas" trailing={`CURRENT · ${locationLabel}`} />
      <View style={styles.areaList}>
        {AREAS.map((item) => {
          const selected = area === item.id;
          return (
            <Pressable
              key={item.id}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              aria-checked={selected}
              onPress={() => {
                setDemoArea(item.id, item.label);
                router.dismissTo('/');
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
        <SectionHeading title="Search radius" trailing="STRAIGHT-LINE DISTANCE" />
        <Text style={styles.radiusCopy}>Show sample locations within {radiusMiles} miles of the search origin.</Text>
        <View style={styles.radiusButtons}>
          {RADII.map((radius) => (
            <ActionButton
              key={radius}
              selected={radiusMiles === radius}
              kind={radiusMiles === radius ? 'primary' : 'secondary'}
              onPress={() => setRadiusMiles(radius)}>
              {`${radius} mi`}
            </ActionButton>
          ))}
        </View>
      </View>

      <NoticeBand title="Location access" tone="neutral">
        A typed address remains available if device location access is declined. Preview that recovery path below.
      </NoticeBand>
      <View style={styles.permissionAction}>
        <ActionButton kind="secondary" onPress={() => router.push('/states/location-denied' as never)}>
          Preview denied access
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
