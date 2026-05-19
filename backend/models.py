from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, ForeignKey, Enum, Table, UniqueConstraint, Float, Date
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
import secrets
import uuid

Base = declarative_base()

def generate_uuid():
    """Generate a URL-safe UUID string for primary keys"""
    return str(uuid.uuid4())

class AccountType(str, enum.Enum):
    ORCID = "orcid"
    GLOBAL_ADMIN = "global_admin"
    INSTITUTION_ADMIN = "institution_admin"

class UserStatus(str, enum.Enum):
    ACTIVE = "active"
    PENDING = "pending"
    SUSPENDED = "suspended"

class PrimaryAccountType(str, enum.Enum):
    RESEARCHER = "RESEARCHER"
    ADMIN_STAFF = "ADMIN_STAFF"
    GRANT_MANAGER = "GRANT_MANAGER"
    FINANCE_OFFICER = "FINANCE_OFFICER"
    ETHICS_COMMITTEE_MEMBER = "ETHICS_COMMITTEE_MEMBER"
    DATA_STEWARD = "DATA_STEWARD"
    DATA_ENGINEER = "DATA_ENGINEER"
    INSTITUTIONAL_LEADERSHIP = "INSTITUTIONAL_LEADERSHIP"
    EXTERNAL_REVIEWER = "EXTERNAL_REVIEWER"
    GUEST_COLLABORATOR = "GUEST_COLLABORATOR"
    EXTERNAL_FUNDER = "EXTERNAL_FUNDER"
    MOU_ADMIN = "MOU_ADMIN"
    LEGAL_OFFICER = "LEGAL_OFFICER"
    PARTNERSHIP_COORDINATOR = "PARTNERSHIP_COORDINATOR"
    EXTERNAL_PARTNER = "EXTERNAL_PARTNER"

class ResearchRole(str, enum.Enum):
    RESEARCHER = "researcher"
    PRINCIPAL_INVESTIGATOR = "principal_investigator"
    CO_INVESTIGATOR = "co_investigator"
    GRANT_OFFICER = "grant_officer"
    RESEARCH_ADMIN = "research_admin"
    FINANCE_OFFICER = "finance_officer"
    ETHICS_REVIEWER = "ethics_reviewer"
    ETHICS_CHAIR = "ethics_chair"
    DATA_STEWARD = "data_steward"
    DATA_ENGINEER = "data_engineer"
    INSTITUTIONAL_LEAD = "institutional_lead"
    SYSTEM_ADMIN = "system_admin"
    EXTERNAL_REVIEWER = "external_reviewer"
    GUEST_COLLABORATOR = "guest_collaborator"
    EXTERNAL_FUNDER = "external_funder"
    APPLICANT = "applicant"
    MOU_ADMIN = "mou_admin"
    LEGAL_OFFICER = "legal_officer"
    PARTNERSHIP_COORDINATOR = "partnership_coordinator"
    EXTERNAL_PARTNER = "external_partner"

user_roles = Table(
    'user_roles',
    Base.metadata,
    Column('user_id', String, ForeignKey('users.id'), primary_key=True),
    Column('role', Enum(ResearchRole), primary_key=True),
    Column('assigned_at', DateTime(timezone=True), server_default=func.now()),
    Column('assigned_by', String, ForeignKey('users.id'), nullable=True)
)

class Institution(Base):
    __tablename__ = "institutions"

    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    name = Column(String, nullable=False, unique=True)
    domain = Column(String, nullable=False, unique=True)
    verified_domains = Column(Text, nullable=True)
    orcid_client_id = Column(String, nullable=True)
    orcid_client_secret = Column(String, nullable=True)
    orcid_redirect_uri = Column(String, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    primary_admin_id = Column(String, ForeignKey('users.id'), nullable=True)
    settings = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    users = relationship("User", back_populates="institution", foreign_keys="User.primary_institution_id")
    orcid_profiles = relationship("OrcidProfile", back_populates="institution")

class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        UniqueConstraint('email', 'primary_institution_id', name='uix_email_institution'),
    )

    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    email = Column(String, index=True, nullable=False)
    name = Column(String, nullable=True)
    password_hash = Column(String, nullable=True)
    email_verified = Column(Boolean, default=False, nullable=False)
    
    account_type = Column(Enum(AccountType), nullable=False, default=AccountType.ORCID)
    status = Column(Enum(UserStatus), nullable=False, default=UserStatus.PENDING)
    
    orcid_id = Column(String, unique=True, index=True, nullable=True)
    orcid_access_token = Column(String, nullable=True)
    orcid_refresh_token = Column(String, nullable=True)
    orcid_token_expires_at = Column(DateTime(timezone=True), nullable=True)
    orcid_profile_last_sync = Column(DateTime(timezone=True), nullable=True)
    
    primary_institution_id = Column(String, ForeignKey('institutions.id'), nullable=True, index=True)
    is_global_admin = Column(Boolean, default=False, nullable=False)
    is_institution_admin = Column(Boolean, default=False, nullable=False)
    
    primary_account_type = Column(Enum(PrimaryAccountType), nullable=True)
    department = Column(String(200), nullable=True)
    job_title = Column(String(200), nullable=True)
    phone = Column(String(50), nullable=True)
    expertise_keywords = Column(Text, nullable=True)
    
    is_guest = Column(Boolean, default=False, nullable=False)
    access_expires_at = Column(DateTime(timezone=True), nullable=True)
    invited_by_id = Column(String, ForeignKey('users.id'), nullable=True)
    invitation_context = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_login = Column(DateTime(timezone=True), nullable=True)
    
    institution = relationship("Institution", back_populates="users", foreign_keys=[primary_institution_id])
    orcid_profile = relationship("OrcidProfile", back_populates="user", uselist=False)
    notifications = relationship("Notification", back_populates="recipient", foreign_keys="Notification.recipient_id")
    publication_libraries = relationship("PublicationLibrary", back_populates="user")
    manuscripts = relationship("Manuscript", back_populates="user")

class OrcidProfile(Base):
    __tablename__ = "orcid_profiles"

    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    user_id = Column(String, ForeignKey('users.id'), unique=True, nullable=False)
    institution_id = Column(String, ForeignKey('institutions.id'), nullable=True)
    
    orcid_id = Column(String, nullable=False, index=True)
    given_names = Column(String, nullable=True)
    family_name = Column(String, nullable=True)
    biography = Column(Text, nullable=True)
    
    affiliations = Column(Text, nullable=True)
    works = Column(Text, nullable=True)
    funding = Column(Text, nullable=True)
    
    visibility_status = Column(String, nullable=True)
    is_public = Column(Boolean, default=False)
    
    last_synced_at = Column(DateTime(timezone=True), server_default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    user = relationship("User", back_populates="orcid_profile")
    institution = relationship("Institution", back_populates="orcid_profiles")


# ============================================================
# PROTOTYPE MODELS - APPEND ONLY, DO NOT MODIFY ABOVE
# ============================================================

# ─── SHARED ENUMS ────────────────────────────────────────────────────────────

class ProposalStatus(str, enum.Enum):
    DRAFT = "draft"
    INTERNAL_REVIEW = "internal_review"
    RETURNED = "returned"
    SUBMITTED = "submitted"
    UNDER_REVIEW = "under_review"
    AWARDED = "awarded"
    DECLINED = "declined"

class AwardStatus(str, enum.Enum):
    ACTIVE = "active"
    SUSPENDED = "suspended"
    COMPLETED = "completed"
    TERMINATED = "terminated"

class ProjectStatus(str, enum.Enum):
    PROPOSED = "proposed"
    ACTIVE = "active"
    SUSPENDED = "suspended"
    COMPLETED = "completed"

class EthicsStatus(str, enum.Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    UNDER_REVIEW = "under_review"
    APPROVED = "approved"
    APPROVED_WITH_MODS = "approved_with_modifications"
    REJECTED = "rejected"
    DEFERRED = "deferred"

class ReviewStatus(str, enum.Enum):
    ASSIGNED = "assigned"
    IN_PROGRESS = "in_progress"
    SUBMITTED = "submitted"

class QAStatus(str, enum.Enum):
    STAGED = "staged"
    PASSED = "passed"
    FAILED = "failed"
    QUARANTINED = "quarantined"


# ─── GRANT MODULE MODELS ─────────────────────────────────────────────────────

class GrantOpportunity(Base):
    __tablename__ = "grant_opportunities"

    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    # institution_id removed - opportunities are now platform-wide, filtered by categories
    title = Column(String(500), nullable=False)
    sponsor = Column(String(300))
    description = Column(Text)
    category = Column(String(200))  # Legacy field, kept for backward compatibility
    geography = Column(String(200))
    applicant_type = Column(String(200))
    funding_type = Column(String(100))
    amount_min = Column(Float)
    amount_max = Column(Float)
    currency = Column(String(10), default="KES")
    open_date = Column(DateTime(timezone=True))
    deadline = Column(Date)
    eligibility = Column(Text)
    criteria = Column(Text)
    application_url = Column(String(500))
    contact_email = Column(String(200))
    source_system = Column(String(100), default="internal")
    source_id = Column(String(200))
    status = Column(String(50), default="open", index=True)
    is_curated = Column(Boolean, default=False, index=True)  # Published to researchers
    created_by_id = Column(String, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    proposals = relationship("Proposal", back_populates="opportunity")
    created_by = relationship("User", foreign_keys=[created_by_id])
    bookmarks = relationship("OpportunityBookmark", back_populates="opportunity", cascade="all, delete-orphan")
    category_assignments = relationship("OpportunityCategories", cascade="all, delete-orphan")


class OpportunityBookmark(Base):
    __tablename__ = "opportunity_bookmarks"

    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    opportunity_id = Column(String, ForeignKey("grant_opportunities.id"), nullable=False)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    opportunity = relationship("GrantOpportunity", back_populates="bookmarks")
    user = relationship("User")

    __table_args__ = (
        # Ensure a user can only bookmark an opportunity once
        UniqueConstraint('opportunity_id', 'user_id', name='unique_user_opportunity_bookmark'),
    )


# Opportunity Categories for filtering
class OpportunityCategory(Base):
    __tablename__ = "opportunity_categories"

    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    name = Column(String(100), nullable=False, unique=True)
    description = Column(Text, nullable=True)
    slug = Column(String(100), nullable=False, unique=True, index=True)
    color = Column(String(20), default="#3B82F6")  # Tailwind blue-500
    icon = Column(String(50), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    opportunity_associations = relationship("OpportunityCategories", back_populates="category", cascade="all, delete-orphan")
    institution_associations = relationship("InstitutionCategory", back_populates="category", cascade="all, delete-orphan")


# Junction table: Opportunity <-> Category (many-to-many)
class OpportunityCategories(Base):
    __tablename__ = "opportunity_category_assignments"

    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    opportunity_id = Column(String, ForeignKey("grant_opportunities.id"), nullable=False)
    category_id = Column(String, ForeignKey("opportunity_categories.id"), nullable=False)
    assigned_by = Column(String, ForeignKey("users.id"), nullable=True)
    assigned_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    opportunity = relationship("GrantOpportunity")
    category = relationship("OpportunityCategory", back_populates="opportunity_associations")
    assigner = relationship("User", foreign_keys=[assigned_by])

    __table_args__ = (
        UniqueConstraint('opportunity_id', 'category_id', name='unique_opportunity_category'),
    )


# Junction table: Institution <-> Category (many-to-many)
class InstitutionCategory(Base):
    __tablename__ = "institution_categories"

    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    institution_id = Column(String, ForeignKey("institutions.id"), nullable=False)
    category_id = Column(String, ForeignKey("opportunity_categories.id"), nullable=False)
    assigned_by = Column(String, ForeignKey("users.id"), nullable=True)
    assigned_at = Column(DateTime(timezone=True), server_default=func.now())
    notes = Column(Text, nullable=True)

    # Relationships
    institution = relationship("Institution")
    category = relationship("OpportunityCategory", back_populates="institution_associations")
    assigner = relationship("User", foreign_keys=[assigned_by])

    __table_args__ = (
        UniqueConstraint('institution_id', 'category_id', name='unique_institution_category'),
    )


class Proposal(Base):
    __tablename__ = "proposals"

    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    opportunity_id = Column(String, ForeignKey("grant_opportunities.id"), nullable=False)
    institution_id = Column(String, ForeignKey("institutions.id"), nullable=False)
    lead_pi_id = Column(String, ForeignKey("users.id"), nullable=False)
    title = Column(String(500), nullable=False)
    status = Column(Enum(ProposalStatus), default=ProposalStatus.DRAFT)
    submitted_at = Column(DateTime(timezone=True))
    current_version = Column(Integer, default=1)
    internal_notes = Column(Text)
    # Workflow tracking
    review_step = Column(Integer, default=0)          # 0-5 step within the pipeline
    review_stage_name = Column(String(200), nullable=True)  # human-readable stage label
    stage_notes = Column(Text, nullable=True)          # notes from last transition
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    opportunity = relationship("GrantOpportunity", back_populates="proposals")
    lead_pi = relationship("User", foreign_keys=[lead_pi_id])
    sections = relationship("ProposalSection", back_populates="proposal",
                            cascade="all, delete-orphan")
    documents = relationship("ProposalDocument", back_populates="proposal",
                             cascade="all, delete-orphan")
    collaborators = relationship("ProposalCollaborator", back_populates="proposal",
                                 cascade="all, delete-orphan")
    reviews = relationship("ProposalReview", back_populates="proposal",
                           cascade="all, delete-orphan")
    award = relationship("Award", back_populates="proposal", uselist=False)
    stage_history = relationship("ProposalStageHistory", back_populates="proposal",
                                 cascade="all, delete-orphan",
                                 order_by="ProposalStageHistory.stage_step")
    stage_assignments = relationship("ProposalStageAssignment", back_populates="proposal",
                                     cascade="all, delete-orphan")


class ProposalSection(Base):
    __tablename__ = "proposal_sections"

    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    proposal_id = Column(String, ForeignKey("proposals.id"), nullable=False)
    section_type = Column(String(100), nullable=False)
    title = Column(String(300), nullable=False)
    content_html = Column(Text, default="")
    word_count = Column(Integer, default=0)
    version = Column(Integer, default=1)
    section_order = Column(Integer, default=0)
    allowed_roles = Column(String(500), default="")  # comma-separated roles, empty = all
    last_edited_by_id = Column(String, ForeignKey("users.id"))
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    proposal = relationship("Proposal", back_populates="sections")
    last_edited_by = relationship("User", foreign_keys=[last_edited_by_id])
    versions = relationship("ProposalSectionVersion", back_populates="section", order_by="ProposalSectionVersion.version_number.desc()")


class ProposalSectionVersion(Base):
    __tablename__ = "proposal_section_versions"

    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    section_id = Column(String, ForeignKey("proposal_sections.id", ondelete="CASCADE"), nullable=False)
    version_number = Column(Integer, nullable=False)
    content_html = Column(Text, default="")
    word_count = Column(Integer, default=0)
    saved_by_id = Column(String, ForeignKey("users.id"))
    saved_at = Column(DateTime(timezone=True), server_default=func.now())

    section = relationship("ProposalSection", back_populates="versions")
    saved_by = relationship("User", foreign_keys=[saved_by_id])


class ProposalDocument(Base):
    __tablename__ = "proposal_documents"

    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    proposal_id = Column(String, ForeignKey("proposals.id"), nullable=False)
    document_type = Column(String(100))
    original_filename = Column(String(500))
    stored_filename = Column(String(500))
    file_size_bytes = Column(Integer)
    mime_type = Column(String(200))
    uploaded_by_id = Column(String, ForeignKey("users.id"))
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())

    proposal = relationship("Proposal", back_populates="documents")
    uploaded_by = relationship("User", foreign_keys=[uploaded_by_id])


class ProposalCollaborator(Base):
    __tablename__ = "proposal_collaborators"

    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    proposal_id = Column(String, ForeignKey("proposals.id"), nullable=False)
    user_id = Column(String, ForeignKey("users.id"), nullable=True)  # Nullable for pending invites
    role = Column(String(100), default="co_investigator")
    can_edit = Column(Boolean, default=True)
    status = Column(String(50), default="pending")  # pending, accepted, declined
    invited_email = Column(String(200))  # For pending invites
    invited_orcid = Column(String(100))  # For pending invites
    invited_name = Column(String(200))  # For pending invites
    invited_at = Column(DateTime(timezone=True), server_default=func.now())
    responded_at = Column(DateTime(timezone=True))

    proposal = relationship("Proposal", back_populates="collaborators")
    user = relationship("User", foreign_keys=[user_id])


class ProposalReview(Base):
    __tablename__ = "proposal_reviews"

    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    proposal_id = Column(String, ForeignKey("proposals.id"), nullable=False)
    reviewer_id = Column(String, ForeignKey("users.id"), nullable=False)
    status = Column(Enum(ReviewStatus), default=ReviewStatus.ASSIGNED)
    has_coi = Column(Boolean, default=False)
    coi_reason = Column(Text)
    scores = Column(Text, default="{}")
    overall_score = Column(Integer)
    recommendation = Column(String(50))
    narrative_feedback = Column(Text)
    submitted_at = Column(DateTime(timezone=True))
    assigned_at = Column(DateTime(timezone=True), server_default=func.now())

    proposal = relationship("Proposal", back_populates="reviews")
    reviewer = relationship("User", foreign_keys=[reviewer_id])


# Default intended duration per stage in working days
STAGE_INTENDED_DAYS = {0: 3, 1: 7, 2: 14, 3: 7, 4: 14, 5: 7}


class ProposalStageHistory(Base):
    """Tracks when a proposal enters and exits each review stage."""
    __tablename__ = "proposal_stage_history"

    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    proposal_id = Column(String, ForeignKey("proposals.id"), nullable=False)
    stage_step = Column(Integer, nullable=False)       # 0-5
    stage_name = Column(String(100))
    entered_at = Column(DateTime(timezone=True), server_default=func.now())
    intended_days = Column(Integer)                    # expected duration
    exited_at = Column(DateTime(timezone=True))        # null = still active
    entered_by_id = Column(String, ForeignKey("users.id"))

    proposal = relationship("Proposal", back_populates="stage_history")
    entered_by = relationship("User", foreign_keys=[entered_by_id])


class ProposalStageAssignment(Base):
    """Tracks which reviewer is assigned to review a specific stage of a proposal."""
    __tablename__ = "proposal_stage_assignments"

    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    proposal_id = Column(String, ForeignKey("proposals.id"), nullable=False)
    stage_step = Column(Integer, nullable=False)
    stage_name = Column(String(100))
    reviewer_id = Column(String, ForeignKey("users.id"), nullable=False)
    assigned_at = Column(DateTime(timezone=True), server_default=func.now())
    assigned_by_id = Column(String, ForeignKey("users.id"), nullable=False)
    notes = Column(Text)
    status = Column(String(50), default="active")      # active | removed

    proposal = relationship("Proposal", back_populates="stage_assignments")
    reviewer = relationship("User", foreign_keys=[reviewer_id])
    assigned_by = relationship("User", foreign_keys=[assigned_by_id])

    __table_args__ = (
        UniqueConstraint("proposal_id", "stage_step", "reviewer_id",
                         name="uq_proposal_stage_reviewer"),
    )


class Award(Base):
    __tablename__ = "awards"

    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    proposal_id = Column(String, ForeignKey("proposals.id"), nullable=False, unique=True)
    institution_id = Column(String, ForeignKey("institutions.id"), nullable=False)
    award_number = Column(String(100), unique=True)
    funder_name = Column(String(300))
    total_amount = Column(Integer, nullable=False)
    currency = Column(String(10), default="KES")
    start_date = Column(DateTime(timezone=True))
    end_date = Column(DateTime(timezone=True))
    status = Column(Enum(AwardStatus), default=AwardStatus.ACTIVE)
    conditions = Column(Text)
    issued_by_id = Column(String, ForeignKey("users.id"))
    issued_at = Column(DateTime(timezone=True), server_default=func.now())

    proposal = relationship("Proposal", back_populates="award")
    issued_by = relationship("User", foreign_keys=[issued_by_id])
    budget_lines = relationship("BudgetLine", back_populates="award",
                                cascade="all, delete-orphan")
    research_project = relationship("ResearchProject", back_populates="award",
                                    uselist=False)


class BudgetLine(Base):
    __tablename__ = "budget_lines"

    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    award_id = Column(String, ForeignKey("awards.id"), nullable=False)
    category = Column(String(200), nullable=False)
    description = Column(String(500))
    amount = Column(Integer, nullable=False)
    spent_to_date = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    award = relationship("Award", back_populates="budget_lines")


# ─── RESEARCH MODULE MODELS ───────────────────────────────────────────────────

class ResearchProject(Base):
    __tablename__ = "research_projects"

    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    institution_id = Column(String, ForeignKey("institutions.id"), nullable=False)
    award_id = Column(String, ForeignKey("awards.id"), nullable=True)
    pi_id = Column(String, ForeignKey("users.id"), nullable=False)
    title = Column(String(500), nullable=False)
    description = Column(Text)
    project_type = Column(String(100), default="funded")
    status = Column(Enum(ProjectStatus), default=ProjectStatus.PROPOSED)
    start_date = Column(DateTime(timezone=True))
    end_date = Column(DateTime(timezone=True))
    involves_human_subjects = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    award = relationship("Award", back_populates="research_project")
    pi = relationship("User", foreign_keys=[pi_id])
    ethics_applications = relationship("EthicsApplication",
                                       back_populates="project",
                                       cascade="all, delete-orphan")
    capture_forms = relationship("CaptureForm", back_populates="project")
    data_import_requests = relationship("DataImportRequest", back_populates="project", cascade="all, delete-orphan")
    members = relationship("ProjectMember", back_populates="project",
                           cascade="all, delete-orphan")
    milestones = relationship("ProjectMilestone", back_populates="project",
                              cascade="all, delete-orphan",
                              order_by="ProjectMilestone.due_date")
    project_documents = relationship("ProjectDocument", back_populates="project",
                                     cascade="all, delete-orphan")
    research_outputs = relationship("ResearchOutput", back_populates="project")


class EthicsApplication(Base):
    __tablename__ = "ethics_applications"

    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    project_id = Column(String, ForeignKey("research_projects.id"), nullable=False)
    institution_id = Column(String, ForeignKey("institutions.id"), nullable=False)
    application_type = Column(String(100), default="full_review")
    status = Column(Enum(EthicsStatus), default=EthicsStatus.DRAFT)
    title = Column(String(500))
    lay_summary = Column(Text)
    methodology = Column(Text)
    risk_assessment = Column(Text)
    data_handling = Column(Text)
    submitted_by_id = Column(String, ForeignKey("users.id"))
    submitted_at = Column(DateTime(timezone=True))
    decision_notes = Column(Text)
    approved_until = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    project = relationship("ResearchProject", back_populates="ethics_applications")
    submitted_by = relationship("User", foreign_keys=[submitted_by_id])
    documents = relationship("EthicsDocument", back_populates="ethics_application",
                              cascade="all, delete-orphan")


# ─── DATA MODULE A MODELS ────────────────────────────────────────────────────

class CaptureForm(Base):
    __tablename__ = "capture_forms"

    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    project_id = Column(String, ForeignKey("research_projects.id"), nullable=True)
    institution_id = Column(String, ForeignKey("institutions.id"), nullable=False)
    title = Column(String(500), nullable=False)
    description = Column(Text)
    form_schema = Column(Text, default='{"fields": []}')
    source_system = Column(String(50), default="internal")
    external_form_id = Column(String(200))
    external_endpoint = Column(String(500))
    is_active = Column(Boolean, default=True)
    created_by_id = Column(String, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    project = relationship("ResearchProject", back_populates="capture_forms")
    created_by = relationship("User", foreign_keys=[created_by_id])
    submissions = relationship("FormSubmission", back_populates="form",
                               cascade="all, delete-orphan")


class FormSubmission(Base):
    __tablename__ = "form_submissions"

    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    form_id = Column(String, ForeignKey("capture_forms.id"), nullable=False)
    data = Column(Text, nullable=False)
    submitted_by_id = Column(String, ForeignKey("users.id"), nullable=True)
    source_system = Column(String(50), default="internal")
    external_submission_id = Column(String(200))
    qa_status = Column(Enum(QAStatus), default=QAStatus.STAGED)
    submitted_at = Column(DateTime(timezone=True), server_default=func.now())

    form = relationship("CaptureForm", back_populates="submissions")
    submitted_by = relationship("User", foreign_keys=[submitted_by_id])


# ─── CROSS-CUTTING: NOTIFICATIONS ────────────────────────────────────────────

class EmailVerification(Base):
    __tablename__ = "email_verifications"

    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    email = Column(String, nullable=False, index=True)
    verification_code = Column(String(6), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    verified = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    verified_at = Column(DateTime(timezone=True), nullable=True)

class NotificationType(str, enum.Enum):
    NEW_REGISTRATION = "new_registration"
    ACCOUNT_APPROVED = "account_approved"
    ACCOUNT_REJECTED = "account_rejected"
    ROLE_ASSIGNED = "role_assigned"
    ROLE_REMOVED = "role_removed"
    PROPOSAL_SUBMITTED = "proposal_submitted"
    PROPOSAL_APPROVED = "proposal_approved"
    PROPOSAL_REJECTED = "proposal_rejected"
    REVIEW_ASSIGNED = "review_assigned"
    COMMENT_ADDED = "comment_added"
    SYSTEM_ANNOUNCEMENT = "system_announcement"

class NotificationPriority(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"

class Notification(Base):
    __tablename__ = "notifications"
    
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    recipient_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    type = Column(Enum(NotificationType), nullable=False)
    priority = Column(Enum(NotificationPriority), default=NotificationPriority.MEDIUM)
    
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    
    action_url = Column(String, nullable=True)
    
    related_entity_type = Column(String, nullable=True)
    related_entity_id = Column(String, nullable=True)
    
    is_read = Column(Boolean, default=False, nullable=False, index=True)
    read_at = Column(DateTime(timezone=True), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=True)
    
    recipient = relationship("User", back_populates="notifications", foreign_keys=[recipient_id])


# ==================== SCHOLARLY WORKS MODELS ====================

class ScholarlyWork(Base):
    __tablename__ = "scholarly_works"
    
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    title = Column(String, nullable=False, index=True)
    abstract = Column(Text, nullable=True)
    publication_year = Column(Integer, nullable=True, index=True)
    publication_date = Column(Date, nullable=True)
    
    # Identifiers
    doi = Column(String, unique=True, nullable=True, index=True)
    pmid = Column(String, unique=True, nullable=True, index=True)
    arxiv_id = Column(String, unique=True, nullable=True, index=True)
    openalex_id = Column(String, unique=True, nullable=True, index=True)
    
    # Publication details
    work_type = Column(String, nullable=True, index=True)  # article, book, dataset, etc.
    venue_name = Column(String, nullable=True)  # journal/conference name
    volume = Column(String, nullable=True)
    issue = Column(String, nullable=True)
    pages = Column(String, nullable=True)
    publisher = Column(String, nullable=True)
    
    # Metrics
    cited_by_count = Column(Integer, default=0)
    is_open_access = Column(Boolean, default=False)
    open_access_url = Column(String, nullable=True)
    
    # Categorization
    primary_topic = Column(String, nullable=True, index=True)
    keywords = Column(Text, nullable=True)  # JSON array as text
    
    # Status
    is_published = Column(Boolean, default=True)
    is_retracted = Column(Boolean, default=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    authors = relationship("WorkAuthor", back_populates="work", cascade="all, delete-orphan")
    institutions = relationship("WorkInstitution", back_populates="work", cascade="all, delete-orphan")
    funders = relationship("WorkFunder", back_populates="work", cascade="all, delete-orphan")


class WorkAuthor(Base):
    __tablename__ = "work_authors"
    
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    work_id = Column(String, ForeignKey('scholarly_works.id', ondelete='CASCADE'), nullable=False)
    
    author_name = Column(String, nullable=False)
    author_position = Column(Integer, nullable=False)  # 1 = first author, etc.
    is_corresponding = Column(Boolean, default=False)
    
    # Author identifiers
    orcid = Column(String, nullable=True)
    user_id = Column(String, ForeignKey('users.id'), nullable=True)  # Link to system user if exists
    
    # Affiliation at time of publication
    affiliation_name = Column(String, nullable=True)
    affiliation_country = Column(String, nullable=True)
    
    work = relationship("ScholarlyWork", back_populates="authors")
    user = relationship("User")


class WorkInstitution(Base):
    __tablename__ = "work_institutions"
    
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    work_id = Column(String, ForeignKey('scholarly_works.id', ondelete='CASCADE'), nullable=False)
    institution_id = Column(String, ForeignKey('institutions.id'), nullable=True)
    
    institution_name = Column(String, nullable=False)
    institution_country = Column(String, nullable=True)
    institution_type = Column(String, nullable=True)  # university, research_institute, etc.
    
    work = relationship("ScholarlyWork", back_populates="institutions")
    institution = relationship("Institution")


class WorkFunder(Base):
    __tablename__ = "work_funders"
    
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    work_id = Column(String, ForeignKey('scholarly_works.id', ondelete='CASCADE'), nullable=False)
    
    funder_name = Column(String, nullable=False)
    funder_country = Column(String, nullable=True)
    grant_number = Column(String, nullable=True)
    award_amount = Column(Float, nullable=True)
    currency = Column(String, default='USD')
    
    work = relationship("ScholarlyWork", back_populates="funders")


# ─── RESEARCH MODULE: TEAM, MILESTONES, OUTPUTS ──────────────────────────────

class ProjectMember(Base):
    __tablename__ = "project_members"

    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    project_id = Column(String, ForeignKey("research_projects.id"), nullable=False)
    user_id = Column(String, ForeignKey("users.id"), nullable=True)
    role = Column(String(100), default="co_investigator")
    status = Column(String(50), default="pending")   # pending | accepted | declined
    invited_email = Column(String(200))
    invited_name = Column(String(200))
    invited_at = Column(DateTime(timezone=True), server_default=func.now())
    joined_at = Column(DateTime(timezone=True))

    project = relationship("ResearchProject", back_populates="members")
    user = relationship("User", foreign_keys=[user_id])

    __table_args__ = (
        UniqueConstraint("project_id", "user_id", name="uq_project_member"),
    )


class ProjectMilestone(Base):
    __tablename__ = "project_milestones"

    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    project_id = Column(String, ForeignKey("research_projects.id"), nullable=False)
    title = Column(String(500), nullable=False)
    description = Column(Text)
    due_date = Column(DateTime(timezone=True))
    completed_at = Column(DateTime(timezone=True))
    assigned_to_id = Column(String, ForeignKey("users.id"))
    status = Column(String(50), default="pending")    # pending | in_progress | completed | overdue
    priority = Column(String(20), default="medium")   # low | medium | high | critical
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    project = relationship("ResearchProject", back_populates="milestones")
    assigned_to = relationship("User", foreign_keys=[assigned_to_id])
    tasks = relationship("ProjectTask", back_populates="milestone",
                         cascade="all, delete-orphan")


class ProjectTask(Base):
    __tablename__ = "project_tasks"

    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    milestone_id = Column(String, ForeignKey("project_milestones.id"), nullable=False)
    title = Column(String(500), nullable=False)
    assigned_to_id = Column(String, ForeignKey("users.id"))
    due_date = Column(DateTime(timezone=True))
    status = Column(String(50), default="todo")       # todo | in_progress | done
    priority = Column(String(20), default="medium")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    milestone = relationship("ProjectMilestone", back_populates="tasks")
    assigned_to = relationship("User", foreign_keys=[assigned_to_id])


class ProjectDocument(Base):
    __tablename__ = "project_documents"

    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    project_id = Column(String, ForeignKey("research_projects.id"), nullable=False)
    document_type = Column(String(100))
    original_filename = Column(String(500))
    stored_filename = Column(String(500))
    file_size_bytes = Column(Integer)
    mime_type = Column(String(200))
    uploaded_by_id = Column(String, ForeignKey("users.id"))
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())

    project = relationship("ResearchProject", back_populates="project_documents")
    uploaded_by = relationship("User", foreign_keys=[uploaded_by_id])


class ResearchOutput(Base):
    __tablename__ = "research_outputs"

    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    institution_id = Column(String, ForeignKey("institutions.id"), nullable=False)
    project_id = Column(String, ForeignKey("research_projects.id"), nullable=True)
    output_type = Column(String(100), default="journal_article")
    title = Column(String(500), nullable=False)
    abstract = Column(Text)
    content_tiptap = Column(Text, default="{}")    # TipTap JSON content
    doi = Column(String(200))
    year = Column(Integer)
    journal_name = Column(String(300))
    status = Column(String(50), default="draft")   # draft | in_review | published
    version = Column(Integer, default=1)
    created_by_id = Column(String, ForeignKey("users.id"), nullable=False)
    last_edited_by_id = Column(String, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    project = relationship("ResearchProject", back_populates="research_outputs")
    created_by = relationship("User", foreign_keys=[created_by_id])
    last_edited_by = relationship("User", foreign_keys=[last_edited_by_id])


class EthicsDocument(Base):
    __tablename__ = "ethics_documents"
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    ethics_application_id = Column(String, ForeignKey("ethics_applications.id"), nullable=False)
    document_type = Column(String(50), nullable=False)  # protocol, consent_form, data_management_plan, site_permission, other
    original_filename = Column(String(300), nullable=False)
    stored_filename = Column(String(300), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size_bytes = Column(Integer, nullable=False)
    mime_type = Column(String(100), nullable=False)
    uploaded_by_id = Column(String, ForeignKey("users.id"), nullable=False)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())

    ethics_application = relationship("EthicsApplication", back_populates="documents")
    uploaded_by = relationship("User", foreign_keys=[uploaded_by_id])


class DataImportRequestStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    EXPIRED = "expired"


class DataImportRequest(Base):
    __tablename__ = "data_import_requests"
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    project_id = Column(String, ForeignKey("research_projects.id"), nullable=False)
    requester_id = Column(String, ForeignKey("users.id"), nullable=False)
    status = Column(Enum(DataImportRequestStatus), default=DataImportRequestStatus.PENDING, nullable=False)
    justification = Column(Text, nullable=False)
    requested_datasets = Column(Text, nullable=False)  # JSON array of dataset identifiers/names
    access_duration_months = Column(Integer, nullable=False)  # Duration of access in months
    approved_by_id = Column(String, ForeignKey("users.id"), nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)
    rejection_reason = Column(Text, nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    project = relationship("ResearchProject", back_populates="data_import_requests")
    requester = relationship("User", foreign_keys=[requester_id])
    approver = relationship("User", foreign_keys=[approved_by_id])


# ─── DATA MODULE A: DATASETS & QA ────────────────────────────────────────────

class DatasetStatus(str, enum.Enum):
    DRAFT = "draft"
    STAGING = "staging"
    ACTIVE = "active"
    ARCHIVED = "archived"

class AccessLevel(str, enum.Enum):
    PUBLIC = "public"
    RESTRICTED = "restricted"
    CONFIDENTIAL = "confidential"
    HIGHLY_SENSITIVE = "highly_sensitive"

class QARuleAction(str, enum.Enum):
    FLAG = "flag"
    REJECT = "reject"
    AUTO_FIX = "auto_fix"

class QAResultStatus(str, enum.Enum):
    PASSED = "passed"
    FAILED = "failed"
    WARNED = "warned"


class Dataset(Base):
    __tablename__ = "datasets"
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    project_id = Column(String, ForeignKey("research_projects.id"), nullable=True)
    institution_id = Column(String, ForeignKey("institutions.id"), nullable=False)
    source_form_id = Column(String, ForeignKey("capture_forms.id"), nullable=True)
    title = Column(String(500), nullable=False)
    description = Column(Text)
    status = Column(Enum(DatasetStatus), default=DatasetStatus.DRAFT)
    access_level = Column(Enum(AccessLevel), default=AccessLevel.RESTRICTED)
    record_count = Column(Integer, default=0)
    current_version = Column(Integer, default=1)
    created_by_id = Column(String, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    project = relationship("ResearchProject")
    source_form = relationship("CaptureForm")
    created_by = relationship("User", foreign_keys=[created_by_id])
    versions = relationship("DatasetVersion", back_populates="dataset",
                            cascade="all, delete-orphan",
                            order_by="DatasetVersion.version_number.desc()")
    qa_rules = relationship("QARule", back_populates="dataset",
                            cascade="all, delete-orphan")


class DatasetVersion(Base):
    __tablename__ = "dataset_versions"
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    dataset_id = Column(String, ForeignKey("datasets.id"), nullable=False)
    version_number = Column(Integer, nullable=False)
    checksum = Column(String(128))
    storage_path = Column(String(500))
    row_count = Column(Integer, default=0)
    change_summary = Column(Text)
    created_by_id = Column(String, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    dataset = relationship("Dataset", back_populates="versions")
    created_by = relationship("User", foreign_keys=[created_by_id])


class QARule(Base):
    __tablename__ = "qa_rules"
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    dataset_id = Column(String, ForeignKey("datasets.id"), nullable=False)
    rule_type = Column(String(50), nullable=False)  # missing_value, duplicate, range, format, consistency
    field_name = Column(String(200), nullable=False)
    operator = Column(String(50))  # gt, lt, eq, between, regex, not_null, unique
    threshold = Column(String(200))
    action = Column(Enum(QARuleAction), default=QARuleAction.FLAG)
    is_active = Column(Boolean, default=True)
    created_by_id = Column(String, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    dataset = relationship("Dataset", back_populates="qa_rules")
    created_by = relationship("User", foreign_keys=[created_by_id])


class QAResult(Base):
    __tablename__ = "qa_results"
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    submission_id = Column(String, ForeignKey("form_submissions.id"), nullable=False)
    rule_id = Column(String, ForeignKey("qa_rules.id"), nullable=False)
    status = Column(Enum(QAResultStatus), nullable=False)
    details = Column(Text)
    reviewed_by_id = Column(String, ForeignKey("users.id"), nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    submission = relationship("FormSubmission")
    rule = relationship("QARule")
    reviewed_by = relationship("User", foreign_keys=[reviewed_by_id])


class DataTransformation(Base):
    __tablename__ = "data_transformations"
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    dataset_id = Column(String, ForeignKey("datasets.id"), nullable=False)
    transformation_type = Column(String(100), nullable=False)  # recode, standardize, derive, clean
    parameters = Column(Text)  # JSON
    applied_by_id = Column(String, ForeignKey("users.id"), nullable=False)
    applied_at = Column(DateTime(timezone=True), server_default=func.now())
    reversible = Column(Boolean, default=True)

    dataset = relationship("Dataset")
    applied_by = relationship("User", foreign_keys=[applied_by_id])


# ═══════════════════════════════════════════════════════════════════════════
# PUBLICATION LIBRARY MODELS
# ═══════════════════════════════════════════════════════════════════════════

class PublicationLibrary(Base):
    __tablename__ = "publication_libraries"
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    parent_id = Column(String, ForeignKey("publication_libraries.id"), nullable=True)
    is_folder = Column(Boolean, default=False)
    is_default = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    user = relationship("User", back_populates="publication_libraries")
    publications = relationship("Publication", back_populates="library", cascade="all, delete-orphan")
    parent = relationship("PublicationLibrary", remote_side=[id], backref="children")


class Publication(Base):
    __tablename__ = "publications"
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    library_id = Column(String, ForeignKey("publication_libraries.id"), nullable=False)
    
    # Core metadata
    title = Column(Text, nullable=False)
    authors = Column(Text, nullable=False)
    journal = Column(String(500), nullable=True)
    year = Column(Integer, nullable=True)
    doi = Column(String(255), nullable=True, index=True)
    pmid = Column(String(50), nullable=True, index=True)
    
    # Source info
    source = Column(String(50), nullable=True)  # PubMed, Crossref, OpenAlex, etc.
    source_id = Column(String(255), nullable=True)
    
    # Additional metadata
    abstract = Column(Text, nullable=True)
    publication_type = Column(String(100), nullable=True)
    language = Column(String(50), nullable=True)
    country = Column(String(100), nullable=True)
    keywords = Column(Text, nullable=True)  # JSON array
    
    # Citation info
    citation_count = Column(Integer, default=0)
    
    # User interaction
    starred = Column(Boolean, default=False)
    tags = Column(Text, nullable=True)  # JSON array
    notes = Column(Text, nullable=True)
    
    # AI summary
    ai_summary = Column(Text, nullable=True)
    ai_summary_generated_at = Column(DateTime(timezone=True), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    library = relationship("PublicationLibrary", back_populates="publications")


# Update User model to include publication_libraries relationship
# This should be added to the User class definition
# user.publication_libraries = relationship("PublicationLibrary", back_populates="user")


# ═══════════════════════════════════════════════════════════════════════════
# MANUSCRIPT MODELS
# ═══════════════════════════════════════════════════════════════════════════

class Manuscript(Base):
    __tablename__ = "manuscripts"
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    title = Column(String(500), nullable=False)
    short_description = Column(Text, nullable=True)
    department = Column(String(255), nullable=True)
    keywords = Column(Text, nullable=True)  # JSON array
    
    # Owner/creator
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    
    # Content
    content = Column(Text, nullable=True)
    abstract = Column(Text, nullable=True)
    
    # Status
    status = Column(String(50), default='draft')  # draft, in_review, submitted, published
    version = Column(Integer, default=1)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="manuscripts")
    co_authors = relationship("ManuscriptCoAuthor", back_populates="manuscript", cascade="all, delete-orphan")

    @property
    def creator(self):
        return self.user


class ManuscriptCoAuthor(Base):
    __tablename__ = "manuscript_co_authors"
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    manuscript_id = Column(String, ForeignKey("manuscripts.id"), nullable=False)
    
    # Co-author details
    given_name = Column(String(255), nullable=False)
    family_name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=True)
    orcid = Column(String(50), nullable=True)
    role = Column(String(50), default='author', server_default='author')  # author, editor, reviewer, admin

    # Invitation status
    status = Column(String(50), default='invited')  # invited, accepted, declined
    invited_at = Column(DateTime(timezone=True), server_default=func.now())
    responded_at = Column(DateTime(timezone=True), nullable=True)
    
    # Order in author list
    author_order = Column(Integer, nullable=False)
    
    # Relationship
    manuscript = relationship("Manuscript", back_populates="co_authors")


# ═══════════════════════════════════════════════════════════════════════════
# DATA SOURCE CONNECTIONS (Saved source configurations)
# ═══════════════════════════════════════════════════════════════════════════

class DataSource(Base):
    """
    Saved data source connection configurations.
    These are reusable connection definitions researchers can import from.
    """
    __tablename__ = "data_sources"

    id = Column(String, primary_key=True, default=generate_uuid)

    institution_id = Column(String, ForeignKey("institutions.id"), nullable=False, index=True)
    researcher_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)

    name = Column(String(255), nullable=False)
    source_type = Column(String(50), nullable=False)   # kobo_collect | google_sheets | excel
    url = Column(Text, nullable=True)
    api_key = Column(Text, nullable=True)               # stored as-is; future: encrypt
    asset_uid = Column(String(100), nullable=True)      # KoboCollect form UID
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    record_count = Column(Integer, nullable=True)
    last_sync = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    institution = relationship("Institution")
    researcher = relationship("User", foreign_keys=[researcher_id])


# ═══════════════════════════════════════════════════════════════════════════
# LAKEHOUSE DATA IMPORT MODELS (Metadata-First Architecture)
# ═══════════════════════════════════════════════════════════════════════════

class DataImportStatus(str, enum.Enum):
    PENDING = "pending"
    QUEUED = "queued"
    INGESTING = "ingesting"
    INGESTED = "ingested"
    FAILED = "failed"

class DataSourceType(str, enum.Enum):
    URL = "url"
    FILE_UPLOAD = "file_upload"
    KOBO_COLLECT = "kobo_collect"
    GOOGLE_SHEETS = "google_sheets"
    EXCEL = "excel"
    API_FEED = "api_feed"

class DataImport(Base):
    """
    Metadata-only tracking for data imports.
    Raw data is stored in MinIO Bronze bucket, not in PostgreSQL.
    """
    __tablename__ = "data_imports"
    
    id = Column(String(36), primary_key=True, default=lambda: secrets.token_urlsafe(16))
    
    # Context IDs
    institution_id = Column(String, ForeignKey("institutions.id"), nullable=False, index=True)
    researcher_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    project_id = Column(String, ForeignKey("research_projects.id"), nullable=True, index=True)
    
    # Source metadata
    source_url = Column(Text, nullable=True)
    source_type = Column(Enum(DataSourceType), nullable=False)
    source_tag = Column(String(100), nullable=False)
    file_name = Column(String(255), nullable=True)
    file_format = Column(String(20), nullable=True)
    file_size_bytes = Column(Integer, nullable=True)
    
    # Ingestion tracking
    ingest_status = Column(Enum(DataImportStatus), default=DataImportStatus.PENDING, nullable=False, index=True)
    bronze_path = Column(Text, nullable=True)
    bronze_bucket = Column(String(100), nullable=True)
    ingest_triggered_at = Column(DateTime(timezone=True), nullable=True)
    ingest_completed_at = Column(DateTime(timezone=True), nullable=True)
    error_message = Column(Text, nullable=True)
    
    # Additional metadata
    record_count = Column(Integer, nullable=True)
    description = Column(Text, nullable=True)
    metadata_json = Column(Text, nullable=True)  # JSON string for flexible metadata
    
    # Priority and retry tracking
    priority = Column(Integer, default=5)  # 1 (low) to 10 (high)
    retry_count = Column(Integer, default=0)
    last_retry_at = Column(DateTime(timezone=True), nullable=True)
    file_size_estimate = Column(Integer, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    created_by = Column(String, ForeignKey("users.id"), nullable=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    institution = relationship("Institution")
    researcher = relationship("User", foreign_keys=[researcher_id])
    project = relationship("ResearchProject")
    creator = relationship("User", foreign_keys=[created_by])


# ═══════════════════════════════════════════════════════════════════════════
# MODULE 7 – MoU & PARTNERSHIPS
# ═══════════════════════════════════════════════════════════════════════════

class MouStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    INTERNAL_REVIEW = "INTERNAL_REVIEW"
    LEGAL_REVIEW = "LEGAL_REVIEW"
    EXEC_APPROVAL = "EXEC_APPROVAL"
    PENDING_SIGNING = "PENDING_SIGNING"
    ACTIVE = "ACTIVE"
    MID_TERM_REVIEW = "MID_TERM_REVIEW"
    PENDING_RENEWAL = "PENDING_RENEWAL"
    SUSPENDED = "SUSPENDED"
    EXPIRED = "EXPIRED"
    CLOSED = "CLOSED"
    ARCHIVED = "ARCHIVED"

class MouType(str, enum.Enum):
    GENERAL_COLLABORATION = "GENERAL_COLLABORATION"
    ACADEMIC_EXCHANGE = "ACADEMIC_EXCHANGE"
    RESEARCH_PARTNERSHIP = "RESEARCH_PARTNERSHIP"
    DATA_SHARING = "DATA_SHARING"
    JOINT_DEGREE = "JOINT_DEGREE"
    CLINICAL = "CLINICAL"
    INDUSTRY = "INDUSTRY"
    CONSORTIUM = "CONSORTIUM"
    CO_FUNDING = "CO_FUNDING"

class MouConfidentiality(str, enum.Enum):
    PUBLIC = "PUBLIC"
    INTERNAL = "INTERNAL"
    RESTRICTED = "RESTRICTED"
    CONFIDENTIAL = "CONFIDENTIAL"

class MouRiskRating(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"

class MouPartnerType(str, enum.Enum):
    UNIVERSITY = "UNIVERSITY"
    RESEARCH_INSTITUTE = "RESEARCH_INSTITUTE"
    GOVERNMENT = "GOVERNMENT"
    NGO = "NGO"
    HOSPITAL = "HOSPITAL"
    INDUSTRY = "INDUSTRY"
    FUNDER = "FUNDER"
    INTERNATIONAL_ORG = "INTERNATIONAL_ORG"

class MouPartnerTier(str, enum.Enum):
    STRATEGIC = "STRATEGIC"
    ACTIVE = "ACTIVE"
    DORMANT = "DORMANT"

class MouParticipantRole(str, enum.Enum):
    LEAD = "LEAD"
    CO_SIGNATORY = "CO_SIGNATORY"
    BENEFICIARY = "BENEFICIARY"
    OBSERVER = "OBSERVER"

class MouApprovalStageType(str, enum.Enum):
    INTERNAL_REVIEW = "INTERNAL_REVIEW"
    LEGAL_REVIEW = "LEGAL_REVIEW"
    EXEC_APPROVAL = "EXEC_APPROVAL"
    SIGNING = "SIGNING"

class MouApprovalStageStatus(str, enum.Enum):
    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    APPROVED = "APPROVED"
    RETURNED = "RETURNED"
    SKIPPED = "SKIPPED"

class MouActivityType(str, enum.Enum):
    JOINT_TRAINING = "JOINT_TRAINING"
    RESEARCH_PROJECT = "RESEARCH_PROJECT"
    STUDENT_EXCHANGE = "STUDENT_EXCHANGE"
    PUBLICATION = "PUBLICATION"
    GRANT_APPLICATION = "GRANT_APPLICATION"
    TECHNOLOGY_TRANSFER = "TECHNOLOGY_TRANSFER"
    POLICY_BRIEF = "POLICY_BRIEF"
    EVENT_WORKSHOP = "EVENT_WORKSHOP"
    CONSULTANCY = "CONSULTANCY"
    EQUIPMENT_SHARING = "EQUIPMENT_SHARING"
    OTHER = "OTHER"

class MouActivityStatus(str, enum.Enum):
    PLANNED = "PLANNED"
    IN_PROGRESS = "IN_PROGRESS"
    DELAYED = "DELAYED"
    EVIDENCE_SUBMITTED = "EVIDENCE_SUBMITTED"
    VERIFIED = "VERIFIED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"

class MouVersionType(str, enum.Enum):
    ORIGINAL = "ORIGINAL"
    AMENDMENT = "AMENDMENT"
    RENEWAL = "RENEWAL"
    ADDENDUM = "ADDENDUM"

class MouCommunicationType(str, enum.Enum):
    EMAIL = "EMAIL"
    MEETING = "MEETING"
    CALL = "CALL"
    SITE_VISIT = "SITE_VISIT"
    REPORT = "REPORT"
    OTHER = "OTHER"

class MouBudgetStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    APPROVED = "APPROVED"
    ACTIVE = "ACTIVE"
    CLOSED = "CLOSED"

class MouComplianceStatus(str, enum.Enum):
    PENDING = "PENDING"
    COMPLIANT = "COMPLIANT"
    NON_COMPLIANT = "NON_COMPLIANT"
    WAIVED = "WAIVED"


class Mou(Base):
    __tablename__ = "mous"

    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    institution_id = Column(String, ForeignKey("institutions.id"), nullable=False, index=True)
    mou_number = Column(String(50), unique=True, nullable=True)
    title = Column(String(500), nullable=False)
    mou_type = Column(Enum(MouType), nullable=False)
    status = Column(Enum(MouStatus), nullable=False, default=MouStatus.DRAFT, index=True)
    thematic_area = Column(Text, nullable=True)
    lead_department = Column(String(200), nullable=True)
    coordinator_id = Column(String, ForeignKey("users.id"), nullable=True)
    legal_officer_id = Column(String, ForeignKey("users.id"), nullable=True)
    scope_objectives = Column(Text, nullable=True)
    obligations_institution = Column(Text, nullable=True)
    obligations_partner = Column(Text, nullable=True)
    governing_law = Column(String(100), nullable=True)
    confidentiality_level = Column(Enum(MouConfidentiality), default=MouConfidentiality.INTERNAL)
    effective_date = Column(Date, nullable=True)
    expiry_date = Column(Date, nullable=True)
    signed_date = Column(Date, nullable=True)
    duration_years = Column(Float, nullable=True)
    auto_renew = Column(Boolean, default=False)
    renewal_notice_days = Column(Integer, default=90)
    risk_rating = Column(Enum(MouRiskRating), nullable=True)
    financial_commitment = Column(Boolean, default=False)
    ip_clauses = Column(Boolean, default=False)
    data_sharing = Column(Boolean, default=False)
    parent_mou_id = Column(String, ForeignKey("mous.id"), nullable=True)
    created_by_id = Column(String, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    institution = relationship("Institution")
    created_by = relationship("User", foreign_keys=[created_by_id])
    coordinator = relationship("User", foreign_keys=[coordinator_id])
    legal_officer = relationship("User", foreign_keys=[legal_officer_id])
    participants = relationship("MouParticipant", back_populates="mou", cascade="all, delete-orphan")
    approval_stages = relationship("MouApprovalStage", back_populates="mou", cascade="all, delete-orphan")
    activities = relationship("MouActivity", back_populates="mou", cascade="all, delete-orphan")
    versions = relationship("MouVersion", back_populates="mou", cascade="all, delete-orphan")
    budgets = relationship("MouBudget", back_populates="mou", cascade="all, delete-orphan")
    compliance_items = relationship("MouComplianceItem", back_populates="mou", cascade="all, delete-orphan")
    communications = relationship("MouCommunication", back_populates="mou", cascade="all, delete-orphan")


class MouVersion(Base):
    __tablename__ = "mou_versions"

    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    mou_id = Column(String, ForeignKey("mous.id"), nullable=False, index=True)
    version_number = Column(Integer, nullable=False, default=1)
    document_path = Column(String(500), nullable=True)
    document_checksum = Column(String(64), nullable=True)
    version_type = Column(Enum(MouVersionType), default=MouVersionType.ORIGINAL)
    change_summary = Column(Text, nullable=True)
    uploaded_by_id = Column(String, ForeignKey("users.id"), nullable=True)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())

    mou = relationship("Mou", back_populates="versions")
    uploaded_by = relationship("User", foreign_keys=[uploaded_by_id])


class MouPartner(Base):
    __tablename__ = "mou_partners"

    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    institution_id = Column(String, ForeignKey("institutions.id"), nullable=False, index=True)
    organisation_name = Column(String(300), nullable=False)
    organisation_type = Column(Enum(MouPartnerType), nullable=True)
    country = Column(String(5), nullable=True)
    region = Column(String(100), nullable=True)
    city = Column(String(100), nullable=True)
    website = Column(String(300), nullable=True)
    accreditation_status = Column(String(100), nullable=True)
    partnership_tier = Column(Enum(MouPartnerTier), default=MouPartnerTier.ACTIVE)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    institution = relationship("Institution")
    contacts = relationship("MouPartnerContact", back_populates="partner", cascade="all, delete-orphan")
    participants = relationship("MouParticipant", back_populates="partner")
    communications = relationship("MouCommunication", back_populates="partner")


class MouPartnerContact(Base):
    __tablename__ = "mou_partner_contacts"

    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    partner_id = Column(String, ForeignKey("mou_partners.id"), nullable=False, index=True)
    mou_id = Column(String, ForeignKey("mous.id"), nullable=True)
    full_name = Column(String(200), nullable=False)
    title = Column(String(100), nullable=True)
    email = Column(String(200), nullable=True)
    phone = Column(String(50), nullable=True)
    orcid_id = Column(String(100), nullable=True)
    is_primary = Column(Boolean, default=False)
    role_at_partner = Column(String(200), nullable=True)

    partner = relationship("MouPartner", back_populates="contacts")


class MouParticipant(Base):
    __tablename__ = "mou_participants"

    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    mou_id = Column(String, ForeignKey("mous.id"), nullable=False, index=True)
    partner_id = Column(String, ForeignKey("mou_partners.id"), nullable=False)
    role = Column(Enum(MouParticipantRole), default=MouParticipantRole.CO_SIGNATORY)
    signatory_name = Column(String(200), nullable=True)
    signatory_title = Column(String(200), nullable=True)
    signed_date = Column(Date, nullable=True)

    mou = relationship("Mou", back_populates="participants")
    partner = relationship("MouPartner", back_populates="participants")


class MouCommunication(Base):
    __tablename__ = "mou_communications"

    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    mou_id = Column(String, ForeignKey("mous.id"), nullable=False, index=True)
    partner_id = Column(String, ForeignKey("mou_partners.id"), nullable=True)
    communication_type = Column(Enum(MouCommunicationType), default=MouCommunicationType.OTHER)
    date = Column(Date, nullable=True)
    summary = Column(Text, nullable=True)
    outcome = Column(Text, nullable=True)
    next_action = Column(Text, nullable=True)
    logged_by_id = Column(String, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    mou = relationship("Mou", back_populates="communications")
    partner = relationship("MouPartner", back_populates="communications")
    logged_by = relationship("User", foreign_keys=[logged_by_id])


class MouApprovalStage(Base):
    __tablename__ = "mou_approval_stages"

    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    mou_id = Column(String, ForeignKey("mous.id"), nullable=False, index=True)
    stage_type = Column(Enum(MouApprovalStageType), nullable=False)
    stage_order = Column(Integer, nullable=False, default=1)
    assigned_to_id = Column(String, ForeignKey("users.id"), nullable=True)
    status = Column(Enum(MouApprovalStageStatus), default=MouApprovalStageStatus.PENDING)
    comments = Column(Text, nullable=True)
    decided_at = Column(DateTime(timezone=True), nullable=True)
    decided_by_id = Column(String, ForeignKey("users.id"), nullable=True)
    sla_days = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    mou = relationship("Mou", back_populates="approval_stages")
    assigned_to = relationship("User", foreign_keys=[assigned_to_id])
    decided_by = relationship("User", foreign_keys=[decided_by_id])


class MouActivity(Base):
    __tablename__ = "mou_activities"

    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    mou_id = Column(String, ForeignKey("mous.id"), nullable=False, index=True)
    title = Column(String(300), nullable=False)
    description = Column(Text, nullable=True)
    activity_type = Column(Enum(MouActivityType), default=MouActivityType.OTHER)
    assigned_to_id = Column(String, ForeignKey("users.id"), nullable=True)
    planned_start_date = Column(Date, nullable=True)
    planned_end_date = Column(Date, nullable=True)
    status = Column(Enum(MouActivityStatus), default=MouActivityStatus.PLANNED)
    completion_percentage = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    mou = relationship("Mou", back_populates="activities")
    assigned_to = relationship("User", foreign_keys=[assigned_to_id])


class MouBudget(Base):
    __tablename__ = "mou_budgets"

    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    mou_id = Column(String, ForeignKey("mous.id"), nullable=False, index=True)
    description = Column(Text, nullable=True)
    currency = Column(String(3), default="KES")
    committed_by_institution = Column(Float, default=0)
    committed_by_partner = Column(Float, default=0)
    total_budget = Column(Float, default=0)
    status = Column(Enum(MouBudgetStatus), default=MouBudgetStatus.DRAFT)
    approved_by_id = Column(String, ForeignKey("users.id"), nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    mou = relationship("Mou", back_populates="budgets")
    approved_by = relationship("User", foreign_keys=[approved_by_id])


class MouComplianceItem(Base):
    __tablename__ = "mou_compliance_items"

    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    mou_id = Column(String, ForeignKey("mous.id"), nullable=False, index=True)
    check_type = Column(String(200), nullable=False)
    required = Column(Boolean, default=True)
    status = Column(Enum(MouComplianceStatus), default=MouComplianceStatus.PENDING)
    notes = Column(Text, nullable=True)
    verified_by_id = Column(String, ForeignKey("users.id"), nullable=True)
    verified_at = Column(DateTime(timezone=True), nullable=True)

    mou = relationship("Mou", back_populates="compliance_items")
    verified_by = relationship("User", foreign_keys=[verified_by_id])
