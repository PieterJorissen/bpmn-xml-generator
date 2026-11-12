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
const DATA_W = 36, DATA_H = 50, DATA_GAP = 60, DATA_SLOT = 110;   // slot leaves room for the name
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
  // Each reference wants to sit under the activities that use it. Several often want the same
  // spot - documents from one task, or tasks stacked in one column - so references that would
  // collide are merged into a group and spread side by side, centred on where they wanted to be.
  const want = refs.map((ref, i) => {
    const links = assocOf(ref);
    const hosts = links.map(l => shape.get(l.host.id)?.bounds).filter(Boolean);
    return { ref, links, cx: hosts.length
      ? hosts.reduce((a, b) => a + b.x + b.width / 2, 0) / hosts.length
      : 100 + i * DATA_SLOT };
  }).sort((a, b) => a.cx - b.cx);
  const groups = [];
  for (const w of want) {
    groups.push({ items: [w], cx: w.cx });
    for (let g, p; groups.length > 1 && (g = groups.at(-1), p = groups.at(-2),
         p.cx + p.items.length * DATA_SLOT / 2 > g.cx - g.items.length * DATA_SLOT / 2);) {
      groups.pop();
      p.cx = (p.cx * p.items.length + g.cx * g.items.length) / (p.items.length + g.items.length);
      p.items.push(...g.items);
    }
  }
  for (const g of groups)
    g.items.forEach((w, k) => { w.cx = g.cx + (k - (g.items.length - 1) / 2) * DATA_SLOT; });

  for (const { ref, links, cx } of want) {
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
  }
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
        errors.push(`${ids[i]} and ${ids[j]} overlap at (${a.x},${a.y})/(${b.x},${b.y}) - one hides the other. ` +
          'This is a defect in the layout step, not in the model: leave the process as it is and report it');
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
