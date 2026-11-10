"use client";

import { useFormStatus } from "react-dom";

/** A submit button that shows a "working…" label while its form is sending. */
export default function SubmitButton({
  label,
  pendingLabel,
  className = "btn btn-wide",
}: {
  label: string;
  pendingLabel?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button className={className} type="submit" disabled={pending}>
      {pending ? pendingLabel || "Working…" : label}
    </button>
  );
}
