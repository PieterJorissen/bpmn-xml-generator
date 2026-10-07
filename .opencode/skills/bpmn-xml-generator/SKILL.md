---
name: bpmn-xml-generator
description: >
  Generate well-formed BPMN 2.0 XML that is schema-valid against the OMG BPMN 2.0 XSD and opens
  cleanly in bpmn.io. Use whenever the user asks to create, write, design, model, or define a
  business process, workflow, or BPMN diagram — even when they only describe a flow in plain
  language. Also use it to convert YAML/JSON process definitions to BPMN, or to edit or fix an
  existing BPMN file. The skill gathers missing information before writing, emits plain BPMN 2.0
  with no vendor extensions, and always produces a diagram layout.
compatibility: opencode
---

# BPMN Authoring

Produces plain BPMN 2.0 XML: schema-valid against the OMG BPMN 2.0 XSD, parseable by
`bpmn-moddle`, and importable into bpmn-js with no warnings.

**Plain BPMN 2.0, no vendor extensions.** This is a portability choice, not a compatibility one:
a `camunda:` namespace is valid under the BPMN schema and bpmn.io imports it without complaint.
Staying vendor-neutral means the output works unchanged in any conforming tool, and engine-specific
wiring (decision refs, connector configuration, variable mapping) stays in the engine, where the
user configures it. If a user asks for their engine's extensions, add them — nothing breaks.

Shell commands in this skill are **PowerShell**.

## 1. Gather information before writing

**Never generate BPMN from an incomplete description.** Ask for every missing item below in a
single response, then write.

Always required:

- **Process key** — lowercase, hyphen-separated, URL-safe (e.g. `order-approval`).
- **Process name** — human-readable label.
- **Happy-path steps** — start to end, at least one activity.
- **Human tasks** — which steps need a person, and the user or group responsible for each.
- **Service tasks** — which steps call an external system.
- **Gateways** — conditional branches and the condition for each outgoing flow.

Ask when relevant: timer events (ISO 8601), message/signal events, error and boundary events,
sub-processes, and the variable names used in conditions.

For an ambiguous branch such as "approve or reject", confirm the gateway type, the condition on
each outgoing flow, and where each path ends.

## 2. Supported elements

Full attributes: `references/elements.md`. Do not use an element outside this list.

**Events** — `startEvent` (none, timer, message, signal, conditional), `endEvent` (none,
terminate, message, signal, error, escalation), `intermediateCatchEvent` (timer, message, signal,
conditional), `intermediateThrowEvent` (message, signal, escalation), `boundaryEvent` (timer,
error, message, signal, escalation; interrupting or not).

**Activities** — `task`, `userTask`, `serviceTask`, `scriptTask`, `sendTask`, `receiveTask`,
`businessRuleTask`, `callActivity`, `subProcess`.

**Gateways** — `exclusiveGateway` (XOR), `parallelGateway` (AND), `inclusiveGateway` (OR),
`eventBasedGateway` (first event wins).

**Connector** — `sequenceFlow` with `sourceRef`, `targetRef`, optional `conditionExpression`.

**Unsupported** — CMMN, Choreography, Conversation, DataStore, Association.

## 3. Child element order is fixed

The BPMN 2.0 schema defines child elements as an ordered sequence, so the wrong order is a
validation error even when every element is individually correct. This is the single easiest
way to produce an invalid file.

Inside an **activity** (any task, `callActivity`, `subProcess`):

```
incoming, outgoing, ioSpecification?, property*, dataInputAssociation*,
dataOutputAssociation*, potentialOwner / humanPerformer*, loopCharacteristics?
```

Inside an **event**: `incoming`, `outgoing`, then the event definition
(`timerEventDefinition`, `messageEventDefinition`, …) **last**.

Inside `<definitions>`: all root elements (`message`, `signal`, `error`, `process`) first, then
`<bpmndi:BPMNDiagram>` last.

`incoming` and `outgoing` always come first, before `ioSpecification` and before any event
definition.

## 4. File template

`targetNamespace` is mandatory and may be any valid URI; the engine does not read it. Preserve the
existing value when editing a file. Declare `<message>`, `<signal>`, and `<error>` as siblings of
`<process>`, never inside it.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<definitions
  xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
  id="Definitions_{process-key}"
  targetNamespace="http://bpmn.io/schema/bpmn"
  exporter="bpmn-xml-generator"
  exporterVersion="1.0">

  <process id="{process-key}" name="{Process Name}" isExecutable="true">

    <startEvent id="start" name="Start">
      <outgoing>flow_start_to_first</outgoing>
    </startEvent>

    <!-- activities and gateways -->

    <endEvent id="end" name="End">
      <incoming>flow_last_to_end</incoming>
    </endEvent>

    <!-- all sequence flows last -->
    <sequenceFlow id="flow_start_to_first" sourceRef="start" targetRef="..."/>

  </process>

  <!-- BPMNDiagram is appended by the layout step in §7 -->

</definitions>
```

## 5. Patterns

### userTask with a group or a named assignee
`potentialOwner` offers the task to a group; `humanPerformer` assigns it to one person. Both are
standard BPMN, and are the portable equivalent of the vendor `assignee` / `candidateGroups`.

```xml
<userTask id="review_task" name="Review Request">
  <incoming>flow_to_review</incoming>
  <outgoing>flow_from_review</outgoing>
  <humanPerformer>
    <resourceAssignmentExpression>
      <formalExpression>{{variables.manager}}</formalExpression>
    </resourceAssignmentExpression>
  </humanPerformer>
</userTask>

<userTask id="triage_task" name="Triage">
  <incoming>flow_to_triage</incoming>
  <outgoing>flow_from_triage</outgoing>
  <potentialOwner>
    <resourceAssignmentExpression>
      <formalExpression>approvers</formalExpression>
    </resourceAssignmentExpression>
  </potentialOwner>
</userTask>
```

### serviceTask
A plain `serviceTask`. How the engine dispatches it is engine configuration, not BPMN.

```xml
<serviceTask id="notify_erp" name="Notify ERP">
  <incoming>flow_to_notify</incoming>
  <outgoing>flow_from_notify</outgoing>
</serviceTask>
```

### exclusiveGateway with conditions
Give the gateway a `default` flow so no token can get stuck when every condition is false.

```xml
<exclusiveGateway id="gw_approval" name="Approved?" default="flow_rejected">
  <incoming>flow_to_gw</incoming>
  <outgoing>flow_approved</outgoing>
  <outgoing>flow_rejected</outgoing>
</exclusiveGateway>

<sequenceFlow id="flow_approved" sourceRef="gw_approval" targetRef="notify_approved">
  <conditionExpression xsi:type="tFormalExpression">{{variables.approved == true}}</conditionExpression>
</sequenceFlow>
<sequenceFlow id="flow_rejected" sourceRef="gw_approval" targetRef="end_rejected"/>
```

### Timer — intermediate catch and interrupting boundary
```xml
<intermediateCatchEvent id="wait_24h" name="Wait 24h">
  <incoming>flow_to_timer</incoming>
  <outgoing>flow_from_timer</outgoing>
  <timerEventDefinition>
    <timeDuration xsi:type="tFormalExpression">PT24H</timeDuration>
  </timerEventDefinition>
</intermediateCatchEvent>

<boundaryEvent id="timeout_boundary" name="Timeout"
               attachedToRef="review_task" cancelActivity="true">
  <outgoing>flow_timeout</outgoing>
  <timerEventDefinition>
    <timeDuration xsi:type="tFormalExpression">PT48H</timeDuration>
  </timerEventDefinition>
</boundaryEvent>
```

### Message start and catch
```xml
<startEvent id="start_on_message" name="Payment Received">
  <outgoing>flow_from_start</outgoing>
  <messageEventDefinition messageRef="msg_payment"/>
</startEvent>

<intermediateCatchEvent id="wait_payment" name="Wait for Payment">
  <incoming>flow_to_wait</incoming>
  <outgoing>flow_after_payment</outgoing>
  <messageEventDefinition messageRef="msg_payment"/>
</intermediateCatchEvent>

<!-- sibling of <process> -->
<message id="msg_payment" name="payment_received"/>
```

### businessRuleTask and callActivity
A decision reference is engine-specific and has no standard BPMN attribute — leave it out and say
so. `callActivity` names the called process with the standard `calledElement`.

```xml
<businessRuleTask id="credit_check" name="Credit Score Check">
  <incoming>flow_to_credit</incoming>
  <outgoing>flow_from_credit</outgoing>
</businessRuleTask>

<callActivity id="run_kyc" name="Run KYC" calledElement="kyc-check">
  <incoming>flow_to_kyc</incoming>
  <outgoing>flow_from_kyc</outgoing>
</callActivity>
```

## 6. Expression syntax

Conditions use `{{expression}}`. This is a convention, not part of BPMN — bpmn.io treats a
condition as opaque text, and each engine has its own expression language. Confirm it with the
target engine.

```
{{variables.amount > 1000}}                         boolean
{{variables.status == 'approved'}}                  string equality
{{variables.items.length > 0}}                      array check
{{variables.score >= 700 && variables.debt < 5000}} compound
```

Inside XML, escape `&` as `&amp;`, `<` as `&lt;`, `>` as `&gt;`. Timer values are ISO 8601 only —
`{{...}}` never appears in a timer.

## 7. Diagram layout is mandatory

**A BPMN file with no `<bpmndi:BPMNDiagram>` does not open in bpmn.io.** It reports *"no diagram
to display"* and renders an empty canvas. Always run the layout step before handing the file over.

Requires Node.js ≥ 18 and network access for `npm`. Set up the runner once:

```powershell
$Runner = Join-Path ([IO.Path]::GetTempPath()) 'bpmn-layout-runner'

foreach ($Tool in 'node', 'npm') {
    if (-not (Get-Command $Tool -ErrorAction SilentlyContinue)) {
        throw "'$Tool' is not on PATH. The layout step needs Node.js 18 or newer (https://nodejs.org). If you have just installed it, restart the shell so the new PATH is picked up."
    }
}

if (-not (Test-Path (Join-Path $Runner 'node_modules'))) {
    New-Item -ItemType Directory -Force -Path $Runner | Out-Null
    Push-Location $Runner
    try {
        npm init -y | Out-Null
        npm install bpmn-auto-layout
        if ($LASTEXITCODE -ne 0) { throw "npm install failed with exit code $LASTEXITCODE." }
    } finally { Pop-Location }
}
```

The `Get-Command` guard is not optional. A missing `npm` raises a non-terminating
`CommandNotFoundException`, so without it the block prints errors, runs to the end and **still
exits 0** — which reads as success and leads to handing over a file with no diagram section.

Create `layout.mjs` inside that runner directory — `%TEMP%\bpmn-layout-runner\layout.mjs` — with
the `write` tool:

```js
import { readFileSync, writeFileSync } from 'fs';
import { layoutProcess } from 'bpmn-auto-layout';

const [, , input, output] = process.argv;
writeFileSync(output || input, await layoutProcess(readFileSync(input, 'utf8')), 'utf8');
```

Run it against the generated file, which is rewritten in place with the diagram section:

```powershell
$Runner = Join-Path ([IO.Path]::GetTempPath()) 'bpmn-layout-runner'
node (Join-Path $Runner 'layout.mjs') .\process.bpmn
if ($LASTEXITCODE -ne 0) { throw "Layout failed; the file has no diagram section and will not open in bpmn.io." }
```

`$Runner` is redefined here on purpose: each command runs in its own shell, so a variable set in
the setup block above is gone by the time this one runs.

If either step throws, stop and tell the user what is missing. Never hand over the file anyway —
it will open blank. Report the missing prerequisite; do not try to hand-write the diagram section.

Two things to know about the output:

- It re-serialises the file, normalising attribute order and rewriting `<formalExpression>` as
  `<expression xsi:type="tFormalExpression">`. Both are valid; do not undo it.
- An embedded `subProcess` is treated as a black box: the parent renders collapsed and its
  children are laid out in a separate coordinate space, so they are not visible on the canvas.
  When a sub-flow must be visible, model it as a separate process invoked by a `callActivity`.

## 8. Validation checklist

Structure:

- Every element has a unique `id`.
- Every `sequenceFlow` has `sourceRef` and `targetRef` resolving to declared IDs.
- Every element has `<incoming>` except start events, and `<outgoing>` except end events.
- Child elements are in schema order (§3) — `incoming`/`outgoing` first, event definitions last.
- Every flow out of an `exclusiveGateway` has a condition, unless it is the gateway's `default`.
- A `parallelGateway` join has one `<incoming>` per branch of its split.
- Every `boundaryEvent` has `attachedToRef` and no `<incoming>`.
- Timer values are valid ISO 8601 — durations start with `P`, dates carry a time zone.
- `isExecutable="true"` on `<process>`; `targetNamespace` on `<definitions>`.
- `<message>`, `<signal>`, and `<error>` are siblings of `<process>`.

Cleanliness in bpmn.io:

- A `<bpmndi:BPMNDiagram>` section is present (§7).
- Every `<ioSpecification>`, if used at all, has both `<inputSet>` and `<outputSet>` — the schema
  requires them. See `references/elements.md`.
- Every `<dataInputAssociation>` has a `<targetRef>`, and each `<sourceRef>` names a declared
  element `id`, not a bare variable name.

## 9. Output

Write the complete XML — never truncate. Use 2-space indentation, kebab-case process IDs,
`flow_{source}_to_{target}` flow IDs, `gw_{purpose}` gateway IDs, and group all `sequenceFlow`
elements at the bottom of `<process>`. Run the layout step, then tell the user the file is ready
to open at demo.bpmn.io and that engine-specific wiring is theirs to add.

## 10. References

| File | Read when |
|---|---|
| `references/elements.md` | Full attribute reference per element |
| `references/examples.md` | Four complete processes, each verified to open in bpmn.io |
| `references/validation-errors.md` | A schema, `bpmn-moddle`, or bpmn.io error needs diagnosing |
