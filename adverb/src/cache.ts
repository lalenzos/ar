import { Command, ExtensionContext, Range } from "vscode";
import { AdverbCache, CodeLensCacheBlock, Folding } from "./models";

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

    static getFoldingCacheOfDocument(fileName: string): Folding[] | undefined {
        const cache = this.getCache();
        if (!cache?.foldingsCache)
            return undefined;
        return cache.foldingsCache[fileName];
    };

    static updateFoldingCacheOfDocument(fileName: string, range: Range, summary: string): void {
        let cache = this.getCache();
        if (!cache)
            cache = new AdverbCache();
        if (!cache.foldingsCache)
            cache.foldingsCache = {}
        if (!cache.foldingsCache[fileName])
            cache.foldingsCache[fileName] = [];
        cache.foldingsCache[fileName] =
            [
                ...cache.foldingsCache[fileName]!.filter(x => !x.range.isEqual(range)),
                new Folding(range, summary)
            ];
        this.context.workspaceState.update(this.CACHE_NAME, cache);
    };

    static cleanFoldingCacheOfDocument(fileName: string): void {
        const cache = this.getCache();
        if (cache?.foldingsCache && cache?.foldingsCache[fileName]) {
            cache.foldingsCache[fileName] = undefined;
            this.context.workspaceState.update(this.CACHE_NAME, cache);
        }
    };

    static getCodeLensCacheOfDocument(fileName: string): CodeLensCacheBlock[] | undefined {
        const cache = this.getCache();
        if (!cache?.codeLensCache)
            return undefined;
        return cache.codeLensCache[fileName];
    };

    static getCodeLensCacheOfDocumentAndCodeBlock(fileName: string, range: Range): CodeLensCacheBlock | undefined {
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

    static cleanCodeLensCacheOfDocument(fileName: string): void {
        const cache = this.getCache();
        if (cache?.codeLensCache && cache?.codeLensCache[fileName]) {
            cache.codeLensCache[fileName] = undefined;
            this.context.workspaceState.update(this.CACHE_NAME, cache);
        }
    };

};
