# Testing on Real Home Assistant Instance

There are several ways to test this add-on on a real Home Assistant instance.

## Method 1: Local Add-on Repository (Recommended for Quick Testing)

This method installs the add-on directly without needing GitHub.

### Step 1: Prepare the Add-on

```bash
# Build the frontend
cd /Users/romanpinchuk/Developer/conf-edit-ha
make build-frontend
```

### Step 2: Copy to Home Assistant

Copy the add-on folder to your Home Assistant addons directory:

**Option A: If HA runs on the same machine**
```bash
# Find your HA config directory (usually one of these):
# - /usr/share/hassio/addons/local/
# - ~/homeassistant/addons/
# - /config/addons/ (from within HA container)

# Create the addons directory if it doesn't exist
mkdir -p /PATH/TO/HA/addons/local/conf-edit-ha

# Copy files
cp -r . /PATH/TO/HA/addons/local/conf-edit-ha/
```

**Option B: If HA runs on another machine/Raspberry Pi**
```bash
# Using SCP (replace with your HA IP and path)
scp -r . root@192.168.1.100:/addons/local/conf-edit-ha/

# Or using Samba/Network share
# Navigate to \\homeassistant.local\addons\ or \\your-ha-ip\addons\
# Create folder: conf-edit-ha
# Copy all files from conf-edit-ha directory
```

### Step 3: Install in Home Assistant

1. Open Home Assistant web interface
2. Go to **Settings** → **Add-ons**
3. Click **Check for updates** button (bottom right)
4. Scroll down to **Local add-ons** section
5. You should see "Configuration Editor"
6. Click on it and press **Install**

### Step 4: Configure and Start

1. After installation, go to **Configuration** tab
2. Start the add-on
3. Check the **Log** tab for any errors
4. Click **Open Web UI** to access the editor

---

## Method 2: GitHub Repository (Recommended for Sharing/Publishing)

### Step 1: Push to GitHub

```bash
# Build frontend first
make build-frontend

# Commit everything
git add .
git commit -m "Ready for testing"
git push origin main
```

### Step 2: Add Repository to Home Assistant

1. Open Home Assistant
2. Go to **Settings** → **Add-ons**
3. Click **Add-on Store** (bottom right)
4. Click menu (⋮) in top right
5. Select **Repositories**
6. Add your repository URL:
   ```
   https://github.com/yourusername/conf-edit-ha
   ```
7. Click **Add** → **Close**
8. Find "Configuration Editor" in the store
9. Install

---

## Quick Deploy Script

Create `deploy-to-ha.sh`:

```bash
#!/bin/bash
# deploy-to-ha.sh

HA_HOST="homeassistant.local"  # Change to your HA IP
HA_PATH="/addons/local/conf-edit-ha"

echo "Building frontend..."
make build-frontend

echo "Copying to Home Assistant..."
ssh root@$HA_HOST "mkdir -p $HA_PATH"
rsync -av --exclude='node_modules' --exclude='.git' --exclude='frontend/dist' . root@$HA_HOST:$HA_PATH/

echo "✓ Deployed! Go to Settings > Add-ons > Check for updates"
```

Make executable and run:
```bash
chmod +x deploy-to-ha.sh
./deploy-to-ha.sh
```

---

## Troubleshooting

### Add-on doesn't appear
- Ensure files are in `/addons/local/conf-edit-ha/`
- Click "Check for updates" in Add-ons page
- Check `config.yaml` is valid YAML
- Check Supervisor logs

### Build fails
- Verify `static/` folder exists with frontend files
- Check add-on logs for errors
- Ensure frontend was built: `make build-frontend`

### Can't access Web UI
- Check add-on is started
- Look for errors in add-on logs
- Verify ingress configuration

---

## Testing Checklist

- [ ] Add-on appears in Local add-ons
- [ ] Installation completes
- [ ] Add-on starts successfully  
- [ ] Web UI opens
- [ ] File tree displays
- [ ] Files open in editor
- [ ] YAML validation works
- [ ] Entity autocomplete works
- [ ] Files save successfully
- [ ] Backups are created
- [ ] Theme switching works
- [ ] State persists on reload

