import * as vscode from "vscode";
import * as path from "path";
import { RenamingType } from ".";

export class RenamingTreeItem extends vscode.TreeItem {
    constructor(
        public originalName: string,
        public newName: string,
        public type: RenamingType,
    ) {
        super(newName, vscode.TreeItemCollapsibleState.None);
        this.tooltip = `${originalName} -> ${newName} (${this.type.description})`;
        this.description = originalName;
    }

    iconPath = {
        light: path.join(__filename, "..", "..", "..", "resources", "light", "symbol-string.svg"),
        dark: path.join(__filename, "..", "..", "..", "resources", "dark", "symbol-string.svg")
    };
}