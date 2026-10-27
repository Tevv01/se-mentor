---
name: status
description: Show the se-mentor settings that apply in the current repo - the detected stack pack, friction level and checks, focus modules with levels, reviews due and open drills. Use when the user asks what se-mentor is set to, which stack it thinks this project uses, or for their se-mentor status.
---

# se-mentor status

```!
node "${CLAUDE_PLUGIN_ROOT}/scripts/mentor.js" summary
```

Show the summary above to the learner as it is, without adding advice or commentary.
Then add one line on how to change things: `/se-mentor:setup change` for the profile
(stacks, focus modules, friction). If the detected stack is wrong, a custom copy of the
pack with a different `detect:` line fixes it (`/se-mentor:extend stack <name>`).
