import { WEEKDAYS } from "@/lib/calendar";

/** Weekday checkboxes styled as chips (form field name "days"). */
export default function DayChips({ name = "days", selected }: { name?: string; selected: number[] }) {
  return (
    <div className="chips">
      {WEEKDAYS.map((d, i) => (
        <label key={d} className="chip chip-check">
          <input type="checkbox" name={name} value={i} defaultChecked={selected.includes(i)} />
          {d}
        </label>
      ))}
    </div>
  );
}
