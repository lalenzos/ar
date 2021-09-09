import { TextEditor } from "vscode"
import { parse as abstractParse, getIdentifiersToRename as abstractGetIdentifiersToRename } from './abstract-javascript'
export { getParameterName } from './abstract-javascript'

export function parse(code: string) {
    return abstractParse(code, {
        parser: require("recast/parsers/esprima"),
    });
};

export async function getIdentifiersToRename(activeEditor: TextEditor, code: string) {
    return abstractGetIdentifiersToRename(activeEditor, code, {
        parser: require("recast/parsers/esprima"),
    });
};
