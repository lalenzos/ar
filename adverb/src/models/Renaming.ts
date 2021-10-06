import * as vscode from "vscode";
import { RenamingType } from ".";

export class Renaming {
    constructor(public originalName: string, public newName: string, public type: RenamingType, public range: vscode.Range) {
    }

    public get content() {
        return this.newName;
    }
}