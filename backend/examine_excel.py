import pandas as pd

df = pd.read_excel('data/opportunities.xlsx', header=2)
print("First 3 rows:")
print(df.head(3))
print("\n" + "="*80)
print("Columns:")
for i, col in enumerate(df.columns):
    print(f"{i}: {col}")
print("\n" + "="*80)
print(f"Total rows: {len(df)}")
