import { MAX_DATE_RANGE_DAYS } from "@/lib/constants";

export interface EventFieldsValue {
  title: string;
  startDate: string;
  endDate: string;
  dayStartTime: string;
  dayEndTime: string;
  allDay: boolean;
}

interface EventFieldsFormProps {
  value: EventFieldsValue;
  onChange: (value: EventFieldsValue) => void;
  minimumStartDate?: string;
}

const inputClassName =
  "rounded-md border border-zinc-300 bg-white px-3 py-2 text-base text-black outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white";
const labelClassName =
  "flex flex-1 flex-col gap-1.5 text-sm font-medium text-zinc-800 dark:text-zinc-200";

// Chrome/Edge/Firefox only open the native date/time picker when you click
// the small calendar icon, not the text itself. showPicker() lets a click
// anywhere on the field open it, which is what people actually expect.
function openPicker(e: React.MouseEvent<HTMLInputElement>) {
  e.currentTarget.showPicker?.();
}

export function EventFieldsForm({
  value,
  onChange,
  minimumStartDate,
}: EventFieldsFormProps) {
  return (
    <div className="flex flex-col gap-5">
      <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-800 dark:text-zinc-200">
        Title
        <input
          type="text"
          value={value.title}
          onChange={(e) => onChange({ ...value, title: e.target.value })}
          placeholder="Team offsite"
          className={inputClassName}
        />
      </label>

      <div className="flex gap-3">
        <label className={labelClassName}>
          Start date
          <input
            type="date"
            value={value.startDate}
            min={minimumStartDate}
            onChange={(e) => onChange({ ...value, startDate: e.target.value })}
            onClick={openPicker}
            className={inputClassName}
          />
        </label>
        <label className={labelClassName}>
          End date
          <input
            type="date"
            value={value.endDate}
            onChange={(e) => onChange({ ...value, endDate: e.target.value })}
            onClick={openPicker}
            className={inputClassName}
          />
        </label>
      </div>
      <p className="-mt-3 text-xs text-zinc-500 dark:text-zinc-500">
        Up to {MAX_DATE_RANGE_DAYS} days.
      </p>

      <label className="-mb-2 flex items-center gap-2 text-sm font-medium text-zinc-800 dark:text-zinc-200">
        <input
          type="checkbox"
          checked={value.allDay}
          onChange={(e) => onChange({ ...value, allDay: e.target.checked })}
          className="h-4 w-4"
        />
        All day (midnight to midnight)
      </label>

      {!value.allDay && (
        <div className="flex gap-3">
          <label className={labelClassName}>
            Available from
            <input
              type="time"
              value={value.dayStartTime}
              onChange={(e) => onChange({ ...value, dayStartTime: e.target.value })}
              onClick={openPicker}
              className={inputClassName}
            />
          </label>
          <label className={labelClassName}>
            Until
            <input
              type="time"
              value={value.dayEndTime}
              onChange={(e) => onChange({ ...value, dayEndTime: e.target.value })}
              onClick={openPicker}
              className={inputClassName}
            />
          </label>
        </div>
      )}
      <p className="-mt-3 text-xs text-zinc-500 dark:text-zinc-500">
        Applied to every day in the range. No timezone conversion — use
        whatever timezone you have in mind.
        {value.allDay &&
          " For an overnight span, respondents can mark late slots on one day and early slots on the next."}
      </p>
    </div>
  );
}
