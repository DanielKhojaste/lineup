/** "just now", "5 min ago", "3 h ago", "yesterday", "Oct 14" or "Oct 14, 2025". */
export function relativeTime(iso: string, now = new Date()): string {
	const then = new Date(iso);
	const seconds = Math.round((now.getTime() - then.getTime()) / 1000);
	if (!Number.isFinite(seconds)) return "";
	if (seconds < 45) return "just now";
	const minutes = Math.round(seconds / 60);
	if (minutes < 60) return `${minutes} min ago`;
	const hours = Math.round(minutes / 60);
	const sameDay = then.toDateString() === now.toDateString();
	if (sameDay) return `${hours} h ago`;
	const yesterday = new Date(now);
	yesterday.setDate(now.getDate() - 1);
	if (then.toDateString() === yesterday.toDateString()) return "yesterday";
	const options: Intl.DateTimeFormatOptions = {
		month: "short",
		day: "numeric",
	};
	if (then.getFullYear() !== now.getFullYear()) options.year = "numeric";
	return then.toLocaleDateString("en-US", options);
}
