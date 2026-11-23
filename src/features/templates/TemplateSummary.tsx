import type { TemplateView } from '@/game-management';
import { Card, type ChipTrayItem, space, Text } from '@/ui';

/** A template's denominations for the compact chip tray. */
export function templateTrayChips(template: TemplateView): ChipTrayItem[] {
  return template.denominations.map((d, i) => ({ key: `${i}-${d.value}`, color: d.color, value: String(d.value) }));
}

/** "No templates yet" in the picker and the management list. */
export function EmptyTemplates({ description }: { description: string }) {
  return (
    <Card variant="inset" gap={space.xs}>
      <Text variant="bodyStrong">No templates yet</Text>
      <Text variant="supporting">{description}</Text>
    </Card>
  );
}
