# AGENTS.md

Guidance for agents working in this repository.

## What this repository is

An **opencode skill** for generating valid BPMN 2.0 XML compatible with BPMN 2.0-compliant process
engines. It has no build system, test runner, or application code — it is documentation and skill
configuration only.

The skill lives at `.opencode/skills/bpmn-xml-generator/`, one of the directories opencode scans
for skills, and is invoked automatically when a user asks to create, model, or convert a business
process or BPMN diagram.

Shell commands in this repository, including those the skill tells the agent to run, are
**PowerShell**.

## File structure

```
.opencode/skills/bpmn-xml-generator/
  SKILL.md                        # Entry point: frontmatter + all authoring rules
  references/
    elements.md                   # Full attribute reference for every supported element
    examples.md                   # 4 complete valid BPMN examples
    validation-errors.md          # bpmn-moddle parse errors and fixes
install.ps1                       # PowerShell installer
```

`SKILL.md` frontmatter uses only the fields opencode recognises: `name` (must match the directory
name), `description`, and the optional `license`, `compatibility`, and `metadata`. Anything else is
ignored.

## Architecture and design constraints

### Output constraints
- **Plain BPMN 2.0 only — no vendor namespace.** No `camunda:` prefix, no engine-specific
  attributes. Assignment uses standard `<potentialOwner>` / `<humanPerformer>`; decision refs,
  connector config and variable mapping are left for the user to add in their engine's own terms
- Output must be schema-valid against the OMG BPMN 2.0 XSD and import into bpmn-js with no warnings
- **A `<bpmndi:BPMNDiagram>` section is mandatory** — without it bpmn.io reports "no diagram to
  display" and renders nothing. It is generated with `bpmn-auto-layout`, never by hand
- Child elements follow schema order: `incoming`/`outgoing` first, event definitions last,
  process-level `<property>` before the flow elements
- An `<ioSpecification>`, if present, needs both `<inputSet>` and `<outputSet>`; a
  `<dataInputAssociation>` needs a `<targetRef>`, and refs name element ids, not variable names
- Expression syntax: `{{variables.fieldName}}` — a convention, not BPMN; bpmn.io treats conditions
  as opaque text and each engine differs
- Timer values: ISO 8601 only — `{{...}}` is not valid inside a timer expression
- `<process isExecutable="true">` is mandatory
- `targetNamespace` on `<definitions>` is mandatory (any valid URI; the engine does not read it —
  `http://bpmn.io/schema/bpmn` is the conventional default for new files)
- `<message>`, `<signal>`, and `<error>` must be siblings of `<process>` inside `<definitions>`
- Not supported: CMMN, Choreography, Conversation, DataStore

### Output conventions
- Process IDs: kebab-case (becomes the process key in the engine)
- Flow IDs: `flow_{source}_to_{target}`; gateway IDs: `gw_{purpose}`
- All `<sequenceFlow>` elements grouped at the bottom of `<process>`, after all nodes
- 2-space indentation throughout

### Information gathering (skill behaviour)
The skill must ask before writing whenever the process description is incomplete. Required:
process key, name, happy-path steps, human tasks with assignees, service tasks with implementation
type, and any gateway conditions. All missing items are asked in a single response.

## Editing guidelines

- `SKILL.md` is the source of truth for skill behaviour. All rules, patterns, and constraints live
  there. Keep it lean — content that does not change the output does not belong in it.
- `elements.md` is reference-only — update it when supported engine extensions change.
- `examples.md` examples must stay schema-valid and importable into bpmn-js with no warnings, and
  each must carry its own `<bpmndi:BPMNDiagram>`. Verify any change by extracting the XML from the
  Markdown and running it through both `xmllint --schema` (OMG BPMN20.xsd) and a bpmn-js import —
  validate what is in the file, not what you intended to write.
- `validation-errors.md` — add entries as new error patterns are found; keep codes sequential.
- XML escaping in examples: `&&` → `&amp;&amp;`, `<` → `&lt;` in element content and attribute
  values.
