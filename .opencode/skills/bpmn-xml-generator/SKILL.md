---
name: bpmn-xml-generator
description: >
  Generate well-formed, valid BPMN 2.0 XML compatible with BPMN 2.0-compliant process engines.
  Use whenever the user asks to create, write, design, model, or define a business process,
  workflow, or BPMN diagram — even when they only describe a flow in plain language. Also use it
  to convert YAML/JSON process definitions to BPMN, or to edit or fix an existing BPMN file.
  The skill gathers missing information before writing and enforces schema and engine constraints.
compatibility: opencode
---

# BPMN Authoring

Produces BPMN 2.0 XML parseable by `bpmn-moddle` (bpmn-io) and executable by Camunda- and
Flowable-compatible engines.

Shell commands in this skill are **PowerShell**.

## 1. Gather information before writing

**Never generate BPMN from an incomplete description.** Ask for every missing item below in a
single response, then write.

Always required:

- **Process key** — lowercase, hyphen-separated, URL-safe (e.g. `order-approval`).
- **Process name** — human-readable label.
- **Happy-path steps** — start to end, at least one activity.
- **Human tasks** — which steps need a person; assignee or candidate group for each.
- **Service tasks** — which steps call external systems, and the implementation type.
- **Gateways** — conditional branches and the condition for each outgoing flow.

Ask when relevant: timer events (ISO 8601), message/signal events, error and boundary events,
sub-processes, DMN decisions (the `id` of a DMN definition already registered in the engine),
process variable names, which variables each `userTask` exposes, initial variable values, and
whether the output should include a `BPMNDiagram` layout section (see §7).

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

## 3. File template

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
  xmlns:camunda="http://camunda.org/schema/1.0/bpmn"
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

</definitions>
```

The `camunda` namespace is required for `userTask` attributes (`assignee`, `candidateGroups`,
`dueDate`, `formKey`) and for `callActivity` / `businessRuleTask` variable passing.

## 4. Patterns

### userTask with assignee and exposed variables
```xml
<userTask id="review_task" name="Review Request"
          camunda:assignee="{{variables.manager}}"
          camunda:candidateGroups="approvers">
  <extensionElements>
    <camunda:formData>
      <camunda:formField id="approved" label="Approved?" type="boolean"/>
      <camunda:formField id="comment"  label="Comment"   type="string"/>
    </camunda:formData>
  </extensionElements>
  <ioSpecification>
    <dataInput  id="in_amount"    name="amount"/>
    <dataOutput id="out_approved" name="approved"/>
  </ioSpecification>
  <incoming>flow_to_review</incoming>
  <outgoing>flow_from_review</outgoing>
</userTask>
```

### serviceTask (webhook)
```xml
<serviceTask id="notify_erp" name="Notify ERP" implementation="webService">
  <extensionElements>
    <camunda:connector>
      <camunda:connectorId>webhook</camunda:connectorId>
    </camunda:connector>
  </extensionElements>
  <incoming>flow_to_notify</incoming>
  <outgoing>flow_from_notify</outgoing>
</serviceTask>
```

### exclusiveGateway with conditions
```xml
<exclusiveGateway id="gw_approval" name="Approved?">
  <incoming>flow_to_gw</incoming>
  <outgoing>flow_approved</outgoing>
  <outgoing>flow_rejected</outgoing>
</exclusiveGateway>

<sequenceFlow id="flow_approved" sourceRef="gw_approval" targetRef="notify_approved">
  <conditionExpression xsi:type="tFormalExpression">{{variables.approved == true}}</conditionExpression>
</sequenceFlow>
<sequenceFlow id="flow_rejected" sourceRef="gw_approval" targetRef="end_rejected">
  <conditionExpression xsi:type="tFormalExpression">{{variables.approved == false}}</conditionExpression>
</sequenceFlow>
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

### businessRuleTask (DMN)
`decisionRef` must be the `id` of a DMN definition already registered in the engine.
```xml
<businessRuleTask id="credit_check" name="Credit Score Check"
                  camunda:decisionRef="credit-score-decision">
  <extensionElements>
    <camunda:in  variables="all"/>
    <camunda:out variables="all"/>
  </extensionElements>
  <incoming>flow_to_credit</incoming>
  <outgoing>flow_from_credit</outgoing>
</businessRuleTask>
```

### Message start and catch
```xml
<startEvent id="start_on_message" name="Payment Received">
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

## 5. Expression syntax

Use `{{expression}}` — never FEEL (`#{}`) or UEL (`${}`). Syntax is engine-dependent; confirm with
the target engine.

```
{{variables.amount > 1000}}                         boolean
{{variables.status == 'approved'}}                  string equality
{{variables.items.length > 0}}                      array check
{{variables.manager || 'default@company.com'}}      fallback
{{variables.score >= 700 && variables.debt < 5000}} compound
```

Valid in `<conditionExpression>` and in `camunda:` string attributes. Timer values are ISO 8601
only — `{{...}}` never appears in a timer. Inside XML, escape `&` as `&amp;`, `<` as `&lt;`.

## 6. Validation checklist

- Every element has a unique `id`.
- Every `sequenceFlow` has `sourceRef` and `targetRef` resolving to declared IDs.
- Every element has `<incoming>` except start events, and `<outgoing>` except end events.
- Every flow out of an `exclusiveGateway` has a condition, unless it is the gateway's `default`.
- A `parallelGateway` join has one `<incoming>` per branch of its split.
- Every `boundaryEvent` has `attachedToRef` and no `<incoming>`.
- Timer values are valid ISO 8601 — durations start with `P`, dates carry a time zone.
- `isExecutable="true"` on `<process>`; `targetNamespace` on `<definitions>`.
- `<message>`, `<signal>`, and `<error>` are siblings of `<process>`.
- No CMMN, Choreography, Conversation, or DataStore elements.

## 7. Output

Write the complete XML — never truncate. Use 2-space indentation, kebab-case process IDs,
`flow_{source}_to_{target}` flow IDs, `gw_{purpose}` gateway IDs, and group all `sequenceFlow`
elements at the bottom of `<process>`. Afterwards, tell the user to upload the file through their
engine's definition API.

**Diagram layout (only when the user asked for it).** Requires Node.js ≥ 18 and network access for
`npm`. Set up the runner once:

```powershell
$Runner = Join-Path ([IO.Path]::GetTempPath()) 'bpmn-layout-runner'
if (-not (Test-Path (Join-Path $Runner 'node_modules'))) {
    New-Item -ItemType Directory -Force -Path $Runner | Out-Null
    Push-Location $Runner
    npm init -y | Out-Null
    npm install bpmn-auto-layout
    Pop-Location
}
```

Then create `layout.mjs` in `$Runner` with the `write` tool:

```js
import { readFileSync, writeFileSync } from 'fs';
import { layoutProcess } from 'bpmn-auto-layout';

const [, , input, output] = process.argv;
writeFileSync(output || input, await layoutProcess(readFileSync(input, 'utf8')), 'utf8');
console.log('Layout applied.');
```

Run it against the generated file, which is rewritten in place with a `<bpmndi:BPMNDiagram>`
section:

```powershell
node (Join-Path $Runner 'layout.mjs') .\process.bpmn
```

## 8. References

| File | Read when |
|---|---|
| `references/elements.md` | Full attribute reference per element |
| `references/examples.md` | Four complete end-to-end processes |
| `references/validation-errors.md` | A `bpmn-moddle` or engine error needs diagnosing |
