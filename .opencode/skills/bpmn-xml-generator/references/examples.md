# BPMN Examples

Four complete BPMN 2.0 files. Each one is schema-valid against the OMG BPMN 2.0 XSD and imports
into bpmn-js with no warnings, so it can be opened directly at [demo.bpmn.io](https://demo.bpmn.io/).

Each includes its `<bpmndi:BPMNDiagram>` section. Without one, bpmn.io reports *"no diagram to
display"* and shows nothing — see `../SKILL.md` §7.

---

## Example 1 — Simple Approval

userTask with potentialOwner / humanPerformer, exclusiveGateway with a default flow.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<definitions
  xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
  id="Definitions_simple-approval"
  targetNamespace="http://bpmn.io/schema/bpmn"
  exporter="bpmn-xml-generator"
  exporterVersion="1.0">
  <process id="simple-approval" name="Simple Approval" isExecutable="true">
    <startEvent id="start" name="Request Submitted">
      <outgoing>flow_start_to_submit</outgoing>
    </startEvent>
    <userTask id="submit_task" name="Submit Request">
      <incoming>flow_start_to_submit</incoming>
      <outgoing>flow_submit_to_review</outgoing>
      <potentialOwner>
        <resourceAssignmentExpression>
          <expression xsi:type="tFormalExpression">requesters</expression>
        </resourceAssignmentExpression>
      </potentialOwner>
    </userTask>
    <userTask id="review_task" name="Review Request">
      <incoming>flow_submit_to_review</incoming>
      <outgoing>flow_review_to_gw</outgoing>
      <humanPerformer>
        <resourceAssignmentExpression>
          <expression xsi:type="tFormalExpression">{{variables.manager}}</expression>
        </resourceAssignmentExpression>
      </humanPerformer>
    </userTask>
    <exclusiveGateway id="gw_decision" name="Approved?" default="flow_rejected">
      <incoming>flow_review_to_gw</incoming>
      <outgoing>flow_approved</outgoing>
      <outgoing>flow_rejected</outgoing>
    </exclusiveGateway>
    <serviceTask id="notify_approved" name="Notify Approved">
      <incoming>flow_approved</incoming>
      <outgoing>flow_to_end_approved</outgoing>
    </serviceTask>
    <endEvent id="end_approved" name="Approved">
      <incoming>flow_to_end_approved</incoming>
    </endEvent>
    <endEvent id="end_rejected" name="Rejected">
      <incoming>flow_rejected</incoming>
    </endEvent>
    <sequenceFlow id="flow_start_to_submit" sourceRef="start" targetRef="submit_task" />
    <sequenceFlow id="flow_submit_to_review" sourceRef="submit_task" targetRef="review_task" />
    <sequenceFlow id="flow_review_to_gw" sourceRef="review_task" targetRef="gw_decision" />
    <sequenceFlow id="flow_approved" sourceRef="gw_decision" targetRef="notify_approved">
      <conditionExpression xsi:type="tFormalExpression">{{variables.approved == true}}</conditionExpression>
    </sequenceFlow>
    <sequenceFlow id="flow_rejected" sourceRef="gw_decision" targetRef="end_rejected" />
    <sequenceFlow id="flow_to_end_approved" sourceRef="notify_approved" targetRef="end_approved" />
  </process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_simple-approval">
    <bpmndi:BPMNPlane id="BPMNPlane_simple-approval" bpmnElement="simple-approval">
      <bpmndi:BPMNShape id="start_di" bpmnElement="start">
        <dc:Bounds x="57" y="52" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="submit_task_di" bpmnElement="submit_task">
        <dc:Bounds x="175" y="30" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="review_task_di" bpmnElement="review_task">
        <dc:Bounds x="325" y="30" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="gw_decision_di" bpmnElement="gw_decision" isMarkerVisible="true">
        <dc:Bounds x="500" y="45" width="50" height="50" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="notify_approved_di" bpmnElement="notify_approved">
        <dc:Bounds x="625" y="30" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="end_approved_di" bpmnElement="end_approved">
        <dc:Bounds x="807" y="52" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="end_rejected_di" bpmnElement="end_rejected">
        <dc:Bounds x="657" y="192" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="flow_start_to_submit_di" bpmnElement="flow_start_to_submit">
        <di:waypoint x="93" y="70" />
        <di:waypoint x="175" y="70" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="flow_submit_to_review_di" bpmnElement="flow_submit_to_review">
        <di:waypoint x="275" y="70" />
        <di:waypoint x="325" y="70" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="flow_review_to_gw_di" bpmnElement="flow_review_to_gw">
        <di:waypoint x="425" y="70" />
        <di:waypoint x="500" y="70" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="flow_approved_di" bpmnElement="flow_approved">
        <di:waypoint x="550" y="70" />
        <di:waypoint x="625" y="70" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="flow_rejected_di" bpmnElement="flow_rejected">
        <di:waypoint x="525" y="95" />
        <di:waypoint x="525" y="210" />
        <di:waypoint x="657" y="210" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="flow_to_end_approved_di" bpmnElement="flow_to_end_approved">
        <di:waypoint x="725" y="70" />
        <di:waypoint x="807" y="70" />
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</definitions>
```

---

## Example 2 — Customer Onboarding

parallelGateway split and join, with an interrupting timer boundary event.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<definitions
  xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
  id="Definitions_customer-onboarding"
  targetNamespace="http://bpmn.io/schema/bpmn"
  exporter="bpmn-xml-generator"
  exporterVersion="1.0">
  <process id="customer-onboarding" name="Customer Onboarding" isExecutable="true">
    <startEvent id="start" name="Account Created">
      <outgoing>flow_start_to_split</outgoing>
    </startEvent>
    <parallelGateway id="gw_split" name="Parallel Start">
      <incoming>flow_start_to_split</incoming>
      <outgoing>flow_to_welcome</outgoing>
      <outgoing>flow_to_kyc</outgoing>
    </parallelGateway>
    <serviceTask id="send_welcome" name="Send Welcome Email">
      <incoming>flow_to_welcome</incoming>
      <outgoing>flow_welcome_done</outgoing>
    </serviceTask>
    <userTask id="kyc_task" name="Complete KYC">
      <incoming>flow_to_kyc</incoming>
      <outgoing>flow_kyc_done</outgoing>
      <potentialOwner>
        <resourceAssignmentExpression>
          <expression xsi:type="tFormalExpression">compliance</expression>
        </resourceAssignmentExpression>
      </potentialOwner>
    </userTask>
    <boundaryEvent id="kyc_timeout" name="KYC Timeout (48h)" attachedToRef="kyc_task">
      <outgoing>flow_kyc_escalate</outgoing>
      <timerEventDefinition>
        <timeDuration xsi:type="tFormalExpression">PT48H</timeDuration>
      </timerEventDefinition>
    </boundaryEvent>
    <serviceTask id="escalate_kyc" name="Escalate KYC">
      <incoming>flow_kyc_escalate</incoming>
      <outgoing>flow_escalate_to_end</outgoing>
    </serviceTask>
    <parallelGateway id="gw_join" name="Parallel Join">
      <incoming>flow_welcome_done</incoming>
      <incoming>flow_kyc_done</incoming>
      <outgoing>flow_join_to_activate</outgoing>
    </parallelGateway>
    <serviceTask id="activate_account" name="Activate Account">
      <incoming>flow_join_to_activate</incoming>
      <outgoing>flow_activate_to_end</outgoing>
    </serviceTask>
    <endEvent id="end_active" name="Account Active">
      <incoming>flow_activate_to_end</incoming>
    </endEvent>
    <endEvent id="end_escalated" name="KYC Escalated">
      <incoming>flow_escalate_to_end</incoming>
    </endEvent>
    <sequenceFlow id="flow_start_to_split" sourceRef="start" targetRef="gw_split" />
    <sequenceFlow id="flow_to_welcome" sourceRef="gw_split" targetRef="send_welcome" />
    <sequenceFlow id="flow_to_kyc" sourceRef="gw_split" targetRef="kyc_task" />
    <sequenceFlow id="flow_welcome_done" sourceRef="send_welcome" targetRef="gw_join" />
    <sequenceFlow id="flow_kyc_done" sourceRef="kyc_task" targetRef="gw_join" />
    <sequenceFlow id="flow_kyc_escalate" sourceRef="kyc_timeout" targetRef="escalate_kyc" />
    <sequenceFlow id="flow_escalate_to_end" sourceRef="escalate_kyc" targetRef="end_escalated" />
    <sequenceFlow id="flow_join_to_activate" sourceRef="gw_join" targetRef="activate_account" />
    <sequenceFlow id="flow_activate_to_end" sourceRef="activate_account" targetRef="end_active" />
  </process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_customer-onboarding">
    <bpmndi:BPMNPlane id="BPMNPlane_customer-onboarding" bpmnElement="customer-onboarding">
      <bpmndi:BPMNShape id="start_di" bpmnElement="start">
        <dc:Bounds x="57" y="52" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="gw_split_di" bpmnElement="gw_split">
        <dc:Bounds x="200" y="45" width="50" height="50" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="send_welcome_di" bpmnElement="send_welcome">
        <dc:Bounds x="325" y="30" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="gw_join_di" bpmnElement="gw_join">
        <dc:Bounds x="500" y="45" width="50" height="50" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="activate_account_di" bpmnElement="activate_account">
        <dc:Bounds x="625" y="30" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="end_active_di" bpmnElement="end_active">
        <dc:Bounds x="807" y="52" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="kyc_task_di" bpmnElement="kyc_task">
        <dc:Bounds x="325" y="170" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="kyc_timeout_di" bpmnElement="kyc_timeout">
        <dc:Bounds x="357" y="232" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="escalate_kyc_di" bpmnElement="escalate_kyc">
        <dc:Bounds x="475" y="310" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="end_escalated_di" bpmnElement="end_escalated">
        <dc:Bounds x="657" y="332" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="flow_start_to_split_di" bpmnElement="flow_start_to_split">
        <di:waypoint x="93" y="70" />
        <di:waypoint x="200" y="70" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="flow_to_welcome_di" bpmnElement="flow_to_welcome">
        <di:waypoint x="250" y="70" />
        <di:waypoint x="325" y="70" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="flow_to_kyc_di" bpmnElement="flow_to_kyc">
        <di:waypoint x="225" y="95" />
        <di:waypoint x="225" y="210" />
        <di:waypoint x="325" y="210" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="flow_welcome_done_di" bpmnElement="flow_welcome_done">
        <di:waypoint x="425" y="70" />
        <di:waypoint x="500" y="70" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="flow_join_to_activate_di" bpmnElement="flow_join_to_activate">
        <di:waypoint x="550" y="70" />
        <di:waypoint x="625" y="70" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="flow_activate_to_end_di" bpmnElement="flow_activate_to_end">
        <di:waypoint x="725" y="70" />
        <di:waypoint x="807" y="70" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="flow_kyc_done_di" bpmnElement="flow_kyc_done">
        <di:waypoint x="425" y="210" />
        <di:waypoint x="525" y="210" />
        <di:waypoint x="525" y="95" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="flow_kyc_escalate_di" bpmnElement="flow_kyc_escalate">
        <di:waypoint x="375" y="268" />
        <di:waypoint x="375" y="350" />
        <di:waypoint x="475" y="350" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="flow_escalate_to_end_di" bpmnElement="flow_escalate_to_end">
        <di:waypoint x="575" y="350" />
        <di:waypoint x="657" y="350" />
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</definitions>
```

---

## Example 3 — Order Fulfillment

eventBasedGateway racing a message catch against a timer catch.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<definitions
  xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
  id="Definitions_order-fulfillment"
  targetNamespace="http://bpmn.io/schema/bpmn"
  exporter="bpmn-xml-generator"
  exporterVersion="1.0">
  <message id="msg_payment_confirmed" name="payment_confirmed" />
  <process id="order-fulfillment" name="Order Fulfillment" isExecutable="true">
    <startEvent id="start" name="Order Placed">
      <outgoing>flow_start_to_reserve</outgoing>
    </startEvent>
    <serviceTask id="reserve_stock" name="Reserve Stock">
      <incoming>flow_start_to_reserve</incoming>
      <outgoing>flow_reserve_to_wait</outgoing>
    </serviceTask>
    <eventBasedGateway id="gw_race" name="Payment or timeout">
      <incoming>flow_reserve_to_wait</incoming>
      <outgoing>flow_to_payment_catch</outgoing>
      <outgoing>flow_to_timeout_catch</outgoing>
    </eventBasedGateway>
    <intermediateCatchEvent id="catch_payment" name="Payment Confirmed">
      <incoming>flow_to_payment_catch</incoming>
      <outgoing>flow_payment_to_ship</outgoing>
      <messageEventDefinition messageRef="msg_payment_confirmed" />
    </intermediateCatchEvent>
    <intermediateCatchEvent id="catch_timeout" name="Payment Timeout">
      <incoming>flow_to_timeout_catch</incoming>
      <outgoing>flow_timeout_to_cancel</outgoing>
      <timerEventDefinition>
        <timeDuration xsi:type="tFormalExpression">PT24H</timeDuration>
      </timerEventDefinition>
    </intermediateCatchEvent>
    <serviceTask id="ship_order" name="Ship Order">
      <incoming>flow_payment_to_ship</incoming>
      <outgoing>flow_ship_to_end</outgoing>
    </serviceTask>
    <serviceTask id="cancel_order" name="Cancel Order">
      <incoming>flow_timeout_to_cancel</incoming>
      <outgoing>flow_cancel_to_end</outgoing>
    </serviceTask>
    <endEvent id="end_shipped" name="Order Shipped">
      <incoming>flow_ship_to_end</incoming>
    </endEvent>
    <endEvent id="end_cancelled" name="Order Cancelled">
      <incoming>flow_cancel_to_end</incoming>
    </endEvent>
    <sequenceFlow id="flow_start_to_reserve" sourceRef="start" targetRef="reserve_stock" />
    <sequenceFlow id="flow_reserve_to_wait" sourceRef="reserve_stock" targetRef="gw_race" />
    <sequenceFlow id="flow_to_payment_catch" sourceRef="gw_race" targetRef="catch_payment" />
    <sequenceFlow id="flow_to_timeout_catch" sourceRef="gw_race" targetRef="catch_timeout" />
    <sequenceFlow id="flow_payment_to_ship" sourceRef="catch_payment" targetRef="ship_order" />
    <sequenceFlow id="flow_timeout_to_cancel" sourceRef="catch_timeout" targetRef="cancel_order" />
    <sequenceFlow id="flow_ship_to_end" sourceRef="ship_order" targetRef="end_shipped" />
    <sequenceFlow id="flow_cancel_to_end" sourceRef="cancel_order" targetRef="end_cancelled" />
  </process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_order-fulfillment">
    <bpmndi:BPMNPlane id="BPMNPlane_order-fulfillment" bpmnElement="order-fulfillment">
      <bpmndi:BPMNShape id="start_di" bpmnElement="start">
        <dc:Bounds x="57" y="52" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="reserve_stock_di" bpmnElement="reserve_stock">
        <dc:Bounds x="175" y="30" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="gw_race_di" bpmnElement="gw_race">
        <dc:Bounds x="350" y="45" width="50" height="50" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="catch_payment_di" bpmnElement="catch_payment">
        <dc:Bounds x="507" y="52" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="ship_order_di" bpmnElement="ship_order">
        <dc:Bounds x="625" y="30" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="end_shipped_di" bpmnElement="end_shipped">
        <dc:Bounds x="807" y="52" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="catch_timeout_di" bpmnElement="catch_timeout">
        <dc:Bounds x="507" y="192" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="cancel_order_di" bpmnElement="cancel_order">
        <dc:Bounds x="625" y="170" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="end_cancelled_di" bpmnElement="end_cancelled">
        <dc:Bounds x="807" y="192" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="flow_start_to_reserve_di" bpmnElement="flow_start_to_reserve">
        <di:waypoint x="93" y="70" />
        <di:waypoint x="175" y="70" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="flow_reserve_to_wait_di" bpmnElement="flow_reserve_to_wait">
        <di:waypoint x="275" y="70" />
        <di:waypoint x="350" y="70" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="flow_to_payment_catch_di" bpmnElement="flow_to_payment_catch">
        <di:waypoint x="400" y="70" />
        <di:waypoint x="507" y="70" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="flow_to_timeout_catch_di" bpmnElement="flow_to_timeout_catch">
        <di:waypoint x="375" y="95" />
        <di:waypoint x="375" y="210" />
        <di:waypoint x="507" y="210" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="flow_payment_to_ship_di" bpmnElement="flow_payment_to_ship">
        <di:waypoint x="543" y="70" />
        <di:waypoint x="625" y="70" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="flow_ship_to_end_di" bpmnElement="flow_ship_to_end">
        <di:waypoint x="725" y="70" />
        <di:waypoint x="807" y="70" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="flow_timeout_to_cancel_di" bpmnElement="flow_timeout_to_cancel">
        <di:waypoint x="543" y="210" />
        <di:waypoint x="625" y="210" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="flow_cancel_to_end_di" bpmnElement="flow_cancel_to_end">
        <di:waypoint x="725" y="210" />
        <di:waypoint x="807" y="210" />
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</definitions>
```

---

## Example 4 — Loan Application

businessRuleTask and an embedded subProcess.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<definitions
  xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
  id="Definitions_loan-application"
  targetNamespace="http://bpmn.io/schema/bpmn"
  exporter="bpmn-xml-generator"
  exporterVersion="1.0">
  <process id="loan-application" name="Loan Application" isExecutable="true">
    <startEvent id="start" name="Application Received">
      <outgoing>flow_start_to_validate</outgoing>
    </startEvent>
    <userTask id="validate_docs" name="Validate Documents">
      <incoming>flow_start_to_validate</incoming>
      <outgoing>flow_validate_to_gw_docs</outgoing>
      <potentialOwner>
        <resourceAssignmentExpression>
          <expression xsi:type="tFormalExpression">operations</expression>
        </resourceAssignmentExpression>
      </potentialOwner>
    </userTask>
    <exclusiveGateway id="gw_docs" name="Docs Valid?" default="flow_docs_invalid">
      <incoming>flow_validate_to_gw_docs</incoming>
      <outgoing>flow_docs_valid</outgoing>
      <outgoing>flow_docs_invalid</outgoing>
    </exclusiveGateway>
    <businessRuleTask id="credit_rule" name="Evaluate Credit Score">
      <documentation>Decision reference is engine-specific; set it in your engine's own extension.</documentation>
      <incoming>flow_docs_valid</incoming>
      <outgoing>flow_credit_to_gw_score</outgoing>
    </businessRuleTask>
    <exclusiveGateway id="gw_score" name="Auto-Approve?" default="flow_manual">
      <incoming>flow_credit_to_gw_score</incoming>
      <outgoing>flow_auto_approve</outgoing>
      <outgoing>flow_manual</outgoing>
    </exclusiveGateway>
    <serviceTask id="auto_approve" name="Auto-Approve Loan">
      <incoming>flow_auto_approve</incoming>
      <outgoing>flow_auto_to_end</outgoing>
    </serviceTask>
    <subProcess id="sub_manual_review" name="Manual Review">
      <incoming>flow_manual</incoming>
      <outgoing>flow_sub_to_end</outgoing>
      <startEvent id="sub_start">
        <outgoing>sub_flow_1</outgoing>
      </startEvent>
      <userTask id="senior_review" name="Senior Analyst Review">
        <incoming>sub_flow_1</incoming>
        <outgoing>sub_flow_2</outgoing>
        <potentialOwner>
          <resourceAssignmentExpression>
            <expression xsi:type="tFormalExpression">senior-analysts</expression>
          </resourceAssignmentExpression>
        </potentialOwner>
      </userTask>
      <endEvent id="sub_end">
        <incoming>sub_flow_2</incoming>
      </endEvent>
      <sequenceFlow id="sub_flow_1" sourceRef="sub_start" targetRef="senior_review" />
      <sequenceFlow id="sub_flow_2" sourceRef="senior_review" targetRef="sub_end" />
    </subProcess>
    <endEvent id="end_approved" name="Loan Approved">
      <incoming>flow_auto_to_end</incoming>
      <incoming>flow_sub_to_end</incoming>
    </endEvent>
    <endEvent id="end_rejected" name="Application Rejected">
      <incoming>flow_docs_invalid</incoming>
    </endEvent>
    <sequenceFlow id="flow_start_to_validate" sourceRef="start" targetRef="validate_docs" />
    <sequenceFlow id="flow_validate_to_gw_docs" sourceRef="validate_docs" targetRef="gw_docs" />
    <sequenceFlow id="flow_docs_valid" sourceRef="gw_docs" targetRef="credit_rule">
      <conditionExpression xsi:type="tFormalExpression">{{variables.documentsValid == true}}</conditionExpression>
    </sequenceFlow>
    <sequenceFlow id="flow_docs_invalid" sourceRef="gw_docs" targetRef="end_rejected" />
    <sequenceFlow id="flow_credit_to_gw_score" sourceRef="credit_rule" targetRef="gw_score" />
    <sequenceFlow id="flow_auto_approve" sourceRef="gw_score" targetRef="auto_approve">
      <conditionExpression xsi:type="tFormalExpression">{{variables.creditScore &gt;= 700 &amp;&amp; variables.requestedAmount &lt;= 50000}}</conditionExpression>
    </sequenceFlow>
    <sequenceFlow id="flow_manual" sourceRef="gw_score" targetRef="sub_manual_review" />
    <sequenceFlow id="flow_auto_to_end" sourceRef="auto_approve" targetRef="end_approved" />
    <sequenceFlow id="flow_sub_to_end" sourceRef="sub_manual_review" targetRef="end_approved" />
  </process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_loan-application">
    <bpmndi:BPMNPlane id="BPMNPlane_loan-application" bpmnElement="loan-application">
      <bpmndi:BPMNShape id="start_di" bpmnElement="start">
        <dc:Bounds x="57" y="52" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="validate_docs_di" bpmnElement="validate_docs">
        <dc:Bounds x="175" y="30" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="gw_docs_di" bpmnElement="gw_docs" isMarkerVisible="true">
        <dc:Bounds x="350" y="45" width="50" height="50" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="credit_rule_di" bpmnElement="credit_rule">
        <dc:Bounds x="475" y="30" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="gw_score_di" bpmnElement="gw_score" isMarkerVisible="true">
        <dc:Bounds x="650" y="45" width="50" height="50" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="auto_approve_di" bpmnElement="auto_approve">
        <dc:Bounds x="775" y="30" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="end_approved_di" bpmnElement="end_approved">
        <dc:Bounds x="957" y="52" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="end_rejected_di" bpmnElement="end_rejected">
        <dc:Bounds x="507" y="192" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="sub_manual_review_di" bpmnElement="sub_manual_review">
        <dc:Bounds x="775" y="170" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="flow_start_to_validate_di" bpmnElement="flow_start_to_validate">
        <di:waypoint x="93" y="70" />
        <di:waypoint x="175" y="70" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="flow_validate_to_gw_docs_di" bpmnElement="flow_validate_to_gw_docs">
        <di:waypoint x="275" y="70" />
        <di:waypoint x="350" y="70" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="flow_docs_valid_di" bpmnElement="flow_docs_valid">
        <di:waypoint x="400" y="70" />
        <di:waypoint x="475" y="70" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="flow_docs_invalid_di" bpmnElement="flow_docs_invalid">
        <di:waypoint x="375" y="95" />
        <di:waypoint x="375" y="210" />
        <di:waypoint x="507" y="210" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="flow_credit_to_gw_score_di" bpmnElement="flow_credit_to_gw_score">
        <di:waypoint x="575" y="70" />
        <di:waypoint x="650" y="70" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="flow_auto_approve_di" bpmnElement="flow_auto_approve">
        <di:waypoint x="700" y="70" />
        <di:waypoint x="775" y="70" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="flow_manual_di" bpmnElement="flow_manual">
        <di:waypoint x="675" y="95" />
        <di:waypoint x="675" y="210" />
        <di:waypoint x="775" y="210" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="flow_auto_to_end_di" bpmnElement="flow_auto_to_end">
        <di:waypoint x="875" y="70" />
        <di:waypoint x="957" y="70" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="flow_sub_to_end_di" bpmnElement="flow_sub_to_end">
        <di:waypoint x="875" y="210" />
        <di:waypoint x="975" y="210" />
        <di:waypoint x="975" y="88" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNShape id="sub_start_di" bpmnElement="sub_start">
        <dc:Bounds x="57" y="52" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="senior_review_di" bpmnElement="senior_review">
        <dc:Bounds x="175" y="30" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="sub_end_di" bpmnElement="sub_end">
        <dc:Bounds x="357" y="52" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="sub_flow_1_di" bpmnElement="sub_flow_1">
        <di:waypoint x="93" y="70" />
        <di:waypoint x="175" y="70" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="sub_flow_2_di" bpmnElement="sub_flow_2">
        <di:waypoint x="275" y="70" />
        <di:waypoint x="357" y="70" />
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</definitions>
```

---

## Note on the embedded sub-process in Example 4

Its children are laid out off-canvas and the parent renders collapsed — see `../SKILL.md` §7.
When a sub-flow needs to be visible, model it as a separate process invoked by a `callActivity`.

