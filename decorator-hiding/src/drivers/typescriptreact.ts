import { parse as abstractParse, getTypescriptCodePartsToHide } from './abstract-javascript'
export { getParameterName } from './abstract-javascript'

export function parse(code: string) {
    return abstractParse(code, {
        parser: {
            parse(source: any) {
                const babelParser = require("recast/parsers/babel").parser;
                const opts = getOpts();
                return babelParser.parse(source, opts)
            }
        }
    })
};

export function getCodePartsToHide(code: string) {
    return getTypescriptCodePartsToHide(code, {
        parser: {
            parse(source: any) {
                const babelParser = require("recast/parsers/babel").parser;
                const opts = getOpts();
                return babelParser.parse(source, opts)
            }
        }
    });
};

function getOpts() {
    const opts = {
        allowImportExportEverywhere: true,
        allowReturnOutsideFunction: true,
        plugins: [
            "asyncGenerators",
            "bigInt",
            "classPrivateMethods",
            "classPrivateProperties",
            "classProperties",
            "decorators-legacy",
            "doExpressions",
            "dynamicImport",
            "exportDefaultFrom",
            "exportExtensions",
            "exportNamespaceFrom",
            "functionBind",
            "functionSent",
            "importMeta",
            "nullishCoalescingOperator",
            "numericSeparator",
            "objectRestSpread",
            "optionalCatchBinding",
            "optionalChaining",
            ["pipelineOperator", { proposal: "minimal" }],
            "throwExpressions",
            "typescript",
            "jsx"
        ],
        sourceType: "unambiguous",
        startLine: 1,
        strictMode: false,
        tokens: true
    }
    return opts;
}
