import React, { useEffect, useState } from "react";

export default function Footer() {
  // Persist the heart state so it feels "alive" and personal.
  const [heartOn, setHeartOn] = useState<boolean>(() => {
    try {
      return localStorage.getItem("todo_heart_on") === "1";
    } catch {
      return true;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("todo_heart_on", heartOn ? "1" : "0");
    } catch {
      // Ignore storage errors (private mode, blocked storage, etc.)
    }
  }, [heartOn]);

  return (
    <footer className="footer">
      {/* English comment: Keep footer background full-width, but content readable with an inner container. */}
      <div className="footerContainer">
        <div className="footerAd">
          <span className="footerAdText">
            Want your own app? <strong>We build custom systems for small shops.</strong>
          </span>

          <span className="footerLinks">
            <a
              className="link"
              href="https://quantixtech.it.com"
              target="_blank"
              rel="noreferrer"
            >
              Learn more
            </a>
            <span className="footerSep">|</span>
            <a className="link" href="mailto:quantrixtradingtechnology@gmail.com">
              Message us
            </a>
          </span>
        </div>

        <div className="footerText">
          <span>Built with</span>

          <button
            className={`heartInline ${heartOn ? "on" : "off"}`}
            onClick={() => setHeartOn((v) => !v)}
            aria-label="Toggle heart"
            aria-pressed={heartOn}
            title={heartOn ? "Heart on" : "Heart off"}
            type="button"
          >
            ❤
          </button>

          <span>by</span>

          <a className="link" href="https://juldah.website" target="_blank" rel="noreferrer">
            Dang
          </a>

          <span className="footerMuted">— powered by Quantix Trading Tech.</span>
        </div>
      </div>
    </footer>
  );
}
