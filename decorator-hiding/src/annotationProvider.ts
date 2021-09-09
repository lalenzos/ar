import {
    DecorationInstanceRenderOptions,
    ThemeColor,
    DecorationOptions,
    Range,
    workspace,
} from "vscode"

export class Annotations {
    public static parameterAnnotation(
        message: string,
        range: Range
    ): DecorationOptions {
        return {
            range,
            renderOptions: {
                before: {
                    contentText: message,
                    color: new ThemeColor("inlineparameters.annotationForeground"),
                    backgroundColor: new ThemeColor("inlineparameters.annotationBackground"),
                    fontStyle: workspace.getConfiguration("decorator-hiding").get("fontStyle"),
                    fontWeight: workspace.getConfiguration("decorator-hiding").get("fontWeight"),
                    textDecoration: `;
                        font-size: ${workspace.getConfiguration("decorator-hiding").get("fontSize")};
                        margin: ${workspace.getConfiguration("decorator-hiding").get("margin")};
                        padding: ${workspace.getConfiguration("decorator-hiding").get("padding")};
                        border-radius: ${workspace.getConfiguration("decorator-hiding").get("borderRadius")};
                        border: ${workspace.getConfiguration("decorator-hiding").get("border")};
                        vertical-align: middle;
                    `,
                },
            } as DecorationInstanceRenderOptions,
        } as DecorationOptions
    }
}
