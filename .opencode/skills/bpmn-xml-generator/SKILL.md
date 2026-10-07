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

Do not infer or invent any of it. An assignee, a gateway condition and a variable name are facts
about the user's process, not defaults you can pick — a plausible guess is indistinguishable from
a fact in the output, and silently wrong. If it was not stated, it goes in the question.

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

## 7. Finish the file: layout and validation

**A BPMN file with no `<bpmndi:BPMNDiagram>` does not open in bpmn.io** — it reports *"no diagram
to display"* and renders an empty canvas. The same step that adds the diagram also validates the
result, so neither can be skipped. It is two commands. Run both, every time.

Node.js is used but does **not** have to be installed: if `node` is not on PATH, the runner fetches
the official portable Windows build into its own temp directory — no installer, no administrator
rights. Network access is required.

**Step 1 — set up the runner.** This also writes `finish.mjs`, so there is nothing to author by
hand. Safe to re-run; it reuses what is already there.

```powershell
$ErrorActionPreference = 'Stop'
$Runner = Join-Path ([IO.Path]::GetTempPath()) 'bpmn-layout-runner'
New-Item -ItemType Directory -Force -Path $Runner | Out-Null

# Node from PATH if present; otherwise a portable copy under $Runner (no install, no admin).
if (Get-Command node -ErrorAction SilentlyContinue) {
    $NodeExe = 'node'
    $NpmCli  = $null
} else {
    $NodeVersion = 'v24.21.0'
    $NodeDir = Join-Path $Runner "node-$NodeVersion-win-x64"
    $NodeExe = Join-Path $NodeDir 'node.exe'
    $NpmCli  = Join-Path $NodeDir 'node_modules\npm\bin\npm-cli.js'
    if (-not (Test-Path $NodeExe)) {
        Write-Host "Node not found on PATH; downloading a portable copy to $Runner (no install, no admin)."
        $Zip = Join-Path $Runner 'node.zip'
        Invoke-WebRequest "https://nodejs.org/dist/$NodeVersion/node-$NodeVersion-win-x64.zip" -OutFile $Zip -UseBasicParsing
        Expand-Archive -Path $Zip -DestinationPath $Runner -Force
        Remove-Item $Zip
    }
    if (-not (Test-Path $NodeExe)) { throw "Portable Node download failed; expected $NodeExe." }
}

if (-not (Test-Path (Join-Path $Runner 'node_modules\bpmn-auto-layout'))) {
    Push-Location $Runner
    try {
        if ($NpmCli) { & $NodeExe $NpmCli install bpmn-auto-layout }
        else         { npm install bpmn-auto-layout }
    } finally { Pop-Location }
}
if (-not (Test-Path (Join-Path $Runner 'node_modules\bpmn-auto-layout'))) {
    throw "bpmn-auto-layout is not installed in $Runner. The layout step cannot run."
}

# Single-quoted here-string: literal, so the JS ${...} is not touched by PowerShell.
$Finish = @'
import { readFileSync, writeFileSync } from 'fs';
import { layoutProcess } from 'bpmn-auto-layout';
import { BpmnModdle } from 'bpmn-moddle';

const [, , input, output] = process.argv;
const target = output || input;
const errors = [], notes = [];

// Parse the INPUT first: layout silently drops references it cannot resolve.
const before = await new BpmnModdle().fromXML(readFileSync(input, 'utf8'));
for (const w of before.warnings) errors.push(`input: ${w.message}`);

writeFileSync(target, await layoutProcess(readFileSync(input, 'utf8')), 'utf8');
const { rootElement, warnings } = await new BpmnModdle().fromXML(readFileSync(target, 'utf8'));
for (const w of warnings) errors.push(w.message);

const shaped = new Set();
for (const d of rootElement.diagrams || [])
  for (const e of d.plane?.planeElement || []) shaped.add(e.bpmnElement?.id);
if (!(rootElement.diagrams || []).length)
  errors.push('no BPMNDiagram: bpmn.io will show "no diagram to display"');
if (!rootElement.targetNamespace) errors.push('definitions: targetNamespace is missing');

const DUR  = /^P(?!$)(\d+Y)?(\d+M)?(\d+W)?(\d+D)?(T(?!$)(\d+H)?(\d+M)?(\d+(\.\d+)?S)?)?$/;
const DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;
const timer = (el, def) => {
  for (const [k, re, what] of [['timeDuration', DUR, 'an ISO 8601 duration like PT1H'],
                               ['timeDate', DATE, 'an ISO 8601 timestamp with a time zone'],
                               ['timeCycle', /^R\d*\/.+$/, 'an ISO 8601 repeating cycle like R3/PT24H']]) {
    const v = def[k]?.body?.trim();
    if (v === undefined) continue;
    if (v.includes('{{')) errors.push(`${el.id}: timer ${k} is "${v}" - timers take ISO 8601 only, never an expression`);
    else if (!re.test(v)) errors.push(`${el.id}: timer ${k} is "${v}" - expected ${what}`);
  }
};
const BAD_EXPR = /\$\{|#\{/;

const walk = (el, fn) => { fn(el); for (const c of el.flowElements || []) walk(c, fn); };
for (const proc of rootElement.rootElements.filter(e => e.$type === 'bpmn:Process')) {
  if (!proc.isExecutable) errors.push(`process ${proc.id}: isExecutable is not true`);
  walk(proc, el => {
    if (el.$type === 'bpmn:Process') return;
    if (!shaped.has(el.id) && !/SubProcess$/.test(el.$parent?.$type || ''))
      errors.push(`${el.id}: no BPMNShape/BPMNEdge, will not render`);
    if (el.$type === 'bpmn:BoundaryEvent' && !el.attachedToRef)
      errors.push(`${el.id}: boundaryEvent has no attachedToRef`);
    if (el.ioSpecification && (!el.ioSpecification.inputSets?.length || !el.ioSpecification.outputSets?.length))
      errors.push(`${el.id}: ioSpecification needs both inputSet and outputSet`);
    for (const a of el.dataInputAssociations || [])
      if (!a.targetRef) errors.push(`${el.id}: dataInputAssociation has no targetRef`);
    for (const def of el.eventDefinitions || [])
      if (def.$type === 'bpmn:TimerEventDefinition') timer(el, def);
    const cond = el.conditionExpression?.body;
    if (cond && BAD_EXPR.test(cond))
      errors.push(`${el.id}: condition uses FEEL/UEL syntax ("${cond.trim()}") - this skill uses {{...}}`);
    if (el.$type === 'bpmn:ExclusiveGateway' && (el.outgoing || []).length > 1)
      for (const f of el.outgoing)
        if (!f.conditionExpression && f !== el.default)
          errors.push(`${f.id}: flow out of ${el.id} has no condition and is not its default`);
  });
}
for (const a of Object.keys(rootElement.$attrs || {}))
  if (/^xmlns:(?!xsi$|dc$|di$|bpmndi$)/.test(a))
    notes.push(`${a} is a vendor namespace — valid and renders fine, but not portable`);

for (const n of notes) console.log('note: ' + n);
if (errors.length) {
  console.error(`FAIL ${target}`);
  for (const e of errors) console.error('  - ' + e);
  process.exit(1);
}
console.log(`OK ${target} — layout applied, ${shaped.size} elements rendered, no findings`);
'@
Set-Content -Path (Join-Path $Runner 'finish.mjs') -Value $Finish -Encoding utf8
Write-Host "Runner ready at $Runner"
```

**Step 2 — finish the file.** Replace `.\process.bpmn` with your output path.

```powershell
$ErrorActionPreference = 'Stop'
$Runner = Join-Path ([IO.Path]::GetTempPath()) 'bpmn-layout-runner'
$NodeExe = if (Get-Command node -ErrorAction SilentlyContinue) { 'node' }
           else { (Get-ChildItem (Join-Path $Runner 'node-*-win-x64\node.exe')).FullName }
& $NodeExe (Join-Path $Runner 'finish.mjs') .\process.bpmn
if ($LASTEXITCODE -ne 0) { throw "Validation failed; see the findings above. Do not hand over this file." }
```

On success it prints `OK <file> — layout applied, N elements rendered, no findings`.

**A file that has not printed `OK` is not finished.** Fix the findings it lists and run step 2
again. Lines beginning `note:` are advisory and do not fail the run. If a step throws, stop and
tell the user what is missing — never hand over the file anyway, and never hand-write the diagram
section.

Both blocks re-resolve `$Runner` and `$NodeExe` on purpose: each command runs in its own shell, so
variables from step 1 are gone by step 2.

Two things to know about the output:

- It re-serialises the file, normalising attribute order and rewriting `<formalExpression>` as
  `<expression xsi:type="tFormalExpression">`. Both are valid; do not undo it. This also fixes
  child element order (§3) automatically, so §3 is guidance for writing, not something to police.
- An embedded `subProcess` is treated as a black box: the parent renders collapsed and its
  children are laid out in a separate coordinate space, so they are not visible on the canvas.
  When a sub-flow must be visible, model it as a separate process invoked by a `callActivity`.

## 8. What the validator checks, and what it cannot

`finish.mjs` (§7) is the validation step. It is not a checklist to apply from memory — reading the
XML and judging it correct is exactly how the four defects in this repo's own examples survived
until a parser was pointed at them.

It fails the run on:

- any `bpmn-moddle` parse warning, including unresolved references — checked against the **input**
  as well, because the layout pass silently drops references it cannot resolve
- a missing `<bpmndi:BPMNDiagram>`, or any flow node or sequence flow with no shape or edge
- `boundaryEvent` without `attachedToRef`
- `ioSpecification` missing `<inputSet>` or `<outputSet>`
- `dataInputAssociation` without `<targetRef>`
- a flow out of an `exclusiveGateway` with no condition that is not the gateway's `default`
- a timer value that is not valid ISO 8601, or that contains an expression
- a condition written in FEEL (`#{}`) or UEL (`${}`) instead of `{{...}}`
- `isExecutable` not true, or `targetNamespace` missing

It reports as a note, without failing: a vendor namespace. That is a portability preference, not
an error — such files are schema-valid and render in bpmn.io.

It cannot check whether the process is the *right* process. Still yours to judge:

- the flow matches what the user described, and every path reaches an end event
- conditions are collectively exhaustive, and the `default` is the branch they meant
- a `parallelGateway` join has one `<incoming>` per branch of its split
- timer durations are the intended intervals
- names read the way the user would expect in a task list

## 9. Output

Write the complete XML — never truncate. Use 2-space indentation, kebab-case process IDs,
`flow_{source}_to_{target}` flow IDs, `gw_{purpose}` gateway IDs, and group all `sequenceFlow`
elements at the bottom of `<process>`. Run the layout step, then tell the user the file is ready
to open at demo.bpmn.io and that engine-specific wiring is theirs to add.

## 10. References

| File | Read when |
|---|---|
| `references/elements.md` | Before using any element whose attributes are not shown in §5 |
| `references/examples.md` | A complete worked file is needed, or §5 leaves the shape unclear |
| `references/validation-errors.md` | A schema, `bpmn-moddle`, or bpmn.io error needs diagnosing |
