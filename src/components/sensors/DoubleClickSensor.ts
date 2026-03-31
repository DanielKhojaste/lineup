import { Sensor, configurator } from "@dnd-kit/abstract";
import type { DragDropManager, Draggable } from "@dnd-kit/dom";
import type { CleanupFunction } from "@dnd-kit/state";
import { effect } from "@dnd-kit/state";

// Original code source:
// https://www.mintlify.com/clauderic/dnd-kit/guides/custom-sensors
export interface DoubleClickSensorOptions {
	delay?: number;
	onDoubleClick?: (source: Draggable, event: PointerEvent) => void;
}

const defaults = {
	delay: 300,
};

export class DoubleClickSensor extends Sensor<
	DragDropManager,
	DoubleClickSensorOptions
> {
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
					this.handleDoubleClick(event, source);
					this.lastClickTime = 0;
				} else {
					this.lastClickTime = now;
				}
			};

			element.addEventListener("click", handleClick as EventListener);

			return () => {
				element.removeEventListener("click", handleClick as EventListener);
			};
		});

		return unbind;
	}

	private handleDoubleClick(event: PointerEvent, source: Draggable) {
		event.preventDefault();
		event.stopPropagation();

		if (this.options?.onDoubleClick) {
			this.options.onDoubleClick(source, event);
		} else {
			console.log("Double clicked:", source.id);
		}
	}

	public destroy() {}

	static configure = configurator(DoubleClickSensor);
}
