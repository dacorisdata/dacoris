"""Unified public research catalog — works, researchers, institutions, projects, funders."""

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, and_, desc
from sqlalchemy.orm import selectinload
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date
import re
import json

from database import get_db
from models import (
    ScholarlyWork, WorkAuthor, WorkInstitution, WorkFunder,
    Institution, User, ResearchProject, ResearchOutput, Award,
    ProjectMember, ProjectTeam, ProjectTeamMember, ProjectStatus,
    Manuscript, ManuscriptCoAuthor, Publication, PublicationLibrary,
)

router = APIRouter(prefix="/api/public/catalog", tags=["research-catalog"])

# Include all in-platform work regardless of publish state
CATALOG_PROJECT_STATUSES = tuple(ProjectStatus)


def _slug(name: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", (name or "").lower()).strip("-")
    return s or "unknown"


def _author_id(name: str, orcid: Optional[str], user_id: Optional[str]) -> str:
    if user_id:
        return user_id
    key = orcid or name
    return f"author-{_slug(key)}"


def _funder_id(name: str) -> str:
    return f"funder-{_slug(name)}"


def _parse_keywords(raw) -> List[str]:
    if not raw:
        return []
    try:
        parsed = json.loads(raw)
        return parsed if isinstance(parsed, list) else []
    except (json.JSONDecodeError, TypeError):
        return [k.strip() for k in str(raw).split(",") if k.strip()]


# ─── Response models ─────────────────────────────────────────────────────────

class CatalogStats(BaseModel):
    total_works: int
    total_researchers: int
    total_institutions: int
    total_projects: int
    total_funders: int
    total_citations: int
    open_access_percentage: float


class AuthorBrief(BaseModel):
    id: Optional[str] = None
    name: str
    orcid: Optional[str] = None
    affiliation: Optional[str] = None
    is_corresponding: bool = False


class WorkListItem(BaseModel):
    id: str
    source: str  # scholarly | output | manuscript | publication
    title: str
    abstract: Optional[str] = None
    publication_year: Optional[int] = None
    work_type: Optional[str] = None
    venue_name: Optional[str] = None
    doi: Optional[str] = None
    cited_by_count: int = 0
    is_open_access: bool = False
    primary_topic: Optional[str] = None
    status: Optional[str] = None
    authors: List[AuthorBrief] = []
    institutions: List[str] = []
    funders: List[str] = []
    project_id: Optional[str] = None
    project_title: Optional[str] = None


class ResearcherListItem(BaseModel):
    id: str
    name: str
    orcid: Optional[str] = None
    affiliation: Optional[str] = None
    department: Optional[str] = None
    job_title: Optional[str] = None
    publication_count: int = 0
    project_count: int = 0
    is_platform_user: bool = False


class InstitutionListItem(BaseModel):
    id: str
    name: str
    domain: Optional[str] = None
    country: Optional[str] = None
    institution_type: Optional[str] = None
    publication_count: int = 0
    project_count: int = 0
    researcher_count: int = 0


class ProjectListItem(BaseModel):
    id: str
    title: str
    status: str
    research_area: Optional[str] = None
    pi_name: Optional[str] = None
    pi_id: Optional[str] = None
    institution_name: Optional[str] = None
    institution_id: Optional[str] = None
    funder_name: Optional[str] = None
    award_amount: Optional[float] = None
    currency: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    team_size: int = 0
    output_count: int = 0


class FunderListItem(BaseModel):
    id: str
    name: str
    country: Optional[str] = None
    grants_count: int = 0
    projects_count: int = 0
    works_count: int = 0
    total_funding: Optional[float] = None
    currency: str = "USD"


class SearchResult(BaseModel):
    entity_type: str
    id: str
    title: str
    subtitle: Optional[str] = None
    meta: Optional[str] = None


# ─── Serialization helpers ───────────────────────────────────────────────────

def _serialize_work(work: ScholarlyWork) -> WorkListItem:
    return WorkListItem(
        id=work.id,
        source="scholarly",
        title=work.title,
        abstract=work.abstract,
        publication_year=work.publication_year,
        work_type=work.work_type,
        venue_name=work.venue_name,
        doi=work.doi,
        cited_by_count=work.cited_by_count or 0,
        is_open_access=work.is_open_access or False,
        primary_topic=work.primary_topic,
        authors=[
            AuthorBrief(
                id=_author_id(a.author_name, a.orcid, a.user_id),
                name=a.author_name,
                orcid=a.orcid,
                affiliation=a.affiliation_name,
                is_corresponding=a.is_corresponding,
            )
            for a in sorted(work.authors or [], key=lambda x: x.author_position)
        ],
        institutions=[i.institution_name for i in (work.institutions or [])],
        funders=[f.funder_name for f in (work.funders or [])],
    )


def _serialize_output(
    output: ResearchOutput,
    project_title: Optional[str] = None,
    creator: Optional[User] = None,
    institution_name: Optional[str] = None,
) -> WorkListItem:
    authors = []
    if creator:
        authors.append(AuthorBrief(
            id=creator.id,
            name=creator.name or creator.email,
            orcid=creator.orcid_id,
        ))
    return WorkListItem(
        id=output.id,
        source="output",
        title=output.title,
        abstract=output.abstract,
        publication_year=output.year,
        work_type=output.output_type,
        venue_name=output.journal_name,
        doi=output.doi,
        cited_by_count=0,
        is_open_access=False,
        status=output.status,
        authors=authors,
        institutions=[institution_name] if institution_name else [],
        funders=[],
        project_id=output.project_id,
        project_title=project_title,
    )


def _serialize_manuscript(m: Manuscript, owner: Optional[User] = None) -> WorkListItem:
    authors = []
    if owner:
        authors.append(AuthorBrief(id=owner.id, name=owner.name or owner.email, orcid=owner.orcid_id))
    for ca in sorted(m.co_authors or [], key=lambda x: x.author_order):
        authors.append(AuthorBrief(
            name=f"{ca.given_name} {ca.family_name}".strip(),
            orcid=ca.orcid,
        ))
    return WorkListItem(
        id=m.id,
        source="manuscript",
        title=m.title,
        abstract=m.abstract or m.short_description,
        publication_year=m.updated_at.year if m.updated_at else None,
        work_type="manuscript",
        venue_name=m.department,
        cited_by_count=0,
        is_open_access=False,
        status=m.status,
        authors=authors,
    )


def _serialize_publication(pub: Publication, owner: Optional[User] = None) -> WorkListItem:
    author_names = [n.strip() for n in (pub.authors or "").split(",") if n.strip()]
    authors = [AuthorBrief(name=n) for n in author_names[:6]]
    if owner and not authors:
        authors = [AuthorBrief(id=owner.id, name=owner.name or owner.email, orcid=owner.orcid_id)]
    return WorkListItem(
        id=pub.id,
        source="publication",
        title=pub.title,
        abstract=pub.abstract,
        publication_year=pub.year,
        work_type=pub.publication_type or "publication",
        venue_name=pub.journal,
        doi=pub.doi,
        cited_by_count=pub.citation_count or 0,
        is_open_access=False,
        status="published" if pub.doi else "catalogued",
        authors=authors,
    )


def _work_sort_key(item: WorkListItem):
    return (item.publication_year or 0, item.title or "")


# ─── Stats ───────────────────────────────────────────────────────────────────

@router.get("/stats", response_model=CatalogStats)
async def catalog_stats(db: AsyncSession = Depends(get_db)):
    works_n = (await db.execute(select(func.count(ScholarlyWork.id)))).scalar() or 0
    outputs_n = (await db.execute(select(func.count(ResearchOutput.id)))).scalar() or 0
    manuscripts_n = (await db.execute(select(func.count(Manuscript.id)))).scalar() or 0
    publications_n = (await db.execute(select(func.count(Publication.id)))).scalar() or 0

    authors_n = (await db.execute(select(func.count(WorkAuthor.author_name.distinct())))).scalar() or 0
    users_n = (await db.execute(
        select(func.count(User.id)).where(User.status == "active", User.is_global_admin == False)
    )).scalar() or 0

    inst_db = (await db.execute(select(func.count(Institution.id)).where(Institution.is_active == True))).scalar() or 0
    inst_work = (await db.execute(select(func.count(WorkInstitution.institution_name.distinct())))).scalar() or 0

    projects_n = (await db.execute(
        select(func.count(ResearchProject.id)).where(ResearchProject.status.in_(CATALOG_PROJECT_STATUSES))
    )).scalar() or 0

    funder_work = (await db.execute(select(func.count(WorkFunder.funder_name.distinct())))).scalar() or 0
    funder_award = (await db.execute(
        select(func.count(Award.funder_name.distinct())).where(Award.funder_name.isnot(None))
    )).scalar() or 0

    citations = (await db.execute(select(func.sum(ScholarlyWork.cited_by_count)))).scalar() or 0
    oa_n = (await db.execute(
        select(func.count(ScholarlyWork.id)).where(ScholarlyWork.is_open_access == True)
    )).scalar() or 0
    total_works = works_n + outputs_n + manuscripts_n + publications_n
    oa_pct = round((oa_n / works_n * 100) if works_n > 0 else 0, 1)

    return CatalogStats(
        total_works=total_works,
        total_researchers=authors_n + users_n,
        total_institutions=max(inst_db, inst_work),
        total_projects=projects_n,
        total_funders=funder_work + funder_award,
        total_citations=citations,
        open_access_percentage=oa_pct,
    )


# ─── Unified search ────────────────────────────────────────────────────────────

@router.get("/search", response_model=List[SearchResult])
async def catalog_search(
    q: str = Query(..., min_length=1),
    limit: int = Query(20, le=50),
    db: AsyncSession = Depends(get_db),
):
    term = f"%{q}%"
    results: List[SearchResult] = []

    works = (await db.execute(
        select(ScholarlyWork)
        .where(or_(ScholarlyWork.title.ilike(term), ScholarlyWork.abstract.ilike(term)))
        .order_by(desc(ScholarlyWork.cited_by_count))
        .limit(5)
    )).scalars().all()
    for w in works:
        results.append(SearchResult(
            entity_type="work", id=w.id, title=w.title,
            subtitle=w.venue_name, meta=str(w.publication_year) if w.publication_year else None,
        ))

    outputs = (await db.execute(
        select(ResearchOutput)
        .where(or_(ResearchOutput.title.ilike(term), ResearchOutput.abstract.ilike(term)))
        .limit(3)
    )).scalars().all()
    for o in outputs:
        results.append(SearchResult(
            entity_type="work", id=o.id, title=o.title,
            subtitle=o.journal_name, meta=o.status,
        ))

    manuscripts = (await db.execute(
        select(Manuscript)
        .where(or_(Manuscript.title.ilike(term), Manuscript.abstract.ilike(term)))
        .limit(3)
    )).scalars().all()
    for m in manuscripts:
        results.append(SearchResult(
            entity_type="work", id=m.id, title=m.title,
            subtitle="Manuscript", meta=m.status,
        ))

    projects = (await db.execute(
        select(ResearchProject)
        .where(
            ResearchProject.status.in_(CATALOG_PROJECT_STATUSES),
            or_(ResearchProject.title.ilike(term), ResearchProject.project_abstract.ilike(term)),
        )
        .limit(5)
    )).scalars().all()
    for p in projects:
        results.append(SearchResult(
            entity_type="project", id=p.id, title=p.title,
            subtitle=p.pi_full_name, meta=p.status.value if p.status else None,
        ))

    insts = (await db.execute(
        select(Institution).where(Institution.name.ilike(term), Institution.is_active == True).limit(5)
    )).scalars().all()
    for i in insts:
        results.append(SearchResult(entity_type="institution", id=i.id, title=i.name, subtitle=i.domain))

    authors = (await db.execute(
        select(WorkAuthor.author_name, WorkAuthor.orcid, WorkAuthor.affiliation_name)
        .where(WorkAuthor.author_name.ilike(term))
        .group_by(WorkAuthor.author_name, WorkAuthor.orcid, WorkAuthor.affiliation_name)
        .limit(5)
    )).all()
    for name, orcid, aff in authors:
        results.append(SearchResult(
            entity_type="researcher",
            id=_author_id(name, orcid, None),
            title=name,
            subtitle=aff,
            meta=orcid,
        ))

    return results[:limit]


# ─── Works ───────────────────────────────────────────────────────────────────

@router.get("/works", response_model=List[WorkListItem])
async def list_catalog_works(
    search: Optional[str] = None,
    topic: Optional[str] = None,
    year: Optional[int] = None,
    source: Optional[str] = None,
    limit: int = Query(25, le=100),
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    items: List[WorkListItem] = []
    search_term = f"%{search}%" if search else None

    if source in (None, "scholarly"):
        q = select(ScholarlyWork).options(
            selectinload(ScholarlyWork.authors),
            selectinload(ScholarlyWork.institutions),
            selectinload(ScholarlyWork.funders),
        )
        if search_term:
            q = q.where(or_(
                ScholarlyWork.title.ilike(search_term),
                ScholarlyWork.abstract.ilike(search_term),
            ))
        if topic:
            q = q.where(ScholarlyWork.primary_topic.ilike(f"%{topic}%"))
        if year:
            q = q.where(ScholarlyWork.publication_year == year)
        works = (await db.execute(q.order_by(desc(ScholarlyWork.cited_by_count)))).scalars().all()
        items.extend(_serialize_work(w) for w in works)

    if source in (None, "output"):
        oq = select(ResearchOutput).options(
            selectinload(ResearchOutput.created_by),
        )
        if search_term:
            oq = oq.where(or_(
                ResearchOutput.title.ilike(search_term),
                ResearchOutput.abstract.ilike(search_term),
            ))
        if year:
            oq = oq.where(ResearchOutput.year == year)
        outputs = (await db.execute(oq.order_by(desc(ResearchOutput.updated_at)))).scalars().all()
        project_titles = {}
        inst_names = {}
        if outputs:
            pids = [o.project_id for o in outputs if o.project_id]
            iids = list({o.institution_id for o in outputs if o.institution_id})
            if pids:
                for pid, title in (await db.execute(
                    select(ResearchProject.id, ResearchProject.title).where(ResearchProject.id.in_(pids))
                )).all():
                    project_titles[pid] = title
            if iids:
                for iid, iname in (await db.execute(
                    select(Institution.id, Institution.name).where(Institution.id.in_(iids))
                )).all():
                    inst_names[iid] = iname
        items.extend(
            _serialize_output(
                o, project_titles.get(o.project_id),
                creator=o.created_by, institution_name=inst_names.get(o.institution_id),
            )
            for o in outputs
        )

    if source in (None, "manuscript"):
        mq = select(Manuscript).options(
            selectinload(Manuscript.co_authors),
            selectinload(Manuscript.user),
        )
        if search_term:
            mq = mq.where(or_(
                Manuscript.title.ilike(search_term),
                Manuscript.abstract.ilike(search_term),
            ))
        manuscripts = (await db.execute(mq.order_by(desc(Manuscript.updated_at)))).scalars().all()
        items.extend(_serialize_manuscript(m, m.user) for m in manuscripts)

    if source in (None, "publication"):
        pq = select(Publication).options(
            selectinload(Publication.library).selectinload(PublicationLibrary.user),
        )
        if search_term:
            pq = pq.where(or_(
                Publication.title.ilike(search_term),
                Publication.abstract.ilike(search_term),
                Publication.authors.ilike(search_term),
            ))
        if year:
            pq = pq.where(Publication.year == year)
        publications = (await db.execute(pq.order_by(desc(Publication.year)))).scalars().all()
        items.extend(
            _serialize_publication(p, p.library.user if p.library else None)
            for p in publications
        )

    items.sort(key=_work_sort_key, reverse=True)
    return items[offset:offset + limit]


@router.get("/works/{work_id}")
async def get_catalog_work(work_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ScholarlyWork)
        .options(
            selectinload(ScholarlyWork.authors),
            selectinload(ScholarlyWork.institutions),
            selectinload(ScholarlyWork.funders),
        )
        .where(ScholarlyWork.id == work_id)
    )
    work = result.scalar_one_or_none()
    if work:
        data = _serialize_work(work).model_dump()
        data["abstract"] = work.abstract
        data["keywords"] = _parse_keywords(work.keywords)
        data["open_access_url"] = work.open_access_url
        data["pmid"] = work.pmid
        data["publisher"] = work.publisher
        data["volume"] = work.volume
        data["issue"] = work.issue
        data["pages"] = work.pages
        data["publication_date"] = work.publication_date
        data["institutions"] = [
            {"id": i.institution_id or f"name-{_slug(i.institution_name)}", "name": i.institution_name,
             "country": i.institution_country, "type": i.institution_type}
            for i in work.institutions
        ]
        data["funders"] = [
            {"id": _funder_id(f.funder_name), "name": f.funder_name, "country": f.funder_country,
             "grant_number": f.grant_number, "award_amount": f.award_amount, "currency": f.currency}
            for f in work.funders
        ]
        return data

    out = (await db.execute(
        select(ResearchOutput).options(selectinload(ResearchOutput.created_by))
        .where(ResearchOutput.id == work_id)
    )).scalar_one_or_none()
    if out:
        project = None
        inst_name = None
        if out.project_id:
            project = (await db.execute(
                select(ResearchProject).options(selectinload(ResearchProject.award))
                .where(ResearchProject.id == out.project_id)
            )).scalar_one_or_none()
        if out.institution_id:
            inst = (await db.execute(select(Institution).where(Institution.id == out.institution_id))).scalar_one_or_none()
            inst_name = inst.name if inst else None
        data = _serialize_output(out, project.title if project else None, out.created_by, inst_name).model_dump()
        data["keywords"] = []
        if project:
            data["project"] = {
                "id": project.id, "title": project.title, "status": project.status.value,
                "pi_name": project.pi_full_name, "pi_id": project.pi_id,
                "funder_name": project.award.funder_name if project.award else None,
            }
        return data

    manuscript = (await db.execute(
        select(Manuscript).options(selectinload(Manuscript.co_authors), selectinload(Manuscript.user))
        .where(Manuscript.id == work_id)
    )).scalar_one_or_none()
    if manuscript:
        data = _serialize_manuscript(manuscript, manuscript.user).model_dump()
        data["keywords"] = _parse_keywords(manuscript.keywords)
        return data

    publication = (await db.execute(
        select(Publication).options(selectinload(Publication.library).selectinload(PublicationLibrary.user))
        .where(Publication.id == work_id)
    )).scalar_one_or_none()
    if publication:
        data = _serialize_publication(publication, publication.library.user if publication.library else None).model_dump()
        data["keywords"] = _parse_keywords(publication.keywords)
        data["pmid"] = publication.pmid
        data["source_system"] = publication.source
        return data

    raise HTTPException(404, "Work not found")


@router.get("/topics")
async def list_topics(db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(
        select(ScholarlyWork.primary_topic)
        .where(ScholarlyWork.primary_topic.isnot(None))
        .distinct().order_by(ScholarlyWork.primary_topic)
    )).all()
    areas = (await db.execute(
        select(ResearchProject.research_area)
        .where(ResearchProject.research_area.isnot(None), ResearchProject.status.in_(CATALOG_PROJECT_STATUSES))
        .distinct()
    )).all()
    topics = list({t for (t,) in rows if t} | {a for (a,) in areas if a})
    return {"topics": sorted(topics)}


# ─── Researchers ─────────────────────────────────────────────────────────────

@router.get("/researchers", response_model=List[ResearcherListItem])
async def list_researchers(
    search: Optional[str] = None,
    limit: int = Query(30, le=100),
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    aq = select(
        WorkAuthor.author_name,
        WorkAuthor.orcid,
        WorkAuthor.affiliation_name,
        WorkAuthor.user_id,
        func.count(WorkAuthor.work_id).label("pub_count"),
    ).group_by(WorkAuthor.author_name, WorkAuthor.orcid, WorkAuthor.affiliation_name, WorkAuthor.user_id)
    if search:
        aq = aq.where(WorkAuthor.author_name.ilike(f"%{search}%"))
    aq = aq.order_by(desc("pub_count")).limit(limit).offset(offset)
    author_rows = (await db.execute(aq)).all()

    items = []
    seen_ids = set()
    for name, orcid, aff, uid, pub_count in author_rows:
        rid = _author_id(name, orcid, uid)
        if rid in seen_ids:
            continue
        seen_ids.add(rid)
        proj_count = 0
        dept = None
        job = None
        is_user = bool(uid)
        if uid:
            u = (await db.execute(select(User).where(User.id == uid))).scalar_one_or_none()
            if u:
                dept = u.department
                job = u.job_title
                aff = aff or (u.primary_institution_id and None)
            pc = (await db.execute(
                select(func.count(ResearchProject.id)).where(
                    or_(ResearchProject.pi_id == uid,
                        ResearchProject.id.in_(
                            select(ProjectMember.project_id).where(ProjectMember.user_id == uid)
                        ))
                )
            )).scalar() or 0
            proj_count = pc
        items.append(ResearcherListItem(
            id=rid, name=name, orcid=orcid, affiliation=aff,
            department=dept, job_title=job,
            publication_count=pub_count, project_count=proj_count,
            is_platform_user=is_user,
        ))
    return items


@router.get("/researchers/{researcher_id}")
async def get_researcher(researcher_id: str, db: AsyncSession = Depends(get_db)):
    user = None
    if not researcher_id.startswith("author-"):
        user = (await db.execute(
            select(User).options(selectinload(User.institution)).where(User.id == researcher_id)
        )).scalar_one_or_none()

    if user:
        name = user.name or user.email
        orcid = user.orcid_id
        aff = user.institution.name if user.institution else None
        author_filter = or_(WorkAuthor.user_id == user.id, WorkAuthor.author_name.ilike(name))
        proj_filter = or_(
            ResearchProject.pi_id == user.id,
            ResearchProject.id.in_(select(ProjectMember.project_id).where(ProjectMember.user_id == user.id)),
        )
    else:
        slug = researcher_id.replace("author-", "")
        authors = (await db.execute(
            select(WorkAuthor).where(
                or_(
                    WorkAuthor.orcid.isnot(None),
                    WorkAuthor.author_name.isnot(None),
                )
            )
        )).scalars().all()
        match = next(
            (a for a in authors if _slug(a.orcid or a.author_name) == slug),
            None,
        )
        if not match:
            raise HTTPException(404, "Researcher not found")
        name = match.author_name
        orcid = match.orcid
        aff = match.affiliation_name
        author_filter = WorkAuthor.author_name == name
        proj_filter = ResearchProject.pi_full_name.ilike(f"%{name}%")

    work_ids = (await db.execute(
        select(WorkAuthor.work_id).where(author_filter)
    )).scalars().all()
    works = []
    if work_ids:
        wrows = (await db.execute(
            select(ScholarlyWork).options(selectinload(ScholarlyWork.authors))
            .where(ScholarlyWork.id.in_(work_ids))
            .order_by(desc(ScholarlyWork.publication_year))
        )).scalars().all()
        works = [_serialize_work(w).model_dump() for w in wrows]

    projects = (await db.execute(
        select(ResearchProject)
        .where(proj_filter, ResearchProject.status.in_(CATALOG_PROJECT_STATUSES))
        .order_by(desc(ResearchProject.created_at))
        .limit(20)
    )).scalars().all()

    return {
        "id": researcher_id,
        "name": name,
        "orcid": orcid,
        "affiliation": aff,
        "department": user.department if user else None,
        "job_title": user.job_title if user else None,
        "expertise_keywords": _parse_keywords(user.expertise_keywords) if user and user.expertise_keywords else [],
        "is_platform_user": user is not None,
        "publication_count": len(works),
        "project_count": len(projects),
        "works": works,
        "projects": [
            {"id": p.id, "title": p.title, "status": p.status.value, "research_area": p.research_area}
            for p in projects
        ],
    }


# ─── Institutions ──────────────────────────────────────────────────────────────

@router.get("/institutions", response_model=List[InstitutionListItem])
async def list_institutions(
    search: Optional[str] = None,
    limit: int = Query(30, le=100),
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    q = select(Institution).where(Institution.is_active == True)
    if search:
        q = q.where(Institution.name.ilike(f"%{search}%"))
    q = q.order_by(Institution.name).limit(limit).offset(offset)
    insts = (await db.execute(q)).scalars().all()

    items = []
    for inst in insts:
        pub_n = (await db.execute(
            select(func.count(WorkInstitution.work_id)).where(
                or_(WorkInstitution.institution_id == inst.id,
                    WorkInstitution.institution_name.ilike(inst.name))
            )
        )).scalar() or 0
        proj_n = (await db.execute(
            select(func.count(ResearchProject.id)).where(
                ResearchProject.institution_id == inst.id,
                ResearchProject.status.in_(CATALOG_PROJECT_STATUSES),
            )
        )).scalar() or 0
        res_n = (await db.execute(
            select(func.count(User.id)).where(User.primary_institution_id == inst.id, User.status == "active")
        )).scalar() or 0
        items.append(InstitutionListItem(
            id=inst.id, name=inst.name, domain=inst.domain,
            publication_count=pub_n, project_count=proj_n, researcher_count=res_n,
        ))

    if len(items) < limit:
        extra_q = select(
            WorkInstitution.institution_name,
            WorkInstitution.institution_country,
            WorkInstitution.institution_type,
            func.count(WorkInstitution.work_id).label("pub_count"),
        ).where(WorkInstitution.institution_id.is_(None))
        if search:
            extra_q = extra_q.where(WorkInstitution.institution_name.ilike(f"%{search}%"))
        extra_q = extra_q.group_by(
            WorkInstitution.institution_name,
            WorkInstitution.institution_country,
            WorkInstitution.institution_type,
        ).order_by(desc("pub_count")).limit(limit - len(items))
        for name, country, itype, pub_n in (await db.execute(extra_q)).all():
            eid = f"name-{_slug(name)}"
            if any(i.id == eid for i in items):
                continue
            items.append(InstitutionListItem(
                id=eid, name=name, country=country, institution_type=itype,
                publication_count=pub_n,
            ))

    return items


@router.get("/institutions/{institution_id}")
async def get_institution(institution_id: str, db: AsyncSession = Depends(get_db)):
    inst = None
    if not institution_id.startswith("name-"):
        inst = (await db.execute(select(Institution).where(Institution.id == institution_id))).scalar_one_or_none()

    if inst:
        name = inst.name
        inst_filter = or_(WorkInstitution.institution_id == inst.id, WorkInstitution.institution_name.ilike(name))
        proj_filter = ResearchProject.institution_id == inst.id
    else:
        slug = institution_id.replace("name-", "")
        all_wi = (await db.execute(select(WorkInstitution))).scalars().all()
        match = next((w for w in all_wi if _slug(w.institution_name) == slug), None)
        if not match:
            raise HTTPException(404, "Institution not found")
        name = match.institution_name
        inst_filter = WorkInstitution.institution_name == name
        proj_filter = ResearchProject.lead_institution.ilike(f"%{name}%")

    work_ids = (await db.execute(select(WorkInstitution.work_id).where(inst_filter))).scalars().all()
    works = []
    if work_ids:
        wrows = (await db.execute(
            select(ScholarlyWork).options(selectinload(ScholarlyWork.authors))
            .where(ScholarlyWork.id.in_(work_ids))
            .order_by(desc(ScholarlyWork.cited_by_count)).limit(30)
        )).scalars().all()
        works = [_serialize_work(w).model_dump() for w in wrows]

    projects = (await db.execute(
        select(ResearchProject)
        .where(proj_filter, ResearchProject.status.in_(CATALOG_PROJECT_STATUSES))
        .order_by(desc(ResearchProject.created_at)).limit(20)
    )).scalars().all()

    researchers = []
    if inst:
        users = (await db.execute(
            select(User).where(User.primary_institution_id == inst.id, User.status == "active").limit(30)
        )).scalars().all()
        researchers = [
            {"id": u.id, "name": u.name or u.email, "orcid": u.orcid_id, "department": u.department}
            for u in users
        ]

    return {
        "id": institution_id,
        "name": name,
        "domain": inst.domain if inst else None,
        "publication_count": len(works),
        "project_count": len(projects),
        "researcher_count": len(researchers),
        "works": works,
        "projects": [{"id": p.id, "title": p.title, "status": p.status.value, "pi_name": p.pi_full_name} for p in projects],
        "researchers": researchers,
    }


# ─── Projects ────────────────────────────────────────────────────────────────

@router.get("/projects", response_model=List[ProjectListItem])
async def list_projects(
    search: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = Query(25, le=100),
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    q = select(ResearchProject).options(
        selectinload(ResearchProject.award),
        selectinload(ResearchProject.members),
        selectinload(ResearchProject.research_outputs),
        selectinload(ResearchProject.teams).selectinload(ProjectTeam.members),
    ).where(ResearchProject.status.in_(CATALOG_PROJECT_STATUSES))

    if status:
        try:
            q = q.where(ResearchProject.status == ProjectStatus(status))
        except ValueError:
            pass
    if search:
        q = q.where(or_(
            ResearchProject.title.ilike(f"%{search}%"),
            ResearchProject.project_abstract.ilike(f"%{search}%"),
            ResearchProject.pi_full_name.ilike(f"%{search}%"),
        ))
    q = q.order_by(desc(ResearchProject.created_at)).limit(limit).offset(offset)
    projects = (await db.execute(q)).scalars().all()

    inst_names = {}
    inst_ids = list({p.institution_id for p in projects})
    if inst_ids:
        for iid, iname in (await db.execute(
            select(Institution.id, Institution.name).where(Institution.id.in_(inst_ids))
        )).all():
            inst_names[iid] = iname

    items = []
    for p in projects:
        team_size = len(p.members or []) + sum(len(t.members or []) for t in (p.teams or []))
        items.append(ProjectListItem(
            id=p.id,
            title=p.title,
            status=p.status.value if p.status else "unknown",
            research_area=p.research_area,
            pi_name=p.pi_full_name,
            pi_id=p.pi_id,
            institution_name=inst_names.get(p.institution_id) or p.lead_institution,
            institution_id=p.institution_id,
            funder_name=p.award.funder_name if p.award else None,
            award_amount=float(p.award.total_amount) if p.award else None,
            currency=p.award.currency if p.award else None,
            start_date=p.start_date,
            end_date=p.end_date,
            team_size=team_size,
            output_count=len(p.research_outputs or []),
        ))
    return items


@router.get("/projects/{project_id}")
async def get_project(project_id: str, db: AsyncSession = Depends(get_db)):
    p = (await db.execute(
        select(ResearchProject)
        .options(
            selectinload(ResearchProject.award),
            selectinload(ResearchProject.pi),
            selectinload(ResearchProject.members).selectinload(ProjectMember.user),
            selectinload(ResearchProject.teams).selectinload(ProjectTeam.members),
            selectinload(ResearchProject.research_outputs),
        )
        .where(ResearchProject.id == project_id)
    )).scalar_one_or_none()
    if not p:
        raise HTTPException(404, "Project not found")

    inst = (await db.execute(select(Institution).where(Institution.id == p.institution_id))).scalar_one_or_none()

    team = []
    if p.pi_id:
        team.append({
            "id": p.pi_id, "name": p.pi_full_name or (p.pi.name if p.pi else "PI"),
            "role": "principal_investigator", "orcid": p.pi_orcid,
        })
    for m in p.members or []:
        team.append({
            "id": m.user_id,
            "name": m.invited_name or (m.user.name if m.user else m.invited_email),
            "role": m.role, "status": m.status,
        })
    for t in p.teams or []:
        for tm in t.members or []:
            team.append({"id": tm.user_id, "name": tm.display_name, "role": tm.role_label, "team": t.name})

    outputs = [
        {"id": o.id, "title": o.title, "type": o.output_type, "year": o.year, "status": o.status, "doi": o.doi}
        for o in (p.research_outputs or [])
    ]

    return {
        "id": p.id,
        "title": p.title,
        "description": p.description or p.project_abstract,
        "status": p.status.value,
        "research_area": p.research_area,
        "research_keywords": _parse_keywords(p.research_keywords),
        "start_date": p.start_date,
        "end_date": p.end_date,
        "pi": {"id": p.pi_id, "name": p.pi_full_name, "orcid": p.pi_orcid, "email": p.pi_email},
        "institution": {"id": p.institution_id, "name": inst.name if inst else p.lead_institution},
        "funder": {
            "id": _funder_id(p.award.funder_name) if p.award and p.award.funder_name else None,
            "name": p.award.funder_name if p.award else None,
            "award_number": p.award.award_number if p.award else None,
            "amount": p.award.total_amount if p.award else None,
            "currency": p.award.currency if p.award else None,
        } if p.award else None,
        "team": team,
        "outputs": outputs,
    }


# ─── Funders ─────────────────────────────────────────────────────────────────

@router.get("/funders", response_model=List[FunderListItem])
async def list_funders(
    search: Optional[str] = None,
    limit: int = Query(30, le=100),
    db: AsyncSession = Depends(get_db),
):
    merged: dict = {}

    wq = select(
        WorkFunder.funder_name,
        WorkFunder.funder_country,
        func.count(WorkFunder.work_id).label("works"),
        func.sum(WorkFunder.award_amount).label("funding"),
        WorkFunder.currency,
    ).group_by(WorkFunder.funder_name, WorkFunder.funder_country, WorkFunder.currency)
    if search:
        wq = wq.where(WorkFunder.funder_name.ilike(f"%{search}%"))
    for name, country, works, funding, currency in (await db.execute(wq)).all():
        fid = _funder_id(name)
        merged[fid] = {
            "id": fid, "name": name, "country": country,
            "works_count": works, "grants_count": works,
            "projects_count": 0, "total_funding": funding, "currency": currency or "USD",
        }

    aq = select(
        Award.funder_name,
        func.count(Award.id).label("grants"),
        func.sum(Award.total_amount).label("funding"),
        Award.currency,
    ).where(Award.funder_name.isnot(None)).group_by(Award.funder_name, Award.currency)
    if search:
        aq = aq.where(Award.funder_name.ilike(f"%{search}%"))
    for name, grants, funding, currency in (await db.execute(aq)).all():
        fid = _funder_id(name)
        if fid in merged:
            merged[fid]["grants_count"] += grants
            merged[fid]["projects_count"] = grants
            if funding:
                merged[fid]["total_funding"] = (merged[fid]["total_funding"] or 0) + funding
        else:
            merged[fid] = {
                "id": fid, "name": name, "country": None,
                "works_count": 0, "grants_count": grants, "projects_count": grants,
                "total_funding": float(funding) if funding else None, "currency": currency or "KES",
            }

    items = sorted(merged.values(), key=lambda x: x["grants_count"] + x["works_count"], reverse=True)
    return [FunderListItem(**i) for i in items[:limit]]


@router.get("/funders/{funder_id}")
async def get_funder(funder_id: str, db: AsyncSession = Depends(get_db)):
    slug = funder_id.replace("funder-", "")
    all_funders = set()
    for (n,) in (await db.execute(select(WorkFunder.funder_name.distinct()))).all():
        if n:
            all_funders.add(n)
    for (n,) in (await db.execute(select(Award.funder_name.distinct()).where(Award.funder_name.isnot(None)))).all():
        if n:
            all_funders.add(n)

    name = next((n for n in all_funders if _slug(n) == slug), None)
    if not name:
        raise HTTPException(404, "Funder not found")

    work_ids = (await db.execute(
        select(WorkFunder.work_id).where(WorkFunder.funder_name == name)
    )).scalars().all()
    works = []
    if work_ids:
        wrows = (await db.execute(
            select(ScholarlyWork).options(selectinload(ScholarlyWork.authors))
            .where(ScholarlyWork.id.in_(work_ids))
            .order_by(desc(ScholarlyWork.cited_by_count))
        )).scalars().all()
        works = [_serialize_work(w).model_dump() for w in wrows]

    awards = (await db.execute(select(Award).where(Award.funder_name == name))).scalars().all()
    project_ids = []
    projects = []
    for a in awards:
        pr = (await db.execute(
            select(ResearchProject).where(ResearchProject.award_id == a.id)
        )).scalar_one_or_none()
        if pr:
            projects.append({
                "id": pr.id, "title": pr.title, "status": pr.status.value,
                "award_number": a.award_number, "amount": a.total_amount, "currency": a.currency,
            })

    country = None
    wf = (await db.execute(
        select(WorkFunder.funder_country).where(WorkFunder.funder_name == name).limit(1)
    )).scalar_one_or_none()
    if wf:
        country = wf

    total_funding = sum(a.total_amount for a in awards)
    wf_sum = (await db.execute(
        select(func.sum(WorkFunder.award_amount)).where(WorkFunder.funder_name == name)
    )).scalar() or 0

    return {
        "id": funder_id,
        "name": name,
        "country": country,
        "works_count": len(works),
        "projects_count": len(projects),
        "grants_count": len(awards) + len(work_ids),
        "total_funding": total_funding + wf_sum,
        "currency": awards[0].currency if awards else "USD",
        "works": works,
        "projects": projects,
    }
