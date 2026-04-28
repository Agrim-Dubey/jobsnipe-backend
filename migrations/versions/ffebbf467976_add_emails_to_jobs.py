"""add_emails_to_jobs

Revision ID: ffebbf467976
Revises: 7034f02530c6
Create Date: 2026-04-28 03:08:21.897319

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ffebbf467976'
down_revision: Union[str, Sequence[str], None] = '7034f02530c6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('jobs', sa.Column('emails', sa.JSON(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('jobs', 'emails')
