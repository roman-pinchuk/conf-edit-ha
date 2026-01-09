# GitHub Repository Setup Guide

Follow these steps to publish your add-on to GitHub and test it in Home Assistant.

## Prerequisites

- GitHub account
- Git installed locally
- Frontend already built (`make build-frontend`)

## Step 1: Prepare Repository

Ensure the `static/` folder exists with built frontend files:

```bash
# Build frontend if not already done
cd frontend
npm install
npm run build
cd ..

# Verify static folder exists
ls -la static/
```

## Step 2: Initialize Git (if not already done)

```bash
# Check if git is initialized
git status

# If not initialized:
git init
git branch -M main
```

## Step 3: Update repository.yaml

Edit `repository.yaml` and update with your details:

```yaml
name: Configuration Editor Repository
url: https://github.com/YOUR_USERNAME/conf-edit-ha
maintainer: Your Name <your.email@example.com>
```

## Step 4: Commit All Files

```bash
# Add all files
git add .

# Commit
git commit -m "Initial commit: Configuration Editor add-on"
```

## Step 5: Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: `conf-edit-ha` (or your preferred name)
3. Description: "Lightweight YAML configuration editor for Home Assistant"
4. Make it **Public** (required for HA to access)
5. **DO NOT** initialize with README, .gitignore, or license
6. Click **Create repository**

## Step 6: Push to GitHub

```bash
# Add remote (replace YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/conf-edit-ha.git

# Push
git push -u origin main
```

## Step 7: Verify Repository

Visit your repository on GitHub and verify:
- ✅ `config.yaml` exists
- ✅ `build.yaml` exists  
- ✅ `Dockerfile` exists
- ✅ `static/` folder exists with files inside
- ✅ `app.py` exists
- ✅ `requirements.txt` exists

## Step 8: Add Repository to Home Assistant

### In Home Assistant:

1. Go to **Settings** → **Add-ons**
2. Click **Add-on Store** (bottom right corner)
3. Click the **⋮** menu (top right corner)
4. Select **Repositories**
5. In the text field, enter your repository URL:
   ```
   https://github.com/YOUR_USERNAME/conf-edit-ha
   ```
6. Click **Add**
7. Click **Close**

### Wait for Refresh

- Home Assistant will fetch your repository (may take 30-60 seconds)
- Refresh the page if needed

### Install the Add-on

1. Scroll through the add-on store
2. Find "Configuration Editor" 
3. Click on it
4. Click **Install**
5. Wait for installation to complete
6. Click **Start**
7. Click **Open Web UI**

## Step 9: Check Logs

If something goes wrong:

1. Go to the add-on page
2. Click **Log** tab
3. Look for error messages

Common issues:
- Missing `static/` folder → Build frontend first
- Invalid `config.yaml` → Check YAML syntax
- Build errors → Check Docker logs

## Updating the Add-on

When you make changes:

```bash
# Build frontend
make build-frontend

# Commit changes
git add .
git commit -m "Update: description of changes"
git push

# In Home Assistant:
# Settings > Add-ons > Your Add-on > Rebuild
```

Or force Home Assistant to fetch updates:
1. Uninstall the add-on
2. Remove the repository
3. Re-add the repository
4. Install again

## Troubleshooting

### Repository not appearing

- Verify repository is **Public**
- Check URL is correct
- Wait 1-2 minutes and refresh
- Check Supervisor logs: **Settings** → **System** → **Logs**

### Add-on not in store

- Verify `config.yaml`, `build.yaml`, and `Dockerfile` exist in root
- Check YAML files are valid
- Ensure repository URL was added correctly

### Build fails

- Check add-on logs
- Verify `static/` folder was pushed to GitHub
- Ensure all Python dependencies are in `requirements.txt`

### Can't access Web UI

- Check add-on started successfully
- Look for errors in logs
- Verify `ingress: true` in `config.yaml`

## Quick Commands Reference

```bash
# Build and commit
make build-frontend
git add .
git commit -m "Your message"
git push

# Check what will be committed
git status

# View commit history
git log --oneline

# See what changed
git diff
```

## Next Steps

Once testing is successful:

1. Create release: `git tag -a v1.0.0 -m "Release v1.0.0" && git push --tags`
2. Add screenshots to README
3. Consider submitting to Home Assistant Community Add-ons
