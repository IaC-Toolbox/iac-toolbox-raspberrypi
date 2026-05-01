import fs from 'fs';
import path from 'path';
import https from 'https';

export interface DownloadOptions {
  url: string;
  destination: string;
}

export interface GitHubContent {
  name: string;
  path: string;
  type: 'file' | 'dir';
  download_url?: string;
  url: string;
}

/**
 * Downloads a file from a URL to the specified destination.
 *
 * @param options - Download options containing URL and destination path
 * @returns Promise that resolves when download is complete
 */
export async function downloadFile({
  url,
  destination,
}: DownloadOptions): Promise<void> {
  return new Promise((resolve, reject) => {
    // Ensure destination directory exists
    const dir = path.dirname(destination);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const file = fs.createWriteStream(destination);

    https
      .get(url, (response) => {
        if (response.statusCode === 301 || response.statusCode === 302) {
          // Handle redirects
          if (response.headers.location) {
            downloadFile({ url: response.headers.location, destination })
              .then(resolve)
              .catch(reject);
            return;
          }
        }

        if (response.statusCode !== 200) {
          reject(
            new Error(
              `Failed to download: HTTP ${response.statusCode} - ${response.statusMessage}`
            )
          );
          return;
        }

        response.pipe(file);

        file.on('finish', () => {
          file.close();
          resolve();
        });
      })
      .on('error', (err) => {
        fs.unlinkSync(destination);
        reject(err);
      });

    file.on('error', (err) => {
      fs.unlinkSync(destination);
      reject(err);
    });
  });
}

/**
 * Fetches directory contents from GitHub API.
 *
 * @param repoPath - Path within the repository (e.g., "scripts" or "terraform/grafana-alerts")
 * @returns Promise resolving to array of GitHub content items
 */
export async function fetchGitHubDirectory(
  repoPath: string
): Promise<GitHubContent[]> {
  const apiUrl = `https://api.github.com/repos/IaC-Toolbox/iac-toolbox-raspberrypi/contents/${repoPath}`;

  return new Promise((resolve, reject) => {
    https
      .get(
        apiUrl,
        {
          headers: {
            'User-Agent': 'IaC-Toolbox-CLI',
            Accept: 'application/vnd.github.v3+json',
          },
        },
        (response) => {
          let data = '';

          response.on('data', (chunk) => {
            data += chunk;
          });

          response.on('end', () => {
            if (response.statusCode === 200) {
              try {
                const contents = JSON.parse(data) as GitHubContent[];
                resolve(contents);
              } catch (err) {
                reject(new Error('Failed to parse GitHub API response'));
              }
            } else {
              reject(
                new Error(
                  `GitHub API error: ${response.statusCode} ${response.statusMessage}`
                )
              );
            }
          });
        }
      )
      .on('error', reject);
  });
}

/**
 * Downloads a directory recursively from GitHub.
 *
 * @param repoPath - Path within the repository
 * @param destinationDir - Local destination directory
 */
export async function downloadGitHubDirectory(
  repoPath: string,
  destinationDir: string
): Promise<void> {
  const contents = await fetchGitHubDirectory(repoPath);

  for (const item of contents) {
    const localPath = path.join(destinationDir, item.name);

    if (item.type === 'file' && item.download_url) {
      await downloadFile({
        url: item.download_url,
        destination: localPath,
      });
    } else if (item.type === 'dir') {
      // Create directory and download recursively
      if (!fs.existsSync(localPath)) {
        fs.mkdirSync(localPath, { recursive: true });
      }
      await downloadGitHubDirectory(item.path, localPath);
    }
  }
}

/**
 * Downloads infrastructure scripts from iac-toolbox-raspberrypi repository.
 *
 * @param destinationDir - Base directory where files will be downloaded
 */
export async function downloadInfrastructureScripts(
  destinationDir: string
): Promise<void> {
  // Ensure base directory exists
  if (!fs.existsSync(destinationDir)) {
    fs.mkdirSync(destinationDir, { recursive: true });
  }

  // Download specific directories
  const directories = [
    'scripts',
    'terraform/grafana-alerts',
    'ansible-configurations',
  ];

  for (const dir of directories) {
    const localDir = path.join(destinationDir, dir);
    await downloadGitHubDirectory(dir, localDir);
  }

  // Download .gitignore file
  const gitignoreUrl =
    'https://raw.githubusercontent.com/IaC-Toolbox/iac-toolbox-raspberrypi/main/.gitignore';
  await downloadFile({
    url: gitignoreUrl,
    destination: path.join(destinationDir, '.gitignore'),
  });
}

/**
 * Downloads the GitHub Actions workflow template.
 *
 * @param destinationPath - Path where the workflow file should be saved
 * @returns Promise that resolves when download is complete
 */
export async function downloadGitHubWorkflowTemplate(
  destinationPath: string
): Promise<void> {
  const templateUrl =
    'https://raw.githubusercontent.com/IaC-Toolbox/iac-toolbox-raspberrypi/main/.github/workflows/main.yaml';

  await downloadFile({
    url: templateUrl,
    destination: destinationPath,
  });
}
