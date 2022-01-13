import { Command } from "vscode";
import { Range } from "vscode";

export interface CodeLensCacheBlock {
    range: Range,
    command: Command
};