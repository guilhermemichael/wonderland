"""Add RabbitProgress

Revision ID: bd04dd09668f
Revises: 001_initial_m02_schema
Create Date: 2026-09-17 17:17:22.736641+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'bd04dd09668f'
down_revision: Union[str, None] = '001_initial_m02_schema'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'rabbit_progress',
        sa.Column('session_id', sa.Uuid(as_uuid=True), nullable=False),
        sa.Column('has_taken_watch', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('has_followed_trail', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('has_reached_threshold', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['session_id'], ['sessions.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('session_id')
    )

def downgrade() -> None:
    op.drop_table('rabbit_progress')
