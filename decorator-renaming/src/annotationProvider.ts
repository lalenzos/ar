import {
    DecorationInstanceRenderOptions,
    ThemeColor,
    DecorationOptions,
    Range,
    workspace,
} from "vscode"

export class Annotations {
    public static parameterAnnotation(message: string, range: Range, disableStyling: boolean = false): DecorationOptions {
        return {
            range,
            renderOptions: {
                before: {
                    contentText: message,
                    color: new ThemeColor("decoratorrenaming.annotationForeground"),
                    backgroundColor: new ThemeColor("decoratorrenaming.annotationBackground"),
                    fontStyle: workspace.getConfiguration("decorator-renaming").get("fontStyle"),
                    fontWeight: workspace.getConfiguration("decorator-renaming").get("fontWeight"),
                    textDecoration: disableStyling ? "" : `;
                        font-size: ${workspace.getConfiguration("decorator-renaming").get("fontSize")};
                        margin: ${workspace.getConfiguration("decorator-renaming").get("margin")};
                        padding: ${workspace.getConfiguration("decorator-renaming").get("padding")};
                        border-radius: ${workspace.getConfiguration("decorator-renaming").get("borderRadius")};
                        border: ${workspace.getConfiguration("decorator-renaming").get("border")};
                        vertical-align: middle;
                    `,
                },
            } as DecorationInstanceRenderOptions,
        } as DecorationOptions
    }
}
