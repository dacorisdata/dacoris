"""
Prototype workflow service — simplified state machine.
Enforces allowed transitions. For prototype, no complex rule evaluation.
"""
from models import ProposalStatus, AwardStatus, ProjectStatus, EthicsStatus

# Researcher-initiated transitions
RESEARCHER_TRANSITIONS = {
    ProposalStatus.DRAFT: [ProposalStatus.SUBMITTED],
    ProposalStatus.RETURNED: [ProposalStatus.SUBMITTED],
    ProposalStatus.APPROVED: [ProposalStatus.APPLYING],
    ProposalStatus.APPLYING: [ProposalStatus.AWARDED, ProposalStatus.FUNDING_UNSUCCESSFUL],
}

# Admin/Grant officer-initiated transitions
ADMIN_TRANSITIONS = {
    ProposalStatus.SUBMITTED:       [ProposalStatus.UNDER_REVIEW, ProposalStatus.RETURNED, ProposalStatus.DECLINED],
    ProposalStatus.INTERNAL_REVIEW: [ProposalStatus.UNDER_REVIEW, ProposalStatus.RETURNED, ProposalStatus.DECLINED],
    ProposalStatus.UNDER_REVIEW:    [ProposalStatus.APPROVED, ProposalStatus.DECLINED, ProposalStatus.RETURNED],
    ProposalStatus.RETURNED:        [ProposalStatus.UNDER_REVIEW],
}

# Combined for any role
PROPOSAL_TRANSITIONS = {
    ProposalStatus.DRAFT:           [ProposalStatus.SUBMITTED],
    ProposalStatus.RETURNED:        [ProposalStatus.SUBMITTED, ProposalStatus.UNDER_REVIEW],
    ProposalStatus.SUBMITTED:       [ProposalStatus.UNDER_REVIEW, ProposalStatus.RETURNED, ProposalStatus.DECLINED],
    ProposalStatus.INTERNAL_REVIEW: [ProposalStatus.UNDER_REVIEW, ProposalStatus.RETURNED, ProposalStatus.DECLINED],
    ProposalStatus.UNDER_REVIEW:    [ProposalStatus.APPROVED, ProposalStatus.DECLINED, ProposalStatus.RETURNED],
    ProposalStatus.APPROVED:        [ProposalStatus.APPLYING],
    ProposalStatus.APPLYING:        [ProposalStatus.AWARDED, ProposalStatus.FUNDING_UNSUCCESSFUL],
}

# Stage labels for the workflow UI
STAGE_LABELS = {
    ProposalStatus.DRAFT:                (0, 'Draft'),
    ProposalStatus.RETURNED:             (0, 'Returned for Revision'),
    ProposalStatus.SUBMITTED:            (1, 'Received – Awaiting Review'),
    ProposalStatus.INTERNAL_REVIEW:      (2, 'Section Review'),
    ProposalStatus.UNDER_REVIEW:         (2, 'Concurrent Section Review'),
    ProposalStatus.APPROVED:             (3, 'Institutionally Approved'),
    ProposalStatus.APPLYING:             (4, 'External Application in Progress'),
    ProposalStatus.AWARDED:              (5, 'Funder Award Confirmed'),
    ProposalStatus.FUNDING_UNSUCCESSFUL: (5, 'Funding Unsuccessful'),
    ProposalStatus.DECLINED:             (5, 'Not Approved'),
}

ETHICS_TRANSITIONS = {
    EthicsStatus.DRAFT: [EthicsStatus.SUBMITTED],
    EthicsStatus.SUBMITTED: [EthicsStatus.UNDER_REVIEW],
    EthicsStatus.UNDER_REVIEW: [
        EthicsStatus.APPROVED,
        EthicsStatus.APPROVED_WITH_MODS,
        EthicsStatus.REJECTED,
        EthicsStatus.DEFERRED,
    ],
    EthicsStatus.DEFERRED: [EthicsStatus.SUBMITTED],
}

def can_transition_proposal(current: ProposalStatus, target: ProposalStatus) -> bool:
    allowed = PROPOSAL_TRANSITIONS.get(current, [])
    return target in allowed

def can_transition_ethics(current: EthicsStatus, target: EthicsStatus) -> bool:
    allowed = ETHICS_TRANSITIONS.get(current, [])
    return target in allowed
