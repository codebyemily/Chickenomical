import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { DEMO_LOCATIONS, type Category, type DemoLocation, type DemoOffer } from '@/data/demo';

const MODES = [
  { value: 'demo', label: 'Demo data' },
  { value: 'worst', label: 'Worst case' },
  { value: 'empty', label: 'Empty' },
  { value: 'one', label: 'One' },
  { value: '1000', label: '1,000 rows' },
] as const;

type Mode = typeof MODES[number]['value'];
type Fixture = { locations: DemoLocation[]; detailIds: Map<string, string> };
const fixtures = new Map<Mode, Fixture>();
const ORIGINAL_OFFERS = DEMO_LOCATIONS.flatMap((location) => location.offers);

function originalFor(category: Category) {
  return ORIGINAL_OFFERS.find((offer) => offer.category === category && offer.freshness === 'sample-recent')!;
}

function buildFixture(mode: Mode): Fixture {
  const detailIds = new Map<string, string>();
  const copyOffer = (original: DemoOffer, changes: Partial<DemoOffer>): DemoOffer => {
    const offer = { ...original, ...changes };
    detailIds.set(offer.id, original.id);
    return offer;
  };

  if (mode === 'empty') return { locations: [], detailIds };

  if (mode === 'one') {
    const locationId = 'stress-one-store';
    return {
      locations: [{
        ...DEMO_LOCATIONS[0], id: locationId, chain: 'J', displayName: 'J', address: '1 A St - fictional sample',
        distanceMiles: { market: 0.1, 'north-beach': 0.1 },
        offers: (['nuggets', 'tenders'] as const).map((category) => copyOffer(originalFor(category), {
          id: 'stress-one-' + category, locationId, itemName: '1 pc Chicken ' + (category === 'nuggets' ? 'Nugget' : 'Tender'),
          pieceCount: 1, priceCents: 99, mockChecked: 'sample check - just now',
        })),
      }],
      detailIds,
    };
  }

  if (mode === '1000') {
    return {
      locations: Array.from({ length: 100 }, (_, storeIndex) => {
        const locationId = 'stress-volume-store-' + String(storeIndex + 1).padStart(3, '0');
        return {
          ...DEMO_LOCATIONS[storeIndex % DEMO_LOCATIONS.length],
          id: locationId,
          chain: 'Sample Chicken ' + (storeIndex % 10 + 1),
          displayName: 'Fictional pickup store ' + (storeIndex + 1),
          address: (100 + storeIndex) + ' Sample Street - fictional sample',
          distanceMiles: { market: 0.1 + (storeIndex % 49) / 10, 'north-beach': 0.1 + (storeIndex % 49) / 10 },
          offers: (['nuggets', 'tenders'] as const).flatMap((category) => Array.from({ length: 10 }, (_, offerIndex) => copyOffer(originalFor(category), {
            id: locationId + '-' + category + '-' + offerIndex,
            locationId,
            sourceRecordId: 'STRESS-' + storeIndex + '-' + category + '-' + offerIndex,
            itemName: (offerIndex + 1) * 2 + ' pc Chicken ' + (category === 'nuggets' ? 'Nuggets' : 'Tenders'),
            pieceCount: (offerIndex + 1) * 2,
            priceCents: 299 + offerIndex * 125 + (storeIndex % 7) * 10,
            freshness: offerIndex % 4 === 0 ? 'sample-stale' : 'sample-recent',
          }))),
        };
      }),
      detailIds,
    };
  }

  const chainNames = [
    'Southern California Korean Fried Chicken & Family Catering',
    'J',
    'Café Gà Rán Đông Nam Á',
    'Hähnchennuggetsspezialitäten',
    '王記香酥炸雞專門店',
  ];
  const itemNames = [
    '10 pc Buttermilk Chicken Nuggets with Garlic, Herbs & Cracked Black Pepper',
    '1,284 pc Chicken Nuggets - advance-order catering tray',
    '6 pc Crispy Chicken Nuggets — Salt & Pepper',
    '10 pc Hähnchennuggetsspezialitäten',
    '4 pc Gà rán giòn — tỏi, tiêu & nước mắm',
    'Crispy Chicken Tenders - count not supplied',
    '3 pc 香酥炸雞柳 — 原味',
    '5 pc Classic Tenders\nGarlic & herb pickup special',
    '8 pc Nuggets - unavailable',
    '8 pc Chicken Nuggets <b>classic</b> &amp; garlic',
    '12 pc Chicken Nuggets — same name',
    '3 pc Chicken Tenders — same name',
    'Chicken Nuggets - price not supplied',
  ];
  let offerIndex = 0;
  const locations = DEMO_LOCATIONS.map((location, storeIndex) => {
    const locationId = 'stress-worst-' + location.id;
    return {
      ...location,
      id: locationId,
      chain: chainNames[storeIndex],
      displayName: storeIndex === 1 ? 'J' : storeIndex === 2 ? 'Đặng Thị Ngọc Hân - chợ khu phố' : 'San Francisco International Market & Community Pickup Annex - fictional sample',
      address: storeIndex === 2 ? '王府井大街壹佰貳拾捌號國際廣場地下一層 - fictional address' : '1284 Martin Luther King Junior Memorial Boulevard, Suite 128 - fictional address',
      distanceMiles: { market: 0.1 + storeIndex * 0.8, 'north-beach': 0.1 + storeIndex * 0.8 },
      offers: location.offers.map((offer) => {
        const index = offerIndex++;
        return copyOffer(offer, {
          id: 'stress-worst-' + offer.id,
          locationId,
          itemName: itemNames[index],
          sourceRecordId: index === 0 ? 'SYNTHETIC-MENU-IMPORT-20261024-SANFRANCISCO-PICKUP-9f8e7d6c-5b4a-4c3d-8e2f-1a0b9c8d7e6f' : 'STRESS-' + String(index + 1).padStart(3, '0'),
          mockChecked: index === 0 ? 'sample check - just now' : index === 2 ? 'sample check - 3 years ago' : index === 3 ? 'sample check - in 3 days' : offer.mockChecked,
          ...(index === 1 ? { pieceCount: 1284, priceCents: 69999 } : {}),
          ...(index === 4 ? { pieceCount: 1, priceCents: 149 } : {}),
        });
      }),
    };
  });
  // The type permits nullable counts and prices. Cover both exclusions for each category.
  for (const category of ['nuggets', 'tenders'] as const) {
    locations[4].offers.push(copyOffer(originalFor(category), {
      id: 'stress-missing-' + category, locationId: locations[4].id, category,
      itemName: 'Chicken ' + category + ' - count not supplied', pieceCount: null, priceCents: 549, freshness: 'incomplete',
    }));
    locations[4].offers.push(copyOffer(originalFor(category), {
      id: 'stress-unavailable-' + category, locationId: locations[4].id, category,
      itemName: 'Chicken ' + category + ' - unavailable', pieceCount: 8, priceCents: null, freshness: 'unavailable',
    }));
  }
  return { locations, detailIds };
}

export function useCompareStress() {
  const params = useLocalSearchParams<{ stress?: string; stressData?: string }>();
  const router = useRouter();
  const enabled = __DEV__ && params.stress === '1';
  const mode: Mode = MODES.some((option) => option.value === params.stressData) ? params.stressData as Mode : 'demo';
  let fixture: Fixture | undefined;
  if (enabled && mode !== 'demo') {
    fixture = fixtures.get(mode);
    if (!fixture) {
      fixture = buildFixture(mode);
      fixtures.set(mode, fixture);
    }
  }
  const detailId = (offerId: string) => fixture?.detailIds.get(offerId) ?? offerId;
  return {
    enabled, mode, locations: fixture?.locations,
    detailId,
    // Stress records exercise the real row renderer; detail routes remain valid demo records.
    rowOffer: (offer: DemoOffer) => fixture ? { ...offer, id: detailId(offer.id) } : offer,
    setMode: (nextMode: Mode) => router.setParams({ stress: '1', stressData: nextMode }),
  };
}

export function CompareStressControls({ mode, onChange }: { mode: Mode; onChange: (mode: Mode) => void }) {
  return (
    <View style={styles.toolbar} testID="compare-stress-toolbar">
      <Text style={styles.note}>DEV - Compare layout fixtures. Detail links show original demo offers.</Text>
      <ScrollView horizontal contentContainerStyle={styles.segments} showsHorizontalScrollIndicator>
        {MODES.map((option) => (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected: mode === option.value }}
            onPress={() => onChange(option.value)}
            style={[styles.segment, mode === option.value && styles.selected]}>
            <Text style={styles.label}>{option.label}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  toolbar: { position: 'absolute', bottom: 8, left: 8, right: 8, alignSelf: 'center', maxWidth: 660, padding: 6, gap: 4, backgroundColor: '#ddd', borderWidth: 1, borderColor: '#777', borderRadius: 8, zIndex: 100 },
  note: { color: '#222', fontSize: 11, lineHeight: 16 },
  segments: { gap: 4 },
  segment: { paddingHorizontal: 12, minHeight: 36, justifyContent: 'center', borderRadius: 6 },
  selected: { backgroundColor: '#fff' },
  label: { color: '#111', fontSize: 12, lineHeight: 18 },
});
