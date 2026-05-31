# Category Management - Quick Guide

## 🚀 Quick Start

### First Time Setup
```bash
# 1. Navigate to Global Admin → Categories page
# 2. Click "Actions" → "Seed from Excel"
# 3. Confirm to create categories from opportunities.xlsx
```

---

## 📋 Common Tasks

### Create Categories from Excel
1. **Actions** → **Seed from Excel**
2. Confirm the action
3. View results (created vs skipped)

### Export Categories
1. **Actions** → **Export to CSV**
2. File downloads automatically
3. Edit in Excel/Google Sheets

### Import Categories
1. **Actions** → **Import from CSV**
2. Select your CSV file
3. Review import results
4. Check for duplicates and errors

### Create Single Category
1. Click **Create Category** button
2. Fill in:
   - Name (required)
   - Slug (auto-generated)
   - Description
   - Color
   - Icon (optional)
3. Click **Create**

---

## 📄 CSV Template

```csv
id,name,slug,description,color,icon,is_active
,Health,health,Healthcare opportunities,#3B82F6,health,true
,Agriculture,agriculture,Agricultural funding,#10B981,agriculture,true
```

**Tips:**
- Leave `id` empty for new categories
- Include `id` to update existing categories
- `slug` auto-generates if empty
- Default color is `#3B82F6` (blue)

---

## ⚠️ Duplicate Detection

### What Gets Detected:
- ✅ Duplicate names (case-insensitive)
- ✅ Duplicate slugs (case-insensitive)

### What Happens:
- Duplicates are **skipped**
- Shown in import results dialog
- No data is overwritten

### To Update Instead:
- Include the `id` column
- Use the ID from export

---

## 🎨 Color Palette

Auto-assigned colors when seeding:
- `#3B82F6` - Blue
- `#10B981` - Green
- `#F59E0B` - Amber
- `#EF4444` - Red
- `#8B5CF6` - Purple
- `#EC4899` - Pink
- `#14B8A6` - Teal
- `#F97316` - Orange
- `#6366F1` - Indigo
- `#84CC16` - Lime

---

## 🔧 Troubleshooting

### "No category column found"
**Fix:** Excel file must have a column named `category`

### "Duplicate detected"
**Fix:** Remove duplicate row OR include `id` to update

### "Name is required"
**Fix:** Ensure all CSV rows have a `name` value

### Categories not showing
**Fix:** Refresh the page or check browser console

---

## 💡 Pro Tips

1. **Always export before importing** - Keeps a backup
2. **Use Excel formulas** - Generate slugs, colors in bulk
3. **Test with small CSV first** - Verify format works
4. **Check import results** - Review duplicates and errors
5. **Keep ID column** - Makes updates easier

---

## 📊 Import Results Explained

### Created (Green)
New categories added to database

### Updated (Blue)
Existing categories modified (by ID)

### Skipped (Yellow)
Duplicates detected and ignored

### Errors (Red)
Invalid data that couldn't be processed

---

## 🎯 Best Practices

1. **Seed once** - Use Excel seeding for initial setup
2. **Export regularly** - Keep CSV backups
3. **Batch updates** - Use CSV for multiple changes
4. **Descriptive names** - Clear, concise category names
5. **Consistent slugs** - Use lowercase, hyphens only

---

## 📞 Need Help?

Check the full documentation: `CATEGORY_MANAGEMENT_FEATURES.md`
