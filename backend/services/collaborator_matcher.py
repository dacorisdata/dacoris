"""
Collaborator Suggestion Service

Scores institution researchers against a grant opportunity / proposal context
using TF-IDF overlap on expertise, publications, skills, and ORCID data.
Optionally explains fit with GPT-4o-mini when OPENAI_API_KEY is set.
"""

import json
import os
import re
from collections import Counter
from dataclasses import dataclass, field
from typing import List, Optional

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models import GrantOpportunity, PrimaryAccountType, User, UserStatus
from services.grant_matcher import (
    ResearcherProfile,
    build_researcher_token_bag,
    gather_researcher_profile,
    tf_idf_overlap,
    tokenize,
)


@dataclass
class CollaboratorSuggestion:
    user_id: str
    name: str
    email: str
    department: str
    job_title: str
    orcid: str
    expertise_keywords: List[str] = field(default_factory=list)
    skills: List[str] = field(default_factory=list)
    research_areas: List[str] = field(default_factory=list)
    score: float = 0.0
    reasons: List[str] = field(default_factory=list)
    match_explanation: Optional[str] = None


def build_proposal_context_text(
    opportunity: Optional[GrantOpportunity] = None,
    proposal_title: Optional[str] = None,
) -> str:
    parts = [proposal_title or ""]
    if opportunity:
        parts.extend([
            opportunity.title or "",
            opportunity.description or "",
            opportunity.eligibility or "",
            opportunity.criteria or "",
            opportunity.category or "",
            opportunity.sponsor or "",
            opportunity.funding_type or "",
        ])
    return " ".join(p for p in parts if p).strip()


def build_manuscript_context_text(
    title: Optional[str] = None,
    description: Optional[str] = None,
    keywords: Optional[str] = None,
    department: Optional[str] = None,
) -> str:
    kw_text = keywords or ""
    if keywords:
        try:
            parsed = json.loads(keywords) if keywords.strip().startswith("[") else keywords
            if isinstance(parsed, list):
                kw_text = " ".join(str(k) for k in parsed)
        except Exception:
            kw_text = keywords.replace(",", " ")
    parts = [title or "", description or "", kw_text, department or ""]
    return " ".join(p for p in parts if p).strip()


def score_researcher_for_context(
    profile: ResearcherProfile,
    researcher_tokens: Counter,
    context_text: str,
    user: User,
) -> CollaboratorSuggestion:
    base_score = tf_idf_overlap(researcher_tokens, context_text)

    context_lower = context_text.lower()
    category_boost = 1.0
    if profile.department and profile.department.lower() in context_lower:
        category_boost = 1.2
    if profile.research_areas and any(a.lower() in context_lower for a in profile.research_areas):
        category_boost = max(category_boost, 1.25)

    final_score = base_score * category_boost

    reasons: List[str] = []
    kw_hits = [kw for kw in profile.expertise_keywords if kw.lower() in context_lower]
    if kw_hits:
        reasons.append(f"Expertise: {', '.join(kw_hits[:3])}")
    skill_hits = [s for s in profile.skills if s.lower() in context_lower]
    if skill_hits:
        reasons.append(f"Skills: {', '.join(skill_hits[:3])}")
    area_hits = [a for a in profile.research_areas if a.lower() in context_lower]
    if area_hits:
        reasons.append(f"Research areas: {', '.join(area_hits[:2])}")
    pub_kw_hits = [k for k in profile.publication_keywords if k.lower() in context_lower]
    if pub_kw_hits:
        reasons.append(f"Publication topics: {', '.join(pub_kw_hits[:3])}")
    if profile.department and profile.department.lower() in context_lower:
        reasons.append(f"Department fit: {profile.department}")
    if profile.orcid_funding_titles:
        reasons.append("Prior grant experience on ORCID record")
    if profile.publication_titles and not reasons:
        reasons.append(f"Active researcher ({len(profile.publication_titles)} publications indexed)")

    if not reasons:
        if profile.expertise_keywords:
            reasons.append(f"Specialty: {', '.join(profile.expertise_keywords[:3])}")
        elif profile.department:
            reasons.append(f"Based at {profile.department}")
        else:
            reasons.append("Institution researcher with complementary profile")

    return CollaboratorSuggestion(
        user_id=user.id,
        name=user.name or "",
        email=user.email or "",
        department=user.department or profile.department or "",
        job_title=user.job_title or profile.job_title or "",
        orcid=user.orcid_id or "",
        expertise_keywords=profile.expertise_keywords[:8],
        skills=profile.skills[:6],
        research_areas=profile.research_areas[:4],
        score=round(final_score, 4),
        reasons=reasons[:4],
    )


def score_researcher_for_manuscript(
    profile: ResearcherProfile,
    researcher_tokens: Counter,
    context_text: str,
    user: User,
) -> CollaboratorSuggestion:
    suggestion = score_researcher_for_context(profile, researcher_tokens, context_text, user)
    context_tokens = set(tokenize(context_text))
    related_work = []
    for title in (profile.publication_titles + profile.orcid_work_titles)[:20]:
        title_tokens = set(tokenize(title))
        if title_tokens & context_tokens:
            related_work.append(title)
    if related_work:
        suggestion.reasons.insert(0, f"Related publication: {related_work[0][:70]}")
        suggestion.score = round(suggestion.score * 1.35, 4)
    coauthor_signal = profile.orcid_work_titles or profile.publication_titles
    if coauthor_signal and len(suggestion.reasons) < 4:
        suggestion.reasons.append(f"{len(coauthor_signal)} indexed works on profile")
    return suggestion


async def llm_explain_collaborators(
    context_text: str,
    candidates: List[CollaboratorSuggestion],
    api_key: str,
    context_kind: str = "proposal",
) -> List[CollaboratorSuggestion]:
    if not candidates:
        return candidates

    researcher_blocks = []
    for i, c in enumerate(candidates[:8], 1):
        researcher_blocks.append(
            f"{i}. {c.name} — {c.job_title or 'Researcher'}, {c.department or 'N/A'}\n"
            f"   Expertise: {', '.join(c.expertise_keywords[:6]) or 'N/A'}\n"
            f"   Skills: {', '.join(c.skills[:5]) or 'N/A'}\n"
            f"   Signals: {'; '.join(c.reasons[:3])}"
        )

    if context_kind == "manuscript":
        advisor_role = "manuscript co-author advisor"
        task = "explain in one concise sentence why each researcher would be a strong co-author based on specialty and past works"
        context_label = "MANUSCRIPT CONTEXT"
    else:
        advisor_role = "research collaboration advisor"
        task = "explain in one concise sentence why each researcher would strengthen the team"
        context_label = "PROPOSAL CONTEXT"

    prompt = (
        f"You are a {advisor_role}. Given the context below, {task}.\n\n"
        f"{context_label}:\n{context_text[:1200]}\n\n"
        f"SUGGESTED RESEARCHERS:\n" + "\n".join(researcher_blocks) + "\n\n"
        "Respond in JSON only:\n"
        '[{"index": 1, "explanation": "<why invite them>"}, ...]'
    )

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            "https://api.openai.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={
                "model": os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
                "messages": [
                    {"role": "system", "content": "You are a research collaboration advisor. Respond ONLY in valid JSON."},
                    {"role": "user", "content": prompt},
                ],
                "temperature": 0.3,
                "max_tokens": 1200,
            },
        )
        resp.raise_for_status()

    raw = resp.json()["choices"][0]["message"]["content"]
    raw = re.sub(r"^```[a-z]*\n?", "", raw.strip())
    raw = re.sub(r"\n?```$", "", raw.strip())
    rankings = json.loads(raw)
    if isinstance(rankings, dict):
        rankings = next(iter(rankings.values()), [])

    index_map = {i + 1: c for i, c in enumerate(candidates[:8])}
    for r in rankings:
        idx = r.get("index")
        if idx in index_map and r.get("explanation"):
            index_map[idx].match_explanation = r["explanation"]
    return candidates


async def _suggest_for_context(
    current_user: User,
    db: AsyncSession,
    context_text: str,
    context_summary: str,
    exclude_user_ids: Optional[List[str]] = None,
    limit: int = 6,
    context_kind: str = "proposal",
) -> dict:
    exclude = set(exclude_user_ids or [])
    exclude.add(current_user.id)

    if not context_text or len(tokenize(context_text)) < 2:
        return {
            "suggestions": [],
            "total_candidates": 0,
            "ai_enhanced": False,
            "context_summary": context_summary,
        }

    if not current_user.primary_institution_id:
        return {
            "suggestions": [],
            "total_candidates": 0,
            "ai_enhanced": False,
            "context_summary": context_summary[:200],
        }

    result = await db.execute(
        select(User).where(
            User.primary_institution_id == current_user.primary_institution_id,
            User.status == UserStatus.ACTIVE,
            User.primary_account_type == PrimaryAccountType.RESEARCHER,
            User.id.notin_(list(exclude)),
        )
    )
    candidates_users = result.scalars().all()
    score_fn = score_researcher_for_manuscript if context_kind == "manuscript" else score_researcher_for_context

    scored: List[CollaboratorSuggestion] = []
    for user in candidates_users:
        profile = await gather_researcher_profile(user, db)
        tokens = build_researcher_token_bag(profile)
        if not tokens:
            continue
        suggestion = score_fn(profile, tokens, context_text, user)
        if suggestion.score > 0 or profile.expertise_keywords or profile.skills or profile.publication_titles:
            scored.append(suggestion)

    scored.sort(key=lambda x: x.score, reverse=True)
    top = scored[: max(limit, 12)]
    ai_enhanced = False

    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if api_key and top:
        try:
            top = await llm_explain_collaborators(context_text, top[:limit], api_key, context_kind=context_kind)
            ai_enhanced = True
        except Exception as exc:
            print(f"[collaborator_matcher] LLM explain failed: {exc}")

    return {
        "suggestions": top[:limit],
        "total_candidates": len(candidates_users),
        "ai_enhanced": ai_enhanced,
        "context_summary": context_summary[:200],
    }


def _serialize_suggestions(suggestions: List[CollaboratorSuggestion]) -> list:
    return [
        {
            "user_id": s.user_id,
            "name": s.name,
            "email": s.email,
            "department": s.department,
            "job_title": s.job_title,
            "orcid": s.orcid,
            "expertise_keywords": s.expertise_keywords,
            "skills": s.skills,
            "research_areas": s.research_areas,
            "score": s.score,
            "reasons": s.reasons,
            "match_explanation": s.match_explanation,
        }
        for s in suggestions
    ]


async def suggest_collaborators(
    current_user: User,
    db: AsyncSession,
    opportunity_id: Optional[str] = None,
    proposal_title: Optional[str] = None,
    exclude_user_ids: Optional[List[str]] = None,
    limit: int = 6,
) -> dict:
    exclude = set(exclude_user_ids or [])
    exclude.add(current_user.id)

    opportunity = None
    if opportunity_id:
        opportunity = await db.get(GrantOpportunity, opportunity_id)

    context_text = build_proposal_context_text(opportunity, proposal_title)
    summary = proposal_title or (opportunity.title if opportunity else "")
    result = await _suggest_for_context(
        current_user=current_user,
        db=db,
        context_text=context_text,
        context_summary=summary,
        exclude_user_ids=list(exclude),
        limit=limit,
        context_kind="proposal",
    )
    return result


async def suggest_coauthors(
    current_user: User,
    db: AsyncSession,
    title: Optional[str] = None,
    description: Optional[str] = None,
    keywords: Optional[str] = None,
    department: Optional[str] = None,
    exclude_user_ids: Optional[List[str]] = None,
    limit: int = 6,
) -> dict:
    context_text = build_manuscript_context_text(title, description, keywords, department)
    summary = title or "Manuscript"
    return await _suggest_for_context(
        current_user=current_user,
        db=db,
        context_text=context_text,
        context_summary=summary,
        exclude_user_ids=exclude_user_ids,
        limit=limit,
        context_kind="manuscript",
    )


async def _researcher_snapshot(
    user_id: str,
    db: AsyncSession,
    context_text: str,
    context_kind: str = "proposal",
) -> Optional[dict]:
    user = await db.get(User, user_id)
    if not user:
        return None

    profile = await gather_researcher_profile(user, db)
    suggestion = None
    if context_text:
        tokens = build_researcher_token_bag(profile)
        score_fn = score_researcher_for_manuscript if context_kind == "manuscript" else score_researcher_for_context
        suggestion = score_fn(profile, tokens, context_text, user)

    return {
        "user_id": user.id,
        "name": user.name,
        "email": user.email,
        "department": user.department or profile.department,
        "job_title": user.job_title or profile.job_title,
        "orcid": user.orcid_id,
        "biography": (profile.biography or "")[:500],
        "expertise_keywords": profile.expertise_keywords,
        "skills": profile.skills,
        "research_areas": profile.research_areas,
        "publication_titles": profile.publication_titles[:6],
        "orcid_work_titles": profile.orcid_work_titles[:6],
        "signals_used": profile.signals_used,
        "match_score": suggestion.score if suggestion else None,
        "match_reasons": suggestion.reasons if suggestion else [],
        "match_explanation": suggestion.match_explanation if suggestion else None,
    }


async def researcher_profile_snapshot(
    user_id: str,
    db: AsyncSession,
    opportunity_id: Optional[str] = None,
    proposal_title: Optional[str] = None,
) -> Optional[dict]:
    user = await db.get(User, user_id)
    if not user:
        return None

    profile = await gather_researcher_profile(user, db)
    opportunity = await db.get(GrantOpportunity, opportunity_id) if opportunity_id else None
    context_text = build_proposal_context_text(opportunity, proposal_title)
    return await _researcher_snapshot(user_id, db, context_text, context_kind="proposal")


async def coauthor_profile_snapshot(
    user_id: str,
    db: AsyncSession,
    title: Optional[str] = None,
    description: Optional[str] = None,
    keywords: Optional[str] = None,
    department: Optional[str] = None,
) -> Optional[dict]:
    context_text = build_manuscript_context_text(title, description, keywords, department)
    return await _researcher_snapshot(user_id, db, context_text, context_kind="manuscript")
