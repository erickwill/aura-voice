import { SyntaxStyle, RGBA } from "@opentui/core"
import { createMemo } from "solid-js"
import { createSimpleContext } from "./helper"
import { colors } from "../styles/colors"

export type ThemeColors = {
  primary: RGBA
  secondary: RGBA
  accent: RGBA
  error: RGBA
  warning: RGBA
  success: RGBA
  info: RGBA
  text: RGBA
  textMuted: RGBA
  background: RGBA
  backgroundPanel: RGBA
  backgroundElement: RGBA
  border: RGBA
  borderActive: RGBA
  borderSubtle: RGBA
  syntaxComment: RGBA
  syntaxKeyword: RGBA
  syntaxFunction: RGBA
  syntaxVariable: RGBA
  syntaxString: RGBA
  syntaxNumber: RGBA
  syntaxType: RGBA
  syntaxOperator: RGBA
  syntaxPunctuation: RGBA
}

function createThemeFromColors(): ThemeColors {
  return {
    primary: RGBA.fromHex(colors.brand.primary),
    secondary: RGBA.fromHex(colors.brand.light),
    accent: RGBA.fromHex(colors.brand.primary),
    error: RGBA.fromHex(colors.semantic.error),
    warning: RGBA.fromHex(colors.semantic.warning),
    success: RGBA.fromHex(colors.semantic.success),
    info: RGBA.fromHex(colors.semantic.info),
    text: RGBA.fromHex(colors.ui.text),
    textMuted: RGBA.fromHex(colors.ui.muted),
    background: RGBA.fromHex(colors.ui.background),
    backgroundPanel: RGBA.fromHex(colors.ui.surface),
    backgroundElement: RGBA.fromHex(colors.ui.surface),
    border: RGBA.fromHex(colors.ui.border),
    borderActive: RGBA.fromHex(colors.brand.primary),
    borderSubtle: RGBA.fromHex(colors.ui.border),
    syntaxComment: RGBA.fromHex(colors.syntax.comment),
    syntaxKeyword: RGBA.fromHex(colors.syntax.keyword),
    syntaxFunction: RGBA.fromHex(colors.syntax.function),
    syntaxVariable: RGBA.fromHex(colors.syntax.variable),
    syntaxString: RGBA.fromHex(colors.syntax.string),
    syntaxNumber: RGBA.fromHex(colors.syntax.number),
    syntaxType: RGBA.fromHex(colors.syntax.type),
    syntaxOperator: RGBA.fromHex(colors.syntax.operator),
    syntaxPunctuation: RGBA.fromHex(colors.ui.text),
  }
}

function generateSyntax(theme: ThemeColors) {
  return SyntaxStyle.fromTheme([
    {
      scope: ["default"],
      style: { foreground: theme.text },
    },
    {
      scope: ["comment"],
      style: { foreground: theme.syntaxComment, italic: true },
    },
    {
      scope: ["string", "symbol"],
      style: { foreground: theme.syntaxString },
    },
    {
      scope: ["number", "boolean"],
      style: { foreground: theme.syntaxNumber },
    },
    {
      scope: ["keyword"],
      style: { foreground: theme.syntaxKeyword, italic: true },
    },
    {
      scope: ["keyword.function", "function.method"],
      style: { foreground: theme.syntaxFunction },
    },
    {
      scope: ["operator", "keyword.operator"],
      style: { foreground: theme.syntaxOperator },
    },
    {
      scope: ["variable", "variable.parameter"],
      style: { foreground: theme.syntaxVariable },
    },
    {
      scope: ["variable.member", "function", "constructor"],
      style: { foreground: theme.syntaxFunction },
    },
    {
      scope: ["type", "module"],
      style: { foreground: theme.syntaxType },
    },
    {
      scope: ["punctuation"],
      style: { foreground: theme.syntaxPunctuation },
    },
    {
      scope: ["markup.heading"],
      style: { foreground: theme.text, bold: true },
    },
    {
      scope: ["markup.bold"],
      style: { foreground: theme.text, bold: true },
    },
    {
      scope: ["markup.italic"],
      style: { foreground: theme.warning, italic: true },
    },
    {
      scope: ["markup.raw"],
      style: { foreground: theme.success },
    },
    {
      scope: ["markup.link"],
      style: { foreground: theme.info, underline: true },
    },
  ])
}

export const { use: useTheme, provider: ThemeProvider } = createSimpleContext({
  name: "Theme",
  init: (_props: { mode?: "dark" | "light" }) => {
    const themeColors = createThemeFromColors()
    const syntax = createMemo(() => generateSyntax(themeColors))

    return {
      theme: themeColors,
      syntax,
      ready: true,
    }
  },
})
