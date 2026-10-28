import { emptyDraft, safetyControls, type Draft } from "../src/lib/domain";
export function validDraft(): Draft {
  const local = (offset: number) =>
    new Date(Date.now() + offset + 8 * 3600000).toISOString().slice(0, 16);
  return {
    ...structuredClone(emptyDraft),
    title: "Insulation condition inspection",
    department: "Maintenance",
    location: "Warehouse A",
    start: local(-3600000),
    end: local(7200000),
    description: "Visual inspection within the approved work area.",
    purpose: "Verify condition before planned maintenance.",
    requester: "Test Requester",
    phone: "+60123456789",
    email: "requester@pcg.test",
    holder: "Test Holder",
    contractor: "PCG Maintenance",
    contractorApproved: true,
    documentationComplete: true,
    certificateAvailable: true,
    sheComplete: true,
    workers: [
      {
        id: "worker-test",
        name: "Test Worker",
        identity: "EMP-001",
        company: "PCG Maintenance",
        trade: "Inspector",
        phone: "+60123456789",
        competency: "Inspection",
        expiry: "2099-12-31",
        inducted: true,
        acknowledged: true,
      },
    ],
    activities: ["Lone working"],
    ppe: ["Safety shoes", "Safety helmet"],
    controls: [...safetyControls],
    hazards: [
      {
        id: "hazard-test",
        hazard: "Slips and trips",
        consequence: "Minor injury",
        affected: "Work team",
        controls: "Demarcate work area and remove trip hazards.",
        responsible: "Test Holder",
        likelihood: 3,
        severity: 2,
        residualLikelihood: 1,
        residualSeverity: 2,
      },
    ],
    confirmed: true,
  };
}
