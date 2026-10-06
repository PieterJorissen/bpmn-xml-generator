# bpmn-xml-generator

An [opencode](https://opencode.ai) skill that generates valid BPMN 2.0 XML from plain-language
descriptions. Describe a business process and get XML compatible with any `bpmn-moddle`-based
process engine (Camunda, Flowable, and compatible engines).

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)

## What it does

The skill activates automatically when you ask opencode to create, model, design, or fix a BPMN
process. It:

- **Gathers information before writing** — asks for missing details (assignees, conditions,
  variable names) in a single question rather than generating incomplete XML.
- **Produces schema-valid XML** — parseable by `bpmn-moddle` without errors.
- **Enforces structural correctness** — sequence flow connectivity, gateway conditions, ISO 8601
  timer formats, and Camunda extension usage are checked before output.
- **Includes ready-made patterns** — `userTask`, `serviceTask`, gateways, timer and boundary
  events, message correlation, DMN rule tasks, sub-processes, and `callActivity`.
- **Generates diagram layout** — optionally adds a `BPMNDiagram` section so the file opens in
  [bpmn.io](https://demo.bpmn.io/), via [`bpmn-auto-layout`](https://github.com/bpmn-io/bpmn-auto-layout).

## Requirements

- opencode
- PowerShell (the skill's shell commands are PowerShell)
- Node.js ≥ 18 — only for the optional diagram layout step

## Installation

Run from the root of your project:

```powershell
irm https://raw.githubusercontent.com/PieterJorissen/bpmn-xml-generator/main/install.ps1 | iex
```

Installs to `.opencode/skills/bpmn-xml-generator/`.

Global install, available in every project:

```powershell
$s = irm https://raw.githubusercontent.com/PieterJorissen/bpmn-xml-generator/main/install.ps1
& ([scriptblock]::Create($s)) -Global
```

Manual install:

```powershell
git clone https://github.com/PieterJorissen/bpmn-xml-generator.git
Copy-Item -Recurse bpmn-xml-generator/.opencode/skills/bpmn-xml-generator .opencode/skills/
```

Start a new opencode session to activate the skill.

## Use cases

Model a process from scratch:

```
Create a BPMN for an expense reimbursement process. A finance analyst reviews
requests over $500, while smaller amounts are auto-approved.
```

Convert a description to BPMN:

```
Convert this flow to BPMN:
1. Customer places an order
2. System reserves stock
3. Wait up to 24h for payment confirmation
4. If payment received → ship order; if timeout → cancel order and release stock
```

Edit an existing file:

```
Add a 48-hour boundary timer to the "KYC Review" task that escalates to a
senior analyst if not completed in time.
```

### Patterns covered

| Pattern | Elements |
|---|---|
| Human approval flow | `userTask`, `exclusiveGateway` |
| Parallel steps (AND split/join) | `parallelGateway` |
| Wait for external event | `intermediateCatchEvent` (message or timer) |
| Timeout escalation | `boundaryEvent` (timer, interrupting) |
| Race between events | `eventBasedGateway` |
| DMN decision table | `businessRuleTask` with `camunda:decisionRef` |
| Call a sub-process | `callActivity` |
| Script / computed variable | `scriptTask` |

## Layout

| File | Purpose |
|---|---|
| `SKILL.md` | Authoring rules, element list, patterns, validation checklist |
| `references/elements.md` | Full attribute reference per element |
| `references/examples.md` | Four complete, ready-to-upload BPMN examples |
| `references/validation-errors.md` | `bpmn-moddle` and engine errors, with fixes |

## Contributing

Issues and pull requests are welcome.

For bugs, include the prompt you used, the XML output, and the parse or engine error. For feature
requests, name the BPMN pattern or element you need and give a concrete example.

For pull requests: branch from `main`, change the files under
`.opencode/skills/bpmn-xml-generator/`, and verify that any new XML snippet is valid BPMN 2.0
(parseable by `bpmn-moddle`).

## License

[Apache License 2.0](LICENSE)
