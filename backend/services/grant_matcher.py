"""
Agentic Grant Opportunity Matcher Service

Cross-references a researcher's expertise keywords, ORCID data, publications,
skills and research areas against open opportunities. Scores with TF-IDF
keyword overlap; optionally re-ranks with GPT-4o-mini if OPENAI_API_KEY is set.
"""

import json
import math
import os
import re
from collections import Counter
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import List, Optional

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models import (
    GrantOpportunity,
    OrcidProfile,
    Publication,
    PublicationLibrary,
    TrainingNeedsAssessment,
    User,
    UserSkill,
)

# ── Constants ────────────────────────────────────────────────────────────────

STOPWORDS = frozenset({
    "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "by", "from", "is", "are", "was", "were", "be", "been",
    "have", "has", "had", "do", "does", "did", "will", "would", "could",
    "should", "may", "might", "shall", "can", "this", "that", "these",
    "those", "it", "its", "their", "they", "we", "you", "he", "she",
    "not", "no", "nor", "so", "yet", "both", "either", "neither",
    "each", "few", "more", "most", "other", "some", "such", "than",
    "too", "very", "just", "also", "as", "if", "while", "although",
    "research", "project", "study", "studies", "work", "works",
    "grant", "funding", "opportunity", "award",
})


# ── Data classes ─────────────────────────────────────────────────────────────

@dataclass
class ResearcherProfile:
    user_id: str
    name: str
    department: str
    job_title: str
    biography: str
    expertise_keywords: List[str]
    orcid_work_titles: List[str]
    orcid_funding_titles: List[str]
    publication_titles: List[str]
    publication_keywords: List[str]
    publication_abstracts: List[str]
    skills: List[str]
    research_areas: List[str]
    signals_used: List[str] = field(default_factory=list)


@dataclass
class MatchResult:
    opportunity_id: str
    title: str
    sponsor: Optional[str]
    category: Optional[str]
    status: Optional[str]
    deadline: Optional[str]
    amount_min: Optional[float]
    amount_max: Optional[float]
    currency: Optional[str]
    description: Optional[str]
    eligibility: Optional[str]
    score: float
    reasons: List[str]
    match_explanation: Optional[str] = None


# ── Text helpers ─────────────────────────────────────────────────────────────

def tokenize(text: str) -> List[str]:
    text = (text or "").lower()
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    return [t for t in text.split() if t not in STOPWORDS and len(t) > 2]


def tf_idf_overlap(researcher_tokens: Counter, opp_text: str) -> float:
    opp_tokens = Counter(tokenize(opp_text))
    if not opp_tokens or not researcher_tokens:
        return 0.0
    overlap = sum(
        (1 + math.log(researcher_tokens[t])) * (1 + math.log(opp_tokens[t]))
        for t in researcher_tokens if t in opp_tokens
    )
    norm_r = math.sqrt(sum((1 + math.log(c)) ** 2 for c in researcher_tokens.values()))
    norm_o = math.sqrt(sum((1 + math.log(c)) ** 2 for c in opp_tokens.values()))
    return overlap / (norm_r * norm_o) if (norm_r * norm_o) > 0 else 0.0


def build_researcher_token_bag(profile: ResearcherProfile) -> Counter:
    parts = (
        profile.expertise_keywords
        + [profile.department, profile.job_title, profile.biography]
        + profile.orcid_work_titles
        + profile.orcid_funding_titles
        + profile.publication_titles
        + profile.publication_keywords
        + profile.publication_abstracts
        + profile.skills
        + profile.research_areas
    )
    text = " ".join(str(p) for p in parts if p)
    return Counter(tokenize(text))


# ── Profile aggregation ──────────────────────────────────────────────────────

async def gather_researcher_profile(user: User, db: AsyncSession) -> ResearcherProfile:
    signals_used: List[str] = []

    # 1. Expertise keywords
    expertise_keywords: List[str] = []
    if user.expertise_keywords:
        try:
            expertise_keywords = json.loads(user.expertise_keywords)
        except Exception:
            expertise_keywords = [k.strip() for k in user.expertise_keywords.split(",") if k.strip()]
    if expertise_keywords:
        signals_used.append("Profile expertise keywords")
    if user.department:
        signals_used.append("Department")
    if user.job_title:
        signals_used.append("Job title")

    # 2. ORCID data
    biography = ""
    orcid_work_titles: List[str] = []
    orcid_funding_titles: List[str] = []
    try:
        orcid = await db.scalar(select(OrcidProfile).where(OrcidProfile.user_id == user.id))
        if orcid:
            biography = orcid.biography or ""
            if biography:
                signals_used.append("ORCID biography")
            if orcid.works:
                works = json.loads(orcid.works) if isinstance(orcid.works, str) else orcid.works
                for w in (works or [])[:30]:
                    if not isinstance(w, dict):
                        continue
                    title_val = w.get("title") or ""
                    if isinstance(title_val, dict):
                        title_val = title_val.get("value", "")
                    if not title_val:
                        summaries = w.get("work-summary", [])
                        if summaries and isinstance(summaries, list):
                            title_val = (
                                summaries[0].get("title", {}).get("title", {}).get("value", "")
                            )
                    if title_val:
                        orcid_work_titles.append(str(title_val))
                if orcid_work_titles:
                    signals_used.append("ORCID publication works")
            if orcid.funding:
                funding = json.loads(orcid.funding) if isinstance(orcid.funding, str) else orcid.funding
                for f in (funding or [])[:10]:
                    if isinstance(f, dict):
                        t = f.get("title", "")
                        if t:
                            orcid_funding_titles.append(str(t))
                if orcid_funding_titles:
                    signals_used.append("ORCID funding history")
    except Exception:
        pass

    # 3. Publications (via libraries)
    publication_titles: List[str] = []
    publication_keywords: List[str] = []
    publication_abstracts: List[str] = []
    try:
        libs_result = await db.execute(
            select(PublicationLibrary).where(PublicationLibrary.user_id == user.id)
        )
        lib_ids = [lib.id for lib in libs_result.scalars().all()]
        if lib_ids:
            pubs_result = await db.execute(
                select(Publication).where(Publication.library_id.in_(lib_ids)).limit(60)
            )
            pubs = pubs_result.scalars().all()
            for pub in pubs:
                if pub.title:
                    publication_titles.append(pub.title)
                if pub.keywords:
                    try:
                        kws = json.loads(pub.keywords) if isinstance(pub.keywords, str) else pub.keywords
                        if isinstance(kws, list):
                            publication_keywords.extend(str(k) for k in kws)
                    except Exception:
                        pass
                if pub.abstract:
                    publication_abstracts.append(pub.abstract[:600])
            if pubs:
                signals_used.append(f"Publications ({len(pubs)} papers)")
    except Exception:
        pass

    # 4. Skills
    skills: List[str] = []
    try:
        skills_result = await db.execute(
            select(UserSkill).where(UserSkill.user_id == user.id).limit(30)
        )
        skills = [s.skill_name for s in skills_result.scalars().all()]
        if skills:
            signals_used.append("Registered skills")
    except Exception:
        pass

    # 5. Research areas from training assessment
    research_areas: List[str] = []
    try:
        needs = await db.scalar(
            select(TrainingNeedsAssessment).where(TrainingNeedsAssessment.user_id == user.id)
        )
        if needs and needs.research_areas:
            ra = needs.research_areas
            if isinstance(ra, list):
                research_areas = [str(r) for r in ra]
            elif isinstance(ra, str):
                try:
                    research_areas = json.loads(ra)
                except Exception:
                    research_areas = [ra]
            if research_areas:
                signals_used.append("Training needs research areas")
    except Exception:
        pass

    return ResearcherProfile(
        user_id=user.id,
        name=user.name or "",
        department=user.department or "",
        job_title=user.job_title or "",
        biography=biography,
        expertise_keywords=expertise_keywords,
        orcid_work_titles=orcid_work_titles,
        orcid_funding_titles=orcid_funding_titles,
        publication_titles=publication_titles,
        publication_keywords=list(set(publication_keywords)),
        publication_abstracts=publication_abstracts,
        skills=skills,
        research_areas=research_areas,
        signals_used=signals_used,
    )


# ── Keyword scoring ──────────────────────────────────────────────────────────

def score_opportunity_keyword(
    profile: ResearcherProfile,
    researcher_tokens: Counter,
    opp: GrantOpportunity,
) -> MatchResult:
    opp_text = " ".join(
        filter(None, [
            opp.title or "",
            opp.description or "",
            opp.eligibility or "",
            opp.criteria or "",
            opp.category or "",
            opp.sponsor or "",
            opp.funding_type or "",
        ])
    )

    base_score = tf_idf_overlap(researcher_tokens, opp_text)

    # Status boost: prefer open, discount archived/closed
    status_lower = (opp.status or "").lower()
    status_boost = {"open": 1.5, "upcoming": 1.1, "archived": 0.6, "closed": 0.4}.get(status_lower, 0.9)

    # Category match boost
    researcher_context = " ".join(
        profile.expertise_keywords
        + [profile.department, profile.biography]
        + profile.research_areas
    ).lower()
    category_boost = 1.3 if opp.category and opp.category.lower() in researcher_context else 1.0

    final_score = base_score * status_boost * category_boost

    # Build human-readable reasons
    reasons: List[str] = []
    kw_hits = [kw for kw in profile.expertise_keywords if kw.lower() in opp_text.lower()]
    if kw_hits:
        reasons.append(f"Expertise match: {', '.join(kw_hits[:3])}")
    skill_hits = [s for s in profile.skills if s.lower() in opp_text.lower()]
    if skill_hits:
        reasons.append(f"Skill alignment: {', '.join(skill_hits[:3])}")
    if profile.department and profile.department.lower() in opp_text.lower():
        reasons.append(f"Department relevance: {profile.department}")
    pub_kw_hits = [k for k in profile.publication_keywords if k.lower() in opp_text.lower()]
    if pub_kw_hits:
        reasons.append(f"Publication topics: {', '.join(pub_kw_hits[:3])}")
    area_hits = [a for a in profile.research_areas if a.lower() in opp_text.lower()]
    if area_hits:
        reasons.append(f"Research area: {', '.join(area_hits[:2])}")

    if opp.deadline:
        try:
            dl = opp.deadline if isinstance(opp.deadline, datetime) else datetime.fromisoformat(str(opp.deadline))
            if dl.tzinfo is None:
                dl = dl.replace(tzinfo=timezone.utc)
            days = (dl - datetime.now(timezone.utc)).days
            if days > 0:
                reasons.append(f"{days} days until deadline")
            elif days == 0:
                reasons.append("Deadline is today")
        except Exception:
            pass

    if not reasons:
        reasons.append("General profile relevance based on your research background")

    deadline_str = None
    if opp.deadline:
        try:
            deadline_str = opp.deadline.isoformat() if hasattr(opp.deadline, "isoformat") else str(opp.deadline)
        except Exception:
            pass

    return MatchResult(
        opportunity_id=opp.id,
        title=opp.title,
        sponsor=opp.sponsor,
        category=opp.category,
        status=opp.status,
        deadline=deadline_str,
        amount_min=float(opp.amount_min) if opp.amount_min is not None else None,
        amount_max=float(opp.amount_max) if opp.amount_max is not None else None,
        currency=opp.currency,
        description=opp.description,
        eligibility=opp.eligibility,
        score=round(final_score, 4),
        reasons=reasons,
    )


# ── LLM re-ranking (optional) ────────────────────────────────────────────────

def _profile_summary_for_llm(profile: ResearcherProfile) -> str:
    parts: List[str] = []
    if profile.job_title or profile.department:
        role = f"{profile.job_title} in {profile.department}".strip(" in ")
        parts.append(f"Role: {role}")
    if profile.expertise_keywords:
        parts.append(f"Expertise keywords: {', '.join(profile.expertise_keywords[:15])}")
    if profile.research_areas:
        parts.append(f"Research areas: {', '.join(profile.research_areas[:8])}")
    if profile.skills:
        parts.append(f"Skills: {', '.join(profile.skills[:10])}")
    if profile.publication_keywords:
        uniq = list(dict.fromkeys(profile.publication_keywords))
        parts.append(f"Publication keywords: {', '.join(uniq[:10])}")
    if profile.orcid_work_titles:
        parts.append(f"Recent publications: {'; '.join(profile.orcid_work_titles[:5])}")
    if profile.biography:
        parts.append(f"Biography: {profile.biography[:300]}")
    return "\n".join(parts)


def _opp_summary_for_llm(match: MatchResult, idx: int) -> str:
    lines = [
        f"[{idx}] {match.title}",
        f"  Sponsor: {match.sponsor or 'Unknown'} | Category: {match.category or 'N/A'} | Status: {match.status or 'N/A'}",
    ]
    if match.description:
        lines.append(f"  Description: {match.description[:220]}")
    if match.eligibility:
        lines.append(f"  Eligibility: {match.eligibility[:160]}")
    return "\n".join(lines)


async def llm_rerank(
    profile: ResearcherProfile,
    candidates: List[MatchResult],
    api_key: str,
) -> List[MatchResult]:
    researcher_text = _profile_summary_for_llm(profile)
    opps_text = "\n\n".join(_opp_summary_for_llm(c, i + 1) for i, c in enumerate(candidates))

    prompt = (
        f"You are a research funding advisor. Given the researcher profile below, "
        f"rank the {len(candidates)} grant opportunities from most to least relevant and "
        f"write a concise 1-2 sentence explanation for each.\n\n"
        f"RESEARCHER PROFILE:\n{researcher_text}\n\n"
        f"GRANT OPPORTUNITIES:\n{opps_text}\n\n"
        f"Respond in JSON only:\n"
        f'[{{"rank": 1, "index": <number>, "explanation": "<why this fits>"}}, ...]'
    )

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            "https://api.openai.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={
                "model": os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
                "messages": [
                    {"role": "system", "content": "You are a research grant matching assistant. Respond ONLY in valid JSON."},
                    {"role": "user", "content": prompt},
                ],
                "temperature": 0.3,
                "max_tokens": 1800,
            },
        )
        resp.raise_for_status()

    raw = resp.json()["choices"][0]["message"]["content"]
    # Strip markdown code fences if present
    raw = re.sub(r"^```[a-z]*\n?", "", raw.strip())
    raw = re.sub(r"\n?```$", "", raw.strip())
    rankings = json.loads(raw)
    if isinstance(rankings, dict):
        rankings = next(iter(rankings.values()), [])

    index_map = {i + 1: c for i, c in enumerate(candidates)}
    reranked: List[MatchResult] = []
    seen: set = set()
    for r in sorted(rankings, key=lambda x: x.get("rank", 999)):
        idx = r.get("index")
        if idx and idx in index_map and idx not in seen:
            m = index_map[idx]
            m.match_explanation = r.get("explanation")
            reranked.append(m)
            seen.add(idx)
    for i, c in index_map.items():
        if i not in seen:
            reranked.append(c)
    return reranked


# ── Public entry point ───────────────────────────────────────────────────────

async def match_grants(
    user: User,
    db: AsyncSession,
    limit: int = 10,
    include_upcoming: bool = True,
) -> dict:
    profile = await gather_researcher_profile(user, db)

    status_filter = ["open", "upcoming"] if include_upcoming else ["open"]
    opp_result = await db.execute(
        select(GrantOpportunity).where(GrantOpportunity.status.in_(status_filter))
    )
    opportunities = opp_result.scalars().all()

    if not opportunities:
        return {
            "matches": [],
            "total_candidates": 0,
            "ai_enhanced": False,
            "signals_used": profile.signals_used,
        }

    researcher_tokens = build_researcher_token_bag(profile)
    scored = [score_opportunity_keyword(profile, researcher_tokens, opp) for opp in opportunities]
    scored.sort(key=lambda x: x.score, reverse=True)

    # Up to 20 candidates for LLM consideration
    top_candidates = scored[:20]
    ai_enhanced = False

    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if api_key and len(top_candidates) > 1 and profile.signals_used:
        try:
            top_candidates = await llm_rerank(profile, top_candidates, api_key)
            ai_enhanced = True
        except Exception as exc:
            print(f"[grant_matcher] LLM re-rank failed (falling back to keyword order): {exc}")

    return {
        "matches": top_candidates[:limit],
        "total_candidates": len(opportunities),
        "ai_enhanced": ai_enhanced,
        "signals_used": profile.signals_used,
    }
