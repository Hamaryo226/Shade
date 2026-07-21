// Discord application command definitions, shared between the Worker (for reference)
// and scripts/register-commands.ts (which registers these with Discord's REST API).
// Option type numbers: STRING=3, CHANNEL=7, ROLE=8. Subcommand type=1.

const MANAGE_ROLES_PERMISSION = "268435456"; // 1 << 28, as a permission bitfield string

export const commandDefinitions = [
  {
    name: "rolemenu",
    description: "Manage button-based reaction role menus",
    default_member_permissions: MANAGE_ROLES_PERMISSION,
    options: [
      {
        type: 1,
        name: "create",
        description: "Post a new role menu message",
        options: [
          { type: 3, name: "title", description: "Embed title", required: true },
          { type: 3, name: "description", description: "Embed description", required: true },
          { type: 7, name: "channel", description: "Channel to post in (defaults to current channel)", required: false },
        ],
      },
      {
        type: 1,
        name: "add",
        description: "Bind an emoji-labeled button to a role on a menu message",
        options: [
          { type: 3, name: "message_id", description: "The role menu message ID", required: true },
          { type: 3, name: "emoji", description: "Emoji to show on the button (unicode or <:name:id>)", required: true },
          { type: 8, name: "role", description: "Role to grant/revoke when the button is clicked", required: true },
        ],
      },
      {
        type: 1,
        name: "remove",
        description: "Remove a role's button from a menu message",
        options: [
          { type: 3, name: "message_id", description: "The role menu message ID", required: true },
          { type: 8, name: "role", description: "Role to unbind", required: true },
        ],
      },
      {
        type: 1,
        name: "delete",
        description: "Delete a role menu's registration (does not delete the Discord message)",
        options: [{ type: 3, name: "message_id", description: "The role menu message ID", required: true }],
      },
      {
        type: 1,
        name: "list",
        description: "List role menus and their button/role bindings",
        options: [
          { type: 3, name: "message_id", description: "Show bindings for a specific menu only", required: false },
        ],
      },
    ],
  },
];
