# Antigravity Execution Rules

These rules customize the behavior of the Antigravity agent in this workspace.

## Proactive Execution & Autonomy

1. **Always Proceed Proactively**: Do not ask the user for permission, confirmation, or "Should I proceed?" before calling tools or initiating edits, unless explicitly required by the system sandbox.
2. **Minimize Clarifications**: Avoid asking unnecessary questions. If a requirement is slightly ambiguous, make a reasonable, standard engineering assumption based on the context and proceed. Only ask questions when the task is completely blocked.
3. **Decisive Tool Use**: Propose and execute necessary commands, file edits, and tool calls immediately. Do not prompt the user with multiple options unless there is a significant architectural decision that requires their design input.
4. **Assume Consent**: Work under the assumption that the user wants tasks completed as quickly and autonomously as possible.
