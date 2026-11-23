import { StyleSheet, View } from 'react-native';

import { Button } from '../controls/Button';
import { Icon, type IconName } from '../Icon';
import { Text } from '../Text';
import { colors, space } from '../theme';

export interface EmptyStateProps {
  icon?: IconName;
  title: string;
  description?: string;
  action?: { label: string; onPress: () => void; icon?: IconName };
}

/** Centred empty list state with an optional way forward. */
export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <View style={styles.wrap}>
      {icon ? <Icon name={icon} size={44} color={colors.controlBorder} strokeWidth={1.6} /> : null}
      <Text variant="sectionTitle" align="center">
        {title}
      </Text>
      {description ? (
        <Text variant="body" tone="supporting" align="center">
          {description}
        </Text>
      ) : null}
      {action ? (
        <Button label={action.label} icon={action.icon} onPress={action.onPress} fullWidth style={styles.action} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: space.sm, paddingTop: space.xxxl, paddingBottom: space.xl },
  action: { marginTop: space.lg },
});
