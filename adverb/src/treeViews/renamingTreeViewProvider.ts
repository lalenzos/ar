import * as vscode from "vscode";
import configuration from "../configuration";
import { getRenamingTypes } from "../models";
import { GlobalConfiguration } from "../models/GlobalConfiguration";
import { RenamingTreeItem } from ".";

export class RenamingTreeViewProvider implements vscode.TreeDataProvider<RenamingTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<RenamingTreeItem | undefined | null | void> = new vscode.EventEmitter<RenamingTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<RenamingTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor(private global: boolean, private uri?: vscode.Uri) { }

    public refresh(uri?: vscode.Uri) {
        this.uri = uri;
        this._onDidChangeTreeData.fire(undefined);
    }

    getTreeItem(element: RenamingTreeItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: RenamingTreeItem): Promise<RenamingTreeItem[]> {
        if (element || (!this.global && !this.uri))
            return [];

        let fileConfig: GlobalConfiguration | undefined;
        if (this.global)
            fileConfig = await configuration.getGlobalConfiguration();
        else
            fileConfig = await configuration.getLocalConfiguration(this.uri!);
        if (!fileConfig)
            return [];

        const renamings = fileConfig.renamings;
        const result: RenamingTreeItem[] = [];
        if (fileConfig.fileRenaming) {
            const renamingType = getRenamingTypes().find(x => x.id === fileConfig!.fileRenaming);
            if (renamingType)
                result.push(new RenamingTreeItem("all symbol names", renamingType.description, fileConfig.fileRenaming));
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

