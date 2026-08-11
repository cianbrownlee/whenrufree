"use client";

import { Dispatch, Fragment, SetStateAction } from "react";
import { formatDayLabel, formatTimeLabel } from "@/lib/grid";

interface BaseProps {
  slotsByDay: Date[][];
}

interface EditGridProps extends BaseProps {
  mode: "edit";
  selected: Set<string>;
  onSelectedChange: Dispatch<SetStateAction<Set<string>>>;
}

interface AggregateGridProps extends BaseProps {
  mode: "aggregate";
  aggregate: Map<string, { count: number; names: string[] }>;
  maxCount: number;
}

type Props = EditGridProps | AggregateGridProps;

function cellAtPoint(clientX: number, clientY: number): string | null {
  const el = document.elementFromPoint(clientX, clientY);
  const cell = el instanceof Element ? el.closest<HTMLElement>("[data-iso]") : null;
  return cell?.dataset.iso ?? null;
}

export function AvailabilityGrid(props: Props) {
  const { slotsByDay } = props;
  const timeLabels = slotsByDay[0] ?? [];

  function handlePointerDown(iso: string) {
    if (props.mode !== "edit") return;
    const { onSelectedChange } = props;

    // paintValue is decided by the first cell's current (freshest) state,
    // then applied consistently to every cell touched during this drag.
    let paintValue: boolean | null = null;

    function applyPaint(targetIso: string) {
      onSelectedChange((prev) => {
        if (paintValue === null) paintValue = !prev.has(targetIso);
        const next = new Set(prev);
        if (paintValue) next.add(targetIso);
        else next.delete(targetIso);
        return next;
      });
    }
    applyPaint(iso);

    function handlePointerMove(e: PointerEvent) {
      const hitIso = cellAtPoint(e.clientX, e.clientY);
      if (hitIso) applyPaint(hitIso);
    }
    function handlePointerUp() {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    }
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  }

  function handleDayHeaderClick(day: Date[]) {
    if (props.mode !== "edit") return;
    const isos = day.map((slot) => slot.toISOString());
    props.onSelectedChange((prev) => {
      const allSelected = isos.every((iso) => prev.has(iso));
      const next = new Set(prev);
      for (const iso of isos) {
        if (allSelected) next.delete(iso);
        else next.add(iso);
      }
      return next;
    });
  }

  if (slotsByDay.length === 0 || timeLabels.length === 0) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-500">
        No time slots to show.
      </p>
    );
  }

  return (
    <div
      className="grid touch-none select-none overflow-x-auto text-xs"
      style={{
        gridTemplateColumns: `4.5rem repeat(${slotsByDay.length}, minmax(2.75rem, 1fr))`,
      }}
    >
      <div />
      {slotsByDay.map((day) =>
        props.mode === "edit" ? (
          <button
            key={day[0].toISOString()}
            type="button"
            onClick={() => handleDayHeaderClick(day)}
            title="Select the whole day"
            className="cursor-pointer bg-transparent px-1 pb-1 text-center font-medium text-zinc-700 hover:text-emerald-600 dark:text-zinc-300 dark:hover:text-emerald-400"
          >
            {formatDayLabel(day[0])}
          </button>
        ) : (
          <div
            key={day[0].toISOString()}
            className="px-1 pb-1 text-center font-medium text-zinc-700 dark:text-zinc-300"
          >
            {formatDayLabel(day[0])}
          </div>
        ),
      )}

      {timeLabels.map((_, rowIndex) => (
        <Fragment key={`row-${rowIndex}`}>
          <div className="pr-2 text-right text-zinc-500 dark:text-zinc-500">
            {formatTimeLabel(timeLabels[rowIndex])}
          </div>
          {slotsByDay.map((day) => {
            const slot = day[rowIndex];
            const iso = slot.toISOString();

            if (props.mode === "edit") {
              const isSelected = props.selected.has(iso);
              return (
                <div
                  key={iso}
                  data-iso={iso}
                  onPointerDown={() => handlePointerDown(iso)}
                  className={`h-6 cursor-pointer border border-zinc-200 dark:border-zinc-800 ${
                    isSelected
                      ? "bg-emerald-500 dark:bg-emerald-600"
                      : "bg-white dark:bg-zinc-900"
                  }`}
                />
              );
            }

            const entry = props.aggregate.get(iso);
            const count = entry?.count ?? 0;
            const opacity = props.maxCount > 0 ? count / props.maxCount : 0;
            const title =
              count === 0
                ? "No one available yet"
                : `${count} available: ${entry!.names.join(", ")}`;
            return (
              <div
                key={iso}
                title={title}
                className="h-6 border border-zinc-200 dark:border-zinc-800"
                style={{
                  backgroundColor:
                    opacity > 0 ? `rgba(16, 185, 129, ${0.15 + opacity * 0.85})` : undefined,
                }}
              />
            );
          })}
        </Fragment>
      ))}
    </div>
  );
}
