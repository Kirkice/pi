import {
	type Component,
	type TuiMouseEvent,
	type TuiMouseEventResult,
	truncateToWidth,
	visibleWidth,
	wrapTextWithAnsi,
} from "@earendil-works/pi-tui";
import { theme } from "../theme/theme.ts";
import { formatCwdForFooter } from "./footer.ts";
import { MAKIMA_LOGO_HEIGHT, MAKIMA_LOGO_WIDTH, makimaLogoLines } from "./makima-logo.ts";
import { piWordmark } from "./pi-logo.ts";

export interface StartupHeaderData {
	version: string;
	model: string;
	thinking: string;
	cwd: string;
	sessionName?: string;
	trusted: boolean;
	toolCount: number;
	skillCount: number;
}

export interface StartupHeaderResourceSection {
	label: string;
	items: string[];
}

export interface StartupHeaderOptions {
	getData: () => StartupHeaderData;
	getResources?: (expanded: boolean) => StartupHeaderResourceSection[];
	getCollapsedHelp: () => string[];
	getExpandedHelp: () => string[];
	expanded?: boolean;
	showLogo?: boolean;
}

function fitLine(text: string, width: number, align: "left" | "right" = "left"): string {
	if (width <= 0) return "";
	const clipped = truncateToWidth(text, width, theme.fg("muted", "…"));
	const padding = " ".repeat(Math.max(0, width - visibleWidth(clipped)));
	return align === "right" ? `${padding}${clipped}` : `${clipped}${padding}`;
}

function centerLine(text: string, width: number): string {
	const contentWidth = visibleWidth(text);
	const leftPadding = Math.max(0, Math.floor((width - contentWidth) / 2));
	return fitLine(`${" ".repeat(leftPadding)}${text}`, width);
}

function joinColumns(left: string, leftWidth: number, right: string, rightWidth: number): string {
	return `${fitLine(left, leftWidth)}${theme.fg("border", "│")}${fitLine(right, rightWidth)}`;
}

function joinInfoGroups(left: string, right: string, width: number): string {
	const gap = 4;
	const leftWidth = Math.floor((width - gap) / 2);
	return `${fitLine(left, leftWidth)}${" ".repeat(gap)}${fitLine(right, width - leftWidth - gap)}`;
}

function renderResourceLines(resources: StartupHeaderResourceSection[], expanded: boolean, width: number): string[] {
	if (!expanded) {
		const summary = resources
			.map(
				(section) =>
					`${theme.fg("accent", "▸")} ${theme.bold(section.label)} ${theme.fg("muted", `(${section.items.length})`)}`,
			)
			.join(theme.fg("borderMuted", "   ·   "));
		return wrapTextWithAnsi(summary, Math.max(1, width));
	}

	return resources.flatMap((section) => {
		const label = `${theme.fg("accent", "▾")} ${theme.bold(theme.fg("accent", section.label))}`;
		const body = theme.fg("dim", section.items.join(", "));
		return wrapTextWithAnsi(`${label}  ${body}`, Math.max(1, width));
	});
}

/** Makima-inspired startup dashboard backed by Pi's live session data. */
export class StartupHeader implements Component {
	private readonly options: StartupHeaderOptions;
	private expanded: boolean;
	onLogoClick: ((column: number, row: number) => void) | undefined;

	constructor(options: StartupHeaderOptions) {
		this.options = options;
		this.expanded = options.expanded ?? false;
	}

	setExpanded(expanded: boolean): void {
		this.expanded = expanded;
	}

	invalidate(): void {
		// All content is derived on every render so model, session, and theme changes stay current.
	}

	handleMouse(event: TuiMouseEvent): TuiMouseEventResult | undefined {
		if (
			event.type !== "click" ||
			!this.options.showLogo ||
			!this.onLogoClick ||
			event.y < 1 ||
			event.y > MAKIMA_LOGO_HEIGHT ||
			event.x < 1 ||
			event.x > MAKIMA_LOGO_WIDTH
		) {
			return undefined;
		}
		this.onLogoClick(event.screenX - event.x + 1, event.screenY - event.y + 1);
		return { handled: true };
	}

	render(width: number): string[] {
		if (width <= 0) return [];
		const data = this.options.getData();
		const resources = this.options.getResources?.(this.expanded) ?? [];
		const help = this.expanded ? this.options.getExpandedHelp() : this.options.getCollapsedHelp();
		if (width < 34) return this.renderTiny(width, data, resources, help);
		return this.renderPanel(width, data, resources, help);
	}

	private renderTiny(
		width: number,
		data: StartupHeaderData,
		resources: StartupHeaderResourceSection[],
		help: string[],
	): string[] {
		const title = `${piWordmark()} ${theme.fg("dim", `v${data.version}`)}`;
		const model = theme.fg("accent", data.model);
		const cwd = theme.fg("muted", formatCwdForFooter(data.cwd, process.env.HOME || process.env.USERPROFILE));
		const resourceLines = resources.map(
			(section) => `${theme.fg("accent", section.label)} ${theme.fg("dim", section.items.join(", "))}`,
		);
		return [title, model, cwd, ...resourceLines, ...help].map((line) =>
			truncateToWidth(line, width, theme.fg("muted", "…")),
		);
	}

	private renderPanel(
		width: number,
		data: StartupHeaderData,
		resources: StartupHeaderResourceSection[],
		help: string[],
	): string[] {
		const innerWidth = width - 2;
		const title = ` Pi v${data.version} `;
		const titleWidth = visibleWidth(title);
		const topRuleWidth = Math.max(0, innerWidth - titleWidth - 1);
		const top = `${theme.fg("border", "╭─")}${theme.bold(theme.fg("text", title))}${theme.fg("border", `${"─".repeat(topRuleWidth)}╮`)}`;
		const bottom = theme.fg("border", `╰${"─".repeat(innerWidth)}╯`);
		const path = formatCwdForFooter(data.cwd, process.env.HOME || process.env.USERPROFILE);
		const session = data.sessionName || "new session";
		const access = data.trusted ? theme.fg("success", "TRUSTED") : theme.fg("warning", "RESTRICTED");
		const online = theme.fg("success", "● ONLINE");
		const model = theme.fg("accent", data.model);
		const commandDeck = `${theme.bold(theme.fg("accent", "COMMAND DECK"))} ${theme.fg("toolTitle", "/model")} ${theme.fg("muted", "tune")} ${theme.fg("toolTitle", "/resume")} ${theme.fg("muted", "switch")} ${theme.fg("toolTitle", "/help")}`;
		const lines: string[] = [top];

		if (width >= 90) {
			const leftWidth = 36;
			const rightWidth = innerWidth - leftWidth - 1;
			const logo = this.options.showLogo ? makimaLogoLines().map((line) => centerLine(line, leftWidth)) : [];
			const resourceLines = renderResourceLines(resources, this.expanded, rightWidth - 2);
			const identity = [
				"",
				theme.bold("Welcome back"),
				theme.fg("borderMuted", "─".repeat(leftWidth)),
				`${theme.fg("muted", "Model   ")}${model}`,
				`${theme.fg("muted", "Path    ")}${path}`,
				`${theme.fg("muted", "Access  ")}${access}`,
				`${theme.fg("muted", "Session ")}${theme.fg("accent", session)}`,
			];
			const left = [...logo, ...identity];
			const right = [
				`${theme.bold(theme.fg("accent", "SESSION READY"))}${theme.fg("muted", ` · ${data.thinking}`)}`,
				`${theme.fg("success", "● READY")} ${theme.fg("muted", "· workspace initialized")}`,
				theme.fg("borderMuted", "─".repeat(rightWidth)),
				"",
				joinInfoGroups(theme.fg("muted", "RUNTIME"), theme.fg("muted", "SESSION POSTURE"), rightWidth),
				joinInfoGroups(
					`${theme.bold(theme.fg("accent", String(data.toolCount)))} tools · ${theme.bold(theme.fg("accent", String(data.skillCount)))} skills`,
					access,
					rightWidth,
				),
				joinInfoGroups(theme.fg("muted", "local runtime"), theme.fg("muted", session), rightWidth),
				"",
				theme.fg("borderMuted", "─".repeat(rightWidth)),
				"",
				commandDeck,
				`${theme.fg("success", "● ONLINE")} ${theme.fg("muted", "· /help for commands")}`,
			];
			if (resourceLines.length > 0) {
				right.push("", theme.fg("borderMuted", "─".repeat(rightWidth)), ...resourceLines);
			}
			const rowCount = Math.max(left.length, right.length);
			for (let index = 0; index < rowCount; index++) {
				lines.push(
					`${theme.fg("border", "│")}${joinColumns(left[index] ?? "", leftWidth, right[index] ?? "", rightWidth)}${theme.fg("border", "│")}`,
				);
			}
		} else {
			const content = [
				`${theme.bold(theme.fg("accent", "SESSION READY"))}  ${online}`,
				`${theme.fg("muted", "Model   ")}${model}`,
				`${theme.fg("muted", "Mode    ")}${data.thinking}`,
				`${theme.fg("muted", "Path    ")}${path}`,
				`${theme.fg("muted", "Runtime ")}${theme.fg("accent", String(data.toolCount))} tools · ${theme.fg("accent", String(data.skillCount))} skills · ${access}`,
				commandDeck,
			];
			for (const line of content)
				lines.push(`${theme.fg("border", "│")}${fitLine(` ${line}`, innerWidth)}${theme.fg("border", "│")}`);
		}

		if (width < 90 && resources.length > 0) {
			lines.push(
				`${theme.fg("border", "├")}${theme.fg("borderMuted", "─".repeat(innerWidth))}${theme.fg("border", "┤")}`,
			);
			for (const line of renderResourceLines(resources, this.expanded, innerWidth - 2))
				lines.push(`${theme.fg("border", "│")}${fitLine(` ${line}`, innerWidth)}${theme.fg("border", "│")}`);
		}

		if (this.expanded && help.length > 0) {
			lines.push(
				`${theme.fg("border", "├")}${theme.fg("borderMuted", "─".repeat(innerWidth))}${theme.fg("border", "┤")}`,
			);
			for (const line of help)
				lines.push(`${theme.fg("border", "│")}${fitLine(` ${line}`, innerWidth)}${theme.fg("border", "│")}`);
		}
		lines.push(bottom);
		return lines;
	}
}
