import { NativeTabs } from 'expo-router/native-tabs';

import { colors } from '@/theme';

export default function TabLayout() {
  return (
    <NativeTabs tintColor={colors.black} backgroundColor={colors.white}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Icon sf="fork.knife" md="restaurant" />
        <NativeTabs.Trigger.Label>Compare</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="quantity">
        <NativeTabs.Trigger.Icon sf="number" md="calculate" />
        <NativeTabs.Trigger.Label>Group</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="sources">
        <NativeTabs.Trigger.Icon sf="doc.text.magnifyingglass" md="receipt_long" />
        <NativeTabs.Trigger.Label>Explore</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="methodology">
        <NativeTabs.Trigger.Icon sf="text.book.closed" md="menu_book" />
        <NativeTabs.Trigger.Label>Method</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
