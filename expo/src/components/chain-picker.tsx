import { Host, Picker } from '@expo/ui';

import type { Chain } from '@/data/menu-schema';

const ALL_CHAINS = '__all_chains__';

export function ChainPicker({
  chains,
  value,
  onChange,
}: {
  chains: Chain[];
  value: string | null;
  onChange: (chainId: string | null) => void;
}) {
  return (
    <Host matchContents={{ vertical: true }} style={{ width: '100%' }}>
      <Picker
        selectedValue={value ?? ALL_CHAINS}
        onValueChange={(next: string) => onChange(next === ALL_CHAINS ? null : next)}>
        <Picker.Item label="All chains" value={ALL_CHAINS} />
        {chains.map((chain) => <Picker.Item key={chain.id} label={chain.name} value={chain.id} />)}
      </Picker>
    </Host>
  );
}
