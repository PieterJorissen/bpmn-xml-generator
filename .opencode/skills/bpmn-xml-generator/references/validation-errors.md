# BPMN Validation Errors

Errors from XSD validation, `bpmn-moddle` parsing, bpmn.io import, and process engines — with
fixes. Every entry below was reproduced against the OMG BPMN 2.0 XSD or bpmn-js.

---

## Schema errors (XSD validation fails)

### ERR-001: `missing attribute 'id'`
**Cause:** An element is missing its `id` attribute.  
**Fix:** Add a unique `id` to every element — events, tasks, gateways, flows, and definitions.

### ERR-002: `unknown element <xyz>`
**Cause:** An element type not in the BPMN 2.0 schema, or a typo.  
**Fix:** Check spelling. Common typos: `<exclusiveGateway>` (not `<exclusivegateway>`), `<sequenceFlow>` (not `<SequenceFlow>`). BPMN is case-sensitive.

### ERR-003: `unresolved reference 'xyz'`
**Cause:** A `sourceRef`, `targetRef`, `attachedToRef`, `messageRef`, or `signalRef` points to an ID that does not exist.  
**Fix:** Verify every reference resolves to a declared element ID. Message, signal and error elements must be declared as siblings of `<process>` inside `<definitions>`, not inside `<process>`.

### ERR-004: `targetNamespace is required`
**Cause:** Missing `targetNamespace` attribute on `<definitions>`.  
**Fix:** Add any valid URI, e.g. `targetNamespace="http://bpmn.io/schema/bpmn"`. The value is not read by the engine. When editing an existing file, preserve the namespace already declared.

### ERR-005: XML is not well-formed
**Cause:** Unclosed tags, wrong nesting, or illegal characters.  
**Fix:**
- Every opened tag must be closed: `<task ...>...</task>` or `<task .../>`.
- `<incoming>` and `<outgoing>` are child elements of activities/events, not attributes.
- In element content, escape `&` as `&amp;`, `<` as `&lt;`, `>` as `&gt;`.
- In attribute values, escape `"` as `&quot;`.

### ERR-006: `Element 'incoming': This element is not expected`
**Cause:** Child elements are out of schema order. The schema defines them as an ordered sequence, so individually valid elements still fail if they appear in the wrong place. Usually `<incoming>`/`<outgoing>` were written after `<ioSpecification>` or after an event definition.  
**Fix:** Put `<incoming>` and `<outgoing>` first. Inside an activity the order is `incoming, outgoing, ioSpecification?, property*, dataInputAssociation*, dataOutputAssociation*, potentialOwner / humanPerformer*, loopCharacteristics?`. Inside an event, the event definition comes last.

### ERR-007: `Element 'ioSpecification': Missing child element(s)`
**Cause:** An `<ioSpecification>` lists only `<dataInput>`/`<dataOutput>`. The schema requires at least one `<inputSet>` and one `<outputSet>`.  
**Fix:** Add both sets, referencing the declared inputs and outputs — or drop the `ioSpecification` entirely, since it is optional. See `elements.md` §7.

### ERR-008: `Element 'dataInputAssociation': Missing child element(s)`
**Cause:** A `<dataInputAssociation>` has no `<targetRef>`, which is mandatory.  
**Fix:** Add exactly one `<targetRef>` naming a declared `<dataInput>`. Each `<sourceRef>` must also name a declared element id (a `<property>` or `<dataObject>`), never a bare variable name.

### ERR-009: `Element 'property': This element is not expected`
**Cause:** A process-level `<property>` appears after the flow elements.  
**Fix:** Move it above the first event/activity. In `<process>` the order is `property*`, then flow elements, then artifacts.

---

## bpmn.io import errors

### ERR-020: `no diagram to display`
**Cause:** The file has no `<bpmndi:BPMNDiagram>` section. The semantic model is fine, but there is nothing to render, so bpmn.io shows an empty canvas.  
**Fix:** Generate the diagram section with `bpmn-auto-layout` — see `../SKILL.md` §7. This is the most common reason a valid file "does not work" in bpmn.io.

### ERR-021: Elements missing from the canvas
**Cause:** A flow node has no `BPMNShape`, or a sequence flow no `BPMNEdge`, in the `BPMNPlane`.  
**Fix:** Re-run the layout step on the finished file rather than hand-editing the diagram section. An embedded `subProcess` is an expected case: its children are deliberately laid out off-plane and do not appear.

---

## Engine-time errors

### ERR-030: `process has no startEvent`
**Cause:** No `<startEvent>` exists in the process.  
**Fix:** Add exactly one `<startEvent>` per process (sub-processes have their own).

### ERR-031: `token stuck — no outgoing flow`
**Cause:** A token reached an element with no matching outgoing flow (all conditions false on an exclusiveGateway with no default).  
**Fix:** Add a `default` attribute to the gateway pointing to a fallback flow.

### ERR-032: `parallelGateway join never fires`
**Cause:** A parallel join is waiting for tokens that will never arrive (e.g. one branch ends before reaching the join).  
**Fix:** In a parallel split, ALL branches must converge at the join. If a branch can end early, use an `eventBasedGateway` or `inclusiveGateway` instead.

### ERR-033: `condition expression evaluation error`
**Cause:** The expression references a missing variable, or its syntax does not match the engine's expression language.  
**Fix:** Condition syntax is engine-specific — bpmn.io treats it as opaque text, so a file can render perfectly and still fail at runtime. Check the variable names and confirm the dialect with the target engine. String comparisons need quotes: `{{variables.status == 'approved'}}`.

### ERR-034: `timerEvent expression not ISO 8601`
**Cause:** Timer value is not a valid ISO 8601 string.  
**Fix:**
- Duration: `PT1H` (1 hour), `P1D` (1 day), `P2DT3H` (2 days 3 hours).
- Date: `2026-12-31T09:00:00Z` (must include time zone).
- Cycle: `R3/PT1H` (repeat 3 times, every hour).
- Do NOT use `{{expression}}` inside timer values.

### ERR-035: `boundaryEvent has no attachedToRef`
**Cause:** A `<boundaryEvent>` is missing the `attachedToRef` attribute.  
**Fix:** Set `attachedToRef` to the `id` of the task or sub-process it is attached to.

---

## XML escaping quick reference

| Character | Inside element content | Inside attribute value |
|---|---|---|
| `&` | `&amp;` | `&amp;` |
| `<` | `&lt;` | `&lt;` |
| `>` | `&gt;` (optional) | `&gt;` (optional) |
| `"` | `"` | `&quot;` |
| `'` | `'` | `&apos;` (if delimited by `'`) |

```xml
<conditionExpression xsi:type="tFormalExpression">
  {{variables.score &gt;= 700 &amp;&amp; variables.debt &lt; 5000}}
</conditionExpression>
```

---

## ID naming conventions

| Category | Convention | Example |
|---|---|---|
| Process | kebab-case | `order-approval` |
| Events | `start`, `end`, `end_{reason}`, `catch_{name}` | `end_rejected`, `catch_timeout` |
| Tasks | `verb_noun` (snake_case) | `review_request`, `send_email` |
| Gateways | `gw_{purpose}` | `gw_decision`, `gw_split` |
| Flows | `flow_{source}_to_{target}` | `flow_review_to_gw` |
| Sub-process internals | prefix with `sub_` | `sub_start`, `sub_flow_1` |
| Boundary events | `{type}_boundary_{task}` | `timeout_boundary_review` |
| Messages / Signals | `msg_{name}`, `sig_{name}` | `msg_payment_confirmed` |
| Errors | `err_{name}` | `err_timeout` |
