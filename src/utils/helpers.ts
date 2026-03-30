// Source - https://stackoverflow.com/a/11409978
// Posted by CAFxX, modified by community. See post 'Timeline' for change history
// Retrieved 2026-03-06, License - CC BY-SA 4.0
// Refactored into a TypeScript function
export function clamp(number: number, min: number, max: number): number {
	return Math.max(min, Math.min(number, max));
}

export function mergeRefs<T>(...refs: Array<React.Ref<T> | undefined>) {
	return (value: T | null) => {
		for (const ref of refs) {
			if (!ref) continue;

			if (typeof ref === "function") {
				ref(value);
			} else {
				(ref as React.MutableRefObject<T | null>).current = value;
			}
		}
	};
}
