import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { gamesHref } from '@/features/shared/routes';
import type { TemplateView } from '@/game-management';
import { useGameManagement, useTemplates } from '@/state';
import {
  Button,
  ChipTray,
  Dialog,
  Divider,
  IconButton,
  Screen,
  ScreenHeader,
  space,
  Stack,
  Text,
  TopBar,
  useToast,
} from '@/ui';

import { templateEditorHref } from './routes';
import { EmptyTemplates, templateTrayChips } from './TemplateSummary';

/** Chip set templates: the reusable chip sets, managed apart from any game. */
export default function TemplatesScreen() {
  const app = useGameManagement();
  const templates = useTemplates();
  const toast = useToast();
  const [deleting, setDeleting] = useState<TemplateView | null>(null);

  useEffect(() => {
    void app.location.set({ kind: 'templates' });
  }, [app]);

  const goToGames = () => {
    void app.location.set({ kind: 'games' });
    router.dismissTo(gamesHref);
  };

  const remove = async (template: TemplateView) => {
    setDeleting(null);
    const result = await app.templates.delete(template.id);
    if (result.status === 'accepted') toast.show(`Deleted “${template.name}”. Existing games keep their copies.`);
    else toast.show(result.reason.message, { tone: 'error' });
  };

  return (
    <>
      <Screen topBar={<TopBar backLabel="Games" backIcon="home" onBack={goToGames} />}>
        <ScreenHeader title="Chip set templates" />
        <Stack gap="md">
          <Button
            label="New template"
            icon="plus"
            variant="primary"
            fullWidth
            onPress={() => router.push(templateEditorHref('new'))}
          />
          <Text variant="supporting">Changes here affect future selections, not existing games.</Text>
        </Stack>
        {templates.length === 0 ? (
          <EmptyTemplates description="Save a chip set for future games." />
        ) : (
          <View>
            {templates.map((template) => (
              <View key={template.id} style={styles.entry}>
                <Stack direction="row" justify="space-between" wrap={false} gap="sm">
                  <View style={styles.name}>
                    <Text variant="sectionTitle">{template.name}</Text>
                  </View>
                  <Stack direction="row" gap="sm" wrap={false}>
                    <IconButton
                      icon="edit"
                      accessibilityLabel={`Edit ${template.name}`}
                      onPress={() => router.push(templateEditorHref(template.id))}
                    />
                    <IconButton
                      icon="trash"
                      accessibilityLabel={`Delete ${template.name}`}
                      onPress={() => setDeleting(template)}
                    />
                  </Stack>
                </Stack>
                <Text variant="supporting" tabular>
                  {template.summary.label}
                </Text>
                <ChipTray chips={templateTrayChips(template)} />
                <Divider spacing={space.sm} />
              </View>
            ))}
          </View>
        )}
      </Screen>

      <Dialog
        visible={deleting !== null}
        title="Delete template?"
        confirmLabel="Delete template"
        destructive
        onCancel={() => setDeleting(null)}
        onConfirm={() => deleting && void remove(deleting)}
      >
        {deleting ? (
          <Text variant="supporting">
            Permanently delete “{deleting.name}”? Every existing game keeps its chip set. Future games can no longer select
            this template.
          </Text>
        ) : null}
      </Dialog>
    </>
  );
}

const styles = StyleSheet.create({
  entry: { gap: space.md, paddingTop: space.lg },
  name: { flexShrink: 1 },
});
