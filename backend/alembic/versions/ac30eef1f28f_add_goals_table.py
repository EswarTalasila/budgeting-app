"""add_goals_table

Revision ID: ac30eef1f28f
Revises: edcbe7a3d4fa
Create Date: 2026-05-23 19:23:03.722224

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'ac30eef1f28f'
down_revision: Union[str, None] = 'edcbe7a3d4fa'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'goals',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('target_amount', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('current_amount', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('target_date', sa.Date(), nullable=True),
        sa.Column('note', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )


def downgrade() -> None:
    op.drop_table('goals')
