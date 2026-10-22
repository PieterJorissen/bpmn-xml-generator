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

Produces plain BPMN 2.0: schema-valid against the OMG BPMN 2.0 XSD and importable into bpmn-js
with no warnings. No vendor extensions by default, so the output works in any conforming tool —
if the user asks for their engine's, add them.

Shell commands in this skill are **PowerShell**.

## 1. The procedure

1. Gather what is missing (§2) — one question, then write.
2. Write the XML (§4, §5) and **save it to `{process-key}.bpmn`** in the working directory, or to
   the path the user gave.
3. Run the finish step, both commands (§7). It adds the diagram and validates the file.
4. Fix anything it reports and run step 3 again, until it prints `OK`.
5. Tell the user the file is ready to open at demo.bpmn.io, and that engine-specific wiring is
   theirs to add.

The finish step works on a file on disk, so step 2 is not optional — XML that only exists in your
reply cannot be laid out or validated.

## 2. Gather information before writing

**Never generate BPMN from an incomplete description.** Ask for every missing item below in a
single response, then write.

Do not infer or invent any of it. An assignee, a gateway condition and a variable name are facts
about the user's process, not defaults you can pick — a plausible guess is indistinguishable from
a fact in the output. If it was not stated, it goes in the question.

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

**Lanes.** The responsible parties are already the lane list, so do not add a round trip. If they
name two or more distinct parties, offer lanes in that same question — *"I can group these into
lanes by responsible party (A, B, C); want that?"* — and say lanes are visual grouping only, so
assignment stays on the tasks either way. One party, or no answer: no lanes, and do not raise it.

Lanes cover the whole diagram, not only the human steps. Every flow node needs one, so agree where
the rest go: put automated steps in a lane of their own (`System` or similar), and a gateway in the
lane of whoever owns the decision.

## 3. Supported elements

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

**Partition** — `laneSet` / `lane`, to group flow nodes visually by responsible party.

**Data** — `dataObject` with a `dataObjectReference`, linked to an activity by
`dataInputAssociation` / `dataOutputAssociation`.

**Unsupported** — CMMN, Choreography, Conversation, Association, and `dataStore` /
`dataStoreReference`. A `dataStore` is persistent storage outside the process and is a different
element from the `dataObject` above, which is data flowing through this process instance.

## 4. File template

`targetNamespace` is mandatory and may be any valid URI; the engine does not read it. Preserve the
existing value when editing a file. Declare `<message>`, `<signal>`, and `<error>` as siblings of
`<process>`, never inside it.

Child elements are an ordered sequence in the schema: `incoming` and `outgoing` come first, before
`ioSpecification` and before any event definition, and a process-level `<property>` precedes the
flow elements. Write them in that order — the finish step also normalises it. Full order in
`references/elements.md`.

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
  exporter="bpmn-xml-generator">

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

  <!-- the finish step (§7) appends BPMNDiagram here -->

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

### Lanes
A `laneSet` partitions the diagram visually. It carries **no** assignment semantics — a lane is a
name and a list of `flowNodeRef`s — so lanes never replace `potentialOwner` / `humanPerformer`;
use both. The `laneSet` goes first inside `<process>`, before the flow elements.

Every flow node must appear in **exactly one** lane — including start and end events, gateways
and service tasks, not just the human steps. Boundary events are the exception: they ride on their
host task and may be left out.

```xml
<process id="vessel-ops" name="Vessel Ops" isExecutable="true">
  <laneSet id="ls_main">
    <lane id="lane_pm" name="Project Manager">
      <flowNodeRef>start</flowNodeRef>
      <flowNodeRef>plan</flowNodeRef>
    </lane>
    <lane id="lane_crew" name="Vessel Crew">
      <flowNodeRef>execute</flowNodeRef>
      <flowNodeRef>end</flowNodeRef>
    </lane>
  </laneSet>

  <startEvent id="start" name="Request">
    <outgoing>f1</outgoing>
  </startEvent>
  <!-- ... -->
</process>
```

`bpmn-auto-layout` ignores lanes, so the finish step (§7) bands the nodes and draws the lane
shapes, growing each lane to fit the rows it needs.

### Data objects
A `<dataObject>` is the data itself and is **never drawn**; a `<dataObjectReference>` points at it
and is what appears on the canvas. Declare both, then link the reference to an activity with
`<dataOutputAssociation>` (the activity produces it) or `<dataInputAssociation>` (it consumes it).
One `dataObject` may have several references.

`<targetRef>` is mandatory on both association types. An input association reads from the
reference, so the reference id goes in `<sourceRef>` and a `<property>` on the activity receives
it; an output association writes to the reference, so the reference id is the `<targetRef>`.

```xml
<process id="invoicing" name="Invoicing" isExecutable="true">
  <dataObject id="do_invoice" name="Invoice"/>
  <dataObjectReference id="dor_invoice" name="Invoice" dataObjectRef="do_invoice"/>

  <userTask id="draft" name="Draft Invoice">
    <incoming>f1</incoming>
    <outgoing>f2</outgoing>
    <dataOutputAssociation id="doa_draft">
      <targetRef>dor_invoice</targetRef>
    </dataOutputAssociation>
  </userTask>

  <userTask id="approve" name="Approve Invoice">
    <incoming>f2</incoming>
    <outgoing>f3</outgoing>
    <property id="prop_invoice" name="invoice"/>
    <dataInputAssociation id="dia_approve">
      <sourceRef>dor_invoice</sourceRef>
      <targetRef>prop_invoice</targetRef>
    </dataInputAssociation>
  </userTask>
  <!-- ... -->
</process>
```

Data elements are not flow nodes, so they are never listed in a lane's `<flowNodeRef>`. The finish
step (§7) places the reference below the diagram, under the activities that use it, and draws each
association as an edge; `bpmn-auto-layout` draws neither.

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

Merge the same way you split. Two paths arriving at one activity with no gateway is legal, but it
is *uncontrolled flow*: the activity is enabled once per arriving token, so a merge can run it more
than once, and engines disagree on this. A merging gateway costs one element and states the intent.
Converging on an end event needs no gateway.

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
condition as opaque text, and each engine has its own language.

```
{{variables.amount > 1000}}                         boolean
{{variables.status == 'approved'}}                  string equality
{{variables.items.length > 0}}                      array check
{{variables.score >= 700 && variables.debt < 5000}} compound
```

The validator enforces `{{...}}` and rejects FEEL (`#{}`) and UEL (`${}`). If the user's engine
needs a different dialect, say so and let them substitute once the file validates.

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
    throw "bpmn-auto-layout is not installed in $Runner. The finish step cannot run."
}

# Single-quoted here-string: literal, so the JS ${...} is not touched by PowerShell.
$Finish = @'
import { readFileSync, writeFileSync } from 'fs';
import { layoutProcess } from 'bpmn-auto-layout';
import { BpmnModdle } from 'bpmn-moddle';

const [, , input, output] = process.argv;
const target = output || input;
const moddle = new BpmnModdle();
const errors = [], notes = [];

// Parse the INPUT first: layout drops references it cannot resolve.
for (const w of (await moddle.fromXML(readFileSync(input, 'utf8'))).warnings)
  errors.push(`input: ${w.message}`);

let xml = await layoutProcess(readFileSync(input, 'utf8'));
let doc = await moddle.fromXML(xml);

const procs = doc.rootElement.rootElements.filter(e => e.$type === 'bpmn:Process');
let touched = false;   // any DI we add must be re-serialised before the file is written


// --- lane pass: bpmn-auto-layout ignores lanes, so band the nodes and draw the lanes here ---
if (procs.some(p => p.laneSets?.length)) {
  touched = true;
  const MIN_BAND = 140, ROW = 110, PAD = 40;
  for (const proc of procs.filter(p => p.laneSets?.length)) {
    const lanes = proc.laneSets[0].lanes || [];
    const plane = doc.rootElement.diagrams[0].plane;
    const shape = new Map(), edge = new Map();
    for (const pe of plane.planeElement)
      (pe.$type === 'bpmndi:BPMNShape' ? shape : edge).set(pe.bpmnElement.id, pe);

    const laneOf = new Map();
    lanes.forEach((l, i) => (l.flowNodeRef || []).forEach(n => laneOf.set(n.id, i)));
    const boundary = (proc.flowElements || []).filter(e => e.$type === 'bpmn:BoundaryEvent');
    const isBoundary = new Set(boundary.map(b => b.id));

    // bpmn-auto-layout separates parallel branches by y at the same x. Flattening a lane to one
    // row destroys that, so keep the rows it chose: cluster each lane's nodes by their original
    // y and give every row its own strip. A lane grows to fit its rows instead of a fixed height.
    const rowOf = new Map(), rowsIn = [];
    lanes.forEach((l, i) => {
      const members = (l.flowNodeRef || []).filter(n => !isBoundary.has(n.id) && shape.has(n.id));
      const centres = [...new Set(members.map(n => {
        const b = shape.get(n.id).bounds; return Math.round(b.y + b.height / 2);
      }))].sort((a, b) => a - b);
      const bands = [];
      for (const c of centres) {
        const last = bands[bands.length - 1];
        if (last !== undefined && c - last <= 20) continue;
        bands.push(c);
      }
      for (const n of members) {
        const b = shape.get(n.id).bounds, c = b.y + b.height / 2;
        let r = 0;
        bands.forEach((bc, k) => { if (Math.abs(c - bc) <= 20 || c > bc) r = k; });
        rowOf.set(n.id, r);
      }
      rowsIn[i] = Math.max(1, bands.length);
    });
    const height = rowsIn.map(r => Math.max(MIN_BAND, r * ROW));
    const top = height.reduce((acc, h, i) => (acc.push((acc[i] ?? PAD)), acc), [PAD])
                      .map((_, i) => PAD + height.slice(0, i).reduce((a, b) => a + b, 0));

    for (const [id, i] of laneOf) {
      if (isBoundary.has(id)) continue;
      const s = shape.get(id); if (!s) continue;
      const strip = height[i] / rowsIn[i], r = rowOf.get(id) || 0;
      s.bounds.y = top[i] + r * strip + (strip - s.bounds.height) / 2;
    }
    // boundary events are not free-standing: they ride on their host's border
    for (const b of boundary) {
      const bs = shape.get(b.id), hs = shape.get(b.attachedToRef?.id);
      if (!bs || !hs) continue;
      bs.bounds.x = hs.bounds.x + hs.bounds.width - bs.bounds.width - 10;
      bs.bounds.y = hs.bounds.y + hs.bounds.height - bs.bounds.height / 2;
    }
    for (const [id, e] of edge) {
      const f = (proc.flowElements || []).find(x => x.id === id);
      const a = shape.get(f?.sourceRef?.id)?.bounds, b = shape.get(f?.targetRef?.id)?.bounds;
      if (!a || !b) continue;
      const ay = a.y + a.height / 2, by = b.y + b.height / 2;
      const ax = a.x + a.width, bx = b.x, mx = Math.round((ax + bx) / 2);
      const pt = (x, y) => moddle.create('dc:Point', { x: Math.round(x), y: Math.round(y) });
      e.waypoint = ay === by ? [pt(ax, ay), pt(bx, by)]
                             : [pt(ax, ay), pt(mx, ay), pt(mx, by), pt(bx, by)];
    }
    const boxes = [...shape.values()].map(s => s.bounds);
    const minX = Math.min(...boxes.map(b => b.x)) - PAD;
    const maxX = Math.max(...boxes.map(b => b.x + b.width)) + PAD;
    lanes.forEach((l, i) => plane.planeElement.push(moddle.create('bpmndi:BPMNShape', {
      id: `${l.id}_di`, bpmnElement: l, isHorizontal: true,
      bounds: moddle.create('dc:Bounds', { x: minX, y: top[i], width: maxX - minX, height: height[i] })
    })));
  }
}

// --- data objects: bpmn-auto-layout gives the reference a shape but draws no association
// edges, and gives the non-drawable <dataObject> a task-sized shape. Fix both. ---
const DATA_W = 36, DATA_H = 50, DATA_GAP = 60;
for (const proc of procs) {
  const plane = doc.rootElement.diagrams?.[0]?.plane;
  if (!plane) continue;
  const els = proc.flowElements || [];
  const refs = els.filter(e => e.$type === 'bpmn:DataObjectReference');
  if (!refs.length) continue;
  touched = true;
  const shape = new Map();
  for (const pe of plane.planeElement)
    if (pe.$type === 'bpmndi:BPMNShape') shape.set(pe.bpmnElement.id, pe);

  // a <dataObject> is not drawable; drop the shape the layouter invented for it
  const bare = new Set(els.filter(e => e.$type === 'bpmn:DataObject').map(e => e.id));
  plane.planeElement = plane.planeElement.filter(
    pe => !(pe.$type === 'bpmndi:BPMNShape' && bare.has(pe.bpmnElement.id)));

  const assocOf = ref => els.flatMap(a => [
    ...(a.dataOutputAssociations || []).filter(x => x.targetRef?.id === ref.id)
       .map(x => ({ assoc: x, host: a, out: true })),
    ...(a.dataInputAssociations || []).filter(x => (x.sourceRef || []).some(r => r.id === ref.id))
       .map(x => ({ assoc: x, host: a, out: false }))]);

  // measure after the bogus shapes are gone, and ignore the data objects themselves
  const isData = new Set(refs.map(r => r.id));
  const below = Math.max(...[...shape.entries()]
    .filter(([id]) => !bare.has(id) && !isData.has(id))
    .map(([, p]) => p.bounds.y + p.bounds.height));
  refs.forEach((ref, i) => {
    const links = assocOf(ref);
    const hosts = links.map(l => shape.get(l.host.id)?.bounds).filter(Boolean);
    const cx = hosts.length
      ? hosts.reduce((a, b) => a + b.x + b.width / 2, 0) / hosts.length
      : 100 + i * (DATA_W + 40);
    const rs = shape.get(ref.id) || plane.planeElement[plane.planeElement.push(
      moddle.create('bpmndi:BPMNShape', { id: `${ref.id}_di`, bpmnElement: ref,
        bounds: moddle.create('dc:Bounds', { x: 0, y: 0, width: DATA_W, height: DATA_H }) })) - 1];
    Object.assign(rs.bounds, { x: Math.round(cx - DATA_W / 2), y: Math.round(below + DATA_GAP),
                               width: DATA_W, height: DATA_H });
    for (const { assoc, host, out } of links) {
      const h = shape.get(host.id)?.bounds; if (!h) continue;
      const pt = (x, y) => moddle.create('dc:Point', { x: Math.round(x), y: Math.round(y) });
      const a = pt(h.x + h.width / 2, h.y + h.height), b = pt(rs.bounds.x + DATA_W / 2, rs.bounds.y);
      plane.planeElement.push(moddle.create('bpmndi:BPMNEdge', {
        id: `${assoc.id}_di`, bpmnElement: assoc, waypoint: out ? [a, b] : [b, a] }));
    }
  });
}
if (touched) {
  xml = (await moddle.toXML(doc.rootElement, { format: true })).xml;
  doc = await moddle.fromXML(xml);
}
writeFileSync(target, xml, 'utf8');

const { rootElement, warnings } = doc;
for (const w of warnings) errors.push(w.message);

const shaped = new Set(), shapeBounds = new Map();
for (const d of rootElement.diagrams || [])
  for (const e of d.plane?.planeElement || []) {
    shaped.add(e.bpmnElement?.id);
    if (e.$type === 'bpmndi:BPMNShape' && e.bounds) shapeBounds.set(e.bpmnElement?.id, e.bounds);
  }
if (!(rootElement.diagrams || []).length)
  errors.push('no BPMNDiagram: bpmn.io will show "no diagram to display"');
if (!rootElement.targetNamespace) errors.push('definitions: targetNamespace is missing');

const NOT_A_FLOW_NODE = new Set(['bpmn:SequenceFlow', 'bpmn:DataObject',
  'bpmn:DataObjectReference', 'bpmn:DataStoreReference', 'bpmn:Association']);

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

  // --- lane checks: both failures are invisible to every other check ---
  const lanes = proc.laneSets?.[0]?.lanes || [];
  if (lanes.length) {
    for (const l of lanes)
      if (!shaped.has(l.id)) errors.push(`${l.id}: lane has no BPMNShape, so it will not be drawn`);
    const count = new Map();
    for (const l of lanes)
      for (const n of l.flowNodeRef || []) count.set(n.id, (count.get(n.id) || 0) + 1);
    for (const el of proc.flowElements || []) {
      // lane/flowNodeRef is typed FlowNode: data elements and flows cannot be referenced
      if (NOT_A_FLOW_NODE.has(el.$type) || el.$type === 'bpmn:BoundaryEvent') continue;
      const c = count.get(el.id) || 0;
      if (c !== 1) errors.push(`${el.id}: in ${c} lanes, must be in exactly 1 - it would float outside the bands`);
    }
  }

  // Two shapes on top of each other render as one. Nothing else notices: the file stays
  // schema-valid and imports clean, so the lost element is invisible.
  const box = new Map();
  for (const el of proc.flowElements || []) {
    if (el.$type === 'bpmn:SequenceFlow' || el.$type === 'bpmn:BoundaryEvent') continue;
    const b = shapeBounds.get(el.id); if (b) box.set(el.id, b);
  }
  const ids = [...box.keys()];
  for (let i = 0; i < ids.length; i++)
    for (let j = i + 1; j < ids.length; j++) {
      const a = box.get(ids[i]), b = box.get(ids[j]);
      if (a.x < b.x + b.width && b.x < a.x + a.width &&
          a.y < b.y + b.height && b.y < a.y + a.height)
        errors.push(`${ids[i]} and ${ids[j]} overlap at (${a.x},${a.y})/(${b.x},${b.y}) - one hides the other`);
    }

  walk(proc, el => {
    if (el.$type === 'bpmn:Process') return;
    if (el.$type === 'bpmn:DataObject') {
      // not a drawable element; only its reference is
      if (shaped.has(el.id)) errors.push(`${el.id}: a dataObject must not have a BPMNShape`);
    } else if (!shaped.has(el.id) && !/SubProcess$/.test(el.$parent?.$type || '')) {
      errors.push(`${el.id}: no BPMNShape/BPMNEdge, will not render`);
    }
    if (el.$type === 'bpmn:DataObjectReference' && !el.dataObjectRef)
      errors.push(`${el.id}: dataObjectReference has no resolvable dataObjectRef`);
    for (const a of [...(el.dataInputAssociations || []), ...(el.dataOutputAssociations || [])])
      if (!a.id)
        errors.push(`data association on ${el.id} has no id, so it cannot be given a BPMNEdge`);
      else if (!shaped.has(a.id))
        errors.push(`${a.id}: data association on ${el.id} has no BPMNEdge, so the link is invisible`);
    if (/(?:Task|SubProcess|CallActivity)$/.test(el.$type) && (el.incoming || []).length > 1)
      notes.push(`${el.id}: ${el.incoming.length} incoming flows and no merging gateway. ` +
        'Uncontrolled flow enables an activity once per arriving token, so a merge can run it ' +
        'more than once and engines disagree; a merging gateway states the intent explicitly');
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
const boxes = [...shapeBounds.values()];
if (boxes.length) {
  const wide = Math.max(...boxes.map(b => b.x + b.width)) - Math.min(...boxes.map(b => b.x));
  if (wide > 3000) notes.push(`diagram is ${Math.round(wide)}px wide: fitted on a 1920px screen ` +
    `its labels render near ${(12 * 1920 / wide).toFixed(1)}px, which is unreadable. ` +
    'Shorten the longest path by moving stretches into sub-processes called with callActivity');
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

**Step 2 — finish the file.** Replace `.\process.bpmn` with the file you saved in §1 step 2.

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

- It re-serialises the file, normalising attribute order and child element order, and rewriting
  `<formalExpression>` as `<expression xsi:type="tFormalExpression">`. Both are valid; do not
  undo it.
- An embedded `subProcess` is treated as a black box: the parent renders collapsed and its
  children are laid out in a separate coordinate space, so they are not visible on the canvas.
  When a sub-flow must be visible, model it as a separate process invoked by a `callActivity`.

## 8. What the validator checks, and what it cannot

`finish.mjs` (§7) is the validation step, and it is not a checklist to apply from memory.

It fails the run on:

- any `bpmn-moddle` parse warning, including unresolved references — checked against the **input**
  as well, because layout drops references it cannot resolve
- a missing `<bpmndi:BPMNDiagram>`, or any flow node or sequence flow with no shape or edge
- `boundaryEvent` without `attachedToRef`
- `ioSpecification` missing `<inputSet>` or `<outputSet>`
- `dataInputAssociation` without `<targetRef>`
- a flow out of an `exclusiveGateway` with no condition that is not the gateway's `default`
- a timer value that is not valid ISO 8601, or that contains an expression
- a condition written in FEEL (`#{}`) or UEL (`${}`) instead of `{{...}}`
- `isExecutable` not true, or `targetNamespace` missing
- a lane with no `BPMNShape`
- a flow node in zero lanes or several
- two shapes overlapping, where one element hides another
- a `dataObject` carrying a `BPMNShape`, which is not a drawable element
- a `dataObjectReference` whose `dataObjectRef` does not resolve
- a data association with no `BPMNEdge`, which leaves the link invisible

Reported as notes, which do not fail the run: a vendor namespace; an activity merging several
flows without a gateway; a diagram too wide to read when fitted on screen.

It cannot check whether the process is the *right* process. Still yours to judge:

- the flow matches what the user described, and every path reaches an end event
- conditions are collectively exhaustive, and the `default` is the branch they meant
- a `parallelGateway` join has one `<incoming>` per branch of its split
- timer durations are the intended intervals
- names read the way the user would expect in a task list

## 9. Conventions

- Write the complete XML — never truncate.
- 2-space indentation.
- Process IDs kebab-case; flow IDs `flow_{source}_to_{target}`; gateway IDs `gw_{purpose}`.
- All `sequenceFlow` elements grouped at the bottom of `<process>`, after the nodes.
- Keep the longest path short. The diagram grows about 150px per node along it, and past roughly
  3000px the labels are too small to read at a zoom that shows the whole thing. When a process runs
  longer than that, offer to move stretches into sub-processes invoked by `callActivity`; §7 says so
  when it happens.

## 10. References

| File | Read when |
|---|---|
| `references/elements.md` | Before using any element whose attributes are not shown in §5 |
| `references/examples.md` | A complete worked file is needed, or §5 leaves the shape unclear |
| `references/validation-errors.md` | A schema, `bpmn-moddle`, or bpmn.io error needs diagnosing |
