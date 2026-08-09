"""Claim pending proposal collaboration invites after account creation / login."""
from __future__ import annotations

from typing import List, Optional

from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

from models import Proposal, ProposalCollaborator, User, Notification, NotificationType
from services.notifications import create_notification


async def claim_pending_proposal_invites(
    db: AsyncSession,
    user: User,
    invitation_token: Optional[str] = None,
) -> List[dict]:
    """
    Link pending email/token invites to this user and create in-app notifications.

    Safe to call repeatedly — already-linked invites are not re-notified.
    """
    if not user or not user.email:
        return []

    email = user.email.strip().lower()
    filters = [
        ProposalCollaborator.status == "pending",
        or_(
            ProposalCollaborator.user_id.is_(None),
            ProposalCollaborator.user_id == user.id,
        ),
    ]

    email_or_token = [func.lower(ProposalCollaborator.invited_email) == email]
    if invitation_token:
        email_or_token.append(ProposalCollaborator.invitation_token == invitation_token)
    filters.append(or_(*email_or_token))

    result = await db.execute(select(ProposalCollaborator).where(*filters))
    collabs = list(result.scalars().all())
    claimed = []

    for collab in collabs:
        invited = (collab.invited_email or "").strip().lower()
        token_ok = bool(invitation_token and collab.invitation_token == invitation_token)
        email_ok = bool(invited and invited == email)

        # Require email match when present; token alone is not enough if emails differ
        if invited and not email_ok:
            continue
        if not email_ok and not token_ok:
            continue

        newly_linked = collab.user_id is None
        if newly_linked:
            collab.user_id = user.id

        proposal = await db.get(Proposal, collab.proposal_id)
        if not proposal:
            continue

        existing_notif = await db.execute(
            select(Notification.id).where(
                Notification.recipient_id == user.id,
                Notification.action_url == f"/researcher/grants/proposals/{proposal.id}/collab/{collab.id}",
            ).limit(1)
        )
        if existing_notif.scalar_one_or_none() is None:
            await create_notification(
                db,
                user.id,
                title="Proposal Collaboration Invite",
                message=f"You've been invited to collaborate on '{proposal.title}' as {collab.role}",
                entity_type="proposal",
                entity_id=proposal.id,
                link=f"/researcher/grants/proposals/{proposal.id}/collab/{collab.id}",
                notification_type=NotificationType.PROPOSAL_INVITATION,
            )

        claimed.append({
            "collaborator_id": collab.id,
            "proposal_id": proposal.id,
            "proposal_title": proposal.title,
            "role": collab.role,
            "newly_linked": newly_linked,
        })

    if claimed:
        await db.commit()

    return claimed
