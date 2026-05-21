import {
  classifyBigramCost,
  type KeyShape,
  useKeyboard,
} from "@keybr/keyboard";
import { type CodePoint } from "@keybr/unicode";
import { clsx } from "clsx";
import { memo, type ReactNode } from "react";
import { getKeyCenter, Surface } from "./shapes.tsx";
import * as styles from "./TransitionsLayer.module.less";

export type TransitionsModifier = "h" | "m" | "f";

/**
 * Optional secondary coloring strategy applied on top of the modifier-based
 * arc color. When set to "sfb", same-finger bigrams render in the SFB
 * highlight style while non-SFB arcs render with the dimmed alternate style;
 * this surfaces problematic transitions on the keyboard heatmap regardless
 * of how frequent they are.
 */
export type TransitionsColorBy = "sfb";

export const TransitionsLayer = memo(function TransitionsLayer({
  histogram,
  modifier,
  colorBy,
}: {
  readonly histogram: Iterable<readonly [CodePoint, CodePoint, number]>;
  readonly modifier: TransitionsModifier;
  readonly colorBy?: TransitionsColorBy;
}): ReactNode {
  type Item = [shape0: KeyShape, shape1: KeyShape, f: number];
  const keyboard = useKeyboard();
  return (
    <Surface>
      <defs>
        <marker
          id={styles.arrow}
          markerWidth="5"
          markerHeight="6"
          refX="5"
          refY="3"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path
            className={styles.arrow}
            d="M 0 0 L 0 6 L 5 3 z"
            fill="context-stroke"
            stroke="none"
          />
        </marker>
      </defs>
      {items().map(draw)}
    </Surface>
  );

  function items() {
    const list: Item[] = [];
    for (const [codePoint0, codePoint1, f] of [...histogram]
      .sort((a, b) => b[2] - a[2])
      .slice(0, 100)) {
      if (f > 0) {
        const shape0 = getShape(codePoint0);
        const shape1 = getShape(codePoint1);
        if (shape0 != null && shape1 != null) {
          list.push([shape0, shape1, f]);
        }
      }
    }
    return normalize(list);
  }

  function normalize(list: Item[]) {
    const v = list.map((v) => v[2]);
    const a = Math.min(...v);
    const b = Math.max(...v);
    return list
      .map(([shape0, shape1, f]) => {
        return [shape0, shape1, b > a ? (f - a) / (b - a) : 0.5] as Item;
      })
      .sort((a, b) => a[2] - b[2]);
  }

  function getShape(codePoint: CodePoint): KeyShape | null {
    if (codePoint !== 0x0020) {
      const combo = keyboard.getCombo(codePoint);
      if (combo != null) {
        const shape = keyboard.getShape(combo.id);
        if (shape != null) {
          return shape;
        }
      }
    }
    return null;
  }

  function draw([shape0, shape1, f]: Item, index: number): ReactNode {
    if (shape0 === shape1) {
      return null;
    }
    const { x: x0, y: y0 } = getKeyCenter(shape0);
    const { x: x1, y: y1 } = getKeyCenter(shape1);
    const dx = x1 - x0;
    const dy = y1 - y0;
    const theta = Math.atan2(dy, dx);
    const l = Math.sqrt(dx * dx + dy * dy);
    const ox = (y1 - y0) / l;
    const oy = -(x1 - x0) / l;
    const mx = x0 + (x1 - x0) / 2 + (ox * l) / 4;
    const my = y0 + (y1 - y0) / 2 + (oy * l) / 4;
    const t = 3;
    const X1 = x0 + Math.cos(theta) * t;
    const Y1 = y0 + Math.sin(theta) * t;
    const X2 = x1 - Math.cos(theta) * t;
    const Y2 = y1 - Math.sin(theta) * t;
    return (
      <path
        key={index}
        className={clsx(styles.arc, classNameFor(shape0, shape1))}
        d={`M ${X1} ${Y1} Q ${mx} ${my} ${X2} ${Y2}`}
        opacity={f * 0.9 + 0.1}
        markerEnd={`url(#${styles.arrow})`}
      />
    );
  }

  function classNameFor(shape0: KeyShape, shape1: KeyShape) {
    if (colorBy === "sfb") {
      const cost = classifyBigramCost(shape0, shape1);
      return cost.class === "sfb" ? styles.sfb : styles.fAlt;
    }
    return modifierStyle(modifier);
  }
});

function modifierStyle(m: TransitionsModifier) {
  switch (m) {
    case "h":
      return styles.h;
    case "m":
      return styles.m;
    case "f":
      return styles.f;
    default:
      return null;
  }
}
