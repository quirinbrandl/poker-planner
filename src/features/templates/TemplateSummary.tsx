import type { TemplateView } from '@/game-management';
import { type ChipTrayItem, EmptyState } from '@/ui';

/** A template's denominations for the compact chip tray. */
export function templateTrayChips(template: TemplateView): ChipTrayItem[] {
  return template.denominations.map((d, i) => ({ key: `${i}-${d.value}`, color: d.color, value: String(d.value) }));
}

/** "No templates yet" in the picker and the management list. */
export function EmptyTemplates() {
  return <EmptyState icon="templates" title="No templates yet" />;
}
