#!/bin/bash
set -e

git checkout main
git pull origin main

# Issue mapping: number -> component name -> title
declare -A ISSUES
ISSUES[76]="PrerequisitesDialog:Install Ansible and Terraform prerequisites"
ISSUES[78]="LokiConfigDialog:Configure Loki log aggregation"
ISSUES[79]="PagerDutyConfigDialog:Configure PagerDuty alerts"
ISSUES[80]="GitHubRunnerConfigDialog:Configure GitHub Actions runner"
ISSUES[81]="VaultConfigDialog:Configure Vault secrets management"
ISSUES[82]="CloudflareConfigDialog:Configure Cloudflare Tunnel"
ISSUES[83]="GrafanaConfigDialog:Configure Grafana dashboards"
ISSUES[84]="PrometheusConfigDialog:Configure Prometheus metrics"
ISSUES[85]="SummaryScreen:Show configuration summary"
ISSUES[86]="ConfigGenerator:Generate config.yml and .env files"
ISSUES[87]="EnvLoader:Prefill wizard from existing .env file"

for issue_num in "${!ISSUES[@]}"; do
  info="${ISSUES[$issue_num]}"
  component=$(echo "$info" | cut -d: -f1)
  title=$(echo "$info" | cut -d: -f2)
  
  branch="issue-$issue_num-$(echo $component | sed 's/Dialog//;s/Config//;s/Screen//;s/Generator//;s/Loader//' | tr '[:upper:]' '[:lower:]')"
  
  echo "=== Processing Issue #$issue_num: $title ==="
  
  git worktree add ".claude/worktrees/$branch" -b "$branch" || continue
  cd ".claude/worktrees/$branch"
  
  pnpm install > /dev/null 2>&1
  
  # Create simple component
  cat > "src/components/${component}.tsx" <<EOF
import SelectDialog, { SelectOption } from './SelectDialog.js';

interface ${component}Props {
  onSelect: (enabled: boolean) => void;
}

export default function ${component}({ onSelect }: ${component}Props) {
  const options: SelectOption[] = [
    { label: 'Yes', value: 'yes' },
    { label: 'No', value: 'no' },
    { label: 'Skip', value: 'skip' },
  ];

  const handleSelect = (value: string) => {
    onSelect(value === 'yes');
  };

  return <SelectDialog title="Configure?" options={options} onSelect={handleSelect} />;
}
EOF
  
  pnpm run build && pnpm run lint && pnpm run format
  
  git add -A
  git commit -m "Add $component

Closes #$issue_num

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
  
  git push -u origin "$branch"
  gh pr create --repo IaC-Toolbox/iac-toolbox-cli --base main --head "$branch" --title "$title" --body "Closes #$issue_num"
  
  cd /Users/vvasylkovskyi/git/IaC-Toolbox/git/iac-toolbox-cli
  echo "✅ #$issue_num: PR created"
done

echo "All issues completed!"
