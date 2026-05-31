# Network Build Error Fix

## Problem
`npm install` fails during Docker build with network connectivity errors:
```
npm error code ECONNRESET
npm error network aborted
```

---

## Solutions (Try in Order)

### **Solution 1: Retry the Build** ⚡ (Quickest)
Sometimes it's just a temporary network issue:

```bash
docker-compose -f docker-compose.dev.yml up --build
```

The updated `Dockerfile.dev` now has retry logic built-in.

---

### **Solution 2: Use Local node_modules** 🚀 (Fastest)

This skips npm install in Docker entirely by using your local `node_modules`.

#### Step 1: Install dependencies locally
```bash
cd frontend
npm install
cd ..
```

#### Step 2: Use the local development compose file
```bash
docker-compose -f docker-compose.dev.local.yml up --build
```

**Pros:**
- ✅ Instant builds (no npm install in Docker)
- ✅ No network issues
- ✅ Faster iteration

**Cons:**
- ⚠️ Must run `npm install` locally first
- ⚠️ Windows/Linux path differences might cause issues

---

### **Solution 3: Configure Docker Network Settings** 🔧

#### Option A: Use Docker Desktop DNS
1. Open **Docker Desktop**
2. Go to **Settings** → **Resources** → **Network**
3. Enable **Use kernel networking for UDP**
4. Restart Docker Desktop

#### Option B: Use Host Network (Linux only)
```bash
docker-compose -f docker-compose.dev.yml build --network=host
```

#### Option C: Configure DNS in Dockerfile
Add to `frontend/Dockerfile.dev` before `RUN npm install`:
```dockerfile
RUN echo "nameserver 8.8.8.8" > /etc/resolv.conf && \
    echo "nameserver 8.8.4.4" >> /etc/resolv.conf
```

---

### **Solution 4: Use npm Cache** 💾

Create a `.npmrc` file in the frontend directory:

```bash
# frontend/.npmrc
registry=https://registry.npmjs.org/
fetch-retries=5
fetch-retry-mintimeout=20000
fetch-retry-maxtimeout=120000
```

Then rebuild:
```bash
docker-compose -f docker-compose.dev.yml up --build
```

---

### **Solution 5: Use Different Registry** 🌐

If npm registry is blocked or slow, use a mirror:

```bash
# In frontend directory
npm config set registry https://registry.npmmirror.com
npm install
```

Or add to `frontend/Dockerfile.dev`:
```dockerfile
RUN npm config set registry https://registry.npmmirror.com && \
    npm install --legacy-peer-deps
```

---

### **Solution 6: Build Without Cache** 🔄

Sometimes Docker cache causes issues:

```bash
docker-compose -f docker-compose.dev.yml build --no-cache
docker-compose -f docker-compose.dev.yml up
```

---

### **Solution 7: Increase Docker Resources** 💪

1. Open **Docker Desktop**
2. Go to **Settings** → **Resources**
3. Increase:
   - **Memory:** 4GB → 8GB
   - **CPUs:** 2 → 4
4. Click **Apply & Restart**

---

## Recommended Approach for Your Setup

Since you're on Windows and experiencing network issues, I recommend:

### **Quick Fix (Right Now):**
```bash
# Try the updated Dockerfile.dev with retry logic
docker-compose -f docker-compose.dev.yml up --build
```

### **Best Long-Term Solution:**
```bash
# Install dependencies locally once
cd frontend
npm install
cd ..

# Use local node_modules (instant builds)
docker-compose -f docker-compose.dev.local.yml up
```

---

## Files Created

1. **`frontend/Dockerfile.dev`** - Updated with retry logic
2. **`frontend/Dockerfile.dev.local`** - No npm install (uses local node_modules)
3. **`docker-compose.dev.local.yml`** - Mounts local node_modules

---

## Quick Commands

### Try Updated Build (with retries):
```bash
docker-compose -f docker-compose.dev.yml up --build
```

### Use Local node_modules:
```bash
cd frontend && npm install && cd ..
docker-compose -f docker-compose.dev.local.yml up --build
```

### Clean Build:
```bash
docker-compose -f docker-compose.dev.yml down
docker-compose -f docker-compose.dev.yml build --no-cache
docker-compose -f docker-compose.dev.yml up
```

---

## Verify Network Connectivity

Test if Docker can reach npm registry:

```bash
docker run --rm node:20-alpine sh -c "npm config set fetch-retries 5 && npm install express"
```

If this fails, it's a Docker network configuration issue.

---

## Still Having Issues?

1. **Check your firewall/antivirus** - May be blocking Docker
2. **Check proxy settings** - If behind corporate proxy
3. **Try mobile hotspot** - Rule out network issues
4. **Use WSL2** - Better Docker performance on Windows

---

## Success Indicators

You'll know it's working when you see:
```
✔ Container dacoris-db        Created
✔ Container dacoris-backend   Created  
✔ Container dacoris-frontend  Created
✔ Container dacoris-nginx     Created
```

Then access: http://localhost or http://192.168.100.90
