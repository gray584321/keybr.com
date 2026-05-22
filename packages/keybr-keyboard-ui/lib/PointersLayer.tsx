import {
  type Keyboard,
  type KeyCombo,
  type KeyShape,
  useKeyboard,
} from "@keybr/keyboard";
import { Tasks } from "@keybr/lang";
import { type CodePoint } from "@keybr/unicode";
import { memo, type ReactNode, useEffect, useRef, useState } from "react";
import * as styles from "./PointersLayer.module.less";
import { getKeyCenter, Surface } from "./shapes.tsx";

export const PointersLayer = memo(function PointersLayer({
  suffix,
  delay = 1000,
}: {
  readonly suffix: readonly CodePoint[];
  readonly delay?: number;
}): ReactNode {
  const keyboard = useKeyboard();
  const svgRef = useRef<SVGSVGElement>(null);
  const [combo, setCombo] = useState<KeyCombo | null>(null);
  useEffect(() => {
    const tasks = new Tasks();
    setCombo(null);
    if (suffix.length > 0) {
      const combo = keyboard.getCombo(suffix[0]);
      if (combo != null) {
        tasks.delayed(delay, () => {
          setCombo(combo);
        });
      }
    }
    return () => {
      tasks.cancelAll();
    };
  }, [keyboard, suffix, delay]);
  useEffect(() => {
    const svg = svgRef.current;
    if (svg != null) {
      for (const animate of svg.querySelectorAll("animate")) {
        animate.beginElement();
      }
    }
  }, [combo]);
  return <Surface ref={svgRef}>{...pointers(keyboard, combo)}</Surface>;
});

function pointers(keyboard: Keyboard, combo: KeyCombo | null): ReactNode[] {
  const children = [];
  while (combo != null) {
    const shape = keyboard.getShape(combo.id);
    if (shape != null) {
      children.unshift(pointer(shape, styles.pointer));
      if (combo.modifier.shift) {
        const l = keyboard.getShape("ShiftLeft");
        const r = keyboard.getShape("ShiftRight");
        switch (shape.hand) {
          case "left":
            children.unshift(pointer(r, styles.modifierPointer));
            break;
          case "right":
            children.unshift(pointer(l, styles.modifierPointer));
            break;
          default:
            children.unshift(
              pointer(l, styles.modifierPointer),
              pointer(r, styles.modifierPointer),
            );
            break;
        }
      }
      if (combo.modifier.alt) {
        const l = keyboard.getShape("AltLeft");
        const r = keyboard.getShape("AltRight");
        switch (shape.hand) {
          case "left":
            children.unshift(pointer(r, styles.modifierPointer));
            break;
          case "right":
            children.unshift(pointer(l, styles.modifierPointer));
            break;
          default:
            children.unshift(
              pointer(l, styles.modifierPointer),
              pointer(r, styles.modifierPointer),
            );
            break;
        }
      }
    }
    combo = combo.prefix;
  }
  return children;
}

function pointer(shape: KeyShape | null, className: string): ReactNode {
  if (shape == null) {
    return null;
  }
  const { x, y } = getKeyCenter(shape);
  const pointerSize = 30;
  // keySplines matches the --easing-emphasized token (cubic-bezier(0.16, 1, 0.3, 1))
  // for a smoother, decelerating ring + a faint outward pulse overshoot.
  const splineEmphasized = "0.16 1 0.3 1";
  return (
    <circle className={className} cx={x} cy={y} r={pointerSize}>
      <animate
        attributeName="opacity"
        values="0;1;0.85"
        keyTimes="0;0.7;1"
        dur="0.55s"
        calcMode="spline"
        keySplines={`${splineEmphasized};${splineEmphasized}`}
        repeatCount="1"
        restart="always"
        fill="freeze"
      />
      <animate
        attributeName="r"
        values={`0;${pointerSize * 1.08};${pointerSize}`}
        keyTimes="0;0.7;1"
        dur="0.55s"
        calcMode="spline"
        keySplines={`${splineEmphasized};${splineEmphasized}`}
        repeatCount="1"
        restart="always"
        fill="freeze"
      />
    </circle>
  );
}
