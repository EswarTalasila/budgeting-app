import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.middleware.auth import get_current_user
from app.models import Goal
from app.schemas import GoalCreate, GoalUpdate, GoalOut

router = APIRouter()


@router.get("", response_model=list[GoalOut])
async def list_goals(
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user),
):
    result = await db.execute(
        select(Goal).where(Goal.user_id == user_id).order_by(Goal.created_at.desc())
    )
    return result.scalars().all()


@router.post("", response_model=GoalOut, status_code=status.HTTP_201_CREATED)
async def create_goal(
    body: GoalCreate,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user),
):
    if body.target_amount <= 0:
        raise HTTPException(status_code=400, detail="Target amount must be positive")
    if body.current_amount < 0:
        raise HTTPException(status_code=400, detail="Current amount cannot be negative")

    goal = Goal(
        user_id=user_id,
        name=body.name,
        target_amount=body.target_amount,
        current_amount=body.current_amount,
        target_date=body.target_date,
        note=body.note,
    )
    db.add(goal)
    await db.commit()
    await db.refresh(goal)
    return goal


@router.patch("/{goal_id}", response_model=GoalOut)
async def update_goal(
    goal_id: uuid.UUID,
    body: GoalUpdate,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user),
):
    result = await db.execute(
        select(Goal).where(Goal.id == goal_id, Goal.user_id == user_id)
    )
    goal = result.scalar_one_or_none()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    if body.name is not None:
        goal.name = body.name
    if body.target_amount is not None:
        if body.target_amount <= 0:
            raise HTTPException(status_code=400, detail="Target amount must be positive")
        goal.target_amount = body.target_amount
    if body.current_amount is not None:
        if body.current_amount < 0:
            raise HTTPException(status_code=400, detail="Current amount cannot be negative")
        goal.current_amount = body.current_amount
    if body.target_date is not None:
        goal.target_date = body.target_date
    if body.note is not None:
        goal.note = body.note

    await db.commit()
    await db.refresh(goal)
    return goal


@router.delete("/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_goal(
    goal_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user),
):
    result = await db.execute(
        select(Goal).where(Goal.id == goal_id, Goal.user_id == user_id)
    )
    goal = result.scalar_one_or_none()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    await db.delete(goal)
    await db.commit()
