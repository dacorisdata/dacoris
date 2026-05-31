# Global Admin Setup

When you run `docker-compose up --build` for the first time, the system will check if a global admin account exists. If not, you have two options to create one:

## Option 1: Interactive Mode (Recommended for local development)

Run docker-compose with interactive terminal:

```bash
docker-compose up --build
```

When prompted, you'll be asked to enter:
- **Name** (default: "Global Admin")
- **Email** (required)
- **Password** (minimum 8 characters, required)
- **Confirm Password**

The system will create the admin account and start the application.

## Option 2: Environment Variables (Recommended for production/automated deployment)

Edit `docker-compose.yml` and uncomment the admin environment variables:

```yaml
environment:
  # ... other environment variables ...
  # Admin account creation (set these to auto-create admin on first run)
  - ADMIN_NAME=Global Admin
  - ADMIN_EMAIL=admin@ascensiondynamics.com
  - ADMIN_PASSWORD=YourSecurePassword123!
```

Then run:

```bash
docker-compose up --build
```

The admin account will be created automatically without prompts.

## Logging In

After the admin account is created, you can log in at:
- URL: `http://localhost/login`
- Email: The email you provided
- Password: The password you set

## Notes

- The admin account is only created if no global admin exists in the database
- If you run `docker-compose up` again, it will detect the existing admin and skip creation
- The admin account has full access to all system features
- For security, use a strong password (minimum 8 characters)

## Troubleshooting

If the container exits immediately with an error about missing admin credentials:
1. Make sure you're running in interactive mode OR
2. Set the ADMIN_EMAIL and ADMIN_PASSWORD environment variables in docker-compose.yml
