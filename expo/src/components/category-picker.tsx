import { Host, Picker } from '@expo/ui';

import { CATEGORY_OPTIONS, type MenuCategory } from '@/data/menu-schema';

export function CategoryPicker({ value, onChange }: { value: MenuCategory; onChange: (category: MenuCategory) => void }) {
  return (
    <Host matchContents={{ vertical: true }} style={{ width: '100%' }}>
      <Picker selectedValue={value} onValueChange={(next: string) => onChange(next as MenuCategory)}>
        {CATEGORY_OPTIONS.map((option) => (
          <Picker.Item key={option.id} label={option.label} value={option.id} />
        ))}
      </Picker>
    </Host>
  );
}
