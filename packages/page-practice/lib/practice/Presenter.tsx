import { type KeyId } from "@keybr/keyboard";
import { names } from "@keybr/lesson-ui";
import { Screen } from "@keybr/pages-shared";
import { enumProp, Preferences } from "@keybr/settings";
import { type LineList } from "@keybr/textinput";
import {
  type IInputEvent,
  type IKeyboardEvent,
  ModifierState,
} from "@keybr/textinput-events";
import { TextArea } from "@keybr/textinput-ui";
import { type Focusable, Zoomer } from "@keybr/widget";
import { createRef, PureComponent } from "react";
import { Controls } from "./Controls.tsx";
import { HUD } from "./HUD.tsx";
import { Indicators } from "./Indicators.tsx";
import { DeferredKeyboardPresenter } from "./KeyboardPresenter.tsx";
import { PracticeTour } from "./PracticeTour.tsx";
import * as styles from "./Presenter.module.less";
import { type LessonState } from "./state/index.ts";

type Props = {
  readonly state: LessonState;
  readonly lines: LineList;
  readonly depressedKeys: readonly KeyId[];
  readonly onResetLesson: () => void;
  readonly onSkipLesson: () => void;
  readonly onKeyDown: (ev: IKeyboardEvent) => void;
  readonly onKeyUp: (ev: IKeyboardEvent) => void;
  readonly onInput: (ev: IInputEvent) => void;
};

type State = {
  readonly view: View;
  readonly tour: boolean;
  readonly focus: boolean;
};

enum View {
  Normal = 1,
  Compact = 2,
  Bare = 3,
}

function getNextView(view: View): View {
  switch (view) {
    case View.Normal:
      return View.Compact;
    case View.Compact:
      return View.Bare;
    case View.Bare:
      return View.Normal;
  }
}

function viewClass(view: View): string {
  switch (view) {
    case View.Normal:
      return styles.viewNormal;
    case View.Compact:
      return styles.viewCompact;
    case View.Bare:
      return styles.viewBare;
  }
}

const propView = enumProp("prefs.practice.view", View, View.Normal);

export class Presenter extends PureComponent<Props, State> {
  readonly focusRef = createRef<Focusable>();

  override state: State = {
    view: Preferences.get(propView),
    tour: false,
    focus: false,
  };

  override componentDidMount() {
    if (this.props.state.settings.isNew) {
      this.setState({
        view: View.Normal,
        tour: true,
      });
    }
  }

  override render() {
    const {
      props: { state, lines, depressedKeys },
      state: { view, tour, focus },
      handleResetLesson,
      handleSkipLesson,
      handleKeyDown,
      handleKeyUp,
      handleInput,
      handleFocus,
      handleBlur,
      handleChangeView,
      handleHelp,
      handleTourClose,
    } = this;

    const textAreaSize =
      view === View.Bare ? "X2" : view === View.Compact ? "X1" : "X0";
    const textAreaClass =
      view === View.Bare
        ? styles.textInputBare
        : view === View.Compact
          ? styles.textInputCompact
          : styles.textInputNormal;

    const controls = (
      <Controls
        onChangeView={handleChangeView}
        onResetLesson={handleResetLesson}
        onSkipLesson={handleSkipLesson}
        onHelp={handleHelp}
      />
    );

    const textInput = (
      <Zoomer id={`TextArea/${View[view]}`}>
        <TextArea
          focusRef={this.focusRef}
          settings={state.textDisplaySettings}
          lines={lines}
          size={textAreaSize}
          demo={tour}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyUp}
          onInput={handleInput}
        />
      </Zoomer>
    );

    return (
      <Screen className={styles.screen}>
        <div className={`${styles.layout} ${viewClass(view)}`}>
          {view !== View.Bare && (
            <div className={styles.hudArea}>
              <HUD state={state} liveSpeed={state.currentSpeed} />
            </div>
          )}

          <div
            id={names.textInput}
            className={`${styles.textArea} ${textAreaClass}`}
          >
            {textInput}
          </div>

          {view === View.Normal && (
            <div id={names.keyboard} className={styles.keyboardArea}>
              <Zoomer id="Keyboard/Normal">
                <DeferredKeyboardPresenter
                  focus={tour || focus}
                  depressedKeys={depressedKeys}
                  toggledKeys={ModifierState.modifiers}
                  suffix={state.suffix}
                  lastLesson={state.lastLesson}
                />
              </Zoomer>
            </div>
          )}

          {view !== View.Bare && (
            <div className={styles.railArea}>
              <Indicators
                state={state}
                liveSpeed={state.currentSpeed}
                tensionRatio={state.tensionRatio}
                cadenceBaselineMs={state.cadenceBaselineMs}
                cadenceDeviation={state.cadenceDeviation}
              />
            </div>
          )}

          <div className={styles.dockArea}>{controls}</div>

          {view === View.Normal && tour && (
            <PracticeTour onClose={handleTourClose} />
          )}
        </div>
      </Screen>
    );
  }

  handleResetLesson = () => {
    this.props.onResetLesson();
    this.focusRef.current?.focus();
  };

  handleSkipLesson = () => {
    this.props.onSkipLesson();
    this.focusRef.current?.focus();
  };

  handleKeyDown = (ev: IKeyboardEvent) => {
    if (this.state.focus) {
      this.props.onKeyDown(ev);
    }
  };

  handleKeyUp = (ev: IKeyboardEvent) => {
    if (this.state.focus) {
      this.props.onKeyUp(ev);
    }
  };

  handleInput = (ev: IInputEvent) => {
    if (this.state.focus) {
      this.props.onInput(ev);
    }
  };

  handleFocus = () => {
    this.setState(
      {
        focus: true,
      },
      () => {
        this.props.onResetLesson();
      },
    );
  };

  handleBlur = () => {
    this.setState(
      {
        focus: false,
      },
      () => {
        this.props.onResetLesson();
      },
    );
  };

  handleChangeView = () => {
    this.setState(
      ({ view }) => {
        const nextView = getNextView(view);
        Preferences.set(propView, nextView);
        return { view: nextView };
      },
      () => {
        this.props.onResetLesson();
        this.focusRef.current?.focus();
      },
    );
  };

  handleHelp = () => {
    this.setState(
      {
        view: View.Normal,
        tour: true,
      },
      () => {
        this.props.onResetLesson();
        this.focusRef.current?.blur();
      },
    );
  };

  handleTourClose = () => {
    this.setState(
      {
        view: View.Normal,
        tour: false,
      },
      () => {
        this.props.onResetLesson();
        this.focusRef.current?.focus();
      },
    );
  };
}
