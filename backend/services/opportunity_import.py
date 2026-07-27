"""
Grant Opportunity Import Service
Handles importing opportunities from Excel files and external sources
"""
import pandas as pd
import re
import warnings
from datetime import datetime, date
from typing import List, Dict, Any, Optional, Tuple
from pathlib import Path
import hashlib
from difflib import SequenceMatcher
from dateutil import parser as dateutil_parser
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from models import GrantOpportunity, User, OpportunityCategory, OpportunityCategories


class OpportunityImportService:
    """Service for importing and deduplicating grant opportunities"""
    
    FUZZY_MATCH_THRESHOLD = 0.85  # 85% similarity for fuzzy matching
    
    @staticmethod
    def parse_dacoris_excel_file(file_path: str) -> List[Dict[str, Any]]:
        """
        Parse DACORIS-specific Excel format with header rows
        Headers in row 2 (0-indexed), data starts from row 3
        
        Columns (20 total):
        0: OPPORTUNITY ID (source_id)
        1: SOURCE SYSTEM
        2: OPPORTUNITY TITLE
        3: SPONSOR / FUNDER
        4: SPONSOR TYPE
        5: CATEGORY / SECTOR
        6: GEOGRAPHY / COUNTY
        7: ELIGIBLE APPLICANTS
        8: FUNDING TYPE
        9: CCY (Currency)
        10: MIN AWARD (KES/USD)
        11: MAX AWARD (KES/USD)
        12: OPEN DATE
        13: DEADLINE
        14: DAYS REMAINING
        15: STATUS
        16: ROUND / CYCLE
        17: CONTACT EMAIL
        18: OPPORTUNITY URL
        19: INTERNAL NOTES
        """
        # Read Excel with header row at index 2
        df = pd.read_excel(file_path, header=2)
        
        opportunities = []
        for _, row in df.iterrows():
            # Skip empty rows - check first column (OPPORTUNITY_ID)
            if pd.isna(row.iloc[0]) or str(row.iloc[0]).strip() == '':
                continue
            
            # Parse amounts (columns 10 and 11)
            try:
                amount_min = float(str(row.iloc[10]).replace(',', '')) if pd.notna(row.iloc[10]) else None
            except:
                amount_min = None
            
            try:
                amount_max = float(str(row.iloc[11]).replace(',', '')) if pd.notna(row.iloc[11]) else None
            except:
                amount_max = None
                
            opp = {
                'source_id': str(row.iloc[0]).strip() if pd.notna(row.iloc[0]) else None,
                'source_system': str(row.iloc[1]).strip() if pd.notna(row.iloc[1]) else 'dacoris_excel',
                'title': str(row.iloc[2]).strip() if pd.notna(row.iloc[2]) else None,
                'sponsor': str(row.iloc[3]).strip() if pd.notna(row.iloc[3]) else None,
                'description': str(row.iloc[19]).strip() if pd.notna(row.iloc[19]) else None,  # INTERNAL NOTES
                'category': str(row.iloc[5]).strip() if pd.notna(row.iloc[5]) else None,
                'geography': str(row.iloc[6]).strip() if pd.notna(row.iloc[6]) else None,
                'applicant_type': str(row.iloc[7]).strip() if pd.notna(row.iloc[7]) else None,
                'funding_type': str(row.iloc[8]).strip() if pd.notna(row.iloc[8]) else None,
                'amount_min': amount_min,
                'amount_max': amount_max,
                'currency': str(row.iloc[9]).strip() if pd.notna(row.iloc[9]) else 'KES',
                'deadline': OpportunityImportService._parse_date(row.iloc[13]) if pd.notna(row.iloc[13]) else None,
                'eligibility': str(row.iloc[7]).strip() if pd.notna(row.iloc[7]) else None,  # ELIGIBLE_APPLICANTS
                'criteria': str(row.iloc[4]).strip() if pd.notna(row.iloc[4]) else None,  # SPONSOR TYPE
                'application_url': str(row.iloc[18]).strip() if pd.notna(row.iloc[18]) else None,
                'contact_email': str(row.iloc[17]).strip() if pd.notna(row.iloc[17]) else None,
                'status': str(row.iloc[15]).strip().lower() if pd.notna(row.iloc[15]) else 'open',
            }
            
            # Skip if no title
            if opp['title']:
                opportunities.append(opp)
        
        return opportunities
    
    @staticmethod
    def parse_excel_file(file_path: str) -> List[Dict[str, Any]]:
        """
        Parse Excel file containing grant opportunities
        Expected columns: title, sponsor, description, category, geography, 
                         applicant_type, funding_type, amount_min, amount_max, 
                         currency, deadline, eligibility, criteria, application_url, 
                         contact_email, source_system, source_id, status
        """
        df = pd.read_excel(file_path)
        
        # Convert DataFrame to list of dicts
        opportunities = []
        for _, row in df.iterrows():
            opp = {
                'title': str(row.get('title', '')).strip(),
                'sponsor': str(row.get('sponsor', '')).strip() if pd.notna(row.get('sponsor')) else None,
                'description': str(row.get('description', '')).strip() if pd.notna(row.get('description')) else None,
                'category': str(row.get('category', '')).strip() if pd.notna(row.get('category')) else None,
                'geography': str(row.get('geography', '')).strip() if pd.notna(row.get('geography')) else None,
                'applicant_type': str(row.get('applicant_type', '')).strip() if pd.notna(row.get('applicant_type')) else None,
                'funding_type': str(row.get('funding_type', '')).strip() if pd.notna(row.get('funding_type')) else None,
                'amount_min': float(row.get('amount_min')) if pd.notna(row.get('amount_min')) else None,
                'amount_max': float(row.get('amount_max')) if pd.notna(row.get('amount_max')) else None,
                'currency': str(row.get('currency', 'KES')).strip(),
                'deadline': OpportunityImportService._parse_date(row.get('deadline')),
                'eligibility': str(row.get('eligibility', '')).strip() if pd.notna(row.get('eligibility')) else None,
                'criteria': str(row.get('criteria', '')).strip() if pd.notna(row.get('criteria')) else None,
                'application_url': str(row.get('application_url', '')).strip() if pd.notna(row.get('application_url')) else None,
                'contact_email': str(row.get('contact_email', '')).strip() if pd.notna(row.get('contact_email')) else None,
                'source_system': str(row.get('source_system', 'excel_import')).strip(),
                'source_id': str(row.get('source_id', '')).strip() if pd.notna(row.get('source_id')) else None,
                'status': str(row.get('status', 'open')).strip().lower(),
            }
            
            # Skip rows with empty title
            if opp['title']:
                opportunities.append(opp)
        
        return opportunities
    
    @staticmethod
    def _parse_date(date_value: Any) -> Optional[date]:
        """Parse various date formats to date object"""
        if pd.isna(date_value):
            return None
        
        if isinstance(date_value, (datetime, pd.Timestamp)):
            return date_value.date()
        
        if isinstance(date_value, date):
            return date_value
        
        if isinstance(date_value, str):
            try:
                return pd.to_datetime(date_value).date()
            except:
                return None
        
        return None
    
    @staticmethod
    def generate_fingerprint(title: str, sponsor: Optional[str], deadline: Optional[date]) -> str:
        """Generate unique fingerprint for deduplication"""
        components = [
            title.lower().strip(),
            (sponsor or '').lower().strip(),
            str(deadline) if deadline else ''
        ]
        fingerprint_str = '|'.join(components)
        return hashlib.md5(fingerprint_str.encode()).hexdigest()
    
    @staticmethod
    def fuzzy_match(str1: str, str2: str) -> float:
        """Calculate similarity ratio between two strings"""
        return SequenceMatcher(None, str1.lower(), str2.lower()).ratio()
    
    @staticmethod
    async def find_duplicates(
        db: AsyncSession,
        opportunity: Dict[str, Any],
        institution_id: Optional[int] = None
    ) -> List[GrantOpportunity]:
        """
        Find potential duplicate opportunities using:
        1. Exact match on (source_system, source_id)
        2. Fuzzy match on title + sponsor + deadline
        """
        duplicates = []
        
        # Check exact source match
        if opportunity.get('source_system') and opportunity.get('source_id'):
            result = await db.execute(
                select(GrantOpportunity).where(
                    and_(
                        GrantOpportunity.source_system == opportunity['source_system'],
                        GrantOpportunity.source_id == opportunity['source_id']
                    )
                )
            )
            exact_match = result.scalar_one_or_none()
            if exact_match:
                duplicates.append(exact_match)
                return duplicates
        
        # Fuzzy match on title, sponsor, deadline
        query = select(GrantOpportunity)
        if institution_id:
            query = query.where(
                or_(
                    GrantOpportunity.institution_id == institution_id,
                    GrantOpportunity.institution_id.is_(None)
                )
            )
        
        result = await db.execute(query)
        existing_opps = result.scalars().all()
        
        for existing in existing_opps:
            # Calculate similarity
            title_similarity = OpportunityImportService.fuzzy_match(
                opportunity['title'],
                existing.title
            )
            
            sponsor_similarity = 1.0
            if opportunity.get('sponsor') and existing.sponsor:
                sponsor_similarity = OpportunityImportService.fuzzy_match(
                    opportunity['sponsor'],
                    existing.sponsor
                )
            
            deadline_match = (
                opportunity.get('deadline') == existing.deadline
                if opportunity.get('deadline') and existing.deadline
                else True
            )
            
            # Combined score
            combined_score = (title_similarity * 0.6 + sponsor_similarity * 0.4)
            
            if combined_score >= OpportunityImportService.FUZZY_MATCH_THRESHOLD and deadline_match:
                duplicates.append(existing)
        
        return duplicates
    
    @staticmethod
    async def import_opportunities(
        db: AsyncSession,
        opportunities: List[Dict[str, Any]],
        created_by_id: int,
        institution_id: Optional[int] = None,
        skip_duplicates: bool = True,
        update_existing: bool = False
    ) -> Tuple[int, int, List[str]]:
        """
        Import opportunities into database
        
        Returns:
            Tuple of (created_count, skipped_count, errors)
        """
        created_count = 0
        skipped_count = 0
        errors = []
        
        for idx, opp_data in enumerate(opportunities, 1):
            try:
                # Find duplicates
                duplicates = await OpportunityImportService.find_duplicates(
                    db, opp_data, institution_id
                )
                
                if duplicates:
                    if skip_duplicates and not update_existing:
                        skipped_count += 1
                        continue
                    elif update_existing:
                        # Update first duplicate
                        existing = duplicates[0]
                        for key, value in opp_data.items():
                            if value is not None and hasattr(existing, key):
                                setattr(existing, key, value)
                        existing.updated_at = datetime.utcnow()
                        skipped_count += 1
                        continue
                
                # Extract category name before creating opportunity
                category_name = opp_data.pop('category', None)
                
                # Create new opportunity
                new_opp = GrantOpportunity(
                    institution_id=institution_id,
                    created_by_id=created_by_id,
                    **opp_data
                )
                db.add(new_opp)
                await db.flush()  # Flush to get the opportunity ID
                
                # Assign category if provided
                if category_name:
                    # Look up category by name (case-insensitive)
                    cat_result = await db.execute(
                        select(OpportunityCategory).where(
                            OpportunityCategory.name.ilike(category_name.strip())
                        )
                    )
                    category = cat_result.scalar_one_or_none()
                    
                    if category:
                        # Create the relationship
                        opp_cat = OpportunityCategories(
                            opportunity_id=new_opp.id,
                            category_id=category.id
                        )
                        db.add(opp_cat)
                
                created_count += 1
                
            except Exception as e:
                errors.append(f"Row {idx}: {str(e)}")
                continue
        
        await db.commit()
        return created_count, skipped_count, errors

    # ------------------------------------------------------------------
    # Simplified researcher-facing register:
    # OPPORTUNITY ID | Opportunities | Issued by | Deadline of Application | Value | Application Link
    # ------------------------------------------------------------------

    SIMPLE_SOURCE_SYSTEM = "simple_excel_import"

    @staticmethod
    def _parse_flexible_deadline(raw_value: Any) -> Tuple[Optional[date], Optional[str]]:
        """
        Best-effort parser for the free-text "Deadline of Application" column,
        which mixes real datetimes with prose like "Applications reviewed on a
        rolling basis" or "Not Listed". Returns (parsed_date_or_None, raw_text_or_None).
        """
        if raw_value is None or (isinstance(raw_value, float) and pd.isna(raw_value)):
            return None, None
        if pd.isna(raw_value):
            return None, None

        if isinstance(raw_value, (datetime, pd.Timestamp)):
            return raw_value.date(), None
        if isinstance(raw_value, date):
            return raw_value, None

        text = str(raw_value).strip()
        if not text:
            return None, None

        # Normalize narrow/non-breaking spaces some spreadsheet tools insert
        normalized = text.replace(' ', ' ').replace('\xa0', ' ').replace('‎', '').strip()

        # No point attempting to parse prose with no digits at all
        if not re.search(r'\d', normalized):
            return None, normalized

        try:
            with warnings.catch_warnings():
                warnings.simplefilter("ignore")
                parsed = dateutil_parser.parse(normalized, fuzzy=True, default=datetime(2026, 1, 1))
            return parsed.date(), normalized
        except (ValueError, OverflowError):
            return None, normalized

    @staticmethod
    def parse_simple_excel_file(file_path: str) -> List[Dict[str, Any]]:
        """
        Parse the simplified opportunities register (single header row):
        OPPORTUNITY ID, Opportunities, Issued by, Deadline of Application, Value, Application Link
        """
        df = pd.read_excel(file_path)

        required_cols = {'OPPORTUNITY ID', 'Opportunities', 'Issued by', 'Deadline of Application', 'Value', 'Application Link'}
        if not required_cols.issubset(set(df.columns)):
            raise ValueError(
                f"Simple opportunities file is missing expected columns. "
                f"Found: {list(df.columns)}"
            )

        today = date.today()
        opportunities = []
        for _, row in df.iterrows():
            raw_id = row.get('OPPORTUNITY ID')
            title = row.get('Opportunities')
            if pd.isna(raw_id) or pd.isna(title) or not str(title).strip():
                continue

            deadline, deadline_text = OpportunityImportService._parse_flexible_deadline(
                row.get('Deadline of Application')
            )
            opp_status = 'closed' if deadline and deadline < today else 'open'

            value_text = str(row.get('Value')).strip() if pd.notna(row.get('Value')) else None
            if deadline is None:
                note = 'Rolling basis / no fixed deadline'
                description = f"{value_text} • {note}" if value_text else note
            else:
                description = value_text

            opportunities.append({
                'source_id': str(raw_id).strip(),
                'source_system': OpportunityImportService.SIMPLE_SOURCE_SYSTEM,
                'title': str(title).strip(),
                'sponsor': str(row.get('Issued by')).strip() if pd.notna(row.get('Issued by')) else None,
                'description': description,
                'deadline': deadline,
                'application_url': str(row.get('Application Link')).strip() if pd.notna(row.get('Application Link')) else None,
                'status': opp_status,
            })

        return opportunities

    @staticmethod
    async def sync_simple_opportunities(
        db: AsyncSession,
        file_path: str,
    ) -> Tuple[int, int, List[str]]:
        """
        Read the simplified 6-column opportunities workbook and upsert rows into
        grant_opportunities, keyed by (source_system='simple_excel_import', source_id).
        Opportunities from other sources are left untouched.

        Returns (created_count, updated_count, errors).
        """
        parsed = OpportunityImportService.parse_simple_excel_file(file_path)
        if not parsed:
            return 0, 0, []

        creator_result = await db.execute(
            select(User).where(User.is_global_admin == True).order_by(User.created_at).limit(1)
        )
        creator_user = creator_result.scalar_one_or_none()
        if not creator_user:
            fallback_result = await db.execute(select(User).order_by(User.created_at).limit(1))
            creator_user = fallback_result.scalar_one_or_none()
        if not creator_user:
            return 0, 0, ["No users exist to attribute the import to; sync skipped."]

        created_count = 0
        updated_count = 0
        errors: List[str] = []

        for row in parsed:
            try:
                existing_result = await db.execute(
                    select(GrantOpportunity).where(
                        GrantOpportunity.source_system == OpportunityImportService.SIMPLE_SOURCE_SYSTEM,
                        GrantOpportunity.source_id == row['source_id'],
                    )
                )
                opp = existing_result.scalar_one_or_none()

                if opp:
                    opp.title = row['title']
                    opp.sponsor = row['sponsor']
                    opp.description = row['description']
                    opp.deadline = row['deadline']
                    opp.application_url = row['application_url']
                    opp.status = row['status']
                    opp.is_curated = True
                    opp.updated_at = datetime.utcnow()
                    updated_count += 1
                else:
                    db.add(GrantOpportunity(
                        source_system=OpportunityImportService.SIMPLE_SOURCE_SYSTEM,
                        source_id=row['source_id'],
                        title=row['title'],
                        sponsor=row['sponsor'],
                        description=row['description'],
                        deadline=row['deadline'],
                        application_url=row['application_url'],
                        status=row['status'],
                        is_curated=True,
                        created_by_id=creator_user.id,
                    ))
                    created_count += 1
            except Exception as e:
                errors.append(f"{row.get('source_id')}: {e}")

        await db.commit()
        return created_count, updated_count, errors
