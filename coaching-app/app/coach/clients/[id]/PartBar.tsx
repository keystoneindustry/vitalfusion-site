import { partStateLabel, type PartState, type PlanPart } from "@/lib/plan";
import SubmitButton from "@/app/components/SubmitButton";
import AutoRefresh from "@/app/components/AutoRefresh";
import { publishPartAction, revertPartAction } from "./plan-actions";

const MESSAGES: Record<string, string> = {
  saved: "Saved ✓",
  notes: "Call notes saved ✓",
  targets: "Targets updated ✓ The meals don't resize by themselves: ask the AI to resize them, or edit them below.",
  published: "Published ✓ They've been emailed, and it's in their app now.",
  updated: "Changes published ✓ Their app shows the new version.",
  reverted: "Unpublished changes thrown away. This is what they see.",
};

/** Status + publish bar at the top of the Meals and Training pages. */
export default function PartBar({
  clientId,
  part,
  state,
  drafting,
  stale,
  error,
  msg,
  urlError,
  name,
}: {
  clientId: string;
  part: PlanPart;
  state: PartState;
  drafting: boolean;
  stale: boolean;
  error: string | null;
  msg?: string;
  urlError?: string;
  name: string;
}) {
  const what = part === "nutrition" ? "meal plan" : "training program";
  const canPublish = !drafting && (state === "draft" || state === "changed");
  return (
    <>
      <div className={`part-bar state-${state}`}>
        <div>
          <b>{drafting ? "✨ AI drafting…" : partStateLabel(state)}</b>
          <span className="muted small">
            {state === "empty" && !drafting && ` Draft it with AI or build it below.`}
            {state === "draft" && ` ${name} can't see this ${what} yet.`}
            {state === "live" && ` ${name} sees exactly this.`}
            {state === "changed" && ` ${name} still sees the last published version.`}
          </span>
        </div>
        {canPublish && (
          <form action={publishPartAction.bind(null, clientId, part)}>
            <SubmitButton className="btn btn-sm" label={state === "changed" ? "Publish changes" : `Publish to ${name}`} pendingLabel="Publishing…" />
          </form>
        )}
      </div>
      {state === "changed" && !drafting && (
        <form action={revertPartAction.bind(null, clientId, part)} className="right" style={{ margin: "-6px 0 12px" }}>
          <SubmitButton className="btn-link small" label="Undo unpublished changes" pendingLabel="Undoing…" />
        </form>
      )}
      {msg && MESSAGES[msg] && <div className="notice notice-good">{MESSAGES[msg]}</div>}
      {urlError && <div className="notice notice-error">{urlError}</div>}
      {drafting && (
        <div className="notice notice-warn">
          <AutoRefresh />⏳ The AI is working on the {what}. It usually takes 1–3 minutes; this page updates by itself.
        </div>
      )}
      {!drafting && error && <div className="notice notice-error">The last AI run didn't finish: {error}</div>}
      {stale && <div className="notice notice-error">The AI run stopped without finishing. Try again.</div>}
    </>
  );
}
