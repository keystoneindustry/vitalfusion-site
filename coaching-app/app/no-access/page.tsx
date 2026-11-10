export const metadata = { title: "Vital Fusion" };

export default function NoAccessPage() {
  return (
    <main className="auth">
      <img className="auth-logo" src="/icons/logo.png" alt="Vital Fusion" />
      <h1 className="h1 center">Your coaching isn't set up yet</h1>
      <p className="lead center">
        We couldn't find a coaching account for this email. If you've just signed up, your coach may still be adding you.
        Reply to your welcome email or reach out to Tyler and he'll get you sorted.
      </p>
      <form action="/auth/logout" method="post">
        <button className="btn btn-ghost btn-wide" type="submit">
          Sign out
        </button>
      </form>
    </main>
  );
}
