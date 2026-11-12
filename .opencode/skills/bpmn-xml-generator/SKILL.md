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

1. Gather what is missing (§2) — one `question` call, then write.
2. Write the XML (§4, §5) and **save it to `{process-key}.bpmn`** in the working directory, or to
   the path the user gave.
3. Run the finish command (§7). It adds the diagram and validates the file.
4. Fix anything it reports and run it again, until it prints `OK`.
5. Tell the user the file is ready to open at demo.bpmn.io, and that engine-specific wiring is
   theirs to add.

The finish step works on a file on disk, so step 2 is not optional — XML that only exists in your
reply cannot be laid out or validated.

## 2. Gather information before writing

**Never generate BPMN from an incomplete description.** Ask for every missing item below in one
`question` call, then write.

Do not infer or invent any of it. An assignee, a gateway condition and a variable name are facts
about the user's process, not defaults you can pick — a plausible guess is indistinguishable from
a fact in the output. If it was not stated, it goes in the call.

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

**How to ask.** One `question` call, one entry per missing item, so the run blocks until it is
answered instead of continuing on a guess. Build `options` from the user's own words — the steps
they listed, the parties they named, the gateway types that fit — and set `multiple: true` where
several apply. Pass `options: []` when their description offers nothing to choose from: the tool
adds a "type your own answer" row itself, so an empty list is a free-text question and an "Other"
option is never needed. Never offer an invented assignee, condition, key or timer value — a wrong
default is harder to spot in a list than a blank one.

Not every client registers the tool — the app, CLI and desktop do. Without it, ask every item as
plain text in one reply and wait.

**Lanes.** The responsible parties are already the lane list, so do not add a round trip. If they
name two or more distinct parties, offer lanes as one more entry in that same call — *"I can
group these into lanes by responsible party (A, B, C); want that?"* — and say lanes are visual
grouping only, so assignment stays on the tasks either way. One party, or no answer: no lanes,
and do not raise it.

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
One `dataObject` may have several references, and an activity may carry any number of
associations.

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
to display"* and renders an empty canvas. One command adds the diagram and validates the result,
so neither can be skipped:

```powershell
$Skill = 'C:\path\to\bpmn-xml-generator'
& ([scriptblock]::Create((Get-Content -Raw "$Skill\scripts\finish.ps1"))) $Skill .\order-approval.bpmn
```

Line 1 takes the `Base directory for this skill` path that came with this skill; line 2 ends with
the file you saved in §1 step 2. Keep the form as it is — it runs whatever the machine's script
execution policy is. The scripts are there to be run: do not read them, and never retype them.

Node.js does **not** have to be installed: if `node` is not on PATH, the first run fetches the
official portable Windows build into a temp directory — no installer, no administrator rights.
The first run needs network access.

On success it prints `OK <file> — layout applied, N elements rendered, no findings`.

**A file that has not printed `OK` is not finished.** Fix the findings it lists and run the
command again. Lines beginning `note:` are advisory and do not fail the run. If it throws for any
other reason, stop and tell the user what is missing — never hand over the file anyway, and never
hand-write the diagram section.

Fix a finding by correcting the XML it names, never by changing what the process says. Do not
drop, merge or move something the user asked for to get a run to pass. If a finding cannot be
fixed without that, stop and report it — an `overlap` finding in particular is the layout step's
defect, not the model's.

Three things to know about the output:

- The diagram is rebuilt from scratch on every run. Never edit `<bpmndi:...>` coordinates, and
  never delete the section before a re-run — the edit is discarded and the deletion is redundant.
- It re-serialises the file, normalising attribute order and child element order, and rewriting
  `<formalExpression>` as `<expression xsi:type="tFormalExpression">`. Both are valid; do not
  undo it.
- An embedded `subProcess` is treated as a black box: the parent renders collapsed and its
  children are laid out in a separate coordinate space, so they are not visible on the canvas.
  When a sub-flow must be visible, model it as a separate process invoked by a `callActivity`.

## 8. What the validator checks, and what it cannot

The finish command (§7) is the validation step; this is not a checklist to apply from memory.

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
