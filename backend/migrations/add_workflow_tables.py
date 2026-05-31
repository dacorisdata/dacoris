import asyncio
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sqlalchemy import text
from database import engine


async def add_workflow_tables():
    async with engine.begin() as conn:
        print("Creating workflow tables...")
        
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS workflows (
                id VARCHAR PRIMARY KEY,
                name VARCHAR(200) NOT NULL,
                workflow_type VARCHAR(50) NOT NULL,
                description TEXT,
                status VARCHAR(20) DEFAULT 'active',
                is_default BOOLEAN DEFAULT FALSE,
                created_by_id VARCHAR REFERENCES users(id),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE
            );
        """))
        print("✓ Created workflows table")
        
        await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_workflows_type ON workflows(workflow_type);"))
        
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS workflow_stages (
                id VARCHAR PRIMARY KEY,
                workflow_id VARCHAR NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
                stage_order INTEGER NOT NULL,
                stage_name VARCHAR(200) NOT NULL,
                assigned_role VARCHAR(100) NOT NULL,
                approvals_required INTEGER DEFAULT 1,
                auto_advance BOOLEAN DEFAULT FALSE,
                duration_days INTEGER,
                description TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        """))
        print("✓ Created workflow_stages table")
        
        await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_workflow_stages_workflow ON workflow_stages(workflow_id);"))
        
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS workflow_instances (
                id VARCHAR PRIMARY KEY,
                workflow_id VARCHAR NOT NULL REFERENCES workflows(id),
                entity_type VARCHAR(50) NOT NULL,
                entity_id VARCHAR NOT NULL,
                current_stage_id VARCHAR REFERENCES workflow_stages(id),
                status VARCHAR(20) DEFAULT 'in_progress',
                started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                completed_at TIMESTAMP WITH TIME ZONE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE
            );
        """))
        print("✓ Created workflow_instances table")
        
        await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_workflow_instances_entity ON workflow_instances(entity_id);"))
        await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_workflow_instances_workflow ON workflow_instances(workflow_id);"))
        
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS workflow_stage_history (
                id VARCHAR PRIMARY KEY,
                instance_id VARCHAR NOT NULL REFERENCES workflow_instances(id) ON DELETE CASCADE,
                stage_id VARCHAR NOT NULL REFERENCES workflow_stages(id),
                status VARCHAR(20) DEFAULT 'pending',
                assigned_to_id VARCHAR REFERENCES users(id),
                reviewed_by_id VARCHAR REFERENCES users(id),
                notes TEXT,
                started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                completed_at TIMESTAMP WITH TIME ZONE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        """))
        print("✓ Created workflow_stage_history table")
        
        await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_workflow_stage_history_instance ON workflow_stage_history(instance_id);"))
        
        print("\n✅ All workflow tables created successfully!")


if __name__ == "__main__":
    asyncio.run(add_workflow_tables())
