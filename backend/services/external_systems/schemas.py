from __future__ import annotations

from datetime import date, datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class SISStudent(BaseModel):
    student_id: str
    first_name: str = ""
    last_name: str = ""
    full_name: str = ""
    email: str = ""
    institution: str = ""
    domain: str = ""
    gender: str = ""
    nationality: str = ""
    student_type: str = ""
    degree_level: str = ""
    programme_code: str = ""
    programme_name: str = ""
    department: str = ""
    cohort_year: Optional[int] = None
    enrolment_date: Optional[date] = None
    study_mode: str = ""
    expected_graduation_date: Optional[date] = None
    current_stage_no: Optional[int] = None
    current_stage_name: str = ""
    orcid_placeholder: str = ""
    status: str = ""


class SISCohort(BaseModel):
    cohort_id: str
    institution: str = ""
    cohort_year: Optional[int] = None
    degree_level: str = ""
    programme_code: str = ""
    programme_name: str = ""
    start_date: Optional[date] = None
    expected_end_date: Optional[date] = None
    total_enrolled: Optional[int] = None
    msc_count: Optional[int] = None
    phd_count: Optional[int] = None
    local_count: Optional[int] = None
    international_count: Optional[int] = None
    active: Optional[int] = None
    status: str = ""


class LMSProgramme(BaseModel):
    programme_code: str
    programme_name: str = ""
    degree_level: str = ""
    institution: str = ""
    department: str = ""
    duration_years: Optional[float] = None
    total_credits: Optional[int] = None
    pub_requirement: Optional[int] = None
    min_coursework_units: Optional[int] = None
    supervisor_required: bool = True
    ethics_required: bool = True
    dmp_required: bool = True
    thesis_required: bool = True
    graduation_gate: bool = True
    status: str = ""


class LMSCourse(BaseModel):
    course_code: str
    course_name: str = ""
    credits: Optional[int] = None
    programme_code: str = ""
    institution: str = ""
    year_of_study: Optional[int] = None
    semester: Optional[int] = None
    course_type: str = ""
    status: str = ""


class LMSEnrolment(BaseModel):
    enrolment_id: str
    student_id: str
    full_name: str = ""
    institution: str = ""
    programme_code: str = ""
    course_code: str = ""
    course_name: str = ""
    academic_year: str = ""
    semester: Optional[int] = None
    mark_pct: Optional[float] = None
    grade: str = ""
    status: str = ""


class LMSProgrammeRule(BaseModel):
    rule_id: str
    programme_code: str = ""
    institution: str = ""
    degree_level: str = ""
    rule_type: str = ""
    rule_description: str = ""
    min_value: Optional[float] = None
    acceptable_evidence: str = ""
    mandatory: bool = True
    managed_by: str = ""


class JourneyStageStatus(BaseModel):
    stage_no: int
    stage_name: str
    status: str = ""
    stage_date: Optional[date] = None
    extra: Dict[str, Any] = Field(default_factory=dict)


class LMSJourney(BaseModel):
    student_id: str
    full_name: str = ""
    institution: str = ""
    programme: str = ""
    level: str = ""
    cohort: Optional[int] = None
    overall_status: str = ""
    current_stage: str = ""
    days_overdue: Optional[int] = None
    risk_level: str = ""
    lead_supervisor: str = ""
    notes: str = ""
    expected_graduation: Optional[date] = None
    stages: List[JourneyStageStatus] = Field(default_factory=list)
    pub_count: Optional[int] = None


class FMSFeeStructure(BaseModel):
    fee_code: str
    programme_code: str = ""
    institution: str = ""
    degree_level: str = ""
    academic_year: str = ""
    tuition_kes: Optional[float] = None
    registration_kes: Optional[float] = None
    thesis_exam_kes: Optional[float] = None
    library_kes: Optional[float] = None
    technology_levy_kes: Optional[float] = None
    total_annual_kes: Optional[float] = None
    currency: str = "KES"


class FMSStudentAccount(BaseModel):
    account_id: str
    student_id: str
    full_name: str = ""
    institution: str = ""
    programme: str = ""
    degree_level: str = ""
    cohort: Optional[int] = None
    expected_graduation_date: Optional[date] = None
    annual_fee_kes: Optional[float] = None
    duration_yrs: Optional[int] = None
    total_programme_fee_kes: Optional[float] = None
    scholarship_kes: Optional[float] = None
    net_payable_kes: Optional[float] = None
    amount_paid_kes: Optional[float] = None
    outstanding_kes: Optional[float] = None
    payment_status: str = ""
    last_payment_date: Optional[date] = None
    finance_clearance: bool = False


class FMSTransaction(BaseModel):
    transaction_id: str
    student_id: str
    full_name: str = ""
    institution: str = ""
    transaction_date: Optional[date] = None
    amount_kes: Optional[float] = None
    payment_method: str = ""
    reference_no: str = ""
    academic_year: str = ""
    fee_type: str = ""
    status: str = ""
    receipt_no: str = ""


class HRStaff(BaseModel):
    staff_id: str
    first_name: str = ""
    last_name: str = ""
    full_name: str = ""
    email: str = ""
    institution: str = ""
    role: str = ""
    department: str = ""
    staff_type: str = ""
    specialization: str = ""
    active_msc_students: Optional[int] = None
    active_phd_students: Optional[int] = None
    total_supervisees: Optional[int] = None
    employment_type: str = ""
    join_date: Optional[date] = None
    status: str = ""


class HRSupervisorAssignment(BaseModel):
    assignment_id: str
    student_id: str
    student_name: str = ""
    institution: str = ""
    programme: str = ""
    level: str = ""
    lead_supervisor_id: str = ""
    lead_supervisor_name: str = ""
    lead_supervisor_email: str = ""
    co_supervisor_id: str = ""
    co_supervisor_name: str = ""
    co_supervisor_email: str = ""
    appointment_date: Optional[date] = None
    status: str = ""
    conflict_declared: bool = False
    notes: str = ""
