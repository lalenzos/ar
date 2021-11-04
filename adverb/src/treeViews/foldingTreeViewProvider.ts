import * as vscode from "vscode";
import configuration from "../configuration";
import { FoldingTreeItem } from ".";

export class FoldingTreeViewProvider implements vscode.TreeDataProvider<FoldingTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<FoldingTreeItem | undefined | null | void> = new vscode.EventEmitter<FoldingTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<FoldingTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor(private uri?: vscode.Uri) { }

    public refresh(uri?: vscode.Uri) {
        this.uri = uri;
        this._onDidChangeTreeData.fire(undefined);
    }

    getTreeItem(element: FoldingTreeItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: FoldingTreeItem): Promise<FoldingTreeItem[]> {
        if (element || !this.uri)
            return [];

        const result: FoldingTreeItem[] = [];
        const foldings = await configuration.getFoldings(this.uri);
        if (foldings) {
            Object.keys(foldings).forEach(x => {
                const folding = foldings[x];
                result.push(new FoldingTreeItem(folding.start, folding.end, folding.message));
            });
        }
        return result;
    }
}

