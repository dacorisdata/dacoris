"""Training programme sub-modules and learning materials."""
import os

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload
from typing import Optional, List
from pydantic import BaseModel

from database import get_db
from models import (
    User, TrainingProgram, TrainingProgramStatus,
    TrainingModule, TrainingMaterial, TrainingEnrollment, TrainingEnrollmentStatus,
)
from auth import get_current_user
from services.file_upload import save_upload, get_file_path, UPLOAD_DIR
from routes.training.training import _is_training_admin, _require_institution

router = APIRouter(prefix="/api/training", tags=["training-content"])

TRAINING_UPLOAD_SUBFOLDER = "training"


class ModuleCreate(BaseModel):
    title: str
    description: Optional[str] = None
    sort_order: int = 0


class ModuleUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    sort_order: Optional[int] = None


def _serialize_material(m: TrainingMaterial) -> dict:
    return {
        "id": m.id,
        "program_id": m.program_id,
        "module_id": m.module_id,
        "title": m.title,
        "original_filename": m.original_filename,
        "file_size_bytes": m.file_size_bytes,
        "mime_type": m.mime_type,
        "uploaded_by_name": m.uploaded_by.name if m.uploaded_by else None,
        "created_at": m.created_at,
    }


def _serialize_module(
    mod: TrainingModule,
    include_materials: bool = True,
    material_count: Optional[int] = None,
) -> dict:
    materials = mod.materials if include_materials else []
    count = material_count if material_count is not None else len(materials or [])
    data = {
        "id": mod.id,
        "program_id": mod.program_id,
        "title": mod.title,
        "description": mod.description,
        "sort_order": mod.sort_order or 0,
        "created_at": mod.created_at,
        "material_count": count,
    }
    if include_materials:
        data["materials"] = [_serialize_material(m) for m in (materials or [])]
    return data


async def _get_program(db: AsyncSession, program_id: str, inst_id: str) -> TrainingProgram:
    result = await db.execute(
        select(TrainingProgram).where(
            and_(TrainingProgram.id == program_id, TrainingProgram.institution_id == inst_id)
        )
    )
    prog = result.scalar_one_or_none()
    if not prog:
        raise HTTPException(status_code=404, detail="Program not found")
    return prog


async def _user_can_access_materials(
    db: AsyncSession, user: User, program: TrainingProgram,
) -> tuple[bool, bool]:
    """Returns (can_view, can_download)."""
    is_admin = _is_training_admin(user)
    if is_admin:
        return True, True
    if program.status != TrainingProgramStatus.PUBLISHED:
        return False, False
    enroll = await db.execute(
        select(TrainingEnrollment).where(
            and_(
                TrainingEnrollment.program_id == program.id,
                TrainingEnrollment.user_id == user.id,
                TrainingEnrollment.status.in_([
                    TrainingEnrollmentStatus.ACTIVE,
                    TrainingEnrollmentStatus.COMPLETED,
                ]),
            )
        )
    )
    enrolled = enroll.scalar_one_or_none() is not None
    return enrolled or program.status == TrainingProgramStatus.PUBLISHED, enrolled


@router.get("/programs/{program_id}/content")
async def get_program_content(
    program_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    inst_id = _require_institution(current_user)
    prog = await _get_program(db, program_id, inst_id)
    can_view, can_download = await _user_can_access_materials(db, current_user, prog)
    if not can_view:
        raise HTTPException(status_code=403, detail="Not authorized to view programme content")

    result = await db.execute(
        select(TrainingModule)
        .options(
            selectinload(TrainingModule.materials).selectinload(TrainingMaterial.uploaded_by),
        )
        .where(TrainingModule.program_id == program_id)
        .order_by(TrainingModule.sort_order, TrainingModule.created_at)
    )
    modules = result.scalars().all()

    prog_materials = await db.execute(
        select(TrainingMaterial)
        .options(selectinload(TrainingMaterial.uploaded_by))
        .where(
            and_(TrainingMaterial.program_id == program_id, TrainingMaterial.module_id.is_(None))
        )
        .order_by(TrainingMaterial.created_at.desc())
    )
    program_materials = prog_materials.scalars().all()

    return {
        "program_id": program_id,
        "program_title": prog.title,
        "can_download": can_download,
        "modules": [_serialize_module(m) for m in modules],
        "program_materials": [_serialize_material(m) for m in program_materials],
    }


@router.post("/programs/{program_id}/modules")
async def create_module(
    program_id: str,
    body: ModuleCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not _is_training_admin(current_user):
        raise HTTPException(status_code=403, detail="Training admin access required")
    inst_id = _require_institution(current_user)
    await _get_program(db, program_id, inst_id)

    mod = TrainingModule(
        program_id=program_id,
        title=body.title.strip(),
        description=body.description,
        sort_order=body.sort_order,
    )
    db.add(mod)
    await db.commit()
    await db.refresh(mod)
    return _serialize_module(mod, include_materials=False, material_count=0)


@router.put("/modules/{module_id}")
async def update_module(
    module_id: str,
    body: ModuleUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not _is_training_admin(current_user):
        raise HTTPException(status_code=403, detail="Training admin access required")
    inst_id = _require_institution(current_user)

    result = await db.execute(
        select(TrainingModule)
        .options(selectinload(TrainingModule.program))
        .where(TrainingModule.id == module_id)
    )
    mod = result.scalar_one_or_none()
    if not mod or mod.program.institution_id != inst_id:
        raise HTTPException(status_code=404, detail="Module not found")

    for key, val in body.model_dump(exclude_unset=True).items():
        if key == "title" and val:
            setattr(mod, key, val.strip())
        else:
            setattr(mod, key, val)
    await db.commit()
    await db.refresh(mod)
    return _serialize_module(mod, include_materials=False, material_count=0)


@router.delete("/modules/{module_id}")
async def delete_module(
    module_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not _is_training_admin(current_user):
        raise HTTPException(status_code=403, detail="Training admin access required")
    inst_id = _require_institution(current_user)

    result = await db.execute(
        select(TrainingModule)
        .options(
            selectinload(TrainingModule.program),
            selectinload(TrainingModule.materials),
        )
        .where(TrainingModule.id == module_id)
    )
    mod = result.scalar_one_or_none()
    if not mod or mod.program.institution_id != inst_id:
        raise HTTPException(status_code=404, detail="Module not found")

    for mat in mod.materials or []:
        path = get_file_path(mat.stored_filename, TRAINING_UPLOAD_SUBFOLDER)
        if os.path.exists(path):
            try:
                os.remove(path)
            except OSError:
                pass
    await db.delete(mod)
    await db.commit()
    return {"ok": True}


@router.post("/programs/{program_id}/materials")
async def upload_program_material(
    program_id: str,
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    module_id: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not _is_training_admin(current_user):
        raise HTTPException(status_code=403, detail="Training admin access required")
    inst_id = _require_institution(current_user)
    prog = await _get_program(db, program_id, inst_id)

    if module_id:
        mod_result = await db.execute(
            select(TrainingModule).where(
                and_(TrainingModule.id == module_id, TrainingModule.program_id == program_id)
            )
        )
        if not mod_result.scalar_one_or_none():
            raise HTTPException(status_code=404, detail="Module not found")

    file_info = await save_upload(file, subfolder=TRAINING_UPLOAD_SUBFOLDER)
    material = TrainingMaterial(
        program_id=prog.id,
        module_id=module_id or None,
        title=title.strip() if title else file_info["original_filename"],
        original_filename=file_info["original_filename"],
        stored_filename=file_info["stored_filename"],
        file_size_bytes=file_info["file_size_bytes"],
        mime_type=file_info["mime_type"],
        uploaded_by_id=current_user.id,
    )
    db.add(material)
    await db.commit()
    await db.refresh(material)
    material.uploaded_by = current_user
    return _serialize_material(material)


@router.post("/programs/{program_id}/materials/batch")
async def upload_program_materials_batch(
    program_id: str,
    files: List[UploadFile] = File(...),
    module_id: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not _is_training_admin(current_user):
        raise HTTPException(status_code=403, detail="Training admin access required")
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")
    inst_id = _require_institution(current_user)
    prog = await _get_program(db, program_id, inst_id)

    if module_id:
        mod_result = await db.execute(
            select(TrainingModule).where(
                and_(TrainingModule.id == module_id, TrainingModule.program_id == program_id)
            )
        )
        if not mod_result.scalar_one_or_none():
            raise HTTPException(status_code=404, detail="Module not found")

    uploaded = []
    for file in files:
        file_info = await save_upload(file, subfolder=TRAINING_UPLOAD_SUBFOLDER)
        material = TrainingMaterial(
            program_id=prog.id,
            module_id=module_id or None,
            title=file_info["original_filename"],
            original_filename=file_info["original_filename"],
            stored_filename=file_info["stored_filename"],
            file_size_bytes=file_info["file_size_bytes"],
            mime_type=file_info["mime_type"],
            uploaded_by_id=current_user.id,
        )
        db.add(material)
        uploaded.append(material)

    await db.commit()
    for material in uploaded:
        await db.refresh(material)
        material.uploaded_by = current_user

    return {
        "uploaded_count": len(uploaded),
        "materials": [_serialize_material(m) for m in uploaded],
    }


@router.delete("/materials/{material_id}")
async def delete_material(
    material_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not _is_training_admin(current_user):
        raise HTTPException(status_code=403, detail="Training admin access required")
    inst_id = _require_institution(current_user)

    result = await db.execute(
        select(TrainingMaterial)
        .options(selectinload(TrainingMaterial.program))
        .where(TrainingMaterial.id == material_id)
    )
    mat = result.scalar_one_or_none()
    if not mat or mat.program.institution_id != inst_id:
        raise HTTPException(status_code=404, detail="Material not found")

    path = get_file_path(mat.stored_filename, TRAINING_UPLOAD_SUBFOLDER)
    if os.path.exists(path):
        try:
            os.remove(path)
        except OSError:
            pass
    await db.delete(mat)
    await db.commit()
    return {"ok": True}


async def _material_file_response(
    material_id: str,
    current_user: User,
    db: AsyncSession,
    *,
    inline_only: bool = True,
) -> FileResponse:
    inst_id = _require_institution(current_user)
    result = await db.execute(
        select(TrainingMaterial)
        .options(selectinload(TrainingMaterial.program))
        .where(TrainingMaterial.id == material_id)
    )
    mat = result.scalar_one_or_none()
    if not mat or mat.program.institution_id != inst_id:
        raise HTTPException(status_code=404, detail="Material not found")

    _, can_access = await _user_can_access_materials(db, current_user, mat.program)
    if not can_access:
        raise HTTPException(status_code=403, detail="Enroll in this programme to view materials")

    path = os.path.join(UPLOAD_DIR, TRAINING_UPLOAD_SUBFOLDER, mat.stored_filename)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="File not found on disk")

    media_type = mat.mime_type or "application/octet-stream"
    disposition = "inline" if inline_only else "attachment"
    return FileResponse(
        path=path,
        media_type=media_type,
        filename=mat.original_filename,
        content_disposition_type=disposition,
        headers={"Content-Disposition": f'{disposition}; filename="{mat.original_filename}"'},
    )


@router.get("/materials/{material_id}/preview")
async def preview_material(
    material_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await _material_file_response(material_id, current_user, db, inline_only=True)


@router.get("/materials/{material_id}/download")
async def download_material(
    material_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Deprecated — returns inline preview; use /preview instead."""
    return await _material_file_response(material_id, current_user, db, inline_only=True)
