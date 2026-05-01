import { Box, Text } from 'ink';
import { useState, useEffect, useCallback } from 'react';
import os from 'os';
import DeviceProfileDialog from './components/DeviceProfileDialog.js';
import type { DeviceProfile } from './components/DeviceProfileDialog.js';
import { PROFILE_DEFAULTS } from './components/DeviceProfileDialog.js';
import ObservabilityRemoteDialog from './components/ObservabilityRemoteDialog.js';
import type { ObservabilityRemoteConfig } from './components/ObservabilityRemoteDialog.js';
import DeviceTypeDialog from './components/DeviceTypeDialog.js';
import ConnectionDialog from './components/ConnectionDialog.js';
import DirectoryDialog from './components/DirectoryDialog.js';
import DownloadDialog from './components/DownloadDialog.js';
import IntegrationSelectDialog from './components/IntegrationSelectDialog.js';
import GitHubBuildWorkflowDialog from './components/GitHubBuildWorkflowDialog.js';
import type { GitHubBuildWorkflowConfig } from './components/GitHubBuildWorkflowDialog.js';
import CloudflareConfigDialog from './components/CloudflareConfigDialog.js';
import type { CloudflareConfig } from './components/CloudflareConfigDialog.js';
import VaultConfigDialog from './components/VaultConfigDialog.js';
import type { VaultConfig } from './components/VaultConfigDialog.js';
import GrafanaConfigDialog from './components/GrafanaConfigDialog.js';
import type { GrafanaConfig } from './components/GrafanaConfigDialog.js';
import WizardSummaryDialog from './components/WizardSummaryDialog.js';
import InstallPromptDialog from './components/InstallPromptDialog.js';
import BecomePasswordDialog from './components/BecomePasswordDialog.js';
import InstallRunnerDialog from './components/InstallRunnerDialog.js';
import InstallCompleteDialog from './components/InstallCompleteDialog.js';
import ManualRunDialog from './components/ManualRunDialog.js';
import { writeIacToolboxYaml } from './utils/iacToolboxConfig.js';
import { saveCredentials } from './utils/credentials.js';
import type { InstallResult } from './utils/installRunner.js';

interface AppProps {
  profile?: string;
}

interface ConnectionConfig {
  username: string;
  hostname?: string;
  sshKey?: string;
}

export default function App({ profile = 'default' }: AppProps) {
  // Step 0: Device profile
  const [deviceProfile, setDeviceProfile] = useState<DeviceProfile | null>(
    null
  );
  const [observabilityRemote, setObservabilityRemote] = useState<
    ObservabilityRemoteConfig | null | undefined
  >(undefined);

  // Steps 1-3: Device type, connection, directory, download (unchanged)
  const [deviceType, setDeviceType] = useState<string | null>(null);
  const [connection, setConnection] = useState<ConnectionConfig | null>(null);
  const [directory, setDirectory] = useState<string | null>(null);
  const [downloaded, setDownloaded] = useState(false);

  // Step 4: Integration selection (new)
  const [selectedIntegrations, setSelectedIntegrations] = useState<
    string[] | null
  >(null);

  // Step 5: Per-module configuration (new)
  const [githubBuildWorkflowConfig, setGithubBuildWorkflowConfig] =
    useState<GitHubBuildWorkflowConfig | null>(null);
  const [cloudflareConfig, setCloudflareConfig] =
    useState<CloudflareConfig | null>(null);
  const [vaultConfig, setVaultConfig] = useState<VaultConfig | null>(null);
  const [grafanaConfig, setGrafanaConfig] = useState<GrafanaConfig | null>(
    null
  );
  const [moduleConfigComplete, setModuleConfigComplete] = useState(false);

  // Step 6: Summary + write
  const [summaryAction, setSummaryAction] = useState<
    'confirm' | 'cancel' | null
  >(null);
  const [filesWritten, setFilesWritten] = useState(false);
  const [writtenConfigPath, setWrittenConfigPath] = useState<string | null>(
    null
  );

  // Step 7: Install prompt + execution
  const [installChoice, setInstallChoice] = useState<boolean | null>(null);
  const [becomePassword, setBecomePassword] = useState<string | null>(null);
  const [installRunning, setInstallRunning] = useState(false);
  const [installResult, setInstallResult] = useState<InstallResult | null>(
    null
  );

  // Stable callback for install completion (must be at top level for hooks rules)
  const handleInstallComplete = useCallback((result: InstallResult) => {
    setInstallRunning(false);
    setInstallResult(result);
  }, []);

  // Mark module config complete when all selected integrations are configured
  useEffect(() => {
    if (selectedIntegrations === null) return;

    const needsGithubBuild = selectedIntegrations.includes(
      'github_build_workflow'
    );
    const needsCloudflare = selectedIntegrations.includes('cloudflare');
    const needsVault = selectedIntegrations.includes('vault');
    const needsGrafana = selectedIntegrations.includes('grafana');

    if (needsGithubBuild && githubBuildWorkflowConfig === null) return;
    if (needsCloudflare && cloudflareConfig === null) return;
    if (needsVault && vaultConfig === null) return;
    if (needsGrafana && grafanaConfig === null) return;

    // All selected modules are configured
    setModuleConfigComplete(true);
  }, [
    selectedIntegrations,
    githubBuildWorkflowConfig,
    cloudflareConfig,
    vaultConfig,
    grafanaConfig,
  ]);

  // Write files on confirm
  useEffect(() => {
    if (summaryAction !== 'confirm') return;
    if (filesWritten) return;
    if (!directory || !selectedIntegrations) return;

    const writeFiles = async () => {
      try {
        // Write iac-toolbox.yml
        const configPath = await writeIacToolboxYaml(directory, {
          selectedIntegrations,
          deviceProfile: deviceProfile ?? undefined,
          githubBuildWorkflow: githubBuildWorkflowConfig ?? undefined,
          cloudflare: cloudflareConfig ?? undefined,
          vault: vaultConfig ?? undefined,
          grafana: grafanaConfig ?? undefined,
          observabilityRemote: observabilityRemote,
        });
        setWrittenConfigPath(configPath);

        // Write credentials
        const creds: Record<string, string> = {};
        if (githubBuildWorkflowConfig) {
          creds.docker_hub_username =
            githubBuildWorkflowConfig.dockerHubUsername;
          creds.docker_hub_token = githubBuildWorkflowConfig.dockerHubToken;
        }
        if (cloudflareConfig) {
          creds.cloudflare_api_token = cloudflareConfig.token;
        }
        if (grafanaConfig) {
          creds.grafana_admin_password = grafanaConfig.adminPassword;
        }
        if (Object.keys(creds).length > 0) {
          saveCredentials(creds, profile);
        }

        setFilesWritten(true);
      } catch (error) {
        console.error('Failed to write files:', error);
      }
    };

    writeFiles();
  }, [
    summaryAction,
    filesWritten,
    directory,
    selectedIntegrations,
    deviceProfile,
    githubBuildWorkflowConfig,
    cloudflareConfig,
    vaultConfig,
    grafanaConfig,
    observabilityRemote,
    profile,
  ]);

  // 0. Device profile selection
  if (!deviceProfile) {
    return <DeviceProfileDialog onSelect={setDeviceProfile} />;
  }

  // 1. Device type selection
  if (!deviceType) {
    return <DeviceTypeDialog onSelect={setDeviceType} />;
  }

  // 2. Connection details (remote only)
  if (!connection) {
    // For local mode, auto-populate connection with current username
    if (deviceType === 'local') {
      setConnection({ username: os.userInfo().username });
      // Return empty fragment to trigger re-render with connection set
      return <></>;
    }

    // For remote mode, show connection dialog
    return <ConnectionDialog mode="remote" onComplete={setConnection} />;
  }

  // 3. Scripts destination directory
  if (!directory) {
    return (
      <DirectoryDialog
        onSelect={(dir, useExisting) => {
          setDirectory(dir);
          if (useExisting) {
            setDownloaded(true);
          }
        }}
      />
    );
  }

  // 4. Download scripts (skip if using existing)
  if (!downloaded) {
    return (
      <DownloadDialog
        destination={directory}
        onComplete={() => setDownloaded(true)}
      />
    );
  }

  // 5. Select integrations (new multi-select)
  if (selectedIntegrations === null) {
    return (
      <IntegrationSelectDialog
        defaultSelected={PROFILE_DEFAULTS[deviceProfile]}
        onConfirm={(ids) => {
          setSelectedIntegrations(ids);
          if (
            !ids.includes('github_build_workflow') &&
            !ids.includes('cloudflare') &&
            !ids.includes('vault') &&
            !ids.includes('grafana')
          ) {
            setModuleConfigComplete(true);
          }
        }}
      />
    );
  }

  // 6. Per-module configuration for selected integrations
  if (!moduleConfigComplete) {
    if (
      selectedIntegrations.includes('github_build_workflow') &&
      !githubBuildWorkflowConfig
    ) {
      return (
        <GitHubBuildWorkflowDialog onComplete={setGithubBuildWorkflowConfig} />
      );
    }
    if (selectedIntegrations.includes('cloudflare') && !cloudflareConfig) {
      return <CloudflareConfigDialog onComplete={setCloudflareConfig} />;
    }
    if (selectedIntegrations.includes('vault') && !vaultConfig) {
      return (
        <VaultConfigDialog
          cloudflareConfig={cloudflareConfig}
          onComplete={setVaultConfig}
        />
      );
    }
    if (selectedIntegrations.includes('grafana') && !grafanaConfig) {
      return (
        <GrafanaConfigDialog
          cloudflareConfig={cloudflareConfig}
          onComplete={setGrafanaConfig}
        />
      );
    }
  }

  // 6b. Observability remote dialog (App Server without Grafana)
  if (
    deviceProfile === 'app-server' &&
    selectedIntegrations &&
    !selectedIntegrations.includes('grafana') &&
    observabilityRemote === undefined
  ) {
    return (
      <ObservabilityRemoteDialog
        onComplete={(config) => setObservabilityRemote(config)}
      />
    );
  }

  // 7. Summary screen
  if (summaryAction === null) {
    const configFilePath = `${directory}/iac-toolbox.yml`;
    return (
      <WizardSummaryDialog
        selectedIntegrations={selectedIntegrations}
        configFilePath={configFilePath}
        onConfirm={(action) => {
          if (action === 'cancel') {
            process.exit(0);
          }
          setSummaryAction(action);
        }}
      />
    );
  }

  // 8. Files written — show install prompt
  if (filesWritten && writtenConfigPath && installChoice === null) {
    return (
      <InstallPromptDialog
        onSelect={(install) => {
          setInstallChoice(install);
        }}
      />
    );
  }

  // 9. User declined install — show manual run instructions
  if (filesWritten && installChoice === false && directory) {
    return <ManualRunDialog destination={directory} />;
  }

  // 9a. Collect become (sudo) password before running Ansible
  if (filesWritten && installChoice === true && becomePassword === null) {
    return (
      <BecomePasswordDialog
        onComplete={(pw) => {
          setBecomePassword(pw);
          setInstallRunning(true);
        }}
      />
    );
  }

  // 10. Install running — show live output view
  if (filesWritten && installRunning && directory && selectedIntegrations) {
    return (
      <InstallRunnerDialog
        destination={directory}
        profile={profile}
        dockerHubUsername={githubBuildWorkflowConfig?.dockerHubUsername}
        dockerImageName={githubBuildWorkflowConfig?.dockerImageName}
        becomePassword={becomePassword ?? undefined}
        onComplete={handleInstallComplete}
      />
    );
  }

  // 11. Install complete — show result
  if (filesWritten && installResult && directory && selectedIntegrations) {
    return (
      <InstallCompleteDialog
        result={installResult}
        selectedIntegrations={selectedIntegrations}
      />
    );
  }

  // Writing files in progress
  return (
    <Box flexDirection="column" padding={1}>
      <Text>Writing configuration files...</Text>
    </Box>
  );
}
