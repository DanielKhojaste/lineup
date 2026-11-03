import { createElement } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { SessionSheetContent } from "../components/session/SessionSheet";
import { Session } from "../model/session";
import { Board } from "../model/types";

/** A4 at 96 dpi: the sheet is laid out 794 px wide; a page is 1123 px tall. */
const PAGE_WIDTH = 794;
const PAGE_HEIGHT = 1123;
/** Pictures are taken at twice the size so text and diagrams stay sharp. */
const SCALE = 2;
/** Space kept clear at the top and bottom of each page (the sheet's own padding covers page 1's top). */
const PAGE_MARGIN = 32;

interface RenderedSheet {
	canvas: HTMLCanvasElement;
	/** Where each part of the sheet (the top, each activity) starts and ends, in sheet pixels. */
	parts: { top: number; bottom: number }[];
}

/** Draw the session sheet off screen and take a picture of it. */
async function renderSheet(
	session: Session,
	getBoard: (id: string) => Board | undefined,
): Promise<RenderedSheet> {
	const { toCanvas } = await import("html-to-image");
	const host = document.createElement("div");
	host.className = "sheet-export";
	document.body.appendChild(host);
	const root = createRoot(host);
	try {
		flushSync(() => root.render(createElement(SessionSheetContent, { session, getBoard })));
		await document.fonts.ready;
		const sheet = host.firstElementChild as HTMLElement;
		const origin = sheet.getBoundingClientRect().top;
		const parts = [...sheet.querySelectorAll<HTMLElement>(".sheet__part")].map((el) => {
			const r = el.getBoundingClientRect();
			return { top: r.top - origin, bottom: r.bottom - origin };
		});
		const canvas = await toCanvas(sheet, {
			pixelRatio: SCALE,
			backgroundColor: "#ffffff",
			width: PAGE_WIDTH,
		});
		return { canvas, parts };
	} finally {
		root.unmount();
		host.remove();
	}
}

function canvasBytes(canvas: HTMLCanvasElement, type = "image/png"): Promise<Uint8Array> {
	return new Promise((resolve, reject) =>
		canvas.toBlob(async (blob) => {
			if (!blob) return reject(new Error("Couldn't make the image."));
			resolve(new Uint8Array(await blob.arrayBuffer()));
		}, type),
	);
}

/** The whole session sheet as one PNG image. */
export async function sessionToPng(
	session: Session,
	getBoard: (id: string) => Board | undefined,
): Promise<Uint8Array> {
	const { canvas } = await renderSheet(session, getBoard);
	return canvasBytes(canvas);
}

/**
 * Split the sheet into A4 pages, breaking between parts so an activity isn't
 * cut in half (unless it's taller than a page). Returns each page's start and
 * end in sheet pixels.
 */
export function pageBreaks(
	parts: { top: number; bottom: number }[],
	height: number,
	pageHeight = PAGE_HEIGHT - PAGE_MARGIN,
	laterPageHeight = PAGE_HEIGHT - 2 * PAGE_MARGIN,
): { start: number; end: number }[] {
	const pages: { start: number; end: number }[] = [];
	let start = 0;
	while (start < height - 1) {
		const room = pages.length === 0 ? pageHeight : laterPageHeight;
		let end = Math.min(height, start + room);
		if (end < height) {
			// The last part that starts on this page and doesn't fit: break before it.
			const cut = parts.find((p) => p.top > start && p.top < end && p.bottom > end);
			if (cut && cut.top - start > room * 0.25) end = Math.floor(cut.top - 6);
		}
		pages.push({ start, end });
		start = end;
	}
	return pages;
}

/** The session sheet as an A4 PDF, a page at a time. */
export async function sessionToPdf(
	session: Session,
	getBoard: (id: string) => Board | undefined,
): Promise<Uint8Array> {
	const [{ canvas, parts }, { jsPDF }] = await Promise.all([
		renderSheet(session, getBoard),
		import("jspdf"),
	]);
	const height = canvas.height / SCALE;
	const pdf = new jsPDF({ unit: "px", format: [PAGE_WIDTH, PAGE_HEIGHT], hotfixes: ["px_scaling"] });
	pageBreaks(parts, height).forEach(({ start, end }, i) => {
		const page = document.createElement("canvas");
		page.width = PAGE_WIDTH * SCALE;
		page.height = Math.ceil((end - start) * SCALE);
		const ctx = page.getContext("2d")!;
		ctx.fillStyle = "#ffffff";
		ctx.fillRect(0, 0, page.width, page.height);
		ctx.drawImage(
			canvas,
			0,
			start * SCALE,
			page.width,
			page.height,
			0,
			0,
			page.width,
			page.height,
		);
		if (i > 0) pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
		const top = i === 0 ? 0 : PAGE_MARGIN;
		pdf.addImage(page.toDataURL("image/png"), "PNG", 0, top, PAGE_WIDTH, end - start);
	});
	return new Uint8Array(pdf.output("arraybuffer"));
}
