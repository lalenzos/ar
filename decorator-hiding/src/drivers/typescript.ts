import { parse as abstractParse, getTypescriptCodePartsToHide } from './abstract-javascript'
export { getParameterName } from './abstract-javascript'

export function parse(code: string) {
    return abstractParse(code, {
        parser: require("recast/parsers/typescript"),
    });
};

export function getCodePartsToHide(code: string) {
    return getTypescriptCodePartsToHide(code, {
        parser: require("recast/parsers/typescript"),
    });
};
