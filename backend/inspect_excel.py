import pandas as pd

# Read Excel with header in row 2 (0-indexed)
df = pd.read_excel('data/opportunities.xlsx', header=2)

print("="*80)
print("COLUMN MAPPING")
print("="*80)
for i, col in enumerate(df.columns):
    print(f"Index {i:2d}: {col}")

print("\n" + "="*80)
print("FIRST DATA ROW (index 0)")
print("="*80)
if len(df) > 0:
    for i, (col, val) in enumerate(zip(df.columns, df.iloc[0])):
        print(f"Index {i:2d} ({col[:40]:40s}): {str(val)[:60]}")

print("\n" + "="*80)
print(f"Total data rows: {len(df)}")
print("="*80)
