import sys
sys.path.insert(0, '/app')
from services.opportunity_import import OpportunityImportService

opps = OpportunityImportService.parse_dacoris_excel_file('/app/data/opportunities.xlsx')
print(f'✓ Found {len(opps)} opportunities\n')

if opps:
    print('First 3 opportunities:')
    for i, opp in enumerate(opps[:3], 1):
        print(f'{i}. {opp["title"]}')
        print(f'   Sponsor: {opp["sponsor"]}')
        print(f'   Amount: {opp["currency"]} {opp["amount_min"]:,.0f} - {opp["amount_max"]:,.0f}' if opp["amount_min"] else f'   Amount: Not specified')
        print(f'   Deadline: {opp["deadline"]}')
        print(f'   Status: {opp["status"]}')
        print()
