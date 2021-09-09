import { parse as abstractParse, getJavascriptCodePartsToHide } from './abstract-javascript'
export { getParameterName } from './abstract-javascript'

export function parse(code: string) {
    return abstractParse(code, {
        parser: require("recast/parsers/esprima"),
    });
};

export function getCodePartsToHide(code: string) {
    return getJavascriptCodePartsToHide(code, {
        parser: require("recast/parsers/esprima"),
    });
};
