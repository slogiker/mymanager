# Antigravity Workspace Rules

## 📋 Planning & Design Artifacts
- **Always write plans as markdown (`.md`) artifacts** in the conversation's artifact directory (under `<appDataDir>/brain/<conversation-id>`). 

## 🌐 Temporary HTML Previews & Interactive Plans
- When creating HTML/CSS visual mockups, interactive prototypes, or project/implementation plans for the user to review:
  1. Write them as styled, colorful, and interactive HTML pages.
  2. Save the output to a temporary file in the conversation's scratch directory: `/home/slogiker/.gemini/antigravity-cli/brain/<conversation-id>/scratch/preview.html`.
  3. Propose or run a background terminal command (`xdg-open`, `google-chrome`, or `firefox`) to open it immediately in the user's browser.
  4. Run the command asynchronously so it doesn't block the workspace terminal.
  5. Ensure the file remains in the scratch directory to be cleaned up or retained as temporary data.
