import { Host, Picker } from '@expo/ui';

import { CATEGORY_OPTIONS, categoryLabel, type MenuCategory } from '@/data/menu-schema';

export function CategoryPicker({
  value,
  onChange,
  categories = CATEGORY_OPTIONS.map(({ id }) => id),
}: {
  value: MenuCategory;
  onChange: (category: MenuCategory) => void;
  categories?: string[];
}) {
  const options = categories.map((id) => ({ id, label: categoryLabel(id) }));
  return (
    <Host matchContents={{ vertical: true }} style={{ width: '100%' }}>
      <Picker selectedValue={value} onValueChange={(next: string) => onChange(next as MenuCategory)}>
        {options.map((option) => (
          <Picker.Item key={option.id} label={option.label} value={option.id} />
        ))}
      </Picker>
    </Host>
  );
}
