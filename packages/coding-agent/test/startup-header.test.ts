import { visibleWidth } from "@earendil-works/pi-tui";
import { beforeAll, describe, expect, it } from "vitest";
import {
	MAKIMA_LOGO_HEIGHT,
	MAKIMA_LOGO_WIDTH,
	makimaLogoLines,
} from "../src/modes/interactive/components/makima-logo.ts";
import { StartupHeader } from "../src/modes/interactive/components/startup-header.ts";
import { initTheme } from "../src/modes/interactive/theme/theme.ts";
import { stripAnsi } from "../src/utils/ansi.ts";

const data = {
	version: "1.2.3",
	model: "local-model",
	thinking: "high reasoning",
	cwd: "C:\\work\\pi",
	sessionName: "header-test",
	trusted: true,
	toolCount: 7,
	skillCount: 4,
};

function createHeader(expanded = false): StartupHeader {
	return new StartupHeader({
		getData: () => data,
		getResources: (showPaths) => [
			{ label: "Context", items: [showPaths ? "C:\\work\\pi\\AGENTS.md" : "AGENTS.md"] },
			{ label: "Skills", items: [showPaths ? "C:\\skills\\lark-doc\\SKILL.md" : "lark-doc", "lark-task"] },
			{ label: "Prompts", items: [showPaths ? "C:\\prompts\\review.md" : "/review"] },
			{ label: "Extensions", items: [showPaths ? "C:\\extensions\\tools.ts" : "tools.ts"] },
		],
		getCollapsedHelp: () => ["Ctrl+C interrupt · / commands", "Press Ctrl+O to show full startup help."],
		getExpandedHelp: () => ["Ctrl+C to interrupt", "Ctrl+L to select model", "/ for commands"],
		expanded,
		showLogo: true,
	});
}

describe("StartupHeader", () => {
	beforeAll(() => initTheme("dark"));

	it("renders Makima TUI's 28 by 15 pixel portrait", () => {
		const lines = makimaLogoLines();

		expect(lines).toHaveLength(MAKIMA_LOGO_HEIGHT);
		expect(lines.every((line) => visibleWidth(line) === MAKIMA_LOGO_WIDTH)).toBe(true);
		expect(lines.some((line) => line.includes("\x1b["))).toBe(true);
	});

	it("renders the Makima-style split dashboard on wide terminals", () => {
		const lines = createHeader().render(100);
		const text = stripAnsi(lines.join("\n"));

		expect(text).toContain("Pi v1.2.3");
		expect(text).toContain("SESSION READY");
		expect(text).toContain("● ONLINE");
		expect(text).toContain("7 tools · 4 skills");
		expect(text).toContain("COMMAND DECK");
		expect(text).toContain("Welcome back");
		expect(text).toContain("▸ Context (1)");
		expect(text).toContain("▸ Skills (2)");
		expect(text).toContain("▸ Prompts (1)");
		expect(text).toContain("▸ Extensions (1)");
		expect(text).not.toContain("lark-doc, lark-task");
		expect(text).toContain("Press Ctrl+O to show full startup help.");
		expect(text).not.toContain("Interactive workspace");
		expect(text).toContain("header-test");
		const skillsRow = lines.find((line) => stripAnsi(line).includes("▸ Skills (2)"));
		expect(skillsRow).toBeDefined();
		expect(stripAnsi(skillsRow ?? "").indexOf("▸ Skills (2)")).toBeGreaterThan(37);
		expect(lines.length).toBeGreaterThan(MAKIMA_LOGO_HEIGHT);
		expect(lines.every((line) => visibleWidth(line) === 100)).toBe(true);
	});

	it("stacks the dashboard without overflowing compact terminals", () => {
		const lines = createHeader().render(52);
		const text = stripAnsi(lines.join("\n"));

		expect(text).toContain("SESSION READY");
		expect(text).toContain("local-model");
		expect(text).toContain("7 tools · 4 skills");
		expect(lines.every((line) => visibleWidth(line) <= 52)).toBe(true);
	});

	it("falls back to an unboxed title on very narrow terminals", () => {
		const lines = createHeader().render(28);
		const text = stripAnsi(lines.join("\n"));

		expect(text).toContain("v1.2.3");
		expect(text).toContain("local-model");
		expect(text).not.toContain("SESSION READY");
		expect(lines.every((line) => visibleWidth(line) <= 28)).toBe(true);
	});

	it("shows resource details and help only when expanded", () => {
		const header = createHeader();
		const collapsed = stripAnsi(header.render(80).join("\n"));
		expect(collapsed).toContain("▸ Skills (2)");
		expect(collapsed).toContain("show full startup help");
		expect(collapsed).not.toContain("lark-doc, lark-task");

		header.setExpanded(true);
		const expanded = stripAnsi(header.render(80).join("\n"));
		expect(expanded).toContain("Ctrl+L to select model");
		expect(expanded).toContain("C:\\skills\\lark-doc\\SKILL.md");
		expect(expanded).not.toContain("show full startup help");
	});
});
