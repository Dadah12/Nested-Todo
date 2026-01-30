import React from "react";

export default function Footer({
  heartOn,
  toggleHeart,
}: {
  heartOn: boolean;
  toggleHeart: () => void;
}) {
  return (
    <footer className="footer">
      <button className={`heart ${heartOn ? "on" : ""}`} onClick={toggleHeart} aria-label="Toggle heart">
        ♥
      </button>
      <div className="footerText">
        Built with <span className={`heartInline ${heartOn ? "on" : ""}`}>♥</span> by{" "}
        <a className="link" href="https://juldah.website" target="_blank" rel="noreferrer">
          Dang
        </a>
      </div>
    </footer>
  );
}
