import { useRenderer } from "@opentui/solid"
import { createSimpleContext } from "./helper"

export const { use: useExit, provider: ExitProvider } = createSimpleContext({
  name: "Exit",
  init: (input: { onExit?: () => Promise<void> }) => {
    const renderer = useRenderer()
    return async (reason?: any) => {
      renderer.setTerminalTitle("")
      renderer.destroy()
      await input.onExit?.()
      if (reason) {
        if (reason instanceof Error) {
          process.stderr.write(reason.message + "\n")
        } else if (typeof reason === "string") {
          process.stderr.write(reason + "\n")
        }
      }
      process.exit(0)
    }
  },
})
