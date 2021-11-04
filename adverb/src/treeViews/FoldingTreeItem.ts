import * as vscode from "vscode";
import * as path from "path";

export class FoldingTreeItem extends vscode.TreeItem {
    constructor(
        public start: number,
        public end: number,
        public message: string | undefined,
    ) {
        super(`[${start+1} - ${end+1}]`, vscode.TreeItemCollapsibleState.None);
        this.description = message;
    }

    iconPath = {
        light: path.join(__filename, "..", "..", "..", "resources", "light", "chevron-right.svg"),
        dark: path.join(__filename, "..", "..", "..", "resources", "dark", "chevron-right.svg")
    };
}