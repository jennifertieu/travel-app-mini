export const aiTools = [
  {
    type: "function" as const,
    name: "example_tool",
    description:
      "Add a very detailed description here about what the tool is, what it does, and when to use it. The ai will read this part to reason whether or not to use it.",
    parameters: {
      type: "object",
      properties: {
        anyPropYouWant: {
          type: "string",
          description:
            "Describe what the prop is. Like if the prop is 'user': The object of the user. You don't always need this and can just leave as 'properties: {}' if your function doesn't need any arguments.",
        },
      },
      required: ["name of prop"],
      additionalProperties: false,
    },
    strict: true,
  },
];
