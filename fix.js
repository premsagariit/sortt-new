const fs = require('fs');
let content = fs.readFileSync('.github/workflows/main_sortt-backend.yml', 'utf8');

content = content.replace(
    "pnpm run test --if-present",
    "pnpm run test --if-present\n          pnpm deploy --filter backend --prod --force-legacy-deploy deploy_folder"
);

content = content.replace(
    "path: .",
    "path: deploy_folder"
);

fs.writeFileSync('.github/workflows/main_sortt-backend.yml', content);
