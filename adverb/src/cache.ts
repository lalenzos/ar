import { Command, ExtensionContext, Range } from "vscode";
import { AdverbCache, CodeLensCacheBlock } from "./models";

export class Cache {
    private static CACHE_NAME: string = "ADVERB";

    private static context: ExtensionContext;

    static initialize(context: ExtensionContext): void {
        this.context = context;

        this.context.workspaceState.update(this.CACHE_NAME, new AdverbCache());
    };

    private static getCache(): AdverbCache | undefined {
        return this.context.workspaceState.get<AdverbCache>(this.CACHE_NAME);
    };

    static getCodeLensCacheForDocument(fileName: string): CodeLensCacheBlock[] | undefined {
        const cache = this.getCache();
        if (!cache?.codeLensCache)
            return undefined;
        return cache.codeLensCache[fileName];
    };

    static getCodeLensCacheForDocumentAndCodeBlock(fileName: string, range: Range): CodeLensCacheBlock | undefined {
        const cache = this.getCache();
        if (!cache?.codeLensCache)
            return undefined;
        const fileCache = cache.codeLensCache[fileName];
        if (!fileCache)
            return undefined;
        const codeBlock = fileCache.find(x => x.range.isEqual(range));
        return codeBlock;
    };

    static updateCodeLensCacheOfDocumentAndCodeBlock(fileName: string, range: Range, command: Command): void {
        let cache = this.getCache();
        if (!cache)
            cache = new AdverbCache();
        if (!cache.codeLensCache)
            cache.codeLensCache = {}
        if (!cache.codeLensCache[fileName])
            cache.codeLensCache[fileName] = [];
        cache.codeLensCache[fileName] =
            [
                ...cache.codeLensCache[fileName]!.filter(x => !x.range.isEqual(range)),
                { range: range, command: command }
            ];
        this.context.workspaceState.update(this.CACHE_NAME, cache);
    };

    static cleanCodeLensCache(): void {
        this.context.workspaceState.update(this.CACHE_NAME, new AdverbCache());
    };

    static cleanCodeLensCacheOfDocument(fileName: string): void {
        const cache = this.getCache();
        if (cache?.codeLensCache) {
            cache.codeLensCache[fileName] = undefined;
            this.context.workspaceState.update(this.CACHE_NAME, cache);
        }
    };

};
