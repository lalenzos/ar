import * as vscode from "vscode";
import configuration from "./configuration";
import { getRenamingTypes, RenamingTreeItem } from "./models";

export class TreeViewProvider implements vscode.TreeDataProvider<RenamingTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<RenamingTreeItem | undefined | null | void> = new vscode.EventEmitter<RenamingTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<RenamingTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor(private uri?: vscode.Uri) { }

    public refresh(uri?: vscode.Uri) {
        this.uri = uri;
        this._onDidChangeTreeData.fire(undefined);
    }

    getTreeItem(element: RenamingTreeItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: RenamingTreeItem): Promise<RenamingTreeItem[]> {
        if (element || !this.uri)
            return [];

        const fileConfig = await configuration.getSourceCodeFileConfiguration(this.uri);
        if (!fileConfig)
            return [];

        const renamings = fileConfig.singleRenamingConfigurations;
        const result: RenamingTreeItem[] = [];
        if (fileConfig.fileRenamingTypeId) {
            const renamingType = getRenamingTypes().find(x => x.id === fileConfig.fileRenamingTypeId);
            if (renamingType)
                result.push(new RenamingTreeItem("all symbol names", renamingType.description, fileConfig.fileRenamingTypeId));
        }
        if (renamings) {
            Object.keys(renamings).forEach(x => {
                const value = renamings[x];
                result.push(new RenamingTreeItem(value.originalName, value.newName, value.renamingTypeId));
            });
        }
        return result;
    }
}

