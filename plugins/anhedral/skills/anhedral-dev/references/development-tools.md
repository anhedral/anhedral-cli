# Development tools

Choose tools for the task; these references do not install plugins or grant access.
Read the matching installed skill before using its specialized workflow.

| Reference | Use |
| --- | --- |
| [Fallow Code Analysis](https://chatgpt.com/plugins/plugins_6a624898730881919216754948072580?open_in_app) | JS/TS review, architecture, duplication and cleanup. Assess findings against actual callers before removing code; use focused analysis instead of a full audit for every edit. |
| [GitHub](https://chatgpt.com/plugins/github?open_in_app) | Repository, PR, issue and CI context. Verify repository/revision and keep remote writes within the request. |
| [Computer Use](https://learn.chatgpt.com/docs/computer-use) | Reproduce visible bugs and exercise real app flows. Prefer structured integrations for data operations; inspect actual UI state for visual work. |
| [Browser extension](https://learn.chatgpt.com/docs/chrome-extension) | Verify browser flows in the selected permitted profile/session. Consult setup guidance when needed; keep credentials and captured private content out of reports. |

Reproduce the affected flow before a fix and exercise it afterward, including
relevant responsive and keyboard states. Code analysis, CI and browser acceptance
provide different evidence. If a tool is unavailable, continue independent work
and identify the remaining check without changing access policy to bypass it.
