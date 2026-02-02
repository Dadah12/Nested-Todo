import React, { useEffect, useState } from "react";

export default function Footer() {
  // English comment: Persist the heart state so it feels "alive" and personal.
  const [heartOn, setHeartOn] = useState<boolean>(() => {
    try {
      return localStorage.getItem("todo_heart_on") === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("todo_heart_on", heartOn ? "1" : "0");
    } catch {
      // Ignore storage errors
    }
  }, [heartOn]);

  return (
    <footer className="footer">
      <div className="footerInner">
        <div className="footerAd">
          <span>
            Want your own app? <strong>We build custom systems for small shops.</strong>
          </span>

          <span className="footerLinks">
            <a className="link" href="https://juldah.website" target="_blank" rel="noreferrer">
              Learn more
            </a>
            <span className="footerSep">|</span>
            <a className="link" href="mailto:juldahsoriano12@gmail.com">
              Message us
            </a>
          </span>
        </div>

        <div className="footerText">
          <span>Built with</span>
          <button
            className={`heartInline ${heartOn ? "on" : ""}`}
            onClick={() => setHeartOn((v) => !v)}
            aria-label="Toggle heart"
            title="Toggle heart"
            type="button"
          >
            ❤
          </button>
          <span>by</span>
          <a className="link" href="https://juldah.website" target="_blank" rel="noreferrer">
            Dang
          </a>
          <span>— powered by</span>
          <a className="link" href="https://quantixtech.it.com" target="_blank" rel="noreferrer">
            Quantix Trading Tech
          </a>
          <span>.</span>
        </div>
      </div>
    </footer>
  );
}
