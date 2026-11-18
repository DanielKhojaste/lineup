import { createElement } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { SessionSheetContent, SheetLayout } from "../components/session/SessionSheet";
import { Session } from "../model/session";
import { Board } from "../model/types";

/** A4 at 96 dpi: the sheet is laid out 794 px wide; a page is 1123 px tall. */
const PAGE_WIDTH = 794;
const PAGE_HEIGHT = 1123;
/** Pictures are taken at three times the size (about 290 dpi) so small names stay sharp. */
const SCALE = 3;
/** Space kept clear at the top and bottom of each page (the sheet's own padding covers page 1's top). */
const PAGE_MARGIN = 32;

/** A part of the sheet; `newPage`: it starts a page of its own (a drill in Session Details). */
export interface SheetPart {
	top: number;
	bottom: number;
	newPage?: boolean;
}

/** What to export: the summary or the details, and whether to use the ink saver. */
export interface SheetOptions {
	ink?: boolean;
	layout?: SheetLayout;
}

/** A line of text on the sheet and where it is, in sheet pixels. */
export interface TextRun {
	text: string;
	x: number;
	y: number;
	width: number;
	height: number;
}

interface RenderedSheet {
	canvas: HTMLCanvasElement;
	/** Where each part of the sheet (the top, each activity) starts and ends, in sheet pixels. */
	parts: SheetPart[];
	/** The sheet's text, line by line, for a PDF's selectable (invisible) text. */
	text: TextRun[];
}

/**
 * Every line of text in the sheet with its box: each word is measured, and
 * words side by side on one line become one run.
 */
function textRuns(sheet: HTMLElement): TextRun[] {
	const origin = sheet.getBoundingClientRect();
	const runs: TextRun[] = [];
	const walker = document.createTreeWalker(sheet, NodeFilter.SHOW_TEXT);
	const range = document.createRange();
	for (let node = walker.nextNode(); node; node = walker.nextNode()) {
		const value = node.nodeValue ?? "";
		if (!value.trim()) continue;
		let run: TextRun | null = null;
		for (const m of value.matchAll(/\S+/g)) {
			range.setStart(node, m.index!);
			range.setEnd(node, m.index! + m[0].length);
			const r = range.getBoundingClientRect();
			if (!r.width || !r.height) continue;
			const word = { x: r.left - origin.left, y: r.top - origin.top, width: r.width, height: r.height };
			if (run && Math.abs(run.y - word.y) < run.height / 2 && word.x >= run.x + run.width - 1) {
				run.text += ` ${m[0]}`;
				run.width = word.x + word.width - run.x;
			} else {
				if (run) runs.push(run);
				run = { text: m[0], ...word };
			}
		}
		if (run) runs.push(run);
	}
	return runs;
}

/** The PDF's built-in font only has Western European letters: swap or drop the rest. */
const WIN_ANSI_EXTRA = "€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ";
function pdfSafe(text: string): string {
	return text
		.replace(/[→⟶]/g, "->")
		.replace(/[←]/g, "<-")
		.replace(/[−]/g, "-")
		.replace(/[✓✔]/g, "v")
		.replace(/./gu, (c) => (c.charCodeAt(0) <= 0xff || WIN_ANSI_EXTRA.includes(c) ? c : "?"));
}

/** Draw the session sheet off screen and take a picture of it. */
async function renderSheet(
	session: Session,
	getBoard: (id: string) => Board | undefined,
	{ ink = false, layout = "summary" }: SheetOptions = {},
): Promise<RenderedSheet> {
	const { toCanvas } = await import("html-to-image");
	const host = document.createElement("div");
	host.className = "sheet-export";
	document.body.appendChild(host);
	const root = createRoot(host);
	try {
		flushSync(() => root.render(createElement(SessionSheetContent, { session, getBoard, ink, layout })));
		await document.fonts.ready;
		const sheet = host.firstElementChild as HTMLElement;
		const origin = sheet.getBoundingClientRect().top;
		const parts = [...sheet.querySelectorAll<HTMLElement>(".sheet__part")].map((el) => {
			const r = el.getBoundingClientRect();
			return { top: r.top - origin, bottom: r.bottom - origin, newPage: el.hasAttribute("data-new-page") };
		});
		const text = textRuns(sheet);
		// The picture copies each box's measured height, but can fit a line's
		// words a hair differently: a bullet that wrapped in the app could fit on
		// one line in the picture and leave a gap under it. Text boxes take the
		// height their text needs instead.
		const fit = document.createElement("style");
		fit.textContent =
			"p, li, ul, ol, .sheet__text, .sheet__info > div { height: auto !important; min-height: 0 !important; }";
		sheet.prepend(fit);
		const canvas = await toCanvas(sheet, {
			pixelRatio: SCALE,
			backgroundColor: "#ffffff",
			width: PAGE_WIDTH,
		});
		return { canvas, parts, text };
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
	options: SheetOptions = {},
): Promise<Uint8Array> {
	const { canvas } = await renderSheet(session, getBoard, options);
	return canvasBytes(canvas);
}

/**
 * Split the sheet into A4 pages, breaking between parts so an activity isn't
 * cut in half (unless it's taller than a page). Returns each page's start and
 * end in sheet pixels.
 */
export function pageBreaks(
	parts: SheetPart[],
	height: number,
	pageHeight = PAGE_HEIGHT - PAGE_MARGIN,
	laterPageHeight = PAGE_HEIGHT - 2 * PAGE_MARGIN,
): { start: number; end: number }[] {
	const pages: { start: number; end: number }[] = [];
	let start = 0;
	while (start < height - 1) {
		const room = pages.length === 0 ? pageHeight : laterPageHeight;
		let end = Math.min(height, start + room);
		// A part that starts a page of its own: this page ends where it starts.
		const own = parts.find((p) => p.newPage && p.top > start + 1 && p.top < end);
		if (own) end = Math.floor(own.top);
		else if (end < height) {
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
	options: SheetOptions = {},
): Promise<Uint8Array> {
	const [{ canvas, parts, text }, { jsPDF }] = await Promise.all([
		renderSheet(session, getBoard, options),
		import("jspdf"),
	]);
	const height = canvas.height / SCALE;
	const pdf = new jsPDF({
		unit: "px",
		format: [PAGE_WIDTH, PAGE_HEIGHT],
		hotfixes: ["px_scaling"],
		compress: true,
	});
	pdf.setFont("helvetica", "normal");
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
		pdf.addImage(page, "PNG", 0, top, PAGE_WIDTH, end - start, `page-${i}`, "FAST");
		// The text again, invisible, over the picture: it can be selected, copied and searched.
		for (const run of text) {
			const mid = run.y + run.height / 2;
			if (mid < start || mid >= end) continue;
			const safe = pdfSafe(run.text);
			const size = run.height / 1.2;
			pdf.setFontSize(size * 0.75);
			const natural = pdf.getTextWidth(safe);
			pdf.text(safe, run.x, run.y - start + top + run.height * 0.8, {
				renderingMode: "invisible",
				horizontalScale: natural > 0 ? run.width / natural : 1,
			});
		}
	});
	return new Uint8Array(pdf.output("arraybuffer"));
}
