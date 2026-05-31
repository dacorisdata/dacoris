# ORCID Integration Setup

## Current Configuration

- **ORCID Client ID**: `APP-S0GZISHBG32PK5HU`
- **ORCID Client Secret**: `542b22f8-8f65-44a3-a0bd-e5043cc64bbd`
- **Redirect URI**: `http://192.168.0.103/api/auth/orcid/callback`
- **Mode**: Production (ORCID_SANDBOX_MODE=false)

## Important: ORCID Application Settings

You **MUST** register the redirect URI in your ORCID application settings:

1. Go to https://orcid.org/developer-tools
2. Sign in with your ORCID account
3. Find your application with Client ID: `APP-S0GZISHBG32PK5HU`
4. Add the following redirect URI (must match exactly):
   ```
   http://192.168.0.103/api/auth/orcid/callback
   ```

**CRITICAL**: The redirect URI in your ORCID application settings MUST match the `ORCID_REDIRECT_URI` environment variable in your docker-compose file. If you see an error like "redirect_uri does not match for registered client", it means the URI is not registered in your ORCID application.

## Common Issues

### Issue: Redirect URI Mismatch
**Symptom**: Being redirected to wrong URL after ORCID authentication
**Solution**: 
1. Ensure the redirect URI in ORCID application settings matches exactly
2. Rebuild the frontend container after changing ORCID_CLIENT_ID:
   ```bash
   docker-compose up --build -d frontend
   ```

### Issue: Different Client IDs
**Symptom**: Frontend and backend using different ORCID client IDs
**Solution**: Ensure both use the same client ID in docker-compose.yml:
- Backend: `ORCID_CLIENT_ID`
- Frontend: `NEXT_PUBLIC_ORCID_CLIENT_ID`

## Testing

After updating configuration:
1. Rebuild containers: `docker-compose up --build -d`
2. Clear browser cache
3. Try registering a researcher account
4. You should be redirected to ORCID, then back to your application

## Network Access

If accessing from different devices on your network:
- Update `FRONTEND_URL` and `ORCID_REDIRECT_URI` to use your machine's IP
- Current IP: `192.168.0.103`
- Add all possible redirect URIs to your ORCID application settings
