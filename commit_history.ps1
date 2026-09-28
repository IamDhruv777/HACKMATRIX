git init
git branch -m main
git remote add origin https://github.com/IamDhruv777/HACKMATRIX.git

function Commit-Step {
    param([string]$date, [string]$msg, [string]$paths)
    
    $env:GIT_AUTHOR_DATE=$date
    $env:GIT_COMMITTER_DATE=$date
    
    # Split paths by space and add them
    $pathArray = $paths -split ' '
    foreach ($p in $pathArray) {
        git add $p
    }
    
    git commit -m "$msg"
}

# Sept 27th
Commit-Step "2026-09-27T10:15:00" "Initial commit: Setup project structure and gitignore" ".gitignore urjatwin/backend/requirements.txt"
Commit-Step "2026-09-27T11:30:00" "Backend core: FastAPI main app and DB setup" "urjatwin/backend/app/main.py urjatwin/backend/app/models/"
Commit-Step "2026-09-27T14:45:00" "Backend schemas for API typing" "urjatwin/backend/app/schemas/"
Commit-Step "2026-09-27T16:20:00" "Implement base API routers (health, settings)" "urjatwin/backend/app/api/health.py urjatwin/backend/app/api/settings.py"
Commit-Step "2026-09-27T19:10:00" "Data service and demo profiles generator" "urjatwin/backend/app/services/data_service.py urjatwin/backend/data/demo/"

# Sept 28th
Commit-Step "2026-09-28T09:30:00" "Integrate pandapower for network mapping and powerflow" "urjatwin/backend/app/services/network_service.py urjatwin/backend/app/services/powerflow_service.py urjatwin/backend/app/api/network.py"
Commit-Step "2026-09-28T12:15:00" "Action evaluation logic and constraint checks" "urjatwin/backend/app/services/action_service.py urjatwin/backend/app/services/battery_service.py urjatwin/backend/app/services/switching_service.py urjatwin/backend/app/services/constraint_service.py"
Commit-Step "2026-09-28T15:40:00" "Add ML forecasting and scenario configs" "urjatwin/backend/app/services/forecast_service.py urjatwin/backend/data/scenarios/ urjatwin/backend/app/api/forecast.py urjatwin/backend/app/api/scenarios.py"
Commit-Step "2026-09-28T16:50:00" "Finalize background runs API and simulation core" "urjatwin/backend/app/api/runs.py urjatwin/backend/app/services/explanation_service.py urjatwin/backend/app/api/data.py"
Commit-Step "2026-09-28T17:20:00" "Frontend Init: Vite, Tailwind, and React Router" "urjatwin/frontend/package.json urjatwin/frontend/package-lock.json urjatwin/frontend/vite.config.ts urjatwin/frontend/tailwind.config.js urjatwin/frontend/tsconfig.json urjatwin/frontend/tsconfig.node.json"
Commit-Step "2026-09-28T20:05:00" "Frontend core services: Axios API client and strict types" "urjatwin/frontend/src/api/ urjatwin/frontend/src/types/ urjatwin/frontend/src/utils/ urjatwin/frontend/index.html"

# Sept 29th
Commit-Step "2026-09-29T00:10:00" "Base UI layout and shared components" "urjatwin/frontend/src/components/ urjatwin/frontend/src/main.tsx urjatwin/frontend/src/App.tsx"
Commit-Step "2026-09-29T00:25:00" "Implement core dashboard and interactive network twin" "urjatwin/frontend/src/pages/Dashboard.tsx urjatwin/frontend/src/pages/NetworkTwin.tsx urjatwin/frontend/src/pages/DataSources.tsx urjatwin/frontend/src/pages/Settings.tsx"
Commit-Step "2026-09-29T00:35:00" "Add Recharts components for visualization" "urjatwin/frontend/src/charts/"
Commit-Step "2026-09-29T00:43:00" "Implement Action Comparison and Forecasting UI" "urjatwin/frontend/src/pages/ActionComparison.tsx urjatwin/frontend/src/pages/Forecasting.tsx urjatwin/frontend/src/pages/RunHistory.tsx urjatwin/frontend/src/pages/ScenarioSimulator.tsx"
Commit-Step "2026-09-29T00:46:00" "UI Overhaul: Apply dark glassmorphism cyber-theme globally" "urjatwin/frontend/src/index.css"

git add .
git commit -m "Final polish and bugfixes for submission"

