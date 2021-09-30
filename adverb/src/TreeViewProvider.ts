import * as vscode from "vscode";
import workspaceState from "./workspaceState";
import { RenamingTreeItem } from "./models";

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

    getChildren(element?: RenamingTreeItem): Thenable<RenamingTreeItem[]> {
        if (element || !this.uri)
            return Promise.resolve([]);

        const values = workspaceState.getValues(this.uri);
        const result: RenamingTreeItem[] = [];
        if (values) {
            Object.keys(values).forEach(x => {
                const value = values[x];
                result.push(new RenamingTreeItem(value.originalName, value.newName, value.type));
            });
        }
        return Promise.resolve(result);
    }
}

