import { auth, signIn } from "../../auth";
import { redirect } from "next/navigation";

export default async function LoginPage() {
  const session = await auth();
  if (session) redirect("/dashboard");

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "#080c16", fontFamily: "'Manrope', sans-serif"
    }}>
      <div style={{
        background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 20, padding: "48px 40px", textAlign: "center", maxWidth: 420, width: "100%"
      }}>
        <h1 style={{
          fontFamily: "'Unbounded', sans-serif", fontWeight: 800, fontSize: 24, marginBottom: 6,
          background: "linear-gradient(135deg, #ff6b35, #ffb347, #ff6b35)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text"
        }}>
          Производственный<br />Календарь Компьютролс
        </h1>
        <div style={{
          display: "inline-block", background: "linear-gradient(135deg, #ff6b35, #d44a10)",
          color: "#fff", fontFamily: "'Unbounded'", fontWeight: 800, fontSize: 14,
          padding: "3px 14px", borderRadius: 14, marginBottom: 24
        }}>2026</div>
        <p style={{ color: "#6b7280", fontSize: 14, marginBottom: 32, lineHeight: 1.6 }}>
          Калькулятор зарплаты с учётом переработок.<br />
          Войдите, чтобы сохранять свои данные.
        </p>
        <form action={async () => {
          "use server";
          await signIn("google", { redirectTo: "/dashboard" });
        }}>
          <button type="submit" style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
            width: "100%", padding: "14px 24px", background: "#fff", color: "#333",
            border: "none", borderRadius: 12, fontSize: 15, fontWeight: 700,
            fontFamily: "'Manrope', sans-serif", cursor: "pointer", transition: "transform 0.15s",
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Войти через Google
          </button>
        </form>
      </div>
    </div>
  );
}
