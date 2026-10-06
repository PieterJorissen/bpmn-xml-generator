# BPMN Element Reference

Attribute reference for the supported BPMN 2.0 elements. Everything here is plain BPMN 2.0 — no
vendor namespace. Validated against the OMG BPMN 2.0 XSD.

---

## 1. Root Elements

### `<definitions>`
| Attribute | Required | Notes |
|---|---|---|
| `id` | ✅ | Unique identifier, e.g. `Definitions_order-approval` |
| `targetNamespace` | ✅ | Any valid URI. Not read by the engine — required by the BPMN 2.0 XML schema. Preserve the original value when editing existing files. For new files, `http://bpmn.io/schema/bpmn` is the conventional default. |
| `name` | — | Human label |
| `exporter` | — | Tool name |
| `exporterVersion` | — | Tool version |

Namespaces on `<definitions>`:
```
xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"
xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
```

`dc`, `di`, and `bpmndi` are needed by the `<bpmndi:BPMNDiagram>` section, which every file must
carry. Do not add a vendor namespace.

Child order: all root elements (`message`, `signal`, `error`, `process`) first, then
`<bpmndi:BPMNDiagram>`.

### `<process>`
| Attribute | Required | Notes |
|---|---|---|
| `id` | ✅ | Becomes the process identifier/key in the engine |
| `name` | ✅ | Human-readable label |
| `isExecutable` | ✅ | Must be `true` |
| `processType` | — | `None` (default), `Public`, `Private` |

Child order: `property*`, then flow elements (events, activities, gateways, sequence flows), then
artifacts. A `<property>` placed after the flow elements is a schema error.

---

## 2. Child element order

The schema defines children as an ordered sequence. Correct elements in the wrong order fail
validation.

Inside an **activity** (any task, `callActivity`, `subProcess`):
```
incoming, outgoing, ioSpecification?, property*, dataInputAssociation*,
dataOutputAssociation*, potentialOwner / humanPerformer*, loopCharacteristics?
```

Inside an **event**: `incoming`, `outgoing`, then the event definition last.

`incoming` and `outgoing` always come first.

---

## 3. Events

### `<startEvent>`
| Attribute | Notes |
|---|---|
| `id` | required |
| `name` | label shown in diagrams |

**None start** (no child event definition): process starts immediately on instantiation.  
**Timer start**: child `<timerEventDefinition>` — fires on schedule.  
**Message start**: child `<messageEventDefinition messageRef="...">` — fires when message arrives.  
**Signal start**: child `<signalEventDefinition signalRef="...">`.

### `<endEvent>`
| Attribute | Notes |
|---|---|
| `id` | required |
| `name` | label |

**None end**: normal completion.  
**Terminate end**: `<terminateEventDefinition/>` — cancels entire process instance.  
**Error end**: `<errorEventDefinition errorRef="..."/>` — triggers error boundary events.  
**Message end**: `<messageEventDefinition messageRef="..."/>` — sends message on completion.

### `<intermediateCatchEvent>`
Supported definitions: Timer, Message, Signal, Conditional.  
Must have exactly one `<incoming>` and one `<outgoing>`, both before the event definition.

### `<intermediateThrowEvent>`
Supported definitions: Message, Signal, Escalation.

### `<boundaryEvent>`
| Attribute | Required | Notes |
|---|---|---|
| `id` | ✅ | |
| `name` | — | label |
| `attachedToRef` | ✅ | ID of the activity this event is attached to |
| `cancelActivity` | — | `true` (interrupting, default) or `false` (non-interrupting) |

Supported definitions: Timer, Error, Message, Signal, Escalation.  
Must have `<outgoing>` but **no** `<incoming>`.

---

## 4. Activities

### `<task>`
Generic task — passes through immediately with no side effects.
```xml
<task id="log_entry" name="Log Entry">
  <incoming>f1</incoming>
  <outgoing>f2</outgoing>
</task>
```

### `<userTask>`
| Attribute | Notes |
|---|---|
| `id` | required |
| `name` | displayed as task name in UI |

Assignment uses the standard resource roles, placed **after** `<incoming>`/`<outgoing>`:

- `<potentialOwner>` — the task is offered to a group of candidates.
- `<humanPerformer>` — the task is assigned to one performer.

```xml
<userTask id="review_task" name="Review Request">
  <incoming>f1</incoming>
  <outgoing>f2</outgoing>
  <humanPerformer>
    <resourceAssignmentExpression>
      <formalExpression>{{variables.manager}}</formalExpression>
    </resourceAssignmentExpression>
  </humanPerformer>
</userTask>
```

A due date and a form reference have no standard BPMN attribute. Leave them out; they are engine
configuration.

### `<serviceTask>`
| Attribute | Notes |
|---|---|
| `id` | required |
| `name` | label |
| `implementation` | optional; `##WebService` (default) or `##unspecified` |

How the engine dispatches the task is engine configuration, not BPMN. Emit a plain `serviceTask`.

### `<scriptTask>`
| Attribute | Notes |
|---|---|
| `id` | required |
| `name` | label |
| `scriptFormat` | e.g. `"javascript"` |

```xml
<scriptTask id="compute_score" name="Compute Score" scriptFormat="javascript">
  <incoming>f1</incoming>
  <outgoing>f2</outgoing>
  <script>variables.score = variables.income / variables.debt * 10;</script>
</scriptTask>
```

Engines typically restrict the script sandbox; what is reachable from a script is engine-specific.

### `<sendTask>`
Dispatches a message and continues immediately.

### `<receiveTask>`
Waits for a correlated message before continuing.
```xml
<receiveTask id="wait_payment" name="Wait for Payment Confirmation"
             messageRef="msg_payment_confirmed">
  <incoming>f1</incoming>
  <outgoing>f2</outgoing>
</receiveTask>
```

### `<businessRuleTask>`
Marks a step that evaluates a decision. The reference to the decision itself (a DMN definition) has
no standard BPMN attribute — it is engine-specific and is left out.
```xml
<businessRuleTask id="run_credit_rules" name="Credit Score Check">
  <incoming>f1</incoming>
  <outgoing>f2</outgoing>
</businessRuleTask>
```

### `<callActivity>`
Invokes another process definition as a sub-process.
| Attribute | Notes |
|---|---|
| `calledElement` | key of the target process definition |

```xml
<callActivity id="run_kyc" name="Run KYC Process" calledElement="kyc-check">
  <incoming>f1</incoming>
  <outgoing>f2</outgoing>
</callActivity>
```

Variable passing between caller and callee is engine-specific. Prefer `callActivity` over an
embedded `subProcess` when the sub-flow should be visible as its own diagram.

### `<subProcess>`
Embedded sub-process with its own start/end events.
```xml
<subProcess id="sub_validation" name="Validation">
  <incoming>f1</incoming>
  <outgoing>f2</outgoing>
  <startEvent id="sub_start"><outgoing>sub_f1</outgoing></startEvent>
  <endEvent id="sub_end"><incoming>sub_f1</incoming></endEvent>
  <sequenceFlow id="sub_f1" sourceRef="sub_start" targetRef="sub_end"/>
</subProcess>
```

`bpmn-auto-layout` renders an embedded sub-process collapsed, with its children laid out in a
separate coordinate space, so they do not appear on the canvas.

---

## 5. Gateways

### `<exclusiveGateway>` (XOR)
Exactly one outgoing flow is taken. The flow whose condition evaluates to `true` first (in
document order) wins.

**Default flow**: set `default="flow_id"` on the gateway, and omit `<conditionExpression>` on that
flow. It is taken when no other condition matches.

```xml
<exclusiveGateway id="gw_check" name="Check Result" default="flow_default">
  <incoming>f_in</incoming>
  <outgoing>flow_high</outgoing>
  <outgoing>flow_default</outgoing>
</exclusiveGateway>
```

### `<parallelGateway>` (AND)
**Split**: all outgoing flows are activated simultaneously.  
**Join**: waits for ALL incoming tokens before continuing.

```xml
<parallelGateway id="gw_split">
  <incoming>f_in</incoming>
  <outgoing>f_branch_a</outgoing>
  <outgoing>f_branch_b</outgoing>
</parallelGateway>

<parallelGateway id="gw_join">
  <incoming>f_branch_a_done</incoming>
  <incoming>f_branch_b_done</incoming>
  <outgoing>f_after_join</outgoing>
</parallelGateway>
```

### `<inclusiveGateway>` (OR)
Every flow whose condition is `true` is activated. The join waits for all activated tokens.

### `<eventBasedGateway>`
Race between events; the first to arrive wins. Must be followed by `intermediateCatchEvent`s only.
```xml
<eventBasedGateway id="gw_race">
  <incoming>f_in</incoming>
  <outgoing>f_to_msg_catch</outgoing>
  <outgoing>f_to_timer_catch</outgoing>
</eventBasedGateway>
```

---

## 6. Sequence Flows

```xml
<sequenceFlow id="flow_id" name="optional label"
              sourceRef="source_element_id"
              targetRef="target_element_id">
  <conditionExpression xsi:type="tFormalExpression">
    {{variables.approved == true}}
  </conditionExpression>
</sequenceFlow>
```

Rules:
- Every flow needs a unique `id`.
- Conditions are only valid on flows leaving an `exclusiveGateway` or `inclusiveGateway`.
- A flow leaving a `parallelGateway` must NOT have a condition.
- `conditionExpression` content is opaque text to bpmn.io; its syntax is engine-specific.

---

## 7. Data & IO

`ioSpecification` is optional and most engines do not require it. If used, it must be
schema-complete, which means **both** `<inputSet>` and `<outputSet>` are mandatory — the common
mistake of listing only `dataInput`/`dataOutput` is a validation error.

```xml
<process id="io-demo" name="IO Demo" isExecutable="true">
  <property id="prop_amount" name="amount"/>

  <userTask id="review" name="Review">
    <incoming>f1</incoming>
    <outgoing>f2</outgoing>
    <ioSpecification>
      <dataInput id="in_amount" name="amount"/>
      <dataOutput id="out_approved" name="approved"/>
      <inputSet><dataInputRefs>in_amount</dataInputRefs></inputSet>
      <outputSet><dataOutputRefs>out_approved</dataOutputRefs></outputSet>
    </ioSpecification>
    <dataInputAssociation id="dia_1">
      <sourceRef>prop_amount</sourceRef>
      <targetRef>in_amount</targetRef>
    </dataInputAssociation>
  </userTask>
  ...
</process>
```

- A `<dataInputAssociation>` requires exactly one `<targetRef>`.
- `<sourceRef>` and `<targetRef>` are ID references. They must name a declared element — a
  `<property>`, `<dataObject>`, `<dataInput>` or `<dataOutput>` — never a bare variable name.
- A process-level `<property>` must appear before the flow elements.

---

## 8. Event Definitions

### `<timerEventDefinition>`
```xml
<!-- Duration (relative) -->
<timerEventDefinition>
  <timeDuration xsi:type="tFormalExpression">PT1H</timeDuration>
</timerEventDefinition>

<!-- Absolute date -->
<timerEventDefinition>
  <timeDate xsi:type="tFormalExpression">2026-12-31T09:00:00Z</timeDate>
</timerEventDefinition>

<!-- Repeating cycle -->
<timerEventDefinition>
  <timeCycle xsi:type="tFormalExpression">R3/PT24H</timeCycle>
</timerEventDefinition>
```

### `<messageEventDefinition>`
```xml
<messageEventDefinition messageRef="msg_payment"/>
<!-- Declare the message as a sibling of <process> -->
<message id="msg_payment" name="payment_received"/>
```

### `<signalEventDefinition>`
```xml
<signalEventDefinition signalRef="sig_cancel"/>
<signal id="sig_cancel" name="cancel_order"/>
```

### `<errorEventDefinition>`
```xml
<errorEventDefinition errorRef="err_timeout"/>
<error id="err_timeout" name="TimeoutError" errorCode="TIMEOUT"/>
```

### `<terminateEventDefinition>`
```xml
<terminateEventDefinition/>
```

---

## 9. Diagram Interchange

Every file needs a `<bpmndi:BPMNDiagram>` as the last child of `<definitions>`, or bpmn.io reports
*"no diagram to display"*. Generate it with `bpmn-auto-layout` rather than by hand — see
`../SKILL.md` §7.

```xml
<bpmndi:BPMNDiagram id="BPMNDiagram_1">
  <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="{process-key}">
    <bpmndi:BPMNShape id="start_di" bpmnElement="start">
      <dc:Bounds x="152" y="82" width="36" height="36" />
    </bpmndi:BPMNShape>
    <bpmndi:BPMNEdge id="flow_1_di" bpmnElement="flow_1">
      <di:waypoint x="188" y="100" />
      <di:waypoint x="240" y="100" />
    </bpmndi:BPMNEdge>
  </bpmndi:BPMNPlane>
</bpmndi:BPMNDiagram>
```

Every flow node needs a `BPMNShape` and every sequence flow a `BPMNEdge`, each pointing at its
element's `id` via `bpmnElement`.
