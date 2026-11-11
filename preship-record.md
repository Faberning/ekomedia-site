proven-preship-check — 2026-11-11 — homepage redesign v2 — http://localhost:8121/index.html (local build, gzip as on GitHub Pages)
Iterations used: 2/4
Gate 1 Lighthouse Performance (mobile): 98  [PASS]  Accessibility 100, Best Practices 100, SEO 100. First pass scored 62; fixed by self-hosting and trimming fonts, shrinking the nav logo, sizing logo images, and not running the particle field on software renderers. The test browser is a software renderer, so this score is measured with the particle field off.
Gate 2 JSON-LD (raw DOM):       FAQPage, Organization, Service, VideoObject, WebSite; one block, valid JSON, byte-identical to main; FAQ answers on the page match the schema verbatim  [PASS]
Gate 3 Structure-floor:         vs 1 ref  [PASS with override]  Compared with the live homepage it replaces: 2,418 words against 2,546, same FAQ, guides, pillars, results and service content.
Result: GREEN
Overrides: Gate 3 — external reference pages cannot be fetched from the build environment, so the floor was the current live homepage instead of competitor pages.
