"""
Prototype workflow service — simplified state machine.
Enforces allowed transitions. For prototype, no complex rule evaluation.
"""
from models import ProposalStatus, AwardStatus, ProjectStatus, EthicsStatus

# Researcher-initiated transitions
RESEARCHER_TRANSITIONS = {
    ProposalStatus.DRAFT: [ProposalStatus.SUBMITTED],
    ProposalStatus.RETURNED: [ProposalStatus.SUBMITTED],
}

# Admin/Grant officer-initiated transitions
ADMIN_TRANSITIONS = {
    ProposalStatus.SUBMITTED:      [ProposalStatus.INTERNAL_REVIEW, ProposalStatus.RETURNED, ProposalStatus.DECLINED],
    ProposalStatus.INTERNAL_REVIEW:[ProposalStatus.UNDER_REVIEW, ProposalStatus.RETURNED, ProposalStatus.DECLINED],
    ProposalStatus.UNDER_REVIEW:   [ProposalStatus.AWARDED, ProposalStatus.DECLINED, ProposalStatus.RETURNED],
    ProposalStatus.RETURNED:       [ProposalStatus.INTERNAL_REVIEW],
}

# Combined for any role
PROPOSAL_TRANSITIONS = {
    ProposalStatus.DRAFT:          [ProposalStatus.SUBMITTED],
    ProposalStatus.RETURNED:       [ProposalStatus.SUBMITTED, ProposalStatus.INTERNAL_REVIEW],
    ProposalStatus.SUBMITTED:      [ProposalStatus.INTERNAL_REVIEW, ProposalStatus.RETURNED, ProposalStatus.DECLINED],
    ProposalStatus.INTERNAL_REVIEW:[ProposalStatus.UNDER_REVIEW, ProposalStatus.RETURNED, ProposalStatus.DECLINED],
    ProposalStatus.UNDER_REVIEW:   [ProposalStatus.AWARDED, ProposalStatus.DECLINED, ProposalStatus.RETURNED],
}

# Stage labels for the 5-step workflow
STAGE_LABELS = {
    ProposalStatus.DRAFT:           (0, 'Draft'),
    ProposalStatus.RETURNED:        (0, 'Returned for Revision'),
    ProposalStatus.SUBMITTED:       (1, 'Received – Awaiting Review'),
    ProposalStatus.INTERNAL_REVIEW: (2, 'Step 1/4: Eligibility & Technical Review'),
    ProposalStatus.UNDER_REVIEW:    (3, 'Step 2/4: Budget & Panel Review'),
    ProposalStatus.AWARDED:         (4, 'Awarded'),
    ProposalStatus.DECLINED:        (4, 'Not Awarded'),
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
