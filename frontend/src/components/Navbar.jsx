// Shared top navigation bar. In-site tabs (no router dep).
// Path-aware: onNav updates the URL via App (see routePath), so
// /, /seeker, /login, /admin stay screenshot-clean + shareable.
export default function Navbar({ brand, sub, links, active, onNav }) {
  return (
    <header className="nav">
      <div className="navbrand">
        <span className="logo-dot" aria-hidden="true" />
        PB <span>{brand}</span>
      </div>
      <nav className="navlinks">
        {links.map((l) => (
          <button
            key={l.id}
            className={active === l.id ? "on" : ""}
            onClick={() => onNav(l.id)}
          >
            {l.label}
          </button>
        ))}
      </nav>
      <div className="hours">{sub}</div>
    </header>
  );
}
