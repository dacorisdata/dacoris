"""
Script to automatically update models.py to use UUID primary keys.
This script will rewrite the models.py file with UUID-based IDs.
"""

import re
import sys

def update_models_file(input_file, output_file):
    """Update models.py to use UUID primary keys"""
    
    with open(input_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Pattern 1: Replace Integer primary keys with String + UUID default
    # id = Column(Integer, primary_key=True, index=True)
    # -> id = Column(String, primary_key=True, index=True, default=generate_uuid)
    content = re.sub(
        r'id = Column\(Integer, primary_key=True, index=True\)',
        'id = Column(String, primary_key=True, index=True, default=generate_uuid)',
        content
    )
    
    # Pattern 2: Replace Integer primary keys without index
    # id = Column(Integer, primary_key=True)
    # -> id = Column(String, primary_key=True, default=generate_uuid)
    content = re.sub(
        r'id = Column\(Integer, primary_key=True\)',
        'id = Column(String, primary_key=True, default=generate_uuid)',
        content
    )
    
    # Pattern 3: Replace Integer primary keys with autoincrement
    # id = Column(Integer, primary_key=True, autoincrement=True)
    # -> id = Column(String, primary_key=True, default=generate_uuid)
    content = re.sub(
        r'id = Column\(Integer, primary_key=True, autoincrement=True\)',
        'id = Column(String, primary_key=True, default=generate_uuid)',
        content
    )
    
    # Pattern 4: Replace all foreign key columns from Integer to String
    # This is more complex - need to match various patterns
    
    # _id = Column(Integer, ForeignKey(...))
    content = re.sub(
        r'(\w+_id) = Column\(Integer, ForeignKey\(([^)]+)\)',
        r'\1 = Column(String, ForeignKey(\2)',
        content
    )
    
    # Special case for user_roles table and other junction tables
    # Column('user_id', Integer, ForeignKey(...))
    content = re.sub(
        r"Column\('(\w+_id)', Integer, ForeignKey\(([^)]+)\)",
        r"Column('\1', String, ForeignKey(\2)",
        content
    )
    
    # Pattern 5: Handle related_entity_id in notifications (not a FK but should be String)
    content = re.sub(
        r'related_entity_id = Column\(Integer, nullable=True\)',
        'related_entity_id = Column(String, nullable=True)',
        content
    )
    
    # Write updated content
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"[OK] Updated models written to {output_file}")
    
    # Count changes
    integer_pk_count = len(re.findall(r'Column\(String, primary_key=True.*?default=generate_uuid', content))
    fk_count = len(re.findall(r'_id.*?Column\(String, ForeignKey', content))
    
    print(f"  - Converted {integer_pk_count} primary keys to UUID")
    print(f"  - Converted {fk_count} foreign keys to String")

if __name__ == "__main__":
    input_file = "c:/projects/dacoris/backend/models.py"
    output_file = "c:/projects/dacoris/backend/models.py"
    
    print("="*60)
    print("UPDATING MODELS.PY TO USE UUID PRIMARY KEYS")
    print("="*60)
    
    try:
        update_models_file(input_file, output_file)
        print("\n[SUCCESS] models.py has been updated")
        print("\nNext steps:")
        print("1. Review the changes in models.py")
        print("2. Run: python migrations/convert_to_uuid_pks.py")
        print("3. Restart your backend server")
    except Exception as e:
        print(f"\n[ERROR] {e}")
        sys.exit(1)
