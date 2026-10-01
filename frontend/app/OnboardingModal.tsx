"use client";
import { useState, useEffect } from "react";

export default function OnboardingModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [goal, setGoal] = useState("Studying");

  useEffect(() => {
    const done = localStorage.getItem("aik_onboarding_done");
    if (!done) {
      setIsOpen(true);
    }
  }, []);

  function finishOnboarding() {
    localStorage.setItem("aik_onboarding_done", "true");
    setIsOpen(false);
  }

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(6px)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "480px",
          background: "var(--bg-card)",
          border: "1px solid var(--glass-strong)",
          borderRadius: "var(--radius-sm)",
          padding: "2rem",
          boxShadow: "var(--shadow-lg)",
        }}
      >
        {step === 1 && (
          <div>
            <div style={{ fontSize: "1.8rem", marginBottom: "0.5rem" }}>👋</div>
            <h2 style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "0.5rem" }}>
              Welcome to Knowledge Workspace
            </h2>
            <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
              Upload your documents, notes, YouTube videos, or web links to understand and learn from your own knowledge.
            </p>

            <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "0.5rem" }}>
              What are you primarily working on?
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginBottom: "1.5rem" }}>
              {["Studying", "Research", "Work & Projects", "Coding"].map((g) => (
                <button
                  key={g}
                  onClick={() => setGoal(g)}
                  style={{
                    padding: "0.6rem",
                    borderRadius: "var(--radius-sm)",
                    border: `1px solid ${goal === g ? "var(--primary)" : "var(--glass-border)"}`,
                    background: goal === g ? "var(--primary-dim)" : "var(--bg-inset)",
                    color: goal === g ? "var(--primary)" : "var(--text-primary)",
                    fontWeight: 600,
                    fontSize: "0.85rem",
                    cursor: "pointer",
                  }}
                >
                  {g}
                </button>
              ))}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <button onClick={finishOnboarding} className="btn btn-ghost btn-sm">
                Skip
              </button>
              <button onClick={() => setStep(2)} className="btn btn-primary">
                Next →
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <div style={{ fontSize: "1.8rem", marginBottom: "0.5rem" }}>📂</div>
            <h2 style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "0.5rem" }}>
              Add Your First Source
            </h2>
            <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
              Upload a PDF, DOCX, PPTX, or paste a YouTube / Web link on the dashboard to get started.
            </p>

            <div className="neu-card-inset mb-6" style={{ textAlign: "center", padding: "1.5rem" }}>
              <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.2rem" }}>
                Ready to explore
              </div>
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                Your personal knowledge assistant is ready.
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <button onClick={() => setStep(1)} className="btn btn-ghost btn-sm">
                ← Back
              </button>
              <button onClick={finishOnboarding} className="btn btn-primary">
                Get Started ✨
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
