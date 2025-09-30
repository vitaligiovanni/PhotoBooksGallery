# GitHub Actions Deployment Setup

## Required GitHub Secrets

Before deploying, you need to configure the following secrets in your GitHub repository:

### Repository Settings → Secrets and variables → Actions

Add these secrets:

1. **SERVER_HOST** = `82.202.129.237`
   - Your Beget server IP address

2. **SERVER_USER** = `root`
   - SSH username for server access

3. **SERVER_SSH_KEY**
   - Private SSH key for authentication
   - Generate with: `ssh-keygen -t rsa -b 4096 -C "github-deploy@photobooksgallery.am"`
   - Copy the private key content (starts with `-----BEGIN OPENSSH PRIVATE KEY-----`)

4. **SERVER_PORT** = `22` (optional, default is 22)
   - SSH port (usually 22)

## SSH Key Setup on Server

1. Copy the public key to your server:
   ```bash
   # On your local machine
   ssh-copy-id -i ~/.ssh/id_rsa.pub root@82.202.129.237
   ```

2. Or manually add to `/root/.ssh/authorized_keys`:
   ```bash
   # On server
   mkdir -p ~/.ssh
   chmod 700 ~/.ssh
   echo "your_public_key_here" >> ~/.ssh/authorized_keys
   chmod 600 ~/.ssh/authorized_keys
   ```

## Database Setup on Server

Before first deployment, create the PostgreSQL database:

```bash
# Connect to PostgreSQL
sudo -u postgres psql

# Create database and user
CREATE DATABASE photobooksgallery_db;
CREATE USER photobooksgallery_user WITH ENCRYPTED PASSWORD 'P@ssw0rd_2025!';
GRANT ALL PRIVILEGES ON DATABASE photobooksgallery_db TO photobooksgallery_user;
ALTER USER photobooksgallery_user CREATEDB;

# Exit PostgreSQL
\q
```

## Environment Variables

Update `production.env` on server with correct database credentials after setup.

## Deployment Trigger

The deployment will automatically trigger when you push to the `main` branch. You can also manually trigger it from the Actions tab.

## Monitoring Deployment

Check deployment status in:
- GitHub Actions tab
- Server logs: `docker-compose logs -f`
- Application health: `curl https://photobooksgallery.am/api/health`