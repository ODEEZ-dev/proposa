import React from "react"
import ReactDOM from "react-dom/client"
import { BrowserRouter } from "react-router-dom"
import { ConvexProvider } from "convex/react"
import { convex } from "./lib/convex"
import App from "./App"
import { Toaster } from "./components/ui/sonner"
import "@fontsource-variable/manrope"
import "@fontsource-variable/newsreader"
import "./index.css"

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ConvexProvider client={convex}>
        <App />
        <Toaster position="top-right" richColors closeButton />
      </ConvexProvider>
    </BrowserRouter>
  </React.StrictMode>
)