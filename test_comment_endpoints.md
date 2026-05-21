# Test Comment Endpoints

## Quick Test Guide

### 1. Access the Editor

Navigate to: `https://rims.dacoris.com/researcher/manuscripts/{manuscript_id}/editor`

Replace `{manuscript_id}` with an actual manuscript ID from your database.

### 2. Test Comment Creation

1. **Select some text** in the editor
2. **Click the comment button** (💬) in the toolbar
3. The comment form should appear
4. **Type a comment** and click "Comment"
5. The comment should appear in the right sidebar

### 3. Test Comment Features

**Reply to a comment:**
- Click "Reply" on any comment
- Type your reply and click "Reply"
- The reply should appear indented under the parent comment

**Resolve a comment:**
- Click "Resolve" on any comment
- The comment should turn gray
- Click "Reopen" to unresolve

**Filter comments:**
- Click "All", "Open", or "Resolved" tabs
- Comments should filter accordingly

**Delete a comment:**
- Click the delete icon (🗑️) on your own comment
- Confirm deletion
- Comment should disappear

### 4. API Test (Using curl or Postman)

**Get comments for a manuscript:**
```bash
curl -X GET "http://localhost/api/manuscripts/{manuscript_id}/comments" \
  -H "Authorization: Bearer {your_token}"
```

**Create a comment:**
```bash
curl -X POST "http://localhost/api/manuscripts/{manuscript_id}/comments" \
  -H "Authorization: Bearer {your_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "This is a test comment",
    "quoted_text": "Selected text here",
    "selection_start": 100,
    "selection_end": 120
  }'
```

**Resolve a comment:**
```bash
curl -X POST "http://localhost/api/manuscripts/{manuscript_id}/comments/{comment_id}/resolve" \
  -H "Authorization: Bearer {your_token}"
```

### 5. Check Database

Verify data is being stored:

```bash
docker exec dacoris-backend python -c "
from database import engine
import asyncio
from sqlalchemy import text

async def check():
    async with engine.begin() as conn:
        result = await conn.execute(text('SELECT COUNT(*) FROM manuscript_comments'))
        count = result.scalar()
        print(f'Total comments in database: {count}')
        
        result = await conn.execute(text('SELECT id, content, is_resolved FROM manuscript_comments LIMIT 5'))
        print('\\nRecent comments:')
        for row in result:
            status = '✅ Resolved' if row[2] else '⏳ Open'
            print(f'  - {row[0][:8]}... {status}')
            print(f'    {row[1][:50]}...')

asyncio.run(check())
"
```

### Expected Results

✅ Comment button appears in toolbar when text is selected  
✅ Comment form appears when button is clicked  
✅ Comments are saved to database  
✅ Comments appear in sidebar  
✅ Replies work correctly  
✅ Resolve/unresolve works  
✅ Filtering works  
✅ Delete works for own comments  
✅ Comment highlights appear in editor  
✅ Clicking comment in sidebar scrolls to text  

### Troubleshooting

**Comment button doesn't appear:**
- Make sure text is selected
- Check browser console for errors
- Verify frontend files were copied correctly

**Comments don't save:**
- Check backend logs: `docker logs dacoris-backend --tail 50`
- Verify migration ran successfully
- Check database connection

**Sidebar doesn't show comments:**
- Check browser console for API errors
- Verify authentication token is valid
- Check network tab for failed requests

**Highlights don't appear:**
- Verify CSS file was updated
- Clear browser cache
- Check if Comment extension is loaded in editor

### Success Indicators

When everything is working:
1. Yellow highlights appear on commented text
2. Sidebar shows all comments
3. Filter buttons work
4. Reply functionality works
5. Resolve/unresolve changes comment appearance
6. Database contains comment records

---

**System Status:** ✅ Ready for Testing  
**Last Updated:** May 21, 2026
