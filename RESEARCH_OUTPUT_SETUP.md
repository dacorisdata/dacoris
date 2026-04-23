# Research Output Portal Setup

## Overview
The Research Output Portal (`http://localhost:3000/research-output`) is now populated with mock scholarly works data following FAIR principles (Findable, Accessible, Interoperable, Reusable).

## What Was Seeded

### 10 Scholarly Works covering:
- **Agricultural Biotechnology** - CRISPR-Cas9 Gene Editing in African Crops
- **Public Health** - Machine Learning for Malaria Prediction
- **Renewable Energy** - Solar/Wind Integration in Sub-Saharan Africa
- **Climate Science** - Water Resources in Lake Victoria Basin
- **Health Informatics** - AI in African Healthcare
- **Digital Governance** - Blockchain Land Registry in Kenya
- **Development Economics** - Microfinance & Women's Empowerment
- **Financial Economics** - Mobile Money (M-Pesa) Impact Study
- **Ethnopharmacology** - Traditional Medicine Integration
- **Urban Planning** - Smart City Framework for Nairobi

### Data Includes:
- **31 Authors** with ORCID IDs and affiliations
- **29 Institution Affiliations** (Universities, Research Institutes, Government)
- **20 Funding Records** from organizations like:
  - Bill & Melinda Gates Foundation
  - Wellcome Trust
  - World Bank
  - European Research Council
  - African Development Bank
  - National Science Foundation
  - And more...

### Statistics:
- **Total Citations**: 1,357
- **Open Access Rate**: 70%
- **Publication Years**: 2023-2024
- **Topics**: 10 unique research areas

## How to Re-seed Data

If you need to reset or re-populate the data:

### Option 1: Using Python Script (Recommended)
```bash
cd backend
python seed_scholarly_works.py
```

### Option 2: Using API Endpoint
```bash
# PowerShell
Invoke-WebRequest -Uri "http://localhost:8000/api/public/works/seed-mock-data" -Method POST

# Or use the "Seed Mock Data" button in the UI when the page shows an error
```

## Features of the Portal

### Hero Section
- Purple gradient banner with FAIR principles badges
- Decorative floating circles for visual appeal

### Stats Band
- 6-column grid showing key metrics:
  - Total Works
  - Authors
  - Citations
  - Institutions
  - Funders
  - Open Access Percentage

### Tabbed Interface
1. **Works Tab** - Browse all publications with:
   - Search by title, abstract, or keywords
   - Filter by topic
   - Filter by access type (Open/Closed)
   - Purple-accented cards with hover effects
   - Citation counts, institutions, funders
   - "View Details" and DOI links

2. **Authors Tab** - Author profiles with:
   - Avatar initials
   - ORCID identifiers
   - Institutional affiliations
   - Publication counts

3. **Institutions Tab** - Research organizations with:
   - Country information
   - Publication counts
   - Hover effects

4. **Funders Tab** - Funding bodies with:
   - Grant counts
   - Total funding amounts
   - Country of origin

## Design Features

- **Responsive Grid Layouts** - CSS Grid (not deprecated MUI Grid)
- **Purple Accent Color** (#8b5cf6) throughout
- **Dark Mode Support** - Full theme integration
- **Hover Animations** - Lift effects and colored glows
- **Professional Typography** - Proper MUI variants
- **FAIR Compliance** - Following open science principles

## API Endpoints

All endpoints are public (no authentication required):

- `GET /api/public/works/stats` - Get statistics
- `GET /api/public/works` - List works (with filters)
- `GET /api/public/works/{id}` - Get single work
- `GET /api/public/works/topics/list` - List all topics
- `GET /api/public/works/authors/list` - List authors
- `GET /api/public/works/institutions/list` - List institutions
- `GET /api/public/works/funders/list` - List funders
- `POST /api/public/works/seed-mock-data` - Seed database

## Next Steps

You can now:
1. Browse the research output portal at `http://localhost:3000/research-output`
2. Click on individual works to see detailed views
3. Filter and search through the publications
4. Explore authors, institutions, and funders
5. View DOI links to external publications

The portal is fully functional and demonstrates a modern, professional research information system interface!
