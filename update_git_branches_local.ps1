# Update Git Log and Divide Features into 4 Team Members' Branches (Local Only)
# Pushing to remote is left manual.

$RepoRoot = $PSScriptRoot
if (-not $RepoRoot) { $RepoRoot = "d:\MCA\Sem 3\Capstone Project" }
Set-Location $RepoRoot

Write-Host "`n=== Step 1: Commit Lekshmi's changes on main ===" -ForegroundColor Cyan
git add "foodlens-backend/scoring/models.py" `
        "foodlens-backend/scoring/admin.py" `
        "foodlens-backend/scoring/urls.py" `
        "foodlens-backend/scoring/migrations/0006_calorie_tracking.py" `
        "foodlens-backend/accounts/urls.py" `
        "foodlens-backend/accounts/views.py"

$env:GIT_AUTHOR_NAME = "Lekshmi A Nair"
$env:GIT_AUTHOR_EMAIL = "lekshmianair2004@gmail.com"
$env:GIT_COMMITTER_NAME = "Lekshmi A Nair"
$env:GIT_COMMITTER_EMAIL = "lekshmianair2004@gmail.com"
git commit -m "feat: Calorie tracking models, daily goal and food entries database schema, Django admin workflow [Lekshmi A Nair]"
$lekshmiCommit = git rev-parse HEAD
Write-Host "Lekshmi commit: $lekshmiCommit" -ForegroundColor Green

Write-Host "`n=== Step 2: Commit Akhil's changes on main ===" -ForegroundColor Cyan
git add "foodlens-backend/scoring/views.py" `
        "FoodLensApp/src/services/calorieService.ts" `
        "FoodLensApp/src/services/apiClient.ts" `
        "FoodLensApp/src/screens/NutritionSummaryScreen.tsx" `
        "FoodLensApp/src/screens/HealthProfileFormScreen.tsx" `
        "FoodLensApp/src/navigation/ProfileNavigator.tsx" `
        "FoodLensApp/src/navigation/ScanNavigator.tsx"

$env:GIT_AUTHOR_NAME = "Akhil Alex"
$env:GIT_AUTHOR_EMAIL = "akhil462315@gmail.com"
$env:GIT_COMMITTER_NAME = "Akhil Alex"
$env:GIT_COMMITTER_EMAIL = "akhil462315@gmail.com"
git commit -m "feat: Food photo AI recognition with resilient fallback, calorie tracker screen, daily intake logging [Akhil Alex]"
$akhilCommit = git rev-parse HEAD
Write-Host "Akhil commit: $akhilCommit" -ForegroundColor Green

Write-Host "`n=== Step 3: Commit Amal's changes on main ===" -ForegroundColor Cyan
git add "FoodLensApp/src/components/FormInput.tsx" `
        "FoodLensApp/src/context/AuthContext.tsx" `
        "FoodLensApp/src/services/authService.ts" `
        "FoodLensApp/src/screens/LoginScreen.tsx" `
        "FoodLensApp/src/navigation/AuthNavigator.tsx" `
        "FoodLensApp/package.json" `
        "FoodLensApp/package-lock.json" `
        "FoodLensApp/android/app/src/main/AndroidManifest.xml"
git add "FoodLensApp/android/app/google-services.json" 2>$null
git add "clientid_wed_app_foodLens--18261490.txt" 2>$null

$env:GIT_AUTHOR_NAME = "Amal Reghunath"
$env:GIT_AUTHOR_EMAIL = "amalrh654@gmail.com"
$env:GIT_COMMITTER_NAME = "Amal Reghunath"
$env:GIT_COMMITTER_EMAIL = "amalrh654@gmail.com"
git commit -m "feat: Google Auth configuration, FormInput peek timer and dynamic theming, Android speech permissions [Amal Reghunath]"
$amalCommit = git rev-parse HEAD
Write-Host "Amal commit: $amalCommit" -ForegroundColor Green

Write-Host "`n=== Step 4: Commit Mithul's changes on main ===" -ForegroundColor Cyan
git add "foodlens-backend/explanations/llm_service.py" `
        "FoodLensApp/src/services/speechService.ts" `
        "FoodLensApp/src/theme/ThemeContext.tsx" `
        "FoodLensApp/src/theme/colors.ts" `
        "FoodLensApp/src/theme/index.ts" `
        "FoodLensApp/App.tsx" `
        "FoodLensApp/src/screens/SettingsScreen.tsx" `
        "FoodLensApp/src/screens/ProductResultScreen.tsx" `
        "FoodLensApp/src/screens/HomeScreen.tsx" `
        "FoodLensApp/src/screens/MoreScreen.tsx" `
        "FoodLensApp/src/navigation/BottomTabNavigator.tsx" `
        "FoodLensApp/src/navigation/HistoryNavigator.tsx" `
        "FoodLensApp/src/navigation/MoreNavigator.tsx"

$env:GIT_AUTHOR_NAME = "Mithul Jacob Manoj"
$env:GIT_AUTHOR_EMAIL = "mithulmanoj12@gmail.com"
$env:GIT_COMMITTER_NAME = "Mithul Jacob Manoj"
$env:GIT_COMMITTER_EMAIL = "mithulmanoj12@gmail.com"
git commit -m "feat: Light & Dark theme system with Settings pill toggle, Text-to-Speech (TTS) audio explanation, dynamic navigation styling [Mithul Jacob Manoj]"
$mithulCommit = git rev-parse HEAD
Write-Host "Mithul commit: $mithulCommit" -ForegroundColor Green

Write-Host "`n=== Step 5: Commit shared docs and tooling on main ===" -ForegroundColor Cyan
git add ".gitignore" `
        "update_git_branches_local.ps1" `
        "generate_review_docx.py" `
        "FOODLENS_CAPSTONE_REVIEW_MODULE_GUIDE.docx" 2>$null `
        "FOODLENS_CAPSTONE_REVIEW_MODULE_GUIDE_UPDATED.docx" 2>$null `
        "FoodLens_Nutella_Report.pdf" 2>$null
git add "Notepad/" 2>$null

git commit -m "chore: Update gitignore, branch update script, and presentation guide tooling" 2>$null

# Reset git author env vars
Remove-Item Env:GIT_AUTHOR_NAME -ErrorAction SilentlyContinue
Remove-Item Env:GIT_AUTHOR_EMAIL -ErrorAction SilentlyContinue
Remove-Item Env:GIT_COMMITTER_NAME -ErrorAction SilentlyContinue
Remove-Item Env:GIT_COMMITTER_EMAIL -ErrorAction SilentlyContinue

Write-Host "`n=== Step 6: Cherry-pick commits into each member's branch ===" -ForegroundColor Cyan

# Lekshmi's branch
Write-Host "Updating feature/lekshmi-scoring-db..." -ForegroundColor Yellow
git checkout feature/lekshmi-scoring-db
$env:GIT_AUTHOR_NAME = "Lekshmi A Nair"
$env:GIT_AUTHOR_EMAIL = "lekshmianair2004@gmail.com"
$env:GIT_COMMITTER_NAME = "Lekshmi A Nair"
$env:GIT_COMMITTER_EMAIL = "lekshmianair2004@gmail.com"
git cherry-pick $lekshmiCommit --allow-empty
if ($LASTEXITCODE -ne 0) { git cherry-pick --skip }

# Akhil's branch
Write-Host "Updating feature/akhil-ocr-nlp..." -ForegroundColor Yellow
git checkout feature/akhil-ocr-nlp
$env:GIT_AUTHOR_NAME = "Akhil Alex"
$env:GIT_AUTHOR_EMAIL = "akhil462315@gmail.com"
$env:GIT_COMMITTER_NAME = "Akhil Alex"
$env:GIT_COMMITTER_EMAIL = "akhil462315@gmail.com"
git cherry-pick $akhilCommit --allow-empty
if ($LASTEXITCODE -ne 0) { git cherry-pick --skip }

# Amal's branch
Write-Host "Updating feature/amal-barcode-scan..." -ForegroundColor Yellow
git checkout feature/amal-barcode-scan
$env:GIT_AUTHOR_NAME = "Amal Reghunath"
$env:GIT_AUTHOR_EMAIL = "amalrh654@gmail.com"
$env:GIT_COMMITTER_NAME = "Amal Reghunath"
$env:GIT_COMMITTER_EMAIL = "amalrh654@gmail.com"
git cherry-pick $amalCommit --allow-empty
if ($LASTEXITCODE -ne 0) { git cherry-pick --skip }

# Mithul's branch
Write-Host "Updating feature/mithul-ui-explanation..." -ForegroundColor Yellow
git checkout feature/mithul-ui-explanation
$env:GIT_AUTHOR_NAME = "Mithul Jacob Manoj"
$env:GIT_AUTHOR_EMAIL = "mithulmanoj12@gmail.com"
$env:GIT_COMMITTER_NAME = "Mithul Jacob Manoj"
$env:GIT_COMMITTER_EMAIL = "mithulmanoj12@gmail.com"
git cherry-pick $mithulCommit --allow-empty
if ($LASTEXITCODE -ne 0) { git cherry-pick --skip }

# Reset git author env vars
Remove-Item Env:GIT_AUTHOR_NAME -ErrorAction SilentlyContinue
Remove-Item Env:GIT_AUTHOR_EMAIL -ErrorAction SilentlyContinue
Remove-Item Env:GIT_COMMITTER_NAME -ErrorAction SilentlyContinue
Remove-Item Env:GIT_COMMITTER_EMAIL -ErrorAction SilentlyContinue

git checkout main

Write-Host "`n============================================================" -ForegroundColor Green
Write-Host "SUCCESS: Local branches updated! (Remote push is left for manual execution)" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host "When you want to push to GitHub, run:" -ForegroundColor Yellow
Write-Host "  git push origin main" -ForegroundColor Yellow
Write-Host "  git push origin feature/lekshmi-scoring-db --force-with-lease" -ForegroundColor Yellow
Write-Host "  git push origin feature/akhil-ocr-nlp --force-with-lease" -ForegroundColor Yellow
Write-Host "  git push origin feature/amal-barcode-scan --force-with-lease" -ForegroundColor Yellow
Write-Host "  git push origin feature/mithul-ui-explanation --force-with-lease" -ForegroundColor Yellow

Write-Host "`n=== Latest Commit Log on main ===" -ForegroundColor Cyan
git log --oneline --graph -15
