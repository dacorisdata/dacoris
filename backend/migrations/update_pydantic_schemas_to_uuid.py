"""
Script to automatically update all Pydantic schemas to use str for ID fields.
This updates all id: int to id: str and *_id: int to *_id: str
"""

import re
import os
from pathlib import Path

def update_file(file_path):
    """Update a single Python file to use str for ID fields"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    changes = []
    
    # Pattern 1: id: int -> id: str
    pattern1 = r'\bid:\s*int\b'
    if re.search(pattern1, content):
        content = re.sub(pattern1, 'id: str', content)
        changes.append("id: int -> id: str")
    
    # Pattern 2: *_id: int -> *_id: str (foreign keys)
    pattern2 = r'\b(\w+_id):\s*int\b'
    matches = re.findall(pattern2, content)
    if matches:
        content = re.sub(pattern2, r'\1: str', content)
        changes.append(f"*_id: int -> *_id: str ({len(matches)} occurrences)")
    
    # Pattern 3: Optional[int] for IDs -> Optional[str]
    pattern3 = r'\b(\w*_id):\s*Optional\[int\]'
    matches3 = re.findall(pattern3, content)
    if matches3:
        content = re.sub(pattern3, r'\1: Optional[str]', content)
        changes.append(f"*_id: Optional[int] -> Optional[str] ({len(matches3)} occurrences)")
    
    # Pattern 4: id: Optional[int] -> id: Optional[str]
    pattern4 = r'\bid:\s*Optional\[int\]'
    if re.search(pattern4, content):
        content = re.sub(pattern4, 'id: Optional[str]', content)
        changes.append("id: Optional[int] -> Optional[str]")
    
    # Only write if changes were made
    if content != original_content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        return changes
    return None

def main():
    print("="*60)
    print("UPDATING PYDANTIC SCHEMAS TO USE UUID (str)")
    print("="*60)
    
    backend_dir = Path(__file__).parent.parent
    routes_dir = backend_dir / "routes"
    
    # Find all Python files in routes directory
    python_files = list(routes_dir.rglob("*.py"))
    
    # Also check main.py
    python_files.append(backend_dir / "main.py")
    
    updated_files = []
    
    for file_path in python_files:
        if file_path.name.startswith('__'):
            continue
        
        changes = update_file(file_path)
        if changes:
            rel_path = file_path.relative_to(backend_dir)
            updated_files.append((rel_path, changes))
            print(f"\n[OK] Updated: {rel_path}")
            for change in changes:
                print(f"     - {change}")
    
    print("\n" + "="*60)
    if updated_files:
        print(f"[SUCCESS] Updated {len(updated_files)} files")
        print("\nUpdated files:")
        for rel_path, _ in updated_files:
            print(f"  - {rel_path}")
    else:
        print("[INFO] No files needed updating")
    print("="*60)

if __name__ == "__main__":
    main()
