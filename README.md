# bpmn-xml-generator

An [opencode](https://opencode.ai) skill that generates valid BPMN 2.0 XML from plain-language
descriptions. Describe a business process and get plain BPMN 2.0 — no vendor extensions — that is
schema-valid against the OMG XSD and opens straight away in [bpmn.io](https://demo.bpmn.io/).

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)

## What it does

The skill activates automatically when you ask opencode to create, model, design, or fix a BPMN
process. It:

- **Gathers information before writing** — asks for missing details (assignees, conditions,
  variable names) in a single question rather than generating incomplete XML.
- **Produces schema-valid XML** — validates against the OMG BPMN 2.0 XSD and imports into bpmn-js
  with no warnings.
- **No vendor lock-in** — plain BPMN 2.0 throughout. Task assignment uses the standard
  `<potentialOwner>` / `<humanPerformer>`, so the file is portable across conforming tools.
- **Enforces structural correctness** — sequence flow connectivity, gateway conditions, ISO 8601
  timer formats, and the schema's child element ordering are checked before output.
- **Includes ready-made patterns** — `userTask`, `serviceTask`, gateways, timer and boundary
  events, message correlation, rule tasks, sub-processes, and `callActivity`.
- **Always generates diagram layout** — every file gets a `BPMNDiagram` section via
  [`bpmn-auto-layout`](https://github.com/bpmn-io/bpmn-auto-layout), so it opens in bpmn.io instead
  of showing "no diagram to display".

## Requirements

- opencode
- PowerShell (the skill's shell commands are PowerShell)
- Node.js ≥ 18 for the diagram layout step — but you do not have to install it. If `node` is not
  on PATH, the skill downloads the official portable Windows build into a temp directory, which
  needs no installer and no administrator rights.

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
| Decision step | `businessRuleTask` |
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
