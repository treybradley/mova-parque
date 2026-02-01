# Deploy Mova Parque to GitHub (step-by-step)

SSH is set up and your first commit is done. Do these in order.

---

## Step 1: Add your SSH key to GitHub

1. **Copy this whole line** (your public key):

   ```
   ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIPm3M3Ye0VSQrf2IFkNmncdii67qscbd1XabEhm6Sm+M github
   ```

2. Open **https://github.com/settings/keys** in your browser (or: GitHub → your profile pic → **Settings** → **SSH and GPG keys** in the left sidebar).

3. Click **"New SSH key"**.

4. **Title:** type something like `Mac Mova Parque` (so you know which machine it is).

5. **Key type:** leave **Authentication Key**.

6. **Key:** paste the line you copied in step 1.

7. Click **"Add SSH key"**. Confirm if GitHub asks.

Done. Your Mac can now talk to GitHub over SSH.

---

## Step 2: Create the repo on GitHub

1. Go to **https://github.com/new**.

2. **Repository name:** `mova-parque` (or whatever you want; no spaces).

3. **Description:** optional (e.g. "Mova Parque app").

4. **Public** is fine unless you want it private.

5. **Do NOT check** "Add a README", "Add .gitignore", or "Choose a license". You already have code.

6. Click **"Create repository"**.

GitHub will show a page with setup commands. You’ll use the **SSH** URL in the next step.

---

## Step 3: Connect your project and push

Open Terminal and run these from your project folder (e.g. `cd ~/Desktop/Mova_Parque`).

**Replace `YOUR_USERNAME` with your actual GitHub username** (the one in your profile URL).

```bash
git remote add origin git@github.com:YOUR_USERNAME/mova-parque.git
git branch -M main
git push -u origin main
```

- If the repo name isn’t `mova-parque`, use that name in the URL instead.
- First push might ask "Are you sure you want to continue connecting?" — type **yes** and Enter.

After that, your code is on GitHub. You can refresh the repo page and see all your files.

---

## Step 4: Later — push updates

Whenever you want to save your work to GitHub:

```bash
git add .
git commit -m "Short description of what you did"
git push
```

That’s it. No passwords, no tokens — SSH handles it.

---

## If something goes wrong

- **"Permission denied (publickey)"**  
  GitHub doesn’t recognize your key. Double-check you added the **public** key (`id_ed25519.pub`) in Step 1, and that you’re using the **SSH** URL (`git@github.com:...`), not the HTTPS one.

- **"remote origin already exists"**  
  You already added a remote. Use:  
  `git remote set-url origin git@github.com:YOUR_USERNAME/mova-parque.git`  
  then `git push -u origin main` again.

- **Wrong repo name or username in the URL**  
  Fix it with:  
  `git remote set-url origin git@github.com:CORRECT_USERNAME/CORRECT_REPO.git`
