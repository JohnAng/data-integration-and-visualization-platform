/**
 * Footer — site-wide footer with course / academic-year line and the
 * project credit.
 */
export function Footer() {
    return (
        <footer className="border-t border-hairline">
            <div className="max-w-(--container-default) mx-auto px-6 py-6 flex flex-wrap items-center justify-between gap-3 text-caption uppercase tracking-wide text-smoke">
                <span>MYE030 · Spring 2026 · University of Ioannina</span>
                <span>
                    Developed by{" "}
                    <span className="text-ink">Ioannis Angelakos · 2403</span>
                </span>
            </div>
        </footer>
    );
}
