"""
Prototype workflow service — simplified state machine.
Enforces allowed transitions. For prototype, no complex rule evaluation.
"""
from models import ProposalStatus, AwardStatus, ProjectStatus, EthicsStatus

PROPOSAL_TRANSITIONS = {
    ProposalStatus.DRAFT: [ProposalStatus.INTERNAL_REVIEW],
    ProposalStatus.INTERNAL_REVIEW: [ProposalStatus.RETURNED, ProposalStatus.SUBMITTED],
    ProposalStatus.RETURNED: [ProposalStatus.DRAFT],
    ProposalStatus.SUBMITTED: [ProposalStatus.UNDER_REVIEW],
    ProposalStatus.UNDER_REVIEW: [ProposalStatus.AWARDED, ProposalStatus.DECLINED],
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
