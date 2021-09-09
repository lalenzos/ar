import { parse as abstractParse, getIdentifiersToRename as abstractGetIdentifiersToRename } from './abstract-javascript'
export { getParameterName } from './abstract-javascript'

export function parse(code: string) {
    return abstractParse(code, {
        parser: require("recast/parsers/babel"),
    })
}

export function getIdentifiersToRename(code: string) {
    return abstractGetIdentifiersToRename(code, {
        parser: require("recast/parsers/babel"),
    });
};
