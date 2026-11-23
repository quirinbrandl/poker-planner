import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { gamesHref, planningStepHref } from '@/features/shared/routes';
import type { ReplaceChipSetConfirmation } from '@/game-management';
import { useGameManagement, usePlanningView, useTemplates } from '@/state';
import {
  Button,
  ChipTray,
  Dialog,
  FooterActions,
  RadioRow,
  Screen,
  ScreenHeader,
  space,
  Text,
  TopBar,
  useToast,
} from '@/ui';

import { templateEditorHref } from './routes';
import { EmptyTemplates, templateTrayChips } from './TemplateSummary';

/**
 * Choose template, from a game's Chip set step. The selection is staged until Use template;
 * replacing entered chip rows asks first. Afterwards the host is back on the same step.
 */
export default function TemplatePickerScreen() {
  const { gameId } = useLocalSearchParams<{ gameId: string }>();
  const app = useGameManagement();
  const plan = usePlanningView(gameId);
  const templates = useTemplates();
  const toast = useToast();
  const [selected, setSelected] = useState<string | null>(null);
  const [replace, setReplace] = useState<(ReplaceChipSetConfirmation & { templateId: string }) | null>(null);

  const missing = plan === null;
  useEffect(() => {
    if (missing) router.replace(gamesHref);
  }, [missing]);
  if (!plan) return <Screen />;

  const backToStep = () => {
    if (router.canGoBack()) router.back();
    else router.replace(planningStepHref(gameId, 'chipSet'));
  };

  const use = async (templateId: string, confirmed = false) => {
    const result = await app.planning.applyTemplate(gameId, templateId, { confirmed });
    if (result.status === 'needsConfirmation') {
      setReplace({ ...result.confirmation, templateId });
    } else if (result.status === 'accepted') {
      const name = templates.find((t) => t.id === templateId)?.name;
      if (name) toast.show(`Copied “${name}” into this game.`, { tone: 'confirmed' });
      backToStep();
    } else {
      toast.show(result.reason.message, { tone: 'error' });
    }
  };

  const chosen = templates.find((t) => t.id === selected) ?? null;

  return (
    <>
      <Screen
        topBar={<TopBar backLabel="Chip set" onBack={backToStep} />}
        footer={
          <FooterActions>
            <Button
              label="Use template"
              icon="check"
              variant="primary"
              fullWidth
              unavailable={!chosen}
              onUnavailablePress={() => toast.show('Choose a template first.')}
              onPress={() => chosen && void use(chosen.id)}
            />
          </FooterActions>
        }
      >
        <ScreenHeader title="Choose template" />
        <Button
          label="New template"
          icon="plus"
          fullWidth
          onPress={() => router.push(templateEditorHref('new', gameId))}
        />
        {templates.length === 0 ? (
          <EmptyTemplates />
        ) : (
          <View accessibilityRole="radiogroup" accessibilityLabel="Templates" style={styles.list}>
            {templates.map((template) => (
              <RadioRow
                key={template.id}
                label={template.name}
                description={template.summary.label}
                selected={template.id === selected}
                onPress={() => setSelected(template.id)}
              >
                <ChipTray chips={templateTrayChips(template)} />
              </RadioRow>
            ))}
          </View>
        )}
      </Screen>

      <Dialog
        visible={replace !== null}
        title="Replace this game’s chip set?"
        confirmLabel="Replace chip set"
        onCancel={() => setReplace(null)}
        onConfirm={() => {
          if (replace) void use(replace.templateId, true);
          setReplace(null);
        }}
      >
        {replace ? (
          <Text variant="supporting">
            Replace this game’s entered chip data with “{replace.templateName}”? Other settings, templates and game copies
            stay unchanged.
          </Text>
        ) : null}
      </Dialog>
    </>
  );
}

const styles = StyleSheet.create({
  list: { gap: space.md },
});
