from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from sqlalchemy.orm import selectinload
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

from database import get_db
from models import (
    Workflow, WorkflowStage, WorkflowInstance, WorkflowStageHistory,
    WorkflowType, WorkflowStatus, WorkflowInstanceStatus, StageHistoryStatus,
    User, PrimaryAccountType
)
from auth import require_roles, ResearchRole, get_current_user

router = APIRouter(prefix="/api/workflows", tags=["workflows"])


class WorkflowStageCreate(BaseModel):
    stage_order: int
    stage_name: str
    assigned_role: str
    approvals_required: int = 1
    auto_advance: bool = False
    duration_days: Optional[int] = None
    description: Optional[str] = None


class WorkflowCreate(BaseModel):
    name: str
    workflow_type: str
    description: Optional[str] = None
    status: str = "active"
    is_default: bool = False
    stages: List[WorkflowStageCreate]


class WorkflowUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    is_default: Optional[bool] = None
    stages: Optional[List[WorkflowStageCreate]] = None


@router.get("")
async def list_workflows(
    workflow_type: Optional[str] = None,
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(Workflow).options(
        selectinload(Workflow.stages),
        selectinload(Workflow.created_by)
    )
    
    if workflow_type:
        query = query.where(Workflow.workflow_type == workflow_type)
    
    if status:
        query = query.where(Workflow.status == status)
    
    query = query.order_by(Workflow.created_at.desc())
    
    result = await db.execute(query)
    workflows = result.scalars().all()
    
    return [
        {
            "id": w.id,
            "name": w.name,
            "type": w.workflow_type.value if hasattr(w.workflow_type, 'value') else w.workflow_type,
            "description": w.description,
            "status": w.status.value if hasattr(w.status, 'value') else w.status,
            "is_default": w.is_default,
            "created_at": w.created_at,
            "updated_at": w.updated_at,
            "created_by_name": w.created_by.name if w.created_by else None,
            "stages": [
                {
                    "id": s.id,
                    "name": s.stage_name,
                    "order": s.stage_order,
                    "role": s.assigned_role,
                    "approvalRequired": s.approvals_required,
                    "autoAdvance": s.auto_advance,
                    "durationDays": s.duration_days,
                    "description": s.description,
                }
                for s in sorted(w.stages, key=lambda x: x.stage_order)
            ]
        }
        for w in workflows
    ]


@router.get("/{workflow_id}")
async def get_workflow(
    workflow_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Workflow)
        .options(
            selectinload(Workflow.stages),
            selectinload(Workflow.created_by)
        )
        .where(Workflow.id == workflow_id)
    )
    workflow = result.scalar_one_or_none()
    
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    return {
        "id": workflow.id,
        "name": workflow.name,
        "type": workflow.workflow_type.value if hasattr(workflow.workflow_type, 'value') else workflow.workflow_type,
        "description": workflow.description,
        "status": workflow.status.value if hasattr(workflow.status, 'value') else workflow.status,
        "is_default": workflow.is_default,
        "created_at": workflow.created_at,
        "updated_at": workflow.updated_at,
        "created_by_name": workflow.created_by.name if workflow.created_by else None,
        "stages": [
            {
                "id": s.id,
                "name": s.stage_name,
                "order": s.stage_order,
                "role": s.assigned_role,
                "approvalRequired": s.approvals_required,
                "autoAdvance": s.auto_advance,
                "durationDays": s.duration_days,
                "description": s.description,
            }
            for s in sorted(workflow.stages, key=lambda x: x.stage_order)
        ]
    }


@router.post("")
async def create_workflow(
    data: WorkflowCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    is_admin = current_user.is_institution_admin or current_user.is_global_admin
    if not is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    workflow = Workflow(
        name=data.name,
        workflow_type=WorkflowType(data.workflow_type),
        description=data.description,
        status=WorkflowStatus(data.status),
        is_default=data.is_default,
        created_by_id=current_user.id,
    )
    
    db.add(workflow)
    await db.flush()
    
    for stage_data in data.stages:
        stage = WorkflowStage(
            workflow_id=workflow.id,
            stage_order=stage_data.stage_order,
            stage_name=stage_data.stage_name,
            assigned_role=stage_data.assigned_role,
            approvals_required=stage_data.approvals_required,
            auto_advance=stage_data.auto_advance,
            duration_days=stage_data.duration_days,
            description=stage_data.description,
        )
        db.add(stage)
    
    await db.commit()
    await db.refresh(workflow)
    
    result = await db.execute(
        select(Workflow)
        .options(selectinload(Workflow.stages))
        .where(Workflow.id == workflow.id)
    )
    workflow = result.scalar_one()
    
    return {
        "id": workflow.id,
        "name": workflow.name,
        "type": workflow.workflow_type.value,
        "status": workflow.status.value,
        "stages": [
            {
                "id": s.id,
                "name": s.stage_name,
                "order": s.stage_order,
                "role": s.assigned_role,
                "approvalRequired": s.approvals_required,
            }
            for s in sorted(workflow.stages, key=lambda x: x.stage_order)
        ]
    }


@router.put("/{workflow_id}")
async def update_workflow(
    workflow_id: str,
    data: WorkflowUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    is_admin = current_user.is_institution_admin or current_user.is_global_admin
    if not is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.execute(
        select(Workflow)
        .options(selectinload(Workflow.stages))
        .where(Workflow.id == workflow_id)
    )
    workflow = result.scalar_one_or_none()
    
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    if data.name is not None:
        workflow.name = data.name
    if data.description is not None:
        workflow.description = data.description
    if data.status is not None:
        workflow.status = WorkflowStatus(data.status)
    if data.is_default is not None:
        workflow.is_default = data.is_default
    
    if data.stages is not None:
        for stage in workflow.stages:
            await db.delete(stage)
        
        for stage_data in data.stages:
            stage = WorkflowStage(
                workflow_id=workflow.id,
                stage_order=stage_data.stage_order,
                stage_name=stage_data.stage_name,
                assigned_role=stage_data.assigned_role,
                approvals_required=stage_data.approvals_required,
                auto_advance=stage_data.auto_advance,
                duration_days=stage_data.duration_days,
                description=stage_data.description,
            )
            db.add(stage)
    
    await db.commit()
    await db.refresh(workflow)
    
    result = await db.execute(
        select(Workflow)
        .options(selectinload(Workflow.stages))
        .where(Workflow.id == workflow.id)
    )
    workflow = result.scalar_one()
    
    return {
        "id": workflow.id,
        "name": workflow.name,
        "type": workflow.workflow_type.value,
        "status": workflow.status.value,
        "stages": [
            {
                "id": s.id,
                "name": s.stage_name,
                "order": s.stage_order,
                "role": s.assigned_role,
                "approvalRequired": s.approvals_required,
            }
            for s in sorted(workflow.stages, key=lambda x: x.stage_order)
        ]
    }


@router.delete("/{workflow_id}")
async def delete_workflow(
    workflow_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    is_admin = current_user.is_institution_admin or current_user.is_global_admin
    if not is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.execute(
        select(Workflow).where(Workflow.id == workflow_id)
    )
    workflow = result.scalar_one_or_none()
    
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    await db.delete(workflow)
    await db.commit()
    
    return {"message": "Workflow deleted successfully"}


@router.post("/{workflow_id}/toggle-status")
async def toggle_workflow_status(
    workflow_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    is_admin = current_user.is_institution_admin or current_user.is_global_admin
    if not is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.execute(
        select(Workflow).where(Workflow.id == workflow_id)
    )
    workflow = result.scalar_one_or_none()
    
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    if workflow.status == WorkflowStatus.ACTIVE:
        workflow.status = WorkflowStatus.INACTIVE
    else:
        workflow.status = WorkflowStatus.ACTIVE
    
    await db.commit()
    
    return {
        "id": workflow.id,
        "status": workflow.status.value
    }
