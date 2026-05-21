import { type BigramLesson, lessonProps } from "@keybr/lesson";
import { useSettings } from "@keybr/settings";
import {
  Description,
  Explainer,
  Field,
  FieldList,
  FieldSet,
  RadioBox,
  Range,
  TextField,
} from "@keybr/widget";
import { type ReactNode } from "react";
import { FormattedMessage, useIntl } from "react-intl";

export function BigramLessonSettings({
  lesson: _lesson,
}: {
  readonly lesson: BigramLesson;
}): ReactNode {
  const { formatMessage } = useIntl();
  const { settings, updateSettings } = useSettings();
  const targetMode = settings.get(lessonProps.bigram.targetBigramMode);
  const focusMode = settings.get(lessonProps.bigram.focusMode);
  const minBigrams = settings.get(lessonProps.bigram.minBigrams);
  const maxBigrams = settings.get(lessonProps.bigram.maxBigrams);
  const manualBigrams = settings.get(lessonProps.bigram.manualBigrams);

  return (
    <>
      <Explainer>
        <Description>
          <FormattedMessage
            id="lessonType.bigram.description"
            defaultMessage="Bias generated text toward two-letter transitions that slow you down. Research (Aalto CHI 2018) shows same-finger and cross-hand bigrams are the strongest predictors of typing speed."
          />
        </Description>
      </Explainer>
      <FieldSet
        legend={formatMessage({
          id: "t_bigram_target_legend",
          defaultMessage: "Target bigrams",
        })}
      >
        <FieldList>
          <Field>
            <RadioBox
              label={formatMessage({
                id: "t_bigram_slowest",
                defaultMessage: "Your slowest bigrams",
              })}
              checked={targetMode === "slowest"}
              name="bigram.targetBigramMode"
              value="slowest"
              onSelect={() => {
                updateSettings(
                  settings.set(lessonProps.bigram.targetBigramMode, "slowest"),
                );
              }}
            />
          </Field>
          <Field>
            <RadioBox
              label={formatMessage({
                id: "t_bigram_sfb",
                defaultMessage: "Same-finger bigrams",
              })}
              checked={targetMode === "same-finger"}
              name="bigram.targetBigramMode"
              value="same-finger"
              onSelect={() => {
                updateSettings(
                  settings.set(
                    lessonProps.bigram.targetBigramMode,
                    "same-finger",
                  ),
                );
              }}
            />
          </Field>
          <Field>
            <RadioBox
              label={formatMessage({
                id: "t_bigram_common",
                defaultMessage: "Common English bigrams",
              })}
              checked={targetMode === "common"}
              name="bigram.targetBigramMode"
              value="common"
              onSelect={() => {
                updateSettings(
                  settings.set(lessonProps.bigram.targetBigramMode, "common"),
                );
              }}
            />
          </Field>
          <Field>
            <RadioBox
              label={formatMessage({
                id: "t_bigram_manual",
                defaultMessage: "Manual list",
              })}
              checked={targetMode === "manual"}
              name="bigram.targetBigramMode"
              value="manual"
              onSelect={() => {
                updateSettings(
                  settings.set(lessonProps.bigram.targetBigramMode, "manual"),
                );
              }}
            />
          </Field>
        </FieldList>
        {targetMode === "manual" && (
          <FieldList>
            <Field>
              <TextField
                value={manualBigrams}
                placeholder="th, he, er, in, an"
                onChange={(value) => {
                  updateSettings(
                    settings.set(lessonProps.bigram.manualBigrams, value),
                  );
                }}
              />
            </Field>
          </FieldList>
        )}
      </FieldSet>
      <FieldSet
        legend={formatMessage({
          id: "t_bigram_focus_legend",
          defaultMessage: "Focus strategy",
        })}
      >
        <FieldList>
          <Field>
            <RadioBox
              label={formatMessage({
                id: "t_bigram_focus_any",
                defaultMessage: "At least one target per word",
              })}
              checked={focusMode === "any"}
              name="bigram.focusMode"
              value="any"
              onSelect={() => {
                updateSettings(
                  settings.set(lessonProps.bigram.focusMode, "any"),
                );
              }}
            />
          </Field>
          <Field>
            <RadioBox
              label={formatMessage({
                id: "t_bigram_focus_every",
                defaultMessage: "Every bigram is a target",
              })}
              checked={focusMode === "every"}
              name="bigram.focusMode"
              value="every"
              onSelect={() => {
                updateSettings(
                  settings.set(lessonProps.bigram.focusMode, "every"),
                );
              }}
            />
          </Field>
          <Field>
            <RadioBox
              label={formatMessage({
                id: "t_bigram_focus_exclude",
                defaultMessage: "Avoid target bigrams",
              })}
              checked={focusMode === "exclude"}
              name="bigram.focusMode"
              value="exclude"
              onSelect={() => {
                updateSettings(
                  settings.set(lessonProps.bigram.focusMode, "exclude"),
                );
              }}
            />
          </Field>
        </FieldList>
      </FieldSet>
      <FieldSet
        legend={formatMessage({
          id: "t_bigram_density_legend",
          defaultMessage: "Bigram density",
        })}
      >
        <FieldList>
          <Field>
            <FormattedMessage
              id="t_bigram_min"
              defaultMessage="Min per word: {value}"
              values={{ value: minBigrams }}
            />
          </Field>
          <Field>
            <Range
              value={minBigrams}
              min={0}
              max={10}
              step={1}
              onChange={(value) => {
                updateSettings(
                  settings.set(lessonProps.bigram.minBigrams, value),
                );
              }}
            />
          </Field>
        </FieldList>
        <FieldList>
          <Field>
            <FormattedMessage
              id="t_bigram_max"
              defaultMessage="Max per word: {value}"
              values={{ value: maxBigrams }}
            />
          </Field>
          <Field>
            <Range
              value={maxBigrams}
              min={0}
              max={20}
              step={1}
              onChange={(value) => {
                updateSettings(
                  settings.set(lessonProps.bigram.maxBigrams, value),
                );
              }}
            />
          </Field>
        </FieldList>
      </FieldSet>
    </>
  );
}
