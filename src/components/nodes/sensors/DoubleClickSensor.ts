import { Sensor, configurator } from "@dnd-kit/abstract";
import type { DragDropManager, Draggable } from "@dnd-kit/dom";
import { Listeners, getEventCoordinates } from "@dnd-kit/dom/utilities";
import type { CleanupFunction } from "@dnd-kit/state";
import { effect } from "@dnd-kit/state";

// Original code source:
// https://www.mintlify.com/clauderic/dnd-kit/guides/custom-sensors
export interface DoubleClickSensorOptions {
	/**
	 * Maximum time between clicks (ms)
	 */
	delay?: number;

	// CHECK: Callback for double click behavior
	onDoubleClick?: (source: Draggable, event: PointerEvent) => void;
}

const defaults = {
	delay: 300,
};

export class DoubleClickSensor extends Sensor<
	DragDropManager,
	DoubleClickSensorOptions
> {
	private listeners = new Listeners();
	private lastClickTime = 0;

	constructor(
		public manager: DragDropManager,
		public options?: DoubleClickSensorOptions,
	) {
		super(manager, options);
	}

	public bind(source: Draggable, options = this.options): CleanupFunction {
		const { delay = defaults.delay } = options ?? {};

		const unbind = effect(() => {
			const element = (source.handle ?? source.element) as HTMLElement;
			if (!element) return;

			const handleClick = (event: PointerEvent) => {
				if (source.disabled) return;

				const now = Date.now();
				const timeSinceLastClick = now - this.lastClickTime;

				if (timeSinceLastClick < delay) {
					// Double click detected
					this.handleDoubleClick(event, source);
					this.lastClickTime = 0;
				} else {
					// First click
					this.lastClickTime = now;
				}
			};

			element.addEventListener("click", handleClick);

			return () => {
				element.removeEventListener("click", handleClick);
			};
		});

		return unbind;
	}

	private handleDoubleClick(event: PointerEvent, source: Draggable) {
		event.preventDefault();
		event.stopPropagation();

		// CHECK: We no longer start a drag operation here
		// CHECK: Instead, we trigger a custom callback or fallback behavior

		if (this.options?.onDoubleClick) {
			this.options.onDoubleClick(source, event);
		} else {
			// CHECK: Default behavior (for testing)
			console.log("Double clicked:", source.id);
		}
	}

	private setupDragListeners(source: Draggable) {
		const cleanup = this.listeners.bind(document, [
			{
				type: "mousemove",
				listener: (event: PointerEvent) => this.handleMove(event),
			},
			{
				type: "mouseup",
				listener: (event: PointerEvent) => this.handleEnd(event),
			},
			{
				type: "keydown",
				listener: (event: KeyboardEvent) => {
					if (event.code === "Escape") {
						this.handleEnd(event, true);
					}
				},
			},
		]);

		return cleanup;
	}

	private handleMove(event: PointerEvent) {
		const coordinates = getEventCoordinates(event);
		if (!coordinates) return;

		if (this.manager.dragOperation.status.idle) {
			this.manager.actions.start({ event, coordinates });
		} else {
			this.manager.actions.move({ to: coordinates });
		}
	}

	private handleEnd(event: Event, canceled = false) {
		this.manager.actions.stop({ event, canceled });
		this.listeners.clear();
	}

	public destroy() {
		this.listeners.clear();
	}

	static configure = configurator(DoubleClickSensor);
}
